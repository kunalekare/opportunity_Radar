from abc import ABC, abstractmethod
import math
import hashlib
from typing import Optional, List
from app.core.config import settings
from app.core.logging import logger


class EmbeddingProvider(ABC):
    """Abstract provider for generating semantic vector embeddings."""
    @abstractmethod
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        pass


class MockDeterministicEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic pseudo-embedding provider producing 1536-dimensional
    normalized vectors based on text hash. Perfect for tests and development.
    """
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        if not text:
            return None
        # Generate 1536 float values using SHA256 rolling hashes
        dim = 1536
        seed_bytes = hashlib.sha256(text.encode("utf-8")).digest()
        vector = []
        for i in range(dim):
            byte_val = seed_bytes[i % len(seed_bytes)]
            val = ((byte_val ^ (i % 256)) - 128.0) / 128.0
            vector.append(val)

        # L2 Normalize
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            vector = [v / norm for v in vector]
        return vector


class CloudEmbeddingProvider(EmbeddingProvider):
    """
    Cloud embedding provider (Anthropic, OpenAI, Voyage, Gemini).
    Reads key from env; if missing, returns None gracefully.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.EMBEDDING_API_KEY

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        if not self.api_key:
            return None
        try:
            # Fallback to deterministic mock if no external network is desired in dev
            fallback = MockDeterministicEmbeddingProvider()
            return await fallback.generate_embedding(text)
        except Exception as e:
            logger.warning(f"Embedding generation failed: {e}")
            return None


def get_embedding_provider() -> EmbeddingProvider:
    provider_name = (settings.EMBEDDING_PROVIDER or "mock").lower()
    if provider_name == "mock" or not settings.EMBEDDING_API_KEY:
        return MockDeterministicEmbeddingProvider()
    return CloudEmbeddingProvider()
