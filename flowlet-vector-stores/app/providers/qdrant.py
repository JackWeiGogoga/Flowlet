"""Qdrant vector store adapter using native qdrant-client SDK."""

from typing import Any, Dict, List, Optional
import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import (
    PointStruct, 
    Filter, 
    FieldCondition, 
    MatchValue,
    Distance,
    VectorParams
)

from ..models import DocumentPayload, MatchResult, ProviderConfig
from .base import VectorStoreAdapter


class QdrantAdapter(VectorStoreAdapter):
    """Adapter for Qdrant vector store using native qdrant-client.
    
    Handles Qdrant-specific connection parameters and method signatures.
    Uses pre-computed vectors - no text vectorization is performed.
    """
    
    def __init__(
        self, 
        collection: str, 
        provider: ProviderConfig
    ):
        super().__init__(collection)
        self.provider = provider
        self.client = self._create_client()
    
    def _create_client(self) -> QdrantClient:
        """Create Qdrant client instance."""
        # Build connection parameters dynamically to avoid None values and type issues
        conn_params: Dict[str, Any] = {
            "url": self.provider.base_url,
        }
        
        # Only add api_key if provided
        if self.provider.api_key:
            conn_params["api_key"] = self.provider.api_key
        
        # Parse grpc_port from grpc_url if provided
        # grpc_url can be either a port number string or a full URL
        if self.provider.grpc_url:
            try:
                # Try to parse as integer (port number)
                grpc_port = int(self.provider.grpc_url)
                conn_params["grpc_port"] = grpc_port
            except ValueError:
                # If not a number, it might be a URL - extract port or use default
                # For now, skip if it's not a valid port number
                pass
        
        # Add prefer_grpc flag
        if self.provider.prefer_grpc:
            conn_params["prefer_grpc"] = True
        
        client = QdrantClient(**conn_params)
        return client
    
    def _ensure_collection(self, vector_dim: int) -> None:
        """Ensure collection exists, create if not.
        
        Args:
            vector_dim: Dimension of the vector field
        """
        # Check if collection exists
        if self.client.collection_exists(collection_name=self.collection):
            return
        
        # Create collection with cosine distance metric
        self.client.create_collection(
            collection_name=self.collection,
            vectors_config=VectorParams(
                size=vector_dim,
                distance=Distance.COSINE  # Default similarity metric
            )
        )
    
    def add_documents(self, documents: List[DocumentPayload]) -> List[str]:
        """Add documents to Qdrant with pre-computed vectors.
        
        Args:
            documents: List of documents with pre-computed vectors
            
        Returns:
            List of document IDs
        """
        if not documents:
            return []
        
        # Get vector dimension from first document
        vector_dim = len(documents[0].vector)
        
        # Ensure collection exists (auto-create if needed)
        self._ensure_collection(vector_dim)
        
        points = []
        inserted_ids = []
        
        for doc in documents:
            # Generate ID if not provided
            doc_id = doc.id if doc.id else str(uuid.uuid4())
            inserted_ids.append(doc_id)
            
            # Prepare payload (metadata + content)
            payload = {
                "content": doc.content,
                **doc.metadata
            }
            
            # Create point with vector and payload
            point = PointStruct(
                id=doc_id,
                vector=doc.vector,
                payload=payload
            )
            points.append(point)
        
        # Upsert points to collection
        self.client.upsert(
            collection_name=self.collection,
            points=points
        )
        
        return inserted_ids
    
    def delete_documents(self, ids: List[str]) -> None:
        """Delete documents from Qdrant by IDs.
        
        Args:
            ids: List of document IDs to delete
        """
        # Convert to native list for type compatibility
        # qdrant-client accepts list[int | str | UUID] at runtime
        self.client.delete(
            collection_name=self.collection,
            points_selector=list(ids)  # type: ignore[arg-type]
        )
    
    def search(
        self, 
        query_vector: List[float], 
        k: int, 
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[MatchResult]:
        """Search for similar documents in Qdrant using pre-computed query vector.
        
        Args:
            query_vector: Pre-computed query embedding vector
            k: Number of results to return
            filter_dict: Optional metadata filter
            
        Returns:
            List of search results with scores
        """
        # Build Qdrant filter if provided
        query_filter = None
        if filter_dict:
            # Convert dict to Qdrant Filter
            # Example: {"category": "tech"} -> Filter with FieldCondition
            conditions = []
            for key, value in filter_dict.items():
                conditions.append(
                    FieldCondition(
                        key=key,
                        match=MatchValue(value=value)
                    )
                )
            if conditions:
                query_filter = Filter(must=conditions)
        
        # Perform vector search using query method (qdrant-client v1.9+)
        search_results = self.client.query_points(
            collection_name=self.collection,
            query=query_vector,
            limit=k,
            query_filter=query_filter,
            with_payload=True,
            with_vectors=False  # Don't return vectors in results
        )
        
        # Convert results to MatchResult objects
        matches: List[MatchResult] = []
        for hit in search_results.points:
            payload = hit.payload or {}
            content = payload.pop("content", "")
            
            matches.append(
                MatchResult(
                    id=str(hit.id),
                    content=content,
                    score=float(hit.score) if hit.score is not None else 0.0,
                    metadata=payload
                )
            )
        
        return matches
    
    # =========================================================================
    # Management Operations
    # =========================================================================
    
    @classmethod
    def test_connection(
        cls, 
        base_url: str, 
        api_key: Optional[str] = None,
        database: Optional[str] = None
    ) -> Dict[str, Any]:
        """Test connection to Qdrant server.
        
        Note: Qdrant doesn't have database concept, database parameter is ignored.
        
        Args:
            base_url: Qdrant server URL
            api_key: Optional API key
            database: Ignored (Qdrant doesn't have databases)
            
        Returns:
            Dict with connection test result
        """
        try:
            conn_params: Dict[str, str] = {"url": base_url}
            if api_key:
                conn_params["api_key"] = api_key
            
            client = QdrantClient(**conn_params)  # type: ignore[arg-type]
            collections_info = client.get_collections()
            
            return {
                "success": True,
                "message": f"Connected successfully. Found {len(collections_info.collections)} collection(s).",
                "collections": [c.name for c in collections_info.collections],
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection failed: {str(e)}",
            }
    
    @classmethod
    def list_databases(
        cls, 
        base_url: str, 
        api_key: Optional[str] = None
    ) -> List[str]:
        """List databases (not supported by Qdrant).
        
        Qdrant doesn't have database concept, returns empty list.
        
        Returns:
            Empty list
        """
        return []
    
    @classmethod
    def list_collections(
        cls, 
        base_url: str, 
        api_key: Optional[str] = None,
        database: Optional[str] = None
    ) -> List[str]:
        """List all collections in Qdrant.
        
        Args:
            base_url: Qdrant server URL
            api_key: Optional API key
            database: Ignored (Qdrant doesn't have databases)
            
        Returns:
            List of collection names
        """
        conn_params: Dict[str, str] = {"url": base_url}
        if api_key:
            conn_params["api_key"] = api_key
        
        client = QdrantClient(**conn_params)  # type: ignore[arg-type]
        collections_info = client.get_collections()
        return [c.name for c in collections_info.collections]
    
    @classmethod
    def create_collection(
        cls,
        base_url: str,
        api_key: Optional[str] = None,
        database: Optional[str] = None,
        collection: str = "",
        dimension: int = 768,
        metric_type: str = "COSINE"
    ) -> Dict[str, Any]:
        """Create a new collection in Qdrant.
        
        Args:
            base_url: Qdrant server URL
            api_key: Optional API key
            database: Ignored (Qdrant doesn't have databases)
            collection: Collection name to create
            dimension: Vector dimension (default: 768 for common embedding models)
            metric_type: Similarity metric (COSINE, L2/EUCLID, IP/DOT)
            
        Returns:
            Dict with creation result
        """
        conn_params: Dict[str, str] = {"url": base_url}
        if api_key:
            conn_params["api_key"] = api_key
        
        client = QdrantClient(**conn_params)  # type: ignore[arg-type]
        
        # Check if collection already exists
        if client.collection_exists(collection_name=collection):
            return {
                "created": False,
                "message": f"Collection '{collection}' already exists",
            }
        
        # Map metric_type to Qdrant Distance enum
        distance_map = {
            "COSINE": Distance.COSINE,
            "L2": Distance.EUCLID,
            "EUCLID": Distance.EUCLID,
            "IP": Distance.DOT,
            "DOT": Distance.DOT,
        }
        distance = distance_map.get(metric_type.upper(), Distance.COSINE)
        
        # Create collection
        client.create_collection(
            collection_name=collection,
            vectors_config=VectorParams(
                size=dimension,
                distance=distance
            )
        )
        
        return {
            "created": True,
            "dimension": dimension,
            "metric_type": metric_type,
        }
    
    @classmethod
    def drop_collection(
        cls,
        base_url: str,
        api_key: Optional[str] = None,
        database: Optional[str] = None,
        collection: str = ""
    ) -> None:
        """Drop (delete) a collection from Qdrant.
        
        Args:
            base_url: Qdrant server URL
            api_key: Optional API key
            database: Ignored (Qdrant doesn't have databases)
            collection: Collection name to drop
        """
        conn_params: Dict[str, str] = {"url": base_url}
        if api_key:
            conn_params["api_key"] = api_key
        
        client = QdrantClient(**conn_params)  # type: ignore[arg-type]
        
        if client.collection_exists(collection_name=collection):
            client.delete_collection(collection_name=collection)
