from typing import Any, Dict, List, Literal, Optional, TypeVar, Generic
from pydantic import BaseModel, Field, ConfigDict

# Generic type for API response data
T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    """Unified API response format matching Java backend style."""
    code: int = Field(200, description="Response code")
    message: str = Field("Success", description="Response message")
    data: T = Field(..., description="Response data")


class ProviderConfig(BaseModel):
    """Provider configuration with support for both snake_case and camelCase."""
    model_config = ConfigDict(populate_by_name=True)
    
    type: Literal["milvus", "qdrant"]
    base_url: str = Field(..., alias="baseUrl")
    api_key: Optional[str] = Field(None, alias="apiKey")
    grpc_url: Optional[str] = Field(None, alias="grpcUrl")
    prefer_grpc: bool = Field(False, alias="preferGrpc")
    database: Optional[str] = None


class DocumentPayload(BaseModel):
    id: Optional[str] = None
    content: str = Field(..., description="Document text content")
    vector: List[float] = Field(..., min_length=1, description="Document embedding vector")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UpsertRequest(BaseModel):
    provider: ProviderConfig
    collection: str = Field(..., min_length=1)
    documents: List[DocumentPayload] = Field(..., min_length=1)


class DeleteRequest(BaseModel):
    provider: ProviderConfig
    collection: str = Field(..., min_length=1)
    ids: List[str] = Field(..., min_length=1)


class SearchRequest(BaseModel):
    provider: ProviderConfig
    collection: str = Field(..., min_length=1)
    query_vector: List[float] = Field(..., min_length=1, description="Query embedding vector")
    k: int = Field(4, ge=1, le=100)
    filter: Optional[Dict[str, Any]] = None


class MatchResult(BaseModel):
    id: Optional[str]
    content: str
    score: float
    metadata: Dict[str, Any]


class UpsertResponse(BaseModel):
    success: bool
    count: int
    ids: List[str]


class DeleteResponse(BaseModel):
    success: bool
    count: int


class SearchResponse(BaseModel):
    success: bool
    matches: List[MatchResult]


class HealthResponse(BaseModel):
    status: str
    service: str = "vector-store"
