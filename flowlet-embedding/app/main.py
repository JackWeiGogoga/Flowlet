import asyncio
import base64
import os
import tempfile
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import httpx
import numpy as np
import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from FlagEmbedding import FlagModel
from visual_bge.modeling import Visualized_BGE


TEXT_MODEL_PATH = os.getenv("TEXT_MODEL_PATH", "./data/bge-base-zh-v1.5")
VISUAL_BGE_WEIGHT_PATH = os.getenv(
    "VISUAL_BGE_WEIGHT_PATH", "./data/bge-visualized/Visualized_base_en_v1.5.pth"
)
VISUAL_BGE_TEXT_MODEL = os.getenv(
    "VISUAL_BGE_TEXT_MODEL", "BAAI/bge-base-en-v1.5"
)




class EmbeddingResponse(BaseModel):
    model: str
    dim: int
    vectors: list[list[float]]


class HealthResponse(BaseModel):
    status: str
    text_model_loaded: bool
    visual_model_loaded: bool




class SimilarityResponse(BaseModel):
    similarity: float
    method: str = "cosine"


class ModelStore:
    def __init__(self) -> None:
        self.text_model: Optional[FlagModel] = None
        self.visual_model: Optional[Visualized_BGE] = None
        self._visual_lock = asyncio.Lock()

    def load_text_model(self) -> None:
        if not os.path.exists(TEXT_MODEL_PATH):
            raise FileNotFoundError(
                f"Text model not found: {os.path.abspath(TEXT_MODEL_PATH)}"
            )
        self.text_model = FlagModel(
            TEXT_MODEL_PATH,
            query_instruction_for_retrieval="为这个句子生成表示以用于检索相关文章：",
            use_fp16=True
        )

    def load_visual_model(self) -> None:
        if not os.path.exists(VISUAL_BGE_WEIGHT_PATH):
            raise FileNotFoundError(
                f"Visual BGE weight not found: {os.path.abspath(VISUAL_BGE_WEIGHT_PATH)}"
            )
        self.visual_model = Visualized_BGE(
            model_name_bge=VISUAL_BGE_TEXT_MODEL,
            model_weight=VISUAL_BGE_WEIGHT_PATH,
        )
        self.visual_model.eval()


models = ModelStore()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        models.load_text_model()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] text model load failed: {exc}")
    try:
        models.load_visual_model()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] visual model load failed: {exc}")
    yield


app = FastAPI(title="Flowlet Embedding Service",
              version="0.1.0", lifespan=lifespan)


async def _fetch_image_bytes(
    file: Optional[UploadFile],
    image_url: Optional[str],
    image_base64: Optional[str],
) -> tuple[bytes, str]:
    sources = [file is not None, bool(image_url), bool(image_base64)]
    if sum(sources) != 1:
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one of file, image_url, image_base64",
        )

    if file is not None:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file upload")
        suffix = os.path.splitext(file.filename or "")[1] or ".bin"
        return content, suffix

    if image_url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(image_url)
                resp.raise_for_status()
            content = resp.content
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=400, detail=f"Failed to download image_url: {exc}"
            ) from exc
        if not content:
            raise HTTPException(
                status_code=400, detail="Empty image_url response")
        suffix = os.path.splitext(image_url.split("?")[0])[1] or ".bin"
        return content, suffix

    if image_base64 is None:
        raise HTTPException(status_code=400, detail="image_base64 is required")
    try:
        content = base64.b64decode(image_base64, validate=True)
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=400, detail="Invalid image_base64") from exc
    if not content:
        raise HTTPException(status_code=400, detail="Empty image_base64")
    return content, ".bin"


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        text_model_loaded=models.text_model is not None,
        visual_model_loaded=models.visual_model is not None,
    )


@app.post("/embed/text", response_model=EmbeddingResponse)
def embed_text(
    text: list[str] = Form(..., min_length=1),
    normalize: bool = Form(True),
) -> EmbeddingResponse:
    """
    对文本进行向量化编码
    
    - text: 待编码的文本列表（Form 表单，多个值）
    - normalize: 是否对向量进行归一化，默认 True
    """
    if models.text_model is None:
        raise HTTPException(status_code=503, detail="Text model not loaded")
    
    if not text:
        raise HTTPException(status_code=400, detail="text cannot be empty")
    
    # FlagModel.encode() returns normalized embeddings by default
    embeddings = models.text_model.encode(text)
    vectors = np.asarray(embeddings, dtype=np.float32)
    
    # Apply normalization if requested and not already normalized
    if normalize:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1
        vectors = vectors / norms
    
    vectors = vectors.tolist()
    dim = len(vectors[0]) if vectors else 0
    return EmbeddingResponse(model=TEXT_MODEL_PATH, dim=dim, vectors=vectors)


@app.post("/embed/image", response_model=EmbeddingResponse)
async def embed_image(
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    image_base64: Optional[str] = Form(None),
    text: Optional[str] = Form(None),
    normalize: bool = Form(True),
) -> EmbeddingResponse:
    if models.visual_model is None:
        raise HTTPException(status_code=503, detail="Visual model not loaded")

    content, suffix = await _fetch_image_bytes(file, image_url, image_base64)

    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        tmp.write(content)
        tmp.flush()
        async with models._visual_lock:
            with torch.no_grad():
                embedding = models.visual_model.encode(
                    image=tmp.name, text=text
                )

    vectors = np.asarray(embedding, dtype=np.float32)
    if vectors.ndim == 1:
        vectors = vectors[None, :]
    if normalize:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1
        vectors = vectors / norms
    return EmbeddingResponse(
        model=VISUAL_BGE_WEIGHT_PATH, dim=int(vectors.shape[1]), vectors=vectors.tolist()
    )


@app.post("/similarity/text", response_model=SimilarityResponse)
def compare_text_similarity(
    text1: str = Form(..., min_length=1),
    text2: str = Form(..., min_length=1),
) -> SimilarityResponse:
    """
    计算两个文本之间的余弦相似度
    
    - text1: 第一个文本
    - text2: 第二个文本
    """
    if models.text_model is None:
        raise HTTPException(status_code=503, detail="Text model not loaded")
    
    # 对两个文本进行编码
    embeddings = models.text_model.encode([text1, text2])
    vectors = np.asarray(embeddings, dtype=np.float32)
    
    # 归一化向量
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    vectors = vectors / norms
    
    # 计算余弦相似度
    similarity = float(np.dot(vectors[0], vectors[1]))
    
    return SimilarityResponse(similarity=similarity, method="cosine")


@app.post("/similarity/image", response_model=SimilarityResponse)
async def compare_image_similarity(
    file1: Optional[UploadFile] = File(None),
    image_url1: Optional[str] = Form(None),
    image_base641: Optional[str] = Form(None),
    file2: Optional[UploadFile] = File(None),
    image_url2: Optional[str] = Form(None),
    image_base642: Optional[str] = Form(None),
) -> SimilarityResponse:
    """计算两个图片之间的余弦相似度"""
    if models.visual_model is None:
        raise HTTPException(status_code=503, detail="Visual model not loaded")
    
    # 获取第一张图片
    content1, suffix1 = await _fetch_image_bytes(file1, image_url1, image_base641)
    # 获取第二张图片
    content2, suffix2 = await _fetch_image_bytes(file2, image_url2, image_base642)
    
    embeddings = []
    
    # 处理第一张图片
    with tempfile.NamedTemporaryFile(suffix=suffix1) as tmp1:
        tmp1.write(content1)
        tmp1.flush()
        async with models._visual_lock:
            with torch.no_grad():
                embedding1 = models.visual_model.encode(image=tmp1.name, text=None)
        embeddings.append(embedding1)
    
    # 处理第二张图片
    with tempfile.NamedTemporaryFile(suffix=suffix2) as tmp2:
        tmp2.write(content2)
        tmp2.flush()
        async with models._visual_lock:
            with torch.no_grad():
                embedding2 = models.visual_model.encode(image=tmp2.name, text=None)
        embeddings.append(embedding2)
    
    # 转换为 numpy 数组
    vectors = np.array([np.asarray(emb, dtype=np.float32).flatten() for emb in embeddings])
    
    # 归一化向量
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    vectors = vectors / norms
    
    # 计算余弦相似度
    similarity = float(np.dot(vectors[0], vectors[1]))
    
    return SimilarityResponse(similarity=similarity, method="cosine")


@app.post("/embed/multimodal", response_model=EmbeddingResponse)
async def embed_multimodal(
    text: str = Form(...),
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    image_base64: Optional[str] = Form(None),
    normalize: bool = Form(True),
) -> EmbeddingResponse:
    if models.visual_model is None:
        raise HTTPException(status_code=503, detail="Visual model not loaded")

    content, suffix = await _fetch_image_bytes(file, image_url, image_base64)

    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        tmp.write(content)
        tmp.flush()
        async with models._visual_lock:
            with torch.no_grad():
                embedding = models.visual_model.encode(
                    image=tmp.name, text=text
                )

    vectors = np.asarray(embedding, dtype=np.float32)
    if vectors.ndim == 1:
        vectors = vectors[None, :]
    if normalize:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1
        vectors = vectors / norms
    return EmbeddingResponse(
        model=VISUAL_BGE_WEIGHT_PATH, dim=int(vectors.shape[1]), vectors=vectors.tolist()
    )
