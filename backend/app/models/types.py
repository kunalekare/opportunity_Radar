from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

try:
    from pgvector.sqlalchemy import Vector
    PG_VECTOR_AVAILABLE = True
except ImportError:
    PG_VECTOR_AVAILABLE = False
    Vector = None


def get_vector_type(dimensions: int = 1536):
    """
    Returns pgvector.sqlalchemy.Vector if available,
    otherwise falls back to a JSON column for test environments (e.g. SQLite).
    """
    if PG_VECTOR_AVAILABLE and Vector is not None:
        return Vector(dimensions)
    return JSON
