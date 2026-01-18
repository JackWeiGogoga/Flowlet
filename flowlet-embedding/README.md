# Flowlet Embedding Service

Unified embedding web service for text, image, and multimodal inputs.

## Setup

```bash
python3.10 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run (dev)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Run (prod)

```bash
gunicorn -k uvicorn.workers.UvicornWorker -w 2 -b 0.0.0.0:8000 app.main:app
```

## Environment

- `TEXT_MODEL_PATH` (default: `./models/bge-large-zh-v1.5`)
- `VISUAL_BGE_WEIGHT_PATH` (default: `./models/visual_bge/Visualized_base_en_v1.5.pth`)
- `VISUAL_BGE_TEXT_MODEL` (default: `BAAI/bge-base-en-v1.5`)

## API

所有 POST 接口统一使用 `multipart/form-data` 格式。

| 接口 | 参数 | 说明 |
|------|------|------|
| `GET /health` | - | 健康检查 |
| `POST /embed/text` | `text`, `normalize` | 文本向量化 |
| `POST /embed/image` | `file`/`image_url`/`image_base64`, `text`, `normalize` | 图片向量化 |
| `POST /embed/multimodal` | `text`, `file`/`image_url`/`image_base64`, `normalize` | 多模态向量化 |
| `POST /similarity/text` | `text1`, `text2` | 文本相似度计算 |
| `POST /similarity/image` | `file1`/`image_url1`/`image_base641`, `file2`/`image_url2`/`image_base642` | 图片相似度计算 |

### Example: text (单个)

```bash
curl -X POST http://localhost:8000/embed/text \
  -F "text=样例数据"
```

### Example: text (多个)

```bash
curl -X POST http://localhost:8000/embed/text \
  -F "text=样例数据-1" \
  -F "text=样例数据-2" \
  -F "normalize=true"
```

### Example: image

```bash
curl -X POST http://localhost:8000/embed/image \
  -F "file=@./imgs/cir_query.png" \
  -F "normalize=true"
```

### Example: image url

```bash
curl -X POST http://localhost:8000/embed/image \
  -F "image_url=https://example.com/image.png" \
  -F "normalize=true"
```

### Example: image base64

```bash
curl -X POST http://localhost:8000/embed/image \
  -F "image_base64=$(base64 ./imgs/cir_query.png)" \
  -F "normalize=true"
```

### Example: multimodal

```bash
curl -X POST http://localhost:8000/embed/multimodal \
  -F "file=@./imgs/cir_query.png" \
  -F "text=Make the background dark, as if the camera has taken the photo at night" \
  -F "normalize=true"
```

### Example: text similarity

```bash
curl -X POST http://localhost:8000/similarity/text \
  -F "text1=人工智能是模拟人类智能的技术" \
  -F "text2=AI是让机器变得聪明的方法"
```

### Example: image similarity

```bash
curl -X POST http://localhost:8000/similarity/image \
  -F "file1=@./imgs/cir_query.png" \
  -F "file2=@./imgs/cir_candi_1.png"
```
