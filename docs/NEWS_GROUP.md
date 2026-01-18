# 新闻与短资讯图文聚类服务需求文档

## 1. 项目概述

### 1.1 项目背景

针对新闻资讯、社交媒体动态等图文内容，设计一套基于深度学习的智能聚类服务，解决内容去重、相似内容聚合等问题。相比传统基于 SimHash、Phash 的方案，新方案采用语义理解能力更强的向量化技术，并针对不同内容场景（长文本、短文本、有图、无图、模板化内容）进行自适应处理。

### 1.2 项目目标

- **准确率目标**：整体聚类准确率 ≥ 90%
- **性能目标**：单文档处理耗时 < 500ms（GPU）/ < 2s（CPU）
- **可扩展性**：支持百万级文档检索
- **鲁棒性**：针对模板化内容（财经、天气、体育等）避免误聚类

### 1.3 核心技术栈

| 组件         | 技术选型                | 版本要求       |
| ------------ | ----------------------- | -------------- |
| 文本向量模型 | BAAI/bge-large-zh-v1.5  | -              |
| 图片向量模型 | BAAI/bge-visualized     | -              |
| 向量数据库   | Milvus                  | ≥ 2.3          |
| Web 框架     | FastAPI                 | ≥ 0.104        |
| AI 框架      | LangChain               | ≥ 1.0          |
| 编程语言     | Python                  | ≥ 3.10         |
| 容器化       | Docker / Docker Compose | -              |
| 计算加速     | CUDA                    | ≥ 11.8（可选） |

---

## 2. 系统架构

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                           │
│                      (FastAPI)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 文档接入服务  │  │  聚类服务    │  │  查询服务    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Processing Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 特征提取引擎  │  │ 模板检测器    │  │ 实体提取器    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Model Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 文本编码器    │  │ 图像编码器    │  │   NER模型     │     │
│  │   (BGE)      │  │(BGE-Visualized)│ │  (支持中文的开源模型)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Storage Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Milvus     │  │   Redis      │  │   MySQL      │     │
│  │ (向量索引)    │  │  (缓存)      │  │(元数据/簇信息)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心处理流程

```
输入文档
    ↓
┌────────────────────────────────────┐
│ 1. 场景识别                         │
│    - 文本长度判断（≤50字 / >50字）  │
│    - 图片判断（有图 / 无图）        │
│    - 模板检测（财经/天气/体育等）   │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 2. 自适应特征提取                   │
│    ├─ 短文本+有图 → 图片权重70%     │
│    ├─ 短文本+无图 → 专用短文本模型   │
│    ├─ 长文本+有图 → 标准权重(7:3)   │
│    └─ 长文本+无图 → 纯文本向量      │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 3. 向量粗召回                       │
│    - Milvus ANN检索 Top-K          │
│    - 动态阈值（场景相关）           │
│    - 时间窗口过滤                   │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 4. 实体精排（模板内容）             │
│    - 提取关键实体                   │
│    - 实体匹配验证                   │
│    - 结构化字段对比                 │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 5. 聚类决策                         │
│    - 找到相似文档 → 加入已有簇      │
│    - 未找到 → 创建新簇              │
└────────────────────────────────────┘
    ↓
输出聚类结果
```

---

## 3. 功能需求

### 3.1 核心功能

#### 3.1.1 文档接入 API

**功能描述**：接收新文档，执行聚类处理

**输入参数**：

```json
{
  "doc_id": "string (必填，唯一标识)",
  "title": "string (可选，标题)",
  "content": "string (可选，正文)",
  "images": ["url1", "url2"] (可选，图片URL列表),
  "publish_time": "datetime (必填，发布时间)",
  "metadata": {
    "source": "string (来源)",
    "author": "string (作者)",
    "category": "string (分类)"
  }
}
```

**输出结果**：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "doc_id": "string",
    "cluster_id": "string (所属簇ID)",
    "is_new_cluster": false,
    "similar_docs": [
      {
        "doc_id": "string",
        "similarity_score": 0.92,
        "cluster_id": "string"
      }
    ],
    "processing_info": {
      "scenario": "short_text_with_image",
      "template_type": "stock",
      "entities": { "stock_code": "600519", "date": "2024-01-15" },
      "text_weight": 0.3,
      "image_weight": 0.7,
      "vector_threshold": 0.88,
      "processing_time_ms": 245
    }
  }
}
```

**业务规则**：

- 标题、正文、图片至少提供一项
- 相同 `doc_id` 视为更新操作
- 支持批量接入（单次 ≤ 100 条）

---

#### 3.1.2 簇查询 API

**功能描述**：查询簇信息及包含的文档

**接口列表**：

1. **按簇 ID 查询**

   - `GET /api/v1/cluster/{cluster_id}`
   - 返回簇内所有文档列表

2. **按文档 ID 查询所属簇**

   - `GET /api/v1/cluster/by-doc/{doc_id}`
   - 返回文档所属簇及簇内其他文档

3. **按时间范围查询簇列表**
   - `GET /api/v1/clusters?start_time=xxx&end_time=xxx&page=1&size=20`
   - 支持分页

**输出示例**：

```json
{
  "cluster_id": "CLS_20240115_001",
  "doc_count": 5,
  "create_time": "2024-01-15T08:00:00Z",
  "update_time": "2024-01-15T10:30:00Z",
  "representative_doc": {
    "doc_id": "xxx",
    "title": "xxx",
    "summary": "xxx"
  },
  "documents": [
    {
      "doc_id": "xxx",
      "title": "xxx",
      "publish_time": "xxx",
      "is_key_doc": true
    }
  ]
}
```

---

#### 3.1.3 文档删除 API

**功能描述**：从聚类系统中移除文档

**接口**：`DELETE /api/v1/document/{doc_id}`

**业务规则**：

- 删除文档向量及元数据
- 更新所属簇信息
- 若簇内仅剩该文档，删除簇

---

### 3.2 场景自适应处理

#### 3.2.1 场景识别规则

| 场景 ID | 文本长度 | 是否有图 | 场景名称    |
| ------- | -------- | -------- | ----------- |
| S1      | ≤50 字   | 是       | 短文本+有图 |
| S2      | ≤50 字   | 否       | 短文本+无图 |
| S3      | >50 字   | 是       | 长文本+有图 |
| S4      | >50 字   | 否       | 长文本+无图 |

**文本长度计算**：`len(title + content)` 去除 HTML 标签后的字符数

#### 3.2.2 场景参数配置

| 场景 | 文本权重 | 图片权重 | 相似度阈值 | 时间窗口 | 备注          |
| ---- | -------- | -------- | ---------- | -------- | ------------- |
| S1   | 0.3      | 0.7      | 0.88       | 7 天     | 图片主导      |
| S2   | 1.0      | 0.0      | 0.92       | 1 天     | 高阈值+短窗口 |
| S3   | 0.7      | 0.3      | 0.85       | 7 天     | 标准配置      |
| S4   | 1.0      | 0.0      | 0.85       | 7 天     | 纯文本        |

**配置可调**：通过环境变量或配置文件修改

---

### 3.3 模板化内容处理

#### 3.3.1 模板类型定义

| 模板类型       | 关键词                       | 必填实体           | 实体提取规则            |
| -------------- | ---------------------------- | ------------------ | ----------------------- |
| `stock`        | 个股、上涨、下跌、涨幅、跌幅 | stock_code、date   | 正则：`\((\d{6})\)`     |
| `weather`      | 天气、温度、℃、空气质量      | location、date     | NER + 正则：`(\d+)℃`    |
| `sports`       | 战胜、比分、砍下、得分       | teams、date        | NER + 正则：`(\d+:\d+)` |
| `daily_report` | 简报、快讯、日报、播报       | date、organization | NER                     |

**模板检测逻辑**：

- 关键词匹配度 ≥ 40% 时触发
- 可通过配置文件新增模板类型

#### 3.3.2 实体匹配规则

**股票类模板**：

```python
# 伪代码
if template_type == "stock":
    must_match = [
        entities1['stock_code'] == entities2['stock_code'],  # 股票代码完全一致
        entities1['date'] == entities2['date']              # 日期完全一致
    ]
    can_cluster = all(must_match) and vector_similarity > 0.80
```

**天气类模板**：

```python
if template_type == "weather":
    must_match = [
        entities1['location'] == entities2['location'],  # 城市一致
        entities1['date'] == entities2['date']          # 日期一致
    ]
    can_cluster = all(must_match) and vector_similarity > 0.75
```

**体育类模板**：

```python
if template_type == "sports":
    must_match = [
        set(entities1['teams']) == set(entities2['teams']),  # 队伍组合一致
        entities1['date'] == entities2['date']               # 日期一致
    ]
    can_cluster = all(must_match) and vector_similarity > 0.85
```

**业务规则**：

- 模板内容优先实体匹配，向量相似度作为辅助
- 非模板内容纯依赖向量相似度
- 日期字段支持多种格式自动标准化

---

### 3.4 实体提取服务

#### 3.4.1 通用实体

#### 3.4.2 领域实体

基于正则表达式提取：

- **股票代码**：`\((\d{6})\)` 或 `[股票名称]`
- **温度**：`(\d+)℃`
- **比分**：`(\d+:\d+)`
- **数值**：`(\d+\.?\d*)%?`

#### 3.4.3 日期标准化

支持格式：

- `2024年1月15日` → `2024-01-15`
- `2024-01-15` → `2024-01-15`
- `今日` → 当前日期
- `昨日` → 当前日期-1 天

---

## 4. 部署方案

Docker Compose


```python
import re, json
from datetime import datetime, timedelta

SCENARIO_CONFIG = {
    "S1": {"text_weight": 0.3, "image_weight": 0.7, "threshold": 0.88, "window_days": 7},
    "S2": {"text_weight": 1.0, "image_weight": 0.0, "threshold": 0.92, "window_days": 1},
    "S3": {"text_weight": 0.7, "image_weight": 0.3, "threshold": 0.85, "window_days": 7},
    "S4": {"text_weight": 1.0, "image_weight": 0.0, "threshold": 0.85, "window_days": 7}
}

TEMPLATE_KEYWORDS = {
    "stock": ["上涨", "下跌", "涨幅", "跌幅", "个股", "股票", "收盘", "开盘"],
    "weather": ["天气", "温度", "空气质量", "降雨", "多云", "晴", "暴雨"],
    "sports": ["比分", "战胜", "冠军", "联赛", "进球", "得分"],
    "daily_report": ["简报", "快讯", "日报", "播报"]
}


def strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "")


def normalize_date(s):
    if not s:
        return None
    s = str(s).strip()
    now = datetime.utcnow()
    if s in ("今日", "今天", "today"):
        return now.strftime("%Y-%m-%d")
    if s in ("昨日", "昨天", "yesterday"):
        return (now - timedelta(days=1)).strftime("%Y-%m-%d")
    m = re.search(r"(\\d{4})年(\\d{1,2})月(\\d{1,2})日", s)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y%m%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except Exception:
            pass
    return s


def detect_template(text):
    for t, kws in TEMPLATE_KEYWORDS.items():
        if not kws:
            continue
        hit = sum(1 for k in kws if k in text)
        if hit / float(len(kws)) >= 0.4:
            return t
    return "none"


def extract_entities(template_type, text):
    entities = {}
    if template_type == "stock":
        m = re.search(r"\\((\\d{6})\\)", text)
        if m:
            entities["stock_code"] = m.group(1)
        d = re.search(r"(\\d{4}-\\d{2}-\\d{2})", text)
        if d:
            entities["date"] = d.group(1)
    elif template_type == "weather":
        m = re.search(r"(\\d+)℃", text)
        if m:
            entities["temperature"] = m.group(1)
    elif template_type == "sports":
        m = re.search(r"(\\d+:\\d+)", text)
        if m:
            entities["score"] = m.group(1)
    return entities


def parse_images(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        v = value.strip()
        if not v:
            return []
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            return [v]
    return []


def parse_metadata(value):
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        v = value.strip()
        if not v:
            return {}
        try:
            parsed = json.loads(v)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            return {"raw": v}
    return {}


def run(inputs, context):
    title = inputs.get("title") or ""
    content = inputs.get("content") or ""
    text_body = (title + "\n" + content).strip()
    text_len = len(strip_html(text_body))
    images = parse_images(inputs.get("images"))
    has_image = len(images) > 0
    if text_len <= 50 and has_image:
        scenario = "S1"
    elif text_len <= 50 and not has_image:
        scenario = "S2"
    elif text_len > 50 and has_image:
        scenario = "S3"
    else:
        scenario = "S4"
    cfg = SCENARIO_CONFIG.get(scenario, SCENARIO_CONFIG["S4"])
    template_type = detect_template(text_body)
    entities = extract_entities(template_type, text_body)
    publish_time = normalize_date(inputs.get("publish_time"))
    metadata = parse_metadata(inputs.get("metadata"))
    return {
        "text_body": text_body,
        "text_len": text_len,
        "has_image": has_image,
        "scenario": scenario,
        "text_weight": cfg["text_weight"],
        "image_weight": cfg["image_weight"],
        "vector_threshold": cfg["threshold"],
        "time_window_days": cfg["window_days"],
        "template_type": template_type,
        "entities": entities,
        "publish_time": publish_time,
        "images": images,
        "metadata": metadata
    }
```

```json
{
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "label": "开始",
      "config": {
        "variables": [
          { "name": "doc_id", "label": "doc_id", "type": "text", "required": true },
          { "name": "title", "label": "title", "type": "text", "required": false },
          { "name": "content", "label": "content", "type": "paragraph", "required": false },
          { "name": "images", "label": "images", "type": "structure", "required": false },
          { "name": "publish_time", "label": "publish_time", "type": "text", "required": true },
          { "name": "metadata", "label": "metadata", "type": "structure", "required": false }
        ]
      }
    },
    {
      "id": "code-preprocess",
      "type": "code",
      "label": "预处理与场景识别",
      "config": {
        "language": "python",
        "code": "import re, json\nfrom datetime import datetime, timedelta\n\nSCENARIO_CONFIG = {\n    \"S1\": {\"text_weight\": 0.3, \"image_weight\": 0.7, \"threshold\": 0.88, \"window_days\": 7},\n    \"S2\": {\"text_weight\": 1.0, \"image_weight\": 0.0, \"threshold\": 0.92, \"window_days\": 1},\n    \"S3\": {\"text_weight\": 0.7, \"image_weight\": 0.3, \"threshold\": 0.85, \"window_days\": 7},\n    \"S4\": {\"text_weight\": 1.0, \"image_weight\": 0.0, \"threshold\": 0.85, \"window_days\": 7}\n}\n\nTEMPLATE_KEYWORDS = {\n    \"stock\": [\"上涨\", \"下跌\", \"涨幅\", \"跌幅\", \"个股\", \"股票\", \"收盘\", \"开盘\"],\n    \"weather\": [\"天气\", \"温度\", \"空气质量\", \"降雨\", \"多云\", \"晴\", \"暴雨\"],\n    \"sports\": [\"比分\", \"战胜\", \"冠军\", \"联赛\", \"进球\", \"得分\"],\n    \"daily_report\": [\"简报\", \"快讯\", \"日报\", \"播报\"]\n}\n\n\ndef strip_html(text):\n    return re.sub(r\"<[^>]+>\", \"\", text or \"\")\n\n\ndef normalize_date(s):\n    if not s:\n        return None\n    s = str(s).strip()\n    now = datetime.utcnow()\n    if s in (\"今日\", \"今天\", \"today\"):\n        return now.strftime(\"%Y-%m-%d\")\n    if s in (\"昨日\", \"昨天\", \"yesterday\"):\n        return (now - timedelta(days=1)).strftime(\"%Y-%m-%d\")\n    m = re.search(r\"(\\d{4})年(\\d{1,2})月(\\d{1,2})日\", s)\n    if m:\n        return f\"{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}\"\n    for fmt in (\"%Y-%m-%d\", \"%Y/%m/%d\", \"%Y-%m-%d %H:%M:%S\", \"%Y/%m/%d %H:%M:%S\", \"%Y%m%d\"):\n        try:\n            return datetime.strptime(s, fmt).strftime(\"%Y-%m-%d\")\n        except Exception:\n            pass\n    return s\n\n\ndef detect_template(text):\n    for t, kws in TEMPLATE_KEYWORDS.items():\n        if not kws:\n            continue\n        hit = sum(1 for k in kws if k in text)\n        if hit / float(len(kws)) >= 0.4:\n            return t\n    return \"none\"\n\n\ndef extract_entities(template_type, text):\n    entities = {}\n    if template_type == \"stock\":\n        m = re.search(r\"\\((\\d{6})\\)\", text)\n        if m:\n            entities[\"stock_code\"] = m.group(1)\n        d = re.search(r\"(\\d{4}-\\d{2}-\\d{2})\", text)\n        if d:\n            entities[\"date\"] = d.group(1)\n    elif template_type == \"weather\":\n        m = re.search(r\"(\\d+)℃\", text)\n        if m:\n            entities[\"temperature\"] = m.group(1)\n    elif template_type == \"sports\":\n        m = re.search(r\"(\\d+:\\d+)\", text)\n        if m:\n            entities[\"score\"] = m.group(1)\n    return entities\n\n\ndef parse_images(value):\n    if value is None:\n        return []\n    if isinstance(value, list):\n        return value\n    if isinstance(value, str):\n        v = value.strip()\n        if not v:\n            return []\n        try:\n            parsed = json.loads(v)\n            if isinstance(parsed, list):\n                return parsed\n        except Exception:\n            return [v]\n    return []\n\n\ndef parse_metadata(value):\n    if value is None:\n        return {}\n    if isinstance(value, dict):\n        return value\n    if isinstance(value, str):\n        v = value.strip()\n        if not v:\n            return {}\n        try:\n            parsed = json.loads(v)\n            if isinstance(parsed, dict):\n                return parsed\n        except Exception:\n            return {\"raw\": v}\n    return {}\n\n\ndef run(inputs, context):\n    title = inputs.get(\"title\") or \"\"\n    content = inputs.get(\"content\") or \"\"\n    text_body = (title + \"\\n\" + content).strip()\n    text_len = len(strip_html(text_body))\n    images = parse_images(inputs.get(\"images\"))\n    has_image = len(images) > 0\n    if text_len <= 50 and has_image:\n        scenario = \"S1\"\n    elif text_len <= 50 and not has_image:\n        scenario = \"S2\"\n    elif text_len > 50 and has_image:\n        scenario = \"S3\"\n    else:\n        scenario = \"S4\"\n    cfg = SCENARIO_CONFIG.get(scenario, SCENARIO_CONFIG[\"S4\"])\n    template_type = detect_template(text_body)\n    entities = extract_entities(template_type, text_body)\n    publish_time = normalize_date(inputs.get(\"publish_time\"))\n    metadata = parse_metadata(inputs.get(\"metadata\"))\n    return {\n        \"text_body\": text_body,\n        \"text_len\": text_len,\n        \"has_image\": has_image,\n        \"scenario\": scenario,\n        \"text_weight\": cfg[\"text_weight\"],\n        \"image_weight\": cfg[\"image_weight\"],\n        \"vector_threshold\": cfg[\"threshold\"],\n        \"time_window_days\": cfg[\"window_days\"],\n        \"template_type\": template_type,\n        \"entities\": entities,\n        \"publish_time\": publish_time,\n        \"images\": images,\n        \"metadata\": metadata\n    }\n",
        "inputs": [
          { "key": "doc_id", "value": "{{input.doc_id}}" },
          { "key": "title", "value": "{{input.title}}" },
          { "key": "content", "value": "{{input.content}}" },
          { "key": "images", "value": "{{input.images}}" },
          { "key": "publish_time", "value": "{{input.publish_time}}" },
          { "key": "metadata", "value": "{{input.metadata}}" }
        ]
      }
    },
    {
      "id": "subflow-text-embed",
      "type": "subflow",
      "label": "文本向量化子流程",
      "config": {
        "subflowId": "REPLACE_TEXT_EMBED_SUBFLOW_ID",
        "subflowName": "Text Embedding",
        "inputMappings": [
          {
            "targetVariable": "text",
            "sourceExpression": "{{nodes.code-preprocess.result.text_body}}"
          }
        ]
      }
    },
    {
      "id": "subflow-image-embed",
      "type": "subflow",
      "label": "图片向量化子流程",
      "config": {
        "subflowId": "REPLACE_IMAGE_EMBED_SUBFLOW_ID",
        "subflowName": "Image Embedding",
        "inputMappings": [
          {
            "targetVariable": "images",
            "sourceExpression": "{{nodes.code-preprocess.result.images}}"
          }
        ]
      }
    },
    {
      "id": "code-fuse",
      "type": "code",
      "label": "向量融合",
      "config": {
        "language": "python",
        "code": "def to_vector(val):\n    if val is None:\n        return []\n    if isinstance(val, dict):\n        for k in (\"vector\", \"vectors\", \"embedding\"):\n            if k in val:\n                val = val[k]\n                break\n    if isinstance(val, list):\n        if len(val) == 0:\n            return []\n        if isinstance(val[0], list):\n            return val[0]\n        if isinstance(val[0], (int, float)):\n            return val\n    return []\n\n\ndef run(inputs, context):\n    text_vec = to_vector(inputs.get(\"text_vector\"))\n    image_vec = to_vector(inputs.get(\"image_vector\"))\n    tw = float(inputs.get(\"text_weight\") or 1.0)\n    iw = float(inputs.get(\"image_weight\") or 0.0)\n    if not text_vec and not image_vec:\n        return {\"final_vector\": []}\n    if not image_vec:\n        return {\"final_vector\": text_vec}\n    if not text_vec:\n        return {\"final_vector\": image_vec}\n    if len(text_vec) != len(image_vec):\n        return {\"final_vector\": text_vec}\n    fused = [tw * tv + iw * iv for tv, iv in zip(text_vec, image_vec)]\n    return {\"final_vector\": fused}\n",
        "inputs": [
          { "key": "text_vector", "value": "{{nodes.subflow-text-embed.vector}}" },
          { "key": "image_vector", "value": "{{nodes.subflow-image-embed.vector}}" },
          { "key": "text_weight", "value": "{{nodes.code-preprocess.result.text_weight}}" },
          { "key": "image_weight", "value": "{{nodes.code-preprocess.result.image_weight}}" }
        ]
      }
    },
    {
      "id": "vector-search",
      "type": "vector_store",
      "label": "向量检索",
      "config": {
        "providerId": "REPLACE_VECTOR_STORE_PROVIDER_ID",
        "operation": "search",
        "collection": "news_cluster",
        "queryVector": "{{nodes.code-fuse.result.final_vector}}",
        "topK": 20
      }
    },
    {
      "id": "code-decide",
      "type": "code",
      "label": "聚类决策",
      "config": {
        "language": "python",
        "code": "import json\nfrom datetime import datetime, timedelta\n\n\ndef parse_time(s):\n    if not s:\n        return None\n    s = str(s).strip()\n    for fmt in (\"%Y-%m-%d\", \"%Y/%m/%d\", \"%Y-%m-%d %H:%M:%S\", \"%Y/%m/%d %H:%M:%S\", \"%Y%m%d\"):\n        try:\n            return datetime.strptime(s, fmt)\n        except Exception:\n            pass\n    return None\n\n\ndef get_score(m):\n    if isinstance(m, dict):\n        if \"score\" in m:\n            return float(m[\"score\"])\n        if \"similarity\" in m:\n            return float(m[\"similarity\"])\n        if \"distance\" in m:\n            d = float(m[\"distance\"])\n            return 1 - d if d <= 1 else -d\n    return None\n\n\ndef template_threshold(t, fallback):\n    if t == \"stock\":\n        return 0.80\n    if t == \"weather\":\n        return 0.75\n    if t == \"sports\":\n        return 0.85\n    return fallback\n\n\ndef entity_match(template_type, e1, e2):\n    if template_type == \"stock\":\n        return e1.get(\"stock_code\") and e1.get(\"stock_code\") == e2.get(\"stock_code\") and e1.get(\"date\") == e2.get(\"date\")\n    if template_type == \"weather\":\n        return e1.get(\"location\") and e1.get(\"location\") == e2.get(\"location\") and e1.get(\"date\") == e2.get(\"date\")\n    if template_type == \"sports\":\n        return e1.get(\"teams\") and set(e1.get(\"teams\")) == set(e2.get(\"teams\")) and e1.get(\"date\") == e2.get(\"date\")\n    return True\n\n\ndef run(inputs, context):\n    matches = inputs.get(\"matches\") or []\n    scenario = inputs.get(\"scenario\")\n    template_type = inputs.get(\"template_type\") or \"none\"\n    entities = inputs.get(\"entities\") or {}\n    publish_time = inputs.get(\"publish_time\")\n    vector_threshold = float(inputs.get(\"vector_threshold\") or 0.85)\n    time_window_days = int(inputs.get(\"time_window_days\") or 7)\n\n    doc_time = parse_time(publish_time)\n    min_time = doc_time - timedelta(days=time_window_days) if doc_time else None\n\n    kept = []\n    for m in matches:\n        score = get_score(m)\n        if score is None:\n            continue\n        meta = m.get(\"metadata\") if isinstance(m, dict) else {}\n        cand_time = parse_time(meta.get(\"publish_time\")) if isinstance(meta, dict) else None\n        if min_time and cand_time and cand_time < min_time:\n            continue\n        threshold = template_threshold(template_type, vector_threshold)\n        if score < threshold:\n            continue\n        if template_type != \"none\":\n            cand_entities = meta.get(\"entities\") or {}\n            if not entity_match(template_type, entities, cand_entities):\n                continue\n        kept.append(m)\n\n    kept.sort(key=get_score, reverse=True)\n    best = kept[0] if kept else None\n\n    cluster_id = None\n    if isinstance(best, dict):\n        meta = best.get(\"metadata\") or {}\n        cluster_id = meta.get(\"cluster_id\") or meta.get(\"clusterId\")\n\n    is_new = False\n    if not cluster_id:\n        is_new = True\n        suffix = (publish_time or \"\")[:10].replace(\"-\", \"\")\n        cluster_id = f\"CLS_{suffix}_{inputs.get('doc_id', 'NEW')}\"\n\n    similar_docs = []\n    for m in kept[:5]:\n        meta = m.get(\"metadata\") or {}\n        similar_docs.append({\n            \"doc_id\": meta.get(\"doc_id\") or meta.get(\"docId\"),\n            \"similarity_score\": get_score(m),\n            \"cluster_id\": meta.get(\"cluster_id\") or meta.get(\"clusterId\") or cluster_id\n        })\n\n    processing_info = {\n        \"scenario\": scenario,\n        \"template_type\": template_type,\n        \"entities\": entities,\n        \"text_weight\": inputs.get(\"text_weight\"),\n        \"image_weight\": inputs.get(\"image_weight\"),\n        \"vector_threshold\": vector_threshold,\n        \"time_window_days\": time_window_days\n    }\n\n    upsert_metadata = {\n        \"doc_id\": inputs.get(\"doc_id\"),\n        \"cluster_id\": cluster_id,\n        \"publish_time\": publish_time,\n        \"scenario\": scenario,\n        \"template_type\": template_type,\n        \"entities\": entities\n    }\n\n    return {\n        \"cluster_id\": cluster_id,\n        \"is_new_cluster\": is_new,\n        \"similar_docs\": similar_docs,\n        \"processing_info\": processing_info,\n        \"upsert_metadata_json\": json.dumps(upsert_metadata, ensure_ascii=False)\n    }\n",
        "inputs": [
          { "key": "doc_id", "value": "{{input.doc_id}}" },
          { "key": "matches", "value": "{{nodes.vector-search.matches}}" },
          { "key": "scenario", "value": "{{nodes.code-preprocess.result.scenario}}" },
          { "key": "template_type", "value": "{{nodes.code-preprocess.result.template_type}}" },
          { "key": "entities", "value": "{{nodes.code-preprocess.result.entities}}" },
          { "key": "publish_time", "value": "{{nodes.code-preprocess.result.publish_time}}" },
          { "key": "text_weight", "value": "{{nodes.code-preprocess.result.text_weight}}" },
          { "key": "image_weight", "value": "{{nodes.code-preprocess.result.image_weight}}" },
          { "key": "vector_threshold", "value": "{{nodes.code-preprocess.result.vector_threshold}}" },
          { "key": "time_window_days", "value": "{{nodes.code-preprocess.result.time_window_days}}" }
        ]
      }
    },
    {
      "id": "vector-upsert",
      "type": "vector_store",
      "label": "向量写入",
      "config": {
        "providerId": "REPLACE_VECTOR_STORE_PROVIDER_ID",
        "operation": "upsert",
        "collection": "news_cluster",
        "vectorSource": "{{nodes.code-fuse.result.final_vector}}",
        "contentSource": "{{nodes.code-preprocess.result.text_body}}",
        "idSource": "{{input.doc_id}}",
        "metadataSource": "{{nodes.code-decide.result.upsert_metadata_json}}"
      }
    },
    {
      "id": "end-1",
      "type": "end",
      "label": "结束",
      "config": {
        "outputVariables": [
          {
            "name": "doc_id",
            "label": "doc_id",
            "type": "string",
            "expression": "{{input.doc_id}}"
          },
          {
            "name": "cluster_id",
            "label": "cluster_id",
            "type": "string",
            "expression": "{{nodes.code-decide.result.cluster_id}}"
          },
          {
            "name": "is_new_cluster",
            "label": "is_new_cluster",
            "type": "boolean",
            "expression": "{{nodes.code-decide.result.is_new_cluster}}"
          },
          {
            "name": "similar_docs",
            "label": "similar_docs",
            "type": "array",
            "expression": "{{nodes.code-decide.result.similar_docs}}"
          },
          {
            "name": "processing_info",
            "label": "processing_info",
            "type": "object",
            "expression": "{{nodes.code-decide.result.processing_info}}"
          }
        ]
      }
    }
  ],
  "edges": [
    { "source": "start-1", "target": "code-preprocess" },
    { "source": "code-preprocess", "target": "subflow-text-embed" },
    { "source": "subflow-text-embed", "target": "subflow-image-embed" },
    { "source": "subflow-image-embed", "target": "code-fuse" },
    { "source": "code-fuse", "target": "vector-search" },
    { "source": "vector-search", "target": "code-decide" },
    { "source": "code-decide", "target": "vector-upsert" },
    { "source": "vector-upsert", "target": "end-1" }
  ]
}

```
