"""Factory for creating vector store adapters."""

from fastapi import HTTPException

from .models import ProviderConfig
from .providers.base import VectorStoreAdapter
from .providers.milvus import MilvusAdapter
from .providers.qdrant import QdrantAdapter


class VectorStoreFactory:
    """Factory class for creating vector store adapters.
    
    Uses the Factory pattern to create appropriate vector store adapters
    based on the provider type. This makes it easy to add new providers
    without modifying existing code (Open/Closed Principle).
    
    Note: This service works with pre-computed vectors. Text vectorization 
    should be performed before calling this service.
    """
    
    # Registry of available providers
    _providers = {
        "milvus": MilvusAdapter,
        "qdrant": QdrantAdapter,
    }
    
    @classmethod
    def create(
        cls,
        provider: ProviderConfig,
        collection: str,
    ) -> VectorStoreAdapter:
        """Create a vector store adapter based on the provider type.
        
        Args:
            provider: Provider configuration
            collection: Collection name
            
        Returns:
            Vector store adapter instance
            
        Raises:
            HTTPException: If provider type is not supported
        """
        adapter_class = cls._providers.get(provider.type)
        if not adapter_class:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported provider type: {provider.type}. "
                       f"Supported types: {', '.join(cls._providers.keys())}"
            )
        
        return adapter_class(
            collection=collection,
            provider=provider,
        )
    
    @classmethod
    def register_provider(cls, name: str, adapter_class: type[VectorStoreAdapter]) -> None:
        """Register a new vector store provider.
        
        This allows for runtime extension of supported providers.
        
        Args:
            name: Provider name
            adapter_class: Adapter class implementing VectorStoreAdapter
        """
        cls._providers[name] = adapter_class
    
    @classmethod
    def get_supported_providers(cls) -> list[str]:
        """Get list of supported provider types.
        
        Returns:
            List of supported provider names
        """
        return list(cls._providers.keys())
