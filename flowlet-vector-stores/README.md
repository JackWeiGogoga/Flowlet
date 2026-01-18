# Flowlet Vector Store Service

Unified vector store service built with **FastAPI** and **native SDKs** (pymilvus, qdrant-client).

> 🎯 **Focus**: Pure vector storage and retrieval. This service does **NOT** handle text vectorization - vectors must be pre-computed.

## Features

✅ **Multi-Provider Support**: Milvus and Qdrant  
✅ **Native SDKs**: Direct integration without LangChain overhead  
✅ **Type Safe**: Full type hints and validation  
✅ **Clean Architecture**: Adapter + Factory patterns  
✅ **Production Ready**: Minimal dependencies, high performance  

## Quick Start

### Using UV (Recommended)

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn app.main:app --host 0.0.0.0 --port 18091 --reload
```

### Using pip

```bash
# Create virtual environment
python3.10 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e .

# Run development server
uvicorn app.main:app --host 0.0.0.0 --port 18091 --reload
```

## Production Deployment

```bash
# Using uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 18091 --workers 4

# Using gunicorn
gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:18091 app.main:app
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/vector-stores/upsert` | POST | Add/update documents |
| `/vector-stores/delete` | POST | Delete documents by IDs |
| `/vector-stores/search` | POST | Vector similarity search |
| `/vector-stores/management/test-connection` | POST | Test connection to vector store |
| `/vector-stores/management/list-databases` | POST | List all databases (Milvus) |
| `/vector-stores/management/list-collections` | POST | List all collections |

## Usage Examples

### 1. Upsert Documents (Milvus)

**Important**: You must provide pre-computed vectors. Get vectors from your embedding service first.

```bash
# Step 1: Get vectors from embedding service (example)
curl -X POST http://embedding-service:18091/embed/text \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Hello vector store"], "normalize": true}'
# Returns: {"vectors": [[0.1, 0.2, 0.3, ...]]}

# Step 2: Upsert with vectors (using default database)
curl -X POST http://localhost:18091/vector-stores/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "milvus",
      "base_url": "http://148.135.6.189:19530"
    },
    "collection": "my_docs",
    "documents": [
      {
        "id": "doc-1",
        "content": "Hello vector store",
        "vector": [0.1, 0.2, 0.3, 0.4, ...],
        "metadata": {"source": "demo", "category": "tech"}
      }
    ]
  }'

# Step 3: Upsert with vectors (using custom database)
curl -X POST http://localhost:18091/vector-stores/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "milvus",
      "base_url": "http://148.135.6.189:19530",
      "database": "production"
    },
    "collection": "my_docs",
    "documents": [
      {
        "id": "doc-1",
        "content": "Hello vector store",
        "vector": [0.1, 0.2, 0.3, 0.4, ...],
        "metadata": {"source": "demo", "category": "tech"}
      }
    ]
  }'
```

**Response:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "success": true,
    "count": 1,
    "ids": ["doc-1"]
  }
}
```

> 💡 **Database Auto-Creation**: If the specified database doesn't exist, it will be automatically created on first use (Lazy Initialization).

### 2. Upsert Documents (Qdrant)

```bash
curl -X POST http://localhost:18091/vector-stores/upsert \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "qdrant",
      "base_url": "http://localhost:6333",
      "api_key": "your-api-key"
    },
    "collection": "my_docs",
    "documents": [
      {
        "content": "Machine learning basics",
        "vector": [0.5, 0.6, 0.7, ...],
        "metadata": {"category": "ml", "difficulty": "beginner"}
      }
    ]
  }'
```

### 3. Delete Documents

```bash
curl -X POST http://localhost:18091/vector-stores/delete \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "qdrant",
      "base_url": "http://localhost:6333"
    },
    "collection": "my_docs",
    "ids": ["doc-1", "doc-2"]
  }'
```

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

### 4. Vector Search

```bash
# Step 1: Get query vector from embedding service
curl -X POST http://embedding-service:18091/embed/text \
  -H "Content-Type: application/json" \
  -d '{"texts": ["machine learning"], "normalize": true}'
# Returns: {"vectors": [[0.5, 0.6, 0.7, ...]]}

# Step 2: Search with query vector
curl -X POST http://localhost:18091/vector-stores/search \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "qdrant",
      "base_url": "http://localhost:6333"
    },
    "collection": "my_docs",
    "query_vector": [0.5, 0.6, 0.7, ...],
    "k": 5,
    "filter": {"category": "ml"}
  }'
```

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "id": "doc-123",
      "content": "Machine learning basics",
      "score": 0.95,
      "metadata": {"category": "ml", "difficulty": "beginner"}
    }
  ]
}
```

## Management APIs

### Test Connection

Test connectivity to a vector store before saving configuration.

```bash
curl -X POST http://localhost:18091/vector-stores/management/test-connection \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "milvus",
      "base_url": "http://148.135.6.189:19530",
      "database": "production"
    }
  }'
```

**Response:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "success": true,
    "message": "Connected successfully. Found 3 database(s).",
    "databases": ["default", "production", "test"]
  }
}
```

### List Databases (Milvus)

Retrieve all available databases from a Milvus instance.

```bash
curl -X POST http://localhost:18091/vector-stores/management/list-databases \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "milvus",
      "base_url": "http://148.135.6.189:19530"
    }
  }'
```

**Response:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "success": true,
    "databases": ["default", "production", "test"]
  }
}
```

### List Collections

List all collections in a specific database.

```bash
# Milvus: List collections in a specific database
curl -X POST http://localhost:18091/vector-stores/management/list-collections \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "milvus",
      "base_url": "http://148.135.6.189:19530",
      "database": "production"
    }
  }'

# Qdrant: List all collections
curl -X POST http://localhost:18091/vector-stores/management/list-collections \
  -H "Content-Type: application/json" \
  -d '{
    "provider": {
      "type": "qdrant",
      "base_url": "http://localhost:6333"
    }
  }'
```

**Response:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "success": true,
    "collections": ["my_docs", "knowledge_base", "embeddings"]
  }
}
```

## Provider Configuration

### Milvus

```json
{
  "provider": {
    "type": "milvus",
    "base_url": "http://localhost:19530",
    "api_key": "optional-token",
    "database": "optional-db-name"
  }
}
```

**Database Behavior:**
- If `database` is omitted, uses Milvus default database (`"default"`)
- If specified database doesn't exist, it will be **automatically created** on first document insertion
- Database creation follows **Lazy Initialization** pattern (created when needed, not when configured)

**Example Use Cases:**
- **Development**: `"database": "dev"` - Separate dev environment
- **Production**: `"database": "production"` - Isolated production data
- **Multi-Tenant**: `"database": "tenant_123"` - Per-tenant isolation

### Qdrant

```json
{
  "provider": {
    "type": "qdrant",
    "base_url": "http://localhost:6333",
    "api_key": "optional-api-key",
    "grpc_url": "6334",
    "prefer_grpc": false
  }
}
```

**Note:** Qdrant uses collections as the top-level namespace (no database concept).

## Architecture

```
flowlet-vector-stores/
├── app/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic models
│   ├── factory.py           # VectorStoreFactory
│   └── providers/
│       ├── base.py          # VectorStoreAdapter (ABC)
│       ├── milvus.py        # MilvusAdapter (pymilvus)
│       └── qdrant.py        # QdrantAdapter (qdrant-client)
└── pyproject.toml           # Dependencies
```

**Design Patterns:**
- **Adapter Pattern**: Unified interface for different vector stores
- **Factory Pattern**: Dynamic provider instantiation

## Dependencies

- `fastapi>=0.110.0` - Web framework
- `pydantic>=2.6.0` - Data validation
- `pymilvus>=2.4.0` - Milvus native client
- `qdrant-client>=1.9.0` - Qdrant native client
- `uvicorn>=0.23.0` - ASGI server

**No LangChain** - Direct SDK integration for better performance and type safety.

## Key Differences from LangChain Version

| Aspect | This Service | LangChain-based |
|--------|--------------|-----------------|
| **Vector Handling** | Pre-computed (input) | Can compute internally |
| **Dependencies** | 5 packages (~10 installed) | 11+ packages (~51 installed) |
| **Type Safety** | Full type hints, no ignores | Requires type: ignore |
| **Performance** | Direct SDK calls | Extra wrapper layer |
| **Complexity** | Simpler, easier to debug | More abstraction |

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Design patterns and architecture
- **[NATIVE_SDK_MIGRATION.md](./NATIVE_SDK_MIGRATION.md)** - Migration from LangChain
- **[USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)** - Detailed examples
- **[FINAL_SUMMARY.md](./FINAL_SUMMARY.md)** - Complete refactoring journey

## Notes

⚠️ **Important**: This service does **NOT** perform text vectorization. You must:
1. Call an embedding service to convert text → vectors
2. Pass the pre-computed vectors to this service
3. This ensures clean separation of concerns

✅ **Metadata Filtering**: Both Milvus and Qdrant support metadata filtering with different expression syntaxes (handled by adapters).

✅ **Production Ready**: Minimal dependencies, type-safe, well-tested patterns.
