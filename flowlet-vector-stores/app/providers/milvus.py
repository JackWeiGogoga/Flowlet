"""Milvus vector store adapter using native pymilvus SDK."""

from typing import Any, Dict, List, Optional
import uuid
from urllib.parse import urlparse
from pymilvus import MilvusClient, DataType, CollectionSchema, FieldSchema

from ..models import DocumentPayload, MatchResult, ProviderConfig
from .base import VectorStoreAdapter


class MilvusAdapter(VectorStoreAdapter):
    """Adapter for Milvus vector store using native pymilvus client.
    
    Handles Milvus-specific connection parameters and method signatures.
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
        self._vector_dim: Optional[int] = None  # Cache vector dimension
        self._database_ensured = False  # Track if database has been ensured

    @staticmethod
    def _is_lite_uri(uri: str) -> bool:
        """Return True if uri points to Milvus Lite (local file) storage."""
        parsed = urlparse(uri)
        return parsed.scheme in ("", "file")

    @staticmethod
    def _lite_path_from_uri(uri: str) -> str:
        """Normalize lite uri into a filesystem path for MilvusClient."""
        parsed = urlparse(uri)
        if parsed.scheme == "file":
            return parsed.path
        return uri
    
    def _create_client(self) -> MilvusClient:
        """Create Milvus client instance.
        
        Note: Always connects to default database first to avoid
        'database not found' error during initialization.
        Database switching is handled in _ensure_database().
        """
        # Build connection parameters dynamically to avoid None values
        is_lite = self._is_lite_uri(self.provider.base_url)
        conn_params: Dict[str, Any] = {
            "uri": self._lite_path_from_uri(self.provider.base_url)
            if is_lite
            else self.provider.base_url,
        }
        
        # Only add token if provided
        if self.provider.api_key and not is_lite:
            conn_params["token"] = self.provider.api_key
        
        # DO NOT add db_name here - we'll switch database after ensuring it exists
        # This prevents "database not found" error during client initialization
        
        # Initialize Milvus client with connection parameters
        client = MilvusClient(**conn_params)
        return client
    
    def _ensure_database(self) -> None:
        """Ensure database exists, create if not, and switch to it."""
        if self._is_lite_uri(self.provider.base_url):
            self._database_ensured = True
            return  # Milvus Lite only supports the default database

        if not self.provider.database:
            return  # Using default database
        
        if self._database_ensured:
            return  # Already ensured
        
        # Check if database exists
        databases = self.client.list_databases()
        if self.provider.database not in databases:
            # Create database
            self.client.create_database(db_name=self.provider.database)
        
        # Switch to the target database using using_database
        self.client.using_database(db_name=self.provider.database)
        self._database_ensured = True
    
    def _ensure_collection(self, vector_dim: int) -> None:
        """Ensure database and collection exist, create if not.
        
        Creates collection with:
        - id: Primary key (string)
        - vector: Vector field for embeddings
        - content: Text content field (varchar)
        - Dynamic fields enabled for metadata
        
        Args:
            vector_dim: Dimension of the vector field
        """
        # Ensure database exists first and switch to it
        self._ensure_database()
        
        # Check if collection exists
        if self.client.has_collection(collection_name=self.collection):
            return
        
        # Define schema with explicit fields
        schema = self.client.create_schema(
            auto_id=False,
            enable_dynamic_field=True  # Allow dynamic metadata fields
        )
        
        # Add primary key field
        schema.add_field(
            field_name="id",
            datatype=DataType.VARCHAR,
            is_primary=True,
            max_length=512
        )
        
        # Add vector field
        schema.add_field(
            field_name="vector",
            datatype=DataType.FLOAT_VECTOR,
            dim=vector_dim
        )
        
        # Add content field for storing original text
        schema.add_field(
            field_name="content",
            datatype=DataType.VARCHAR,
            max_length=65535  # Max varchar length
        )
        
        # Create index parameters for vector field
        index_params = self.client.prepare_index_params()
        index_params.add_index(
            field_name="vector",
            metric_type="COSINE",
            index_type="AUTOINDEX"
        )
        
        # Create collection with schema
        self.client.create_collection(
            collection_name=self.collection,
            schema=schema,
            index_params=index_params
        )
    
    def add_documents(self, documents: List[DocumentPayload]) -> List[str]:
        """Add documents to Milvus with pre-computed vectors.
        
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
        
        # Prepare data for insertion
        data = []
        inserted_ids = []
        
        for doc in documents:
            # Generate ID if not provided
            doc_id = doc.id if doc.id else str(uuid.uuid4())
            inserted_ids.append(doc_id)
            
            # Prepare document data - expand metadata as dynamic fields
            entity = {
                "id": doc_id,
                "vector": doc.vector,
                "content": doc.content,
            }
            
            # Add metadata fields dynamically (stored in Milvus $meta)
            if doc.metadata:
                for key, value in doc.metadata.items():
                    entity[key] = value
            
            data.append(entity)
        
        # Insert documents
        self.client.insert(
            collection_name=self.collection,
            data=data
        )
        
        return inserted_ids
    
    def delete_documents(self, ids: List[str]) -> None:
        """Delete documents from Milvus by IDs.
        
        Args:
            ids: List of document IDs to delete
        """
        # Ensure we're using the correct database
        self._ensure_database()
        
        # Delete by primary key (id field)
        self.client.delete(
            collection_name=self.collection,
            ids=ids
        )
    
    def search(
        self, 
        query_vector: List[float], 
        k: int, 
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[MatchResult]:
        """Search for similar documents in Milvus using pre-computed query vector.
        
        Args:
            query_vector: Pre-computed query embedding vector
            k: Number of results to return
            filter_dict: Optional metadata filter (as Milvus expression string or dict)
            
        Returns:
            List of search results with scores
        """
        # Ensure we're using the correct database
        self._ensure_database()
        
        # Build filter expression if provided
        filter_expr = None
        if filter_dict:
            # Convert dict to Milvus filter expression
            # Example: {"category": "tech"} -> 'category == "tech"'
            conditions = []
            for key, value in filter_dict.items():
                if isinstance(value, str):
                    conditions.append(f'{key} == "{value}"')
                else:
                    conditions.append(f'{key} == {value}')
            filter_expr = " and ".join(conditions) if conditions else None
        
        # Build search parameters dynamically to avoid None values
        search_params: Dict[str, Any] = {
            "collection_name": self.collection,
            "data": [query_vector],
            "limit": k,
            "output_fields": ["id", "content", "*"]
        }
        
        # Only add filter if provided
        if filter_expr:
            search_params["filter"] = filter_expr
        
        # Perform vector search
        search_results = self.client.search(**search_params)
        
        # Convert results to MatchResult objects
        matches: List[MatchResult] = []
        for hit in search_results[0]:  # First query result
            # Extract metadata (exclude system fields)
            metadata = dict(hit.get("entity", {}))
            doc_id = metadata.pop("id", None)
            content = metadata.pop("content", "")
            metadata.pop("vector", None)  # Remove vector from metadata
            
            matches.append(
                MatchResult(
                    id=doc_id,
                    content=content,
                    score=float(hit.get("distance", 0.0)),
                    metadata=metadata
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
        """Test connection to Milvus server.
        
        Args:
            base_url: Milvus server URL
            api_key: Optional authentication token
            database: Optional database name
            
        Returns:
            Dict with connection test result
        """
        try:
            # Build connection parameters with explicit types
            is_lite = cls._is_lite_uri(base_url)
            conn_params: Dict[str, str] = {
                "uri": cls._lite_path_from_uri(base_url)
                if is_lite
                else base_url
            }
            if api_key and not is_lite:
                conn_params["token"] = api_key
            if database and not is_lite:
                conn_params["db_name"] = database
            
            print("test_connection")
            client = MilvusClient(**conn_params)  # type: ignore[arg-type]
            databases = ["default"] if is_lite else client.list_databases()
            
            return {
                "success": True,
                "message": f"Connected successfully. Found {len(databases)} database(s).",
                "databases": databases,
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
        """List all databases in Milvus.
        
        Args:
            base_url: Milvus server URL
            api_key: Optional authentication token
            
        Returns:
            List of database names
        """
        is_lite = cls._is_lite_uri(base_url)
        if is_lite:
            return ["default"]

        conn_params: Dict[str, str] = {"uri": base_url}
        if api_key and not is_lite:
            conn_params["token"] = api_key
        
        client = MilvusClient(**conn_params)  # type: ignore[arg-type]
        databases: List[str] = client.list_databases()  # type: ignore[assignment]
        return databases
    
    @classmethod
    def list_collections(
        cls, 
        base_url: str, 
        api_key: Optional[str] = None,
        database: Optional[str] = None
    ) -> List[str]:
        """List all collections in Milvus database.
        
        Args:
            base_url: Milvus server URL
            api_key: Optional authentication token
            database: Optional database name
            
        Returns:
            List of collection names
        """
        is_lite = cls._is_lite_uri(base_url)
        conn_params: Dict[str, str] = {
            "uri": cls._lite_path_from_uri(base_url)
            if is_lite
            else base_url
        }
        if api_key and not is_lite:
            conn_params["token"] = api_key
        if database and not is_lite:
            conn_params["db_name"] = database
        
        client = MilvusClient(**conn_params)  # type: ignore[arg-type]
        collections: List[str] = client.list_collections()  # type: ignore[assignment]
        return collections
    
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
        """Create a new collection in Milvus with standard schema.
        
        Creates collection with:
        - id: Primary key (VARCHAR, max 512)
        - vector: Vector field for embeddings (FLOAT_VECTOR)
        - content: Text content field (VARCHAR, max 65535)
        - Dynamic fields enabled for metadata
        
        Args:
            base_url: Milvus server URL
            api_key: Optional authentication token
            database: Optional database name
            collection: Collection name to create
            dimension: Vector dimension (default: 768 for common embedding models)
            metric_type: Similarity metric (COSINE, L2, IP)
            
        Returns:
            Dict with creation result
        """
        is_lite = cls._is_lite_uri(base_url)
        conn_params: Dict[str, str] = {
            "uri": cls._lite_path_from_uri(base_url)
            if is_lite
            else base_url
        }
        if api_key and not is_lite:
            conn_params["token"] = api_key
        
        client = MilvusClient(**conn_params)  # type: ignore[arg-type]
        
        # If database specified, ensure it exists and switch to it
        if database and not is_lite:
            databases = client.list_databases()
            if database not in databases:
                client.create_database(db_name=database)
            client.using_database(db_name=database)
        
        # Check if collection already exists
        if client.has_collection(collection_name=collection):
            return {
                "created": False,
                "message": f"Collection '{collection}' already exists",
            }
        
        # Define schema with explicit fields
        schema = client.create_schema(
            auto_id=False,
            enable_dynamic_field=True  # Allow dynamic metadata fields
        )
        
        # Add primary key field
        schema.add_field(
            field_name="id",
            datatype=DataType.VARCHAR,
            is_primary=True,
            max_length=512
        )
        
        # Add vector field
        schema.add_field(
            field_name="vector",
            datatype=DataType.FLOAT_VECTOR,
            dim=dimension
        )
        
        # Add content field for storing original text
        schema.add_field(
            field_name="content",
            datatype=DataType.VARCHAR,
            max_length=65535  # Max varchar length
        )
        
        # Create index parameters for vector field
        index_params = client.prepare_index_params()
        index_params.add_index(
            field_name="vector",
            metric_type=metric_type,
            index_type="AUTOINDEX"
        )
        
        # Create collection with schema
        client.create_collection(
            collection_name=collection,
            schema=schema,
            index_params=index_params
        )
        
        return {
            "created": True,
            "dimension": dimension,
            "metric_type": metric_type,
            "fields": ["id", "vector", "content", "$meta (dynamic)"],
        }
    
    @classmethod
    def drop_collection(
        cls,
        base_url: str,
        api_key: Optional[str] = None,
        database: Optional[str] = None,
        collection: str = ""
    ) -> None:
        """Drop (delete) a collection from Milvus.
        
        Args:
            base_url: Milvus server URL
            api_key: Optional authentication token
            database: Optional database name
            collection: Collection name to drop
        """
        is_lite = cls._is_lite_uri(base_url)
        conn_params: Dict[str, str] = {
            "uri": cls._lite_path_from_uri(base_url)
            if is_lite
            else base_url
        }
        if api_key and not is_lite:
            conn_params["token"] = api_key
        if database and not is_lite:
            conn_params["db_name"] = database
        
        client = MilvusClient(**conn_params)  # type: ignore[arg-type]
        
        if client.has_collection(collection_name=collection):
            client.drop_collection(collection_name=collection)
