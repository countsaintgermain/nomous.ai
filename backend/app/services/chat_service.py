import os
from pinecone import Pinecone
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

def get_rag_chain_for_case(case_id: int):
    # 1. Połączenie z Pinecone
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index_name = os.getenv("PINECONE_INDEX_NAME", "nomous-dev-index")
    namespace_id = f"case_{case_id}"
    
    # 2. Inicjalizacja poszukiwaczy
    # Tekst w bazie osadzany był przez Gemini (models/gemini-embedding-001), wiec tak samo szukamy
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    vectorstore = PineconeVectorStore(index_name=index_name, embedding=embeddings, namespace=namespace_id)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5}) # Pobierz 5 najtrafniejszych wektorów
    
    # 3. Model "Mózg" - Najmocniejszy Gemini
    # Model użyje Twojego klucza GOOGLE_API_KEY zaczytywanego z os.environ
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-pro", 
        temperature=0.2, # Niski parametr temp - by model twardo trzymał się faktów, a nie "halucynował" prawniczo
        streaming=True 
    )

    # 4. Prompt Systemowy upewniający sie ze to Legal Assistant
    system_prompt = (
        "Jesteś zaawansowanym Asystentem Prawnym (AI Legal Assistant) platformy The Nomous.ia. "
        "Twoim zadaniem jest pomóc prawnikowi w jego sprawie w oparciu o dostarczone mu wyrwane fragmenty akt i orzeczeń. "
        "Zawsze odpowiadaj profesjonalnym, ale przystępnym językiem. Oprzyj swoją odpowiedź WYŁĄCZNIE na "
        "kontekście dostarczonym poniżej. Jeśli nie znasz odpowiedzi na podstawie tych dokumentów, przyznaj to. "
        "\\n\\n"
        "Kontekst Sprawy (Fragmenty Akt):\\n"
        "{context}"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    
    # 5. Składanie łańcucha RAG 
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)
    
    return rag_chain
