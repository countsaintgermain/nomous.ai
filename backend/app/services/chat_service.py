import os
from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.output_parsers import StrOutputParser
from langchain_community.chat_message_histories import SQLChatMessageHistory
from app.core.config import settings

from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from app.services.saos_tools import search_saos_judgments, get_saos_judgment_details
from app.core.database import SessionLocal
from app.models.document import Document, DocumentChunk

def get_session_history(session_id: str):
    return SQLChatMessageHistory(
        session_id=session_id,
        connection_string=settings.SQLALCHEMY_DATABASE_URI,
        table_name="chat_messages"
    )

def retrieve_case_context(query: str, case_id: int) -> str:
    """Wyszukuje najbardziej pasujące fragmenty dokumentów dla danej sprawy z bazy wektorowej PostgreSQL."""
    try:
        embeddings_model = OpenAIEmbeddings(
            model="text-embedding-3-small",
            dimensions=768,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        query_vector = embeddings_model.embed_query(query)

        with SessionLocal() as db:
            chunks = db.query(DocumentChunk).join(Document).filter(
                Document.case_id == case_id
            ).order_by(
                DocumentChunk.embedding.cosine_distance(query_vector)
            ).limit(10).all()
            
            if not chunks:
                return "Brak dokumentów w aktówce dla tej sprawy."
                
            return "\n\n".join([chunk.content for chunk in chunks])
    except Exception as e:
        import logging
        logging.error(f"Error retrieving context from pgvector: {e}")
        return ""

def get_rag_chain_for_case(case_id: int):
    # 1. Model Gemini 1.5 (obsługuje tool calling lepiej niż 3 pro preview)
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash", 
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1,
        streaming=True 
    )

    # 2. Narzędzia (Tools)
    tools = [search_saos_judgments, get_saos_judgment_details]

    # 3. Prompt Systemowy z Historią i wsparciem dla narzędzi
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

    # 4. Tworzenie Agenta
    agent = create_tool_calling_agent(llm, tools, prompt)
    
    # 5. Agent Executor
    agent_executor = AgentExecutor(
        agent=agent, 
        tools=tools, 
        verbose=True,
        return_intermediate_steps=False
    ).with_config({"run_name": "NomousChatAgent"})

    # 6. Dodanie pamięci (SQLChatMessageHistory)
    with_message_history = RunnableWithMessageHistory(
        agent_executor,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
    )
    
    # Wstrzyknięcie kontekstu retrievera (wrapper)
    async def agent_with_context(input_data, config):
        import asyncio
        # Uruchamiamy synchroniczny dostęp do bazy w osobnym wątku
        context = await asyncio.to_thread(retrieve_case_context, input_data["input"], case_id)
        
        return await with_message_history.ainvoke(
            {"input": input_data["input"], "context": context},
            config=config
        )

    return agent_with_context
