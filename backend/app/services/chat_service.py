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

from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from app.services.saos_tools import search_saos_judgments, get_saos_judgment_details

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
    
    # 2. Inicjalizacja poszukiwaczy
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        dimensions=768,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    vectorstore = PineconeVectorStore(
        index_name=index_name, 
        embedding=embeddings,
        namespace=f"case_{case_id}"
    )
    
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 10} 
    )
    
    # 3. Model Gemini 1.5 (obsługuje tool calling lepiej niż 3 pro preview)
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash", 
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1,
        streaming=True 
    )

    # 4. Narzędzia (Tools)
    tools = [search_saos_judgments, get_saos_judgment_details]

    # 5. Prompt Systemowy z Historią i wsparciem dla narzędzi
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Jesteś zaawansowanym Asystentem Prawnym platformy Nomous.ia.\n"
                   "Masz dostęp do bazy wiedzy bieżącej sprawy oraz do systemu orzecznictwa SAOS.\n"
                   "Kontekst dokumentów sprawy:\n{context}\n\n"
                   "Ważne instrukcje:\n"
                   "1. Jeśli użytkownik pyta o orzecznictwo lub linię orzeczniczą, użyj narzędzia 'search_saos_judgments'.\n"
                   "2. Po znalezieniu listy orzeczeń, zapytaj użytkownika, czy chce poznać szczegóły któregoś z nich.\n"
                   "3. Jeśli pobierzesz szczegóły orzeczenia ('get_saos_judgment_details'), zostanie ono automatycznie zapisane w aktach sprawy.\n"
                   "4. Zawsze podawaj ID orzeczenia SAOS i sygnaturę, jeśli są dostępne.\n"
                   f"Bieżący identyfikator sprawy (case_id): {case_id}"),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    # 6. Tworzenie Agenta
    agent = create_tool_calling_agent(llm, tools, prompt)
    
    # 7. Agent Executor
    agent_executor = AgentExecutor(
        agent=agent, 
        tools=tools, 
        verbose=True,
        return_intermediate_steps=False
    ).with_config({"run_name": "NomousChatAgent"})

    # 8. Dodanie pamięci (SQLChatMessageHistory)
    with_message_history = RunnableWithMessageHistory(
        agent_executor,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
    )
    
    # Wstrzyknięcie kontekstu retrievera (wrapper)
    async def agent_with_context(input_data, config):
        docs = await retriever.ainvoke(input_data["input"])
        context = format_docs(docs)
        return await with_message_history.ainvoke(
            {"input": input_data["input"], "context": context},
            config=config
        )

    return agent_with_context
