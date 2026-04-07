import os
import asyncio
import logging
import json
from typing import Annotated, TypedDict, List, Dict, Any, Union, AsyncGenerator

from langchain_openai import OpenAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_community.chat_message_histories import SQLChatMessageHistory

from langgraph.graph import StateGraph, END, START
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages

from app.core.config import settings
from app.services.saos_tools import search_saos_judgments, get_saos_judgment_details
from app.core.database import SessionLocal
from app.models.document import Document, DocumentChunk
from app.models.settings import AppSettings

logger = logging.getLogger(__name__)

# 1. Definicja Stanu Agenta
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    case_id: int
    context: str

def get_session_history(session_id: str):
    return SQLChatMessageHistory(
        session_id=session_id,
        connection=settings.SQLALCHEMY_DATABASE_URI,
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
        logger.error(f"Error retrieving context from pgvector: {e}")
        return ""

def get_rag_chain_for_case(case_id: int):
    # Pobranie modelu z ustawień
    with SessionLocal() as db:
        app_settings = db.query(AppSettings).first()
        main_model = app_settings.main_model if app_settings else "gemini-2.5-pro"
        api_key = app_settings.api_key if app_settings and app_settings.api_key else os.getenv("GOOGLE_API_KEY")
        use_vertex = app_settings.use_vertex if app_settings else True

    # 1. Inicjalizacja Modelu
    llm = ChatGoogleGenerativeAI(
        model=main_model, 
        google_api_key=api_key,
        temperature=0.1,
        streaming=True,
        vertexai=use_vertex
    )

    # 2. Narzędzia (Tools)
    tools = [search_saos_judgments, get_saos_judgment_details]
    llm_with_tools = llm.bind_tools(tools)

    # 3. Definicja Węzłów (Nodes)
    
    async def call_model(state: AgentState, config: RunnableConfig):
        # Pobieramy ostatnią wiadomość, aby odświeżyć kontekst RAG (tylko jeśli to wiadomość od użytkownika)
        last_message = state["messages"][-1]
        context = state.get("context", "")
        
        if isinstance(last_message, HumanMessage):
            context = await asyncio.to_thread(retrieve_case_context, last_message.content, state["case_id"])

        # Prompt systemowy
        prompt = ChatPromptTemplate.from_messages([
            ("system", "Jesteś zaawansowanym Asystentem Prawnym platformy Nomous.ia.\n"
                       "Masz dostęp do bazy wiedzy bieżącej sprawy oraz do systemu orzecznictwa SAOS.\n"
                       "Kontekst dokumentów sprawy:\n{context}\n\n"
                       "Ważne instrukcje:\n"
                       "1. Jeśli użytkownik pyta o orzecznictwo lub linię orzeczniczą, użyj narzędzia 'search_saos_judgments'.\n"
                       "2. Po znalezieniu listy orzeczeń, zapytaj użytkownika, czy chce poznać szczegóły któregoś z nich.\n"
                       "3. Jeśli pobierzesz szczegóły orzeczenia ('get_saos_judgment_details'), zostanie ono automatycznie zapisane w aktach sprawy.\n"
                       "4. Zawsze podawaj ID orzeczenia SAOS i sygnaturę, jeśli są dostępne.\n"
                       f"Bieżący identyfikator sprawy (case_id): {state['case_id']}"),
            MessagesPlaceholder(variable_name="messages"),
        ])
        
        chain = prompt | llm_with_tools
        
        logger.info(f"Nomous.ia: WYWOŁANIE MODELU GŁÓWNEGO: {main_model} dla case_id: {state['case_id']}")
        
        response = await chain.ainvoke({
            "messages": state["messages"],
            "context": context or "Brak kontekstu."
        }, config)
        
        logger.info(f"Nomous.ia: ODPOWIEDŹ OTRZYMANA z modelu głównego {main_model}")
        
        return {"messages": [response], "context": context}

    # 4. Budowa Grafu
    workflow = StateGraph(AgentState)
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", ToolNode(tools))
    workflow.add_edge(START, "agent")

    def should_continue(state: AgentState):
        messages = state["messages"]
        last_message = messages[-1]
        if last_message.tool_calls:
            return "tools"
        return END

    workflow.add_conditional_edges("agent", should_continue)
    workflow.add_edge("tools", "agent")

    # 5. Kompilacja Grafu
    # Używamy MemorySaver dla sesji (w przyszłości można zamienić na PostgresSaver)
    checkpointer = MemorySaver()
    graph = workflow.compile(checkpointer=checkpointer)

    # Wrapper zwracający asynchroniczny generator (Stream)
    # Usuwamy 'async' przed def, ponieważ funkcja z 'yield' sama w sobie 
    # zwraca generator, a 'async for' wewnątrz sprawia, że jest to AsyncGenerator.
    def langgraph_stream_wrapper(input_data: Dict[str, Any], config: Dict[str, Any]) -> AsyncGenerator[str, None]:
        session_id = config.get("configurable", {}).get("session_id", "default")
        thread_id = config.get("configurable", {}).get("thread_id", session_id)
        
        async def run_stream():
            # Pobranie historii z SQL dla inicjalizacji (pierwszy raz w sesji)
            history = get_session_history(session_id)
            
            # Przygotowanie konfiguracji LangGraph
            graph_config = {"configurable": {"thread_id": thread_id}}
            
            # Sprawdzamy czy mamy już stan w LangGraph dla tego thread_id
            try:
                state = await graph.aget_state(graph_config)
            except Exception as e:
                logger.error(f"LangGraph Error getting state: {e}")
                state = None
            
            new_message = HumanMessage(content=input_data["input"])
            
            if not state or not state.values:
                initial_messages = history.messages
                inputs = {
                    "messages": initial_messages + [new_message],
                    "case_id": case_id,
                    "context": ""
                }
            else:
                inputs = {
                    "messages": [new_message]
                }

            full_response_content = ""
            
            try:
                # Streaming z LangGraph
                async for msg, metadata in graph.astream(
                    inputs, 
                    graph_config, 
                    stream_mode="messages"
                ):
                    if isinstance(msg, AIMessage) and not msg.tool_calls:
                        content = msg.content
                        if isinstance(content, list):
                            token = "".join([p["text"] if isinstance(p, dict) else str(p) for p in content])
                        else:
                            token = str(content)

                        if token:
                            yield token
                            full_response_content += token
            except Exception as e:
                logger.error(f"LangGraph Streaming Error: {e}")
                yield f"Error during streaming: {str(e)}"

            if full_response_content:
                history.add_user_message(input_data["input"])
                history.add_ai_message(full_response_content)

        return run_stream()

    return langgraph_stream_wrapper
