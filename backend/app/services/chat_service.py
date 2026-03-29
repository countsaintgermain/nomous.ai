import os
from pinecone import Pinecone
from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.output_parsers import StrOutputParser
from langchain_pinecone import PineconeVectorStore
from langchain_community.chat_message_histories import SQLChatMessageHistory
from app.core.config import settings

def get_session_history(session_id: str):
    return SQLChatMessageHistory(
        session_id=session_id,
        connection_string=settings.SQLALCHEMY_DATABASE_URI,
        table_name="chat_messages"
    )

def get_rag_chain_for_case(case_id: int):
    # 1. Połączenie z Pinecone
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index_name = os.getenv("PINECONE_INDEX_NAME", "nomous-dev-index")
    
    # 2. Inicjalizacja poszukiwaczy (OpenAI 1.1.2)
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        dimensions=768, # Zgodność z indeksem 768
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    vectorstore = PineconeVectorStore(
        index_name=index_name, 
        embedding=embeddings,
        namespace=f"case_{case_id}"
    )
    
    # Retriever znajduje teraz dokumenty wewnątrz namespace'u sprawy
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 10} 
    )
    
    # 3. Model Gemini 3 Pro
    llm = ChatGoogleGenerativeAI(
        model="gemini-3-pro-preview", 
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1,
        streaming=True 
    )

    # 4. Prompt Systemowy z Historią
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Jesteś zaawansowanym Asystentem Prawnym platformy Nomous.ia.\n"
                   "Kontekst dokumentów:\n{context}\n\n"),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}")
    ])
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    # 5. Składanie łańcucha LCEL
    rag_chain = (
        {
            "context": (lambda x: x["input"]) | retriever | format_docs, 
            "input": lambda x: x["input"],
            "chat_history": lambda x: x.get("chat_history", [])
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    # 6. Dodanie pamięci (SQLChatMessageHistory)
    with_message_history = RunnableWithMessageHistory(
        rag_chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
    )
    
    return with_message_history
