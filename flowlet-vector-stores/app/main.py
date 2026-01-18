"""Flowlet Vector Store Service - Main API module.

This module provides a unified REST API for various vector store providers,
using the Adapter pattern to normalize different provider interfaces.

Important: This service works with PRE-COMPUTED VECTORS only. 
Text vectorization/embedding should be performed before calling this service.
"""

from typing import Any, Dict
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .models import (
    ApiResponse,
    DeleteRequest,
    DeleteResponse,
    HealthResponse,
    SearchRequest,
    SearchResponse,
    UpsertRequest,
    UpsertResponse,
    ProviderConfig,
)
from .factory import VectorStoreFactory
from .providers.milvus import MilvusAdapter
from .providers.qdrant import QdrantAdapter


app = FastAPI(title="Flowlet Vector Store Service", version="0.1.0")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        service="vector-store",
    )


@app.post("/vector-stores/upsert", response_model=UpsertResponse)
def upsert_documents(payload: UpsertRequest) -> UpsertResponse:
    """Add or update documents in the vector store with pre-computed vectors.
    
    Important: Documents must include pre-computed embedding vectors.
    This service does not perform text vectorization.
    
    Args:
        payload: Upsert request containing:
            - provider: Vector store provider config
            - collection: Collection name
            - documents: List of documents with pre-computed vectors
        
    Returns:
        Response with success status, count, and document IDs
    """
    adapter = VectorStoreFactory.create(
        provider=payload.provider,
        collection=payload.collection,
    )
    
    ids = adapter.add_documents(payload.documents)
    
    return UpsertResponse(
        success=True,
        count=len(payload.documents),
        ids=ids,
    )


@app.post("/vector-stores/delete", response_model=DeleteResponse)
def delete_documents(payload: DeleteRequest) -> DeleteResponse:
    """Delete documents from the vector store.
    
    Args:
        payload: Delete request containing:
            - provider: Vector store provider config
            - collection: Collection name
            - ids: List of document IDs to delete
        
    Returns:
        Response with success status and count of deleted documents
    """
    adapter = VectorStoreFactory.create(
        provider=payload.provider,
        collection=payload.collection,
    )
    
    adapter.delete_documents(payload.ids)
    
    return DeleteResponse(success=True, count=len(payload.ids))


@app.post("/vector-stores/search", response_model=SearchResponse)
def search_documents(payload: SearchRequest) -> SearchResponse:
    """Search for similar documents in the vector store using pre-computed query vector.
    
    Important: Query must be provided as a pre-computed embedding vector.
    This service does not perform text vectorization.
    
    Args:
        payload: Search request containing:
            - provider: Vector store provider config
            - collection: Collection name
            - query_vector: Pre-computed query embedding vector
            - k: Number of results to return
            - filter: Optional metadata filter
        
    Returns:
        Response with matching documents and similarity scores
    """
    adapter = VectorStoreFactory.create(
        provider=payload.provider,
        collection=payload.collection,
    )
    
    matches = adapter.search(
        query_vector=payload.query_vector,
        k=payload.k,
        filter_dict=payload.filter,
    )
    
    return SearchResponse(success=True, matches=matches)


# ============================================================================
# Management API - Database & Collection listing
# ============================================================================

class TestConnectionRequest(BaseModel):
    """Request model for testing connection."""
    provider: ProviderConfig
    database: str | None = None
    
    @classmethod
    def model_validate(cls, obj):
        """Custom validation to handle empty arrays from frontend."""
        if isinstance(obj, dict):
            # Convert empty array to None for database field
            if "database" in obj and isinstance(obj["database"], list):
                obj["database"] = obj["database"][0] if obj["database"] else None
        return super().model_validate(obj)


class ListDatabasesRequest(BaseModel):
    """Request model for listing databases."""
    provider: ProviderConfig


class ListCollectionsRequest(BaseModel):
    """Request model for listing collections."""
    provider: ProviderConfig
    database: str | None = None


class CreateCollectionRequest(BaseModel):
    """Request model for creating a new collection."""
    provider: ProviderConfig
    collection: str
    database: str | None = None
    dimension: int  # Vector dimension
    metric_type: str = "COSINE"  # Similarity metric: COSINE, L2, IP


class DropCollectionRequest(BaseModel):
    """Request model for dropping a collection."""
    provider: ProviderConfig
    collection: str
    database: str | None = None


@app.post("/vector-stores/test-connection")
def test_connection(payload: TestConnectionRequest) -> ApiResponse[Dict[str, Any]]:
    """Test connection to vector store provider.
    
    Args:
        payload: Test request containing provider config and optional database
        
    Returns:
        Unified API response with connection test result
    """
    try:
        # Delegate to appropriate adapter class
        adapter_class = _get_adapter_class(payload.provider.type)
        
        result = adapter_class.test_connection(
            base_url=payload.provider.base_url,
            api_key=payload.provider.api_key,
            database=payload.database
        )
        
        return ApiResponse(
            code=200,
            message=result.get("message", "Connection test completed"),
            data=result
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Connection test failed: {str(e)}"
        )


@app.post("/vector-stores/list-databases")
def list_databases(payload: ListDatabasesRequest) -> ApiResponse[Dict[str, Any]]:
    """List available databases from provider.
    
    Note: Qdrant doesn't have database concept, returns empty list.
    
    Args:
        payload: Request containing provider config
        
    Returns:
        Unified API response with list of databases
    """
    try:
        # Delegate to appropriate adapter class
        adapter_class = _get_adapter_class(payload.provider.type)
        
        databases = adapter_class.list_databases(
            base_url=payload.provider.base_url,
            api_key=payload.provider.api_key
        )
        
        return ApiResponse(
            code=200,
            message=f"Found {len(databases)} database(s)",
            data={
                "success": True,
                "databases": databases,
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/vector-stores/list-collections")
def list_collections(payload: ListCollectionsRequest) -> ApiResponse[Dict[str, Any]]:
    """List available collections from provider.
    
    Args:
        payload: Request containing provider config and optional database name
        
    Returns:
        Unified API response with list of collections
    """
    try:
        # Delegate to appropriate adapter class
        adapter_class = _get_adapter_class(payload.provider.type)
        
        collections = adapter_class.list_collections(
            base_url=payload.provider.base_url,
            api_key=payload.provider.api_key,
            database=payload.database
        )
        
        return ApiResponse(
            code=200,
            message=f"Found {len(collections)} collection(s)",
            data={
                "success": True,
                "collections": collections,
            }
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/vector-stores/create-collection")
def create_collection(payload: CreateCollectionRequest) -> ApiResponse[Dict[str, Any]]:
    """Create a new collection in the vector store.
    
    Args:
        payload: Request containing:
            - provider: Vector store provider config
            - collection: Collection name to create
            - database: Optional database name
            - dimension: Vector dimension
            - metric_type: Similarity metric (COSINE, L2, IP)
        
    Returns:
        Unified API response with creation result
    """
    try:
        adapter_class = _get_adapter_class(payload.provider.type)
        
        result = adapter_class.create_collection(
            base_url=payload.provider.base_url,
            api_key=payload.provider.api_key,
            database=payload.database,
            collection=payload.collection,
            dimension=payload.dimension,
            metric_type=payload.metric_type
        )
        
        return ApiResponse(
            code=200,
            message=f"Collection '{payload.collection}' created successfully",
            data={
                "success": True,
                "collection": payload.collection,
                **result
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create collection: {str(e)}"
        )


@app.post("/vector-stores/drop-collection")
def drop_collection(payload: DropCollectionRequest) -> ApiResponse[Dict[str, Any]]:
    """Drop (delete) a collection from the vector store.
    
    Args:
        payload: Request containing:
            - provider: Vector store provider config
            - collection: Collection name to drop
            - database: Optional database name
        
    Returns:
        Unified API response with drop result
    """
    try:
        adapter_class = _get_adapter_class(payload.provider.type)
        
        adapter_class.drop_collection(
            base_url=payload.provider.base_url,
            api_key=payload.provider.api_key,
            database=payload.database,
            collection=payload.collection
        )
        
        return ApiResponse(
            code=200,
            message=f"Collection '{payload.collection}' dropped successfully",
            data={
                "success": True,
                "collection": payload.collection,
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to drop collection: {str(e)}"
        )


# ============================================================================
# Helper Functions
# ============================================================================

def _get_adapter_class(provider_type: str):
    """Get adapter class for provider type.
    
    Args:
        provider_type: Provider type (milvus, qdrant, etc.)
        
    Returns:
        Adapter class
        
    Raises:
        HTTPException: If provider type is not supported
    """
    adapter_map = {
        "milvus": MilvusAdapter,
        "qdrant": QdrantAdapter,
    }
    
    adapter_class = adapter_map.get(provider_type)
    if not adapter_class:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported provider type: {provider_type}"
        )
    
    return adapter_class
