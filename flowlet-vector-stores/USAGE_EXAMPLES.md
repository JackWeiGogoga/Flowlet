# Vector Store Service - 使用示例

## 基本使用

### 1. Upsert (添加/更新文档)

```python
import requests

# Milvus 示例
response = requests.post(
    "http://localhost:8000/vector-stores/upsert",
    json={
        "provider": {
            "type": "milvus",
            "base_url": "http://localhost:19530",
            "database": "default"
        },
        "collection": "my_documents",
        "documents": [
            {
                "id": "doc1",
                "content": "这是第一篇文档",
                "metadata": {"category": "tech"}
            },
            {
                "id": "doc2",
                "content": "这是第二篇文档",
                "metadata": {"category": "science"}
            }
        ],
        "embedding": {
            "base_url": "http://localhost:8001",
            "normalize": True
        }
    }
)

print(response.json())
# 输出: {"success": true, "count": 2, "ids": ["doc1", "doc2"]}
```

### 2. Search (搜索文档)

```python
# Qdrant 示例
response = requests.post(
    "http://localhost:8000/vector-stores/search",
    json={
        "provider": {
            "type": "qdrant",
            "base_url": "http://localhost:6333",
            "api_key": "your-api-key"  # 可选
        },
        "collection": "my_documents",
        "query": "科技相关的文档",
        "k": 5,
        "filter": {
            "category": "tech"  # 可选的元数据过滤
        },
        "embedding": {
            "base_url": "http://localhost:8001"
        }
    }
)

print(response.json())
# 输出: {
#   "success": true,
#   "matches": [
#     {
#       "id": "doc1",
#       "content": "这是第一篇文档",
#       "score": 0.95,
#       "metadata": {"category": "tech"}
#     }
#   ]
# }
```

### 3. Delete (删除文档)

```python
# 删除示例 - 现在类型安全了!
response = requests.post(
    "http://localhost:8000/vector-stores/delete",
    json={
        "provider": {
            "type": "milvus",
            "base_url": "http://localhost:19530"
        },
        "collection": "my_documents",
        "ids": ["doc1", "doc2"],  # ✅ List[str] 现在完全兼容
        "embedding": {
            "base_url": "http://localhost:8001"
        }
    }
)

print(response.json())
# 输出: {"success": true, "count": 2}
```

## 不同提供商配置

### Milvus

```json
{
  "provider": {
    "type": "milvus",
    "base_url": "http://localhost:19530",
    "database": "default",  // 可选
    "api_key": "token"      // 可选,用于认证
  }
}
```

### Qdrant

```json
{
  "provider": {
    "type": "qdrant",
    "base_url": "http://localhost:6333",
    "api_key": "your-api-key",        // 可选
    "grpc_url": "http://localhost:6334",  // 可选
    "prefer_grpc": false                   // 可选
  }
}
```

## 健康检查

```python
response = requests.get("http://localhost:8000/health")
print(response.json())
# 输出: {
#   "status": "ok",
#   "embedding_url_configured": true
# }
```

## 环境变量配置

```bash
# .env 文件
EMBEDDING_SERVICE_URL=http://localhost:8001
EMBEDDING_TIMEOUT=20
```

## Python SDK 示例

```python
from typing import List, Dict, Any
import httpx


class VectorStoreClient:
    """Vector Store Service 客户端"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.client = httpx.Client()
    
    def upsert(
        self,
        provider_type: str,
        provider_url: str,
        collection: str,
        documents: List[Dict[str, Any]],
        embedding_url: str,
        **provider_kwargs
    ):
        """添加或更新文档"""
        response = self.client.post(
            f"{self.base_url}/vector-stores/upsert",
            json={
                "provider": {
                    "type": provider_type,
                    "base_url": provider_url,
                    **provider_kwargs
                },
                "collection": collection,
                "documents": documents,
                "embedding": {"base_url": embedding_url}
            }
        )
        response.raise_for_status()
        return response.json()
    
    def search(
        self,
        provider_type: str,
        provider_url: str,
        collection: str,
        query: str,
        k: int = 4,
        embedding_url: str,
        filter_dict: Dict[str, Any] = None,
        **provider_kwargs
    ):
        """搜索文档"""
        response = self.client.post(
            f"{self.base_url}/vector-stores/search",
            json={
                "provider": {
                    "type": provider_type,
                    "base_url": provider_url,
                    **provider_kwargs
                },
                "collection": collection,
                "query": query,
                "k": k,
                "filter": filter_dict,
                "embedding": {"base_url": embedding_url}
            }
        )
        response.raise_for_status()
        return response.json()
    
    def delete(
        self,
        provider_type: str,
        provider_url: str,
        collection: str,
        ids: List[str],
        embedding_url: str,
        **provider_kwargs
    ):
        """删除文档"""
        response = self.client.post(
            f"{self.base_url}/vector-stores/delete",
            json={
                "provider": {
                    "type": provider_type,
                    "base_url": provider_url,
                    **provider_kwargs
                },
                "collection": collection,
                "ids": ids,
                "embedding": {"base_url": embedding_url}
            }
        )
        response.raise_for_status()
        return response.json()


# 使用示例
client = VectorStoreClient()

# 添加文档
result = client.upsert(
    provider_type="milvus",
    provider_url="http://localhost:19530",
    collection="my_docs",
    documents=[
        {"id": "1", "content": "文档内容", "metadata": {"tag": "test"}}
    ],
    embedding_url="http://localhost:8001"
)

# 搜索文档
results = client.search(
    provider_type="milvus",
    provider_url="http://localhost:19530",
    collection="my_docs",
    query="搜索关键词",
    k=5,
    embedding_url="http://localhost:8001"
)

# 删除文档
deleted = client.delete(
    provider_type="milvus",
    provider_url="http://localhost:19530",
    collection="my_docs",
    ids=["1"],
    embedding_url="http://localhost:8001"
)
```

## 错误处理

```python
try:
    response = requests.post(
        "http://localhost:8000/vector-stores/search",
        json={...}
    )
    response.raise_for_status()
    data = response.json()
except requests.HTTPError as e:
    if e.response.status_code == 400:
        print("请求参数错误:", e.response.json())
    elif e.response.status_code == 502:
        print("Embedding 服务错误:", e.response.json())
    else:
        print("其他错误:", e)
```

## 常见问题

### Q: 如何切换不同的 vector store 提供商?

A: 只需修改 `provider.type` 字段即可,其他代码无需更改:

```python
# 从 Milvus 切换到 Qdrant
provider = {
    "type": "qdrant",  # 只改这一行
    "base_url": "http://localhost:6333"
}
```

### Q: 如何处理类型错误?

A: 新架构已经完全解决了类型兼容性问题,所有适配器会自动处理类型转换。

### Q: 如何添加自定义提供商?

A: 请参考 `ARCHITECTURE.md` 中的"如何添加新的提供商"章节。
