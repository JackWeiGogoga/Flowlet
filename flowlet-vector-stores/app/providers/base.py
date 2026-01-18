"""Base classes for vector store adapters."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from ..models import DocumentPayload, MatchResult


class VectorStoreAdapter(ABC):
    """Abstract base class for vector store adapters.
    
    This adapter pattern ensures consistent interface across different vector store providers,
    handling provider-specific implementation details and parameter differences.
    
    Note: This service works with pre-computed vectors. Text vectorization should be 
    performed before calling this service.
    """
    
    def __init__(self, collection: str):
        self.collection = collection
    
    # =========================================================================
    # Core Operations (Required)
    # =========================================================================
    
    @abstractmethod
    def add_documents(self, documents: List[DocumentPayload]) -> List[str]:
        """Add documents to the vector store.
        
        Args:
            documents: List of documents to add
            
        Returns:
            List of document IDs
        """
        pass
    
    @abstractmethod
    def delete_documents(self, ids: List[str]) -> None:
        """Delete documents from the vector store.
        
        Args:
            ids: List of document IDs to delete
        """
        pass
    
    @abstractmethod
    def search(
        self, 
        query_vector: List[float], 
        k: int, 
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[MatchResult]:
        """Search for similar documents using a query vector.
        
        Args:
            query_vector: Pre-computed query embedding vector
            k: Number of results to return
            filter_dict: Optional metadata filter
            
        Returns:
            List of search results with scores
        """
        pass
    
    # =========================================================================
    # Management Operations (Optional - Provider Specific)
    # =========================================================================
    
    @classmethod
    def test_connection(
        cls, 
        base_url: str, 
        api_key: Optional[str] = None,
        database: Optional[str] = None
    ) -> Dict[str, Any]:
        """Test connection to the vector store provider.
        
        Args:
            base_url: Provider base URL
            api_key: Optional API key/token
            database: Optional database name
            
        Returns:
            Dict with success status, message, and available resources
        """
        raise NotImplementedError(f"{cls.__name__} does not support connection testing")
    
    @classmethod
    def list_databases(
        cls, 
        base_url: str, 
        api_key: Optional[str] = None
    ) -> List[str]:
        """List available databases (if supported by provider).
        
        Args:
            base_url: Provider base URL
            api_key: Optional API key/token
            
        Returns:
            List of database names (empty list if not supported)
        """
        return []  # Default: not supported
    
    @classmethod
    def list_collections(
        cls, 
        base_url: str, 
        api_key: Optional[str] = None,
        database: Optional[str] = None
    ) -> List[str]:
        """List available collections.
        
        Args:
            base_url: Provider base URL
            api_key: Optional API key/token
            database: Optional database name
            
        Returns:
            List of collection names
        """
        raise NotImplementedError(f"{cls.__name__} does not support listing collections")
