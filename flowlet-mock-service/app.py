from datetime import datetime, timezone

from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="Flowlet Mock Content Service", version="1.0.0")


def _utc_now():
    return datetime.now(timezone.utc).isoformat()


# In-memory store for demo purposes.
_CONTENT_STORE = {}


def _result(data=None, message="success", code=200):
    return {"code": code, "message": message, "data": data}


def _error_response(status_code, message):
    return JSONResponse(_result(message=message, code=status_code), status_code=status_code)


class ContentPayload(BaseModel):
    title: str | None = None
    body: str | None = ""
    tags: list[str] | None = []
    status: int | None = 0
    contentType: int | None = 0
    userId: str | None = None
    auditStatus: int | None = 0
    auditReason: str | None = None
    auditTime: str | None = None
    auditOperator: str | None = None
    source: str | None = None
    imageUrls: list[str] | None = []
    videoUrl: str | None = None
    category: str | None = None
    sourceLevel: str | None = None


# Image pool for random selection
_IMAGE_POOL = [
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1143&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1667030474693-6d0632f97029?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y2F0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2F0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Y2F0fGVufDB8fDB8fHww",
    "https://plus.unsplash.com/premium_photo-1677545183884-421157b2da02?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8Y2F0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8Y2F0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Y2F0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8Y2F0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1561948955-570b270e7c36?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGNhdHxlbnwwfHwwfHx8MA%3D%3D",
    "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGNhdHxlbnwwfHwwfHx8MA%3D%3D",
]


def _get_images_for_index(index: int):
    """Get a stable set of 1-3 images based on the index."""
    # Determine image count (1-3) based on index
    count = (index % 3) + 1
    # Calculate starting position in the pool
    start = (index * 3) % len(_IMAGE_POOL)
    # Select images cyclically from the pool
    return [_IMAGE_POOL[(start + i) % len(_IMAGE_POOL)] for i in range(count)]


# Group 1: Short content (within 50 chars) - Stock reports and Weather forecasts
_GROUP1_CONTENT = [
    {"title": "贵州茅台今日涨停", "body": "【快讯】贵州茅台(600519)今日涨停，报价1856.00元，成交额达45亿元。", "tags": ["stock", "finance"], "category": "finance"},
    {"title": "北京今日天气预报", "body": "北京今日晴转多云，气温18-28℃，东南风2-3级，空气质量良好。", "tags": ["weather", "life"], "category": "weather"},
    {"title": "比亚迪股价创新高", "body": "【快讯】比亚迪(002594)股价创历史新高，报价298.50元，涨幅5.2%。", "tags": ["stock", "finance"], "category": "finance"},
    {"title": "上海明日有雨", "body": "上海明日小雨转阴，气温15-22℃，偏北风3-4级，出行请带伞。", "tags": ["weather", "life"], "category": "weather"},
    {"title": "宁德时代午后拉升", "body": "【快讯】宁德时代(300750)午后拉升，报价215.80元，涨幅3.8%。", "tags": ["stock", "finance"], "category": "finance"},
    {"title": "广州周末天气晴好", "body": "广州周末天气晴好，气温22-32℃，微风，适宜户外活动。", "tags": ["weather", "life"], "category": "weather"},
    {"title": "中国平安小幅下跌", "body": "【快讯】中国平安(601318)小幅下跌，报价48.25元，跌幅1.2%。", "tags": ["stock", "finance"], "category": "finance"},
    {"title": "深圳今日多云", "body": "深圳今日多云间晴，气温25-33℃，南风2级，紫外线较强。", "tags": ["weather", "life"], "category": "weather"},
    {"title": "腾讯控股港股收涨", "body": "【快讯】腾讯控股(00700.HK)港股收涨2.5%，报价385.60港元。", "tags": ["stock", "finance"], "category": "finance"},
    {"title": "杭州未来三天晴朗", "body": "杭州未来三天以晴为主，气温20-30℃，空气干燥，注意补水。", "tags": ["weather", "life"], "category": "weather"},
]

# Group 2: Long content (~200 chars) - News, novels, entertainment, travel
_GROUP2_CONTENT = [
    {
        "title": "人工智能技术突破：国产大模型性能超越GPT-4",
        "body": "近日，国内某科技巨头发布了最新一代人工智能大模型，在多项基准测试中取得了突破性进展。该模型在自然语言理解、代码生成和多模态推理等任务上均表现出色，部分指标已超越GPT-4。专家表示，这标志着我国在人工智能核心技术领域取得了重要突破，将有力推动AI技术在医疗、教育、金融等行业的广泛应用。该公司计划于下月正式开放API接口，届时开发者可免费申请体验。",
        "tags": ["tech", "AI", "news"],
        "category": "technology",
    },
    {
        "title": "《星河漫游》连载：第三章·星际迷航",
        "body": "飞船在虫洞中剧烈震动，林晨紧握操控杆，额头渗出冷汗。警报声此起彼伏，舷窗外是扭曲的时空光芒。\"还有三十秒！\"AI助手的声音在耳边响起。他深吸一口气，将引擎推至最大功率。光芒骤然消失，眼前是一片陌生的星域。三颗恒星交织成壮丽的光环，远处一颗蔚蓝色行星静静悬浮。\"我们到了，\"林晨喃喃自语，\"新的开始。\"",
        "tags": ["novel", "sci-fi", "serial"],
        "category": "literature",
    },
    {
        "title": "顶流明星官宣恋情：粉丝反应两极分化",
        "body": "昨日深夜，人气演员张某某在社交媒体上官宣与圈外女友的恋情，瞬间引爆热搜。消息发出后不到一小时，相关话题阅读量突破10亿。部分粉丝送上真挚祝福，表示\"只要偶像幸福就好\"；也有粉丝表示难以接受，纷纷\"脱粉回踩\"。业内人士分析，此次官宣时机选择在深夜，或是团队精心策划的结果。目前女方身份尚未公开，但有知情人透露其为某知名企业高管。",
        "tags": ["entertainment", "celebrity", "gossip"],
        "category": "entertainment",
    },
    {
        "title": "云南大理五日游攻略：邂逅最美风花雪月",
        "body": "大理，一座让人来了就不想走的城市。第一天建议游览大理古城，漫步青石板路，感受白族文化；第二天前往洱海，租一辆电动车环湖骑行，打卡网红S弯；第三天登苍山，乘坐索道俯瞰洱海全景；第四天探访喜洲古镇，品尝正宗喜洲粑粑；最后一天可以去双廊发呆，在海边咖啡馆看日落。住宿推荐选择古城内的特色民宿，价格实惠且氛围极佳。",
        "tags": ["travel", "guide", "yunnan"],
        "category": "travel",
    },
    {
        "title": "新能源汽车销量创新高：比亚迪蝉联全球冠军",
        "body": "据最新统计数据显示，今年上半年全球新能源汽车销量突破600万辆，同比增长35%。其中，比亚迪以超过120万辆的成绩蝉联全球销量冠军，特斯拉紧随其后。国内市场方面，新能源渗透率已突破40%，一线城市更是接近60%。业内专家指出，随着充电基础设施的不断完善和电池技术的持续突破，新能源汽车有望在2025年实现与燃油车的价格平权，届时市场将迎来更大爆发。",
        "tags": ["auto", "EV", "news"],
        "category": "automotive",
    },
    {
        "title": "新能源汽车销量创新高：比亚迪蝉联全球冠军",
        "body": "据最新统计数据显示，今年上半年全球新能源汽车销量突破600万辆，同比增长35%。其中，比亚迪以超过120万辆的成绩蝉联全球销量冠军，特斯拉紧随其后。国内市场方面，新能源渗透率已突破40%，一线城市更是接近60%。业内专家指出，随着充电基础设施的不断完善和电池技术的持续突破，新能源汽车有望在2025年实现与燃油车的价格平权，届时市场将迎来更大爆发。",
        "tags": ["auto", "EV", "news"],
        "category": "automotive",
    },
    {
        "title": "新能源车销量再创新高：比亚迪继续领跑全球",
        "body": "统计数据显示，今年上半年全球新能源汽车销量超过600万辆，同比大增35%。其中，比亚迪以120万辆以上的成绩继续领跑全球，特斯拉位居其后。国内新能源渗透率已突破40%，一线城市接近60%。业内人士指出，充电网络完善与电池技术进步将推动新能源车在2025年前后实现与燃油车价格持平，市场空间将进一步打开。",
        "tags": ["auto", "EV", "news"],
        "category": "automotive",
    },
    {
        "title": "新能源市场升温：上半年销量大涨，渗透率持续抬升",
        "body": "行业报告称，上半年全球新能源汽车销量接近600万辆，同比增幅超过三成。比亚迪仍是最大赢家，销量稳居第一，特斯拉紧随其后。国内市场渗透率持续抬升，多个一线城市已接近六成。分析认为，随着充电设施下沉和成本下降，新能源车与燃油车的价差正在缩小，未来两年行业有望迎来新一轮增长。",
        "tags": ["auto", "EV", "market"],
        "category": "automotive",
    },
    {
        "title": "《剑来》书评：网文界的武侠新经典",
        "body": "烽火戏诸侯的《剑来》堪称近年网文界最具野心的作品。小说以少年陈平安的成长为主线，构建了一个宏大而细腻的武侠世界。不同于传统爽文的快节奏，《剑来》以慢热著称，大量篇幅用于人物塑造和哲理思辨。书中\"天下第一\"的设定被无限延展，每个配角都有完整的人生轨迹。虽然超过千万字的体量让许多读者望而却步，但坚持读下去的人无不为其深邃的思想和细腻的情感所折服。",
        "tags": ["novel", "review", "webnovel"],
        "category": "literature",
    },
    {
        "title": "周杰伦演唱会一票难求：黄牛价炒至万元",
        "body": "周杰伦\"嘉年华\"世界巡回演唱会上海站门票于今日开售，开票仅3秒即宣告售罄。大量歌迷表示根本没抢到，怀疑存在\"机器人\"抢票。与此同时，二手平台上内场票已被炒至万元以上，远超原价的数倍。演唱会主办方回应称，将严厉打击黄牛倒票行为，呼吁歌迷通过官方渠道购票。据悉，此次巡演将持续至明年，预计覆盖全球超过30个城市。",
        "tags": ["entertainment", "music", "concert"],
        "category": "entertainment",
    },
    {
        "title": "日本京都赏枫攻略：红叶季必去的十大名所",
        "body": "每年11月中旬至12月初，是京都赏枫的最佳时节。推荐以下十大赏枫名所：清水寺的红叶与古建筑相映成辉；岚山的嵯峨野竹林与红叶形成绝美对比；东福寺的通天桥是摄影爱好者的天堂；永观堂号称\"红叶之王\"；南禅寺的水路阁别具一格；北野天满宫的夜间点灯美轮美奂；醍醐寺的红叶倒映在池中如梦似幻；光明寺的红叶隧道令人陶醉；常寂光寺静谧而优雅；最后别忘了哲学之道的漫步赏枫。",
        "tags": ["travel", "japan", "autumn"],
        "category": "travel",
    },
    {
        "title": "国足世预赛客场告负：主帅赛后发布会沉默",
        "body": "在昨晚进行的世预赛亚洲区36强赛中，中国男足客场0:2不敌对手，遭遇两连败。上半场球队表现尚可，但下半场体能明显下滑，连续出现低级失误导致丢球。赛后，主帅在新闻发布会上沉默良久，仅表示\"需要时间总结\"。球迷反应激烈，社交媒体上批评声不断。足协连夜召开紧急会议，据悉正在评估是否更换主帅。下一场比赛将于五天后进行，届时球队将在主场迎战小组第二名。",
        "tags": ["sports", "football", "news"],
        "category": "sports",
    },
    {
        "title": "ChatGPT使用技巧：让AI成为你的超级助手",
        "body": "想要充分发挥ChatGPT的潜力？这里有几个实用技巧。首先，提问要具体明确，避免模糊的描述；其次，善用角色扮演，让AI扮演专家来回答专业问题；第三，学会分步骤提问，复杂任务拆解成小步骤效果更好；第四，提供示例可以让AI更好理解你的需求；最后，不满意可以要求重新生成或微调。掌握这些技巧，你会发现AI的回答质量大幅提升，工作效率也会显著提高。",
        "tags": ["tech", "AI", "tips"],
        "category": "technology",
    },
]


def _seed_content():
    now = _utc_now()
    statuses = [1, 0, 1, 2, 1]

    # Seed Group 1: Short content (index 1-10)
    for i, content in enumerate(_GROUP1_CONTENT, start=1):
        item_id = f"mock-{i}"
        status = statuses[(i - 1) % len(statuses)]
        _CONTENT_STORE[item_id] = {
            "id": item_id,
            "title": content["title"],
            "body": content["body"],
            "tags": content["tags"],
            "imageUrls": _get_images_for_index(i),
            "videoUrl": None,
            "category": content["category"],
            "sourceLevel": "P1" if status == 1 else "P2",
            "status": status,
            "contentType": 0,
            "userId": f"user-{(i - 1) % 5 + 1}",
            "auditStatus": 1 if status == 1 else 0,
            "auditReason": "" if status == 1 else "Awaiting review",
            "auditTime": now if status == 1 else None,
            "auditOperator": "system",
            "source": "mock-seed",
            "createdAt": now,
            "updatedAt": now,
        }

    # Seed Group 2: Long content (index 11-20)
    for i, content in enumerate(_GROUP2_CONTENT, start=11):
        item_id = f"mock-{i}"
        status = statuses[(i - 1) % len(statuses)]
        _CONTENT_STORE[item_id] = {
            "id": item_id,
            "title": content["title"],
            "body": content["body"],
            "tags": content["tags"],
            "imageUrls": _get_images_for_index(i),
            "videoUrl": f"https://cdn.example.com/mock/{i}/video.mp4",
            "category": content["category"],
            "sourceLevel": "P1" if status == 1 else "P2",
            "status": status,
            "contentType": 1,
            "userId": f"user-{(i - 1) % 5 + 1}",
            "auditStatus": 1 if status == 1 else 0,
            "auditReason": "" if status == 1 else "Awaiting review",
            "auditTime": now if status == 1 else None,
            "auditOperator": "system",
            "source": "mock-seed",
            "createdAt": now,
            "updatedAt": now,
        }


_seed_content()


@app.get("/health")
def health():
    return _result({"status": "ok", "time": _utc_now()})


@app.post("/mock/content")
def create_content(payload: ContentPayload):
    if not payload.title:
        return _error_response(400, "title is required")

    content_id = f"mock-{len(_CONTENT_STORE) + 1}"
    now = _utc_now()
    record = {
        "id": content_id,
        "title": payload.title,
        "body": payload.body or "",
        "tags": payload.tags or [],
        "imageUrls": payload.imageUrls or [],
        "videoUrl": payload.videoUrl,
        "category": payload.category,
        "sourceLevel": payload.sourceLevel,
        "status": payload.status if payload.status is not None else 0,
        "contentType": payload.contentType if payload.contentType is not None else 0,
        "userId": payload.userId or "user-1",
        "auditStatus": payload.auditStatus if payload.auditStatus is not None else 0,
        "auditReason": payload.auditReason or "",
        "auditTime": payload.auditTime,
        "auditOperator": payload.auditOperator or "system",
        "source": payload.source or "mock-api",
        "createdAt": now,
        "updatedAt": now,
    }
    _CONTENT_STORE[content_id] = record
    return JSONResponse(_result(record), status_code=201)


@app.get("/mock/content")
def list_content(status: int | None = None, tag: str | None = None):
    items = list(_CONTENT_STORE.values())

    if status is not None:
        items = [item for item in items if item.get("status") == status]
    if tag:
        items = [item for item in items if tag in (item.get("tags") or [])]

    return _result({"items": items, "total": len(items)})


@app.get("/mock/content/batch")
def batch_get_content_by_ids(ids: str = Query(default="")):
    ids_list = [item.strip() for item in ids.split(",") if item.strip()]
    items = [record for record_id, record in _CONTENT_STORE.items() if record_id in ids_list]
    return _result({"items": items, "total": len(items)})


@app.get("/mock/content/{content_id}")
def get_content(content_id: str):
    record = _CONTENT_STORE.get(content_id)
    if record is None:
        return _error_response(404, "content not found")
    return _result(record)


@app.put("/mock/content/{content_id}")
def update_content(content_id: str, payload: ContentPayload):
    record = _CONTENT_STORE.get(content_id)
    if record is None:
        return _error_response(404, "content not found")

    record.update(
        {
            "title": payload.title or record.get("title"),
            "body": payload.body if payload.body is not None else record.get("body"),
            "tags": payload.tags if payload.tags is not None else record.get("tags"),
            "imageUrls": payload.imageUrls if payload.imageUrls is not None else record.get("imageUrls"),
            "videoUrl": payload.videoUrl if payload.videoUrl is not None else record.get("videoUrl"),
            "category": payload.category if payload.category is not None else record.get("category"),
            "sourceLevel": payload.sourceLevel if payload.sourceLevel is not None else record.get("sourceLevel"),
            "status": payload.status if payload.status is not None else record.get("status"),
            "contentType": payload.contentType if payload.contentType is not None else record.get("contentType"),
            "userId": payload.userId or record.get("userId"),
            "auditStatus": payload.auditStatus if payload.auditStatus is not None else record.get("auditStatus"),
            "auditReason": payload.auditReason if payload.auditReason is not None else record.get("auditReason"),
            "auditTime": payload.auditTime if payload.auditTime is not None else record.get("auditTime"),
            "auditOperator": payload.auditOperator or record.get("auditOperator"),
            "source": payload.source or record.get("source"),
            "updatedAt": _utc_now(),
        }
    )
    return _result(record)


@app.delete("/mock/content/{content_id}")
def delete_content(content_id: str):
    record = _CONTENT_STORE.pop(content_id, None)
    if record is None:
        return _error_response(404, "content not found")
    return _result({"deletedId": content_id})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8801)
