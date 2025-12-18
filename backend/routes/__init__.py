"""Routes package."""
from .documents import router as documents_router
from .clients import router as clients_router
from .exports import router as exports_router
from .matches import router as matches_router
from .stats import router as stats_router

__all__ = [
    "documents_router",
    "clients_router",
    "exports_router",
    "matches_router",
    "stats_router",
]

