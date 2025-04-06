"""
This module contains all the routers for the LightRAG API.
"""

from .document_routes import router as document_router
from .query_routes import router as query_router
from .graph_routes import router as graph_router
from .ollama_api import OllamaAPI
from .prompt_routes import router as prompt_router

__all__ = [
    "document_router",
    "query_router",
    "graph_router",
    "OllamaAPI",
    "prompt_router"
]
