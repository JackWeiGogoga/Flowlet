"""
测试文本和图片相似度比较接口
"""
import requests
import base64

# API 基础 URL
BASE_URL = "http://148.135.6.189:18000"


def test_text_similarity():
    """测试文本相似度比较"""
    print("=" * 50)
    print("测试文本相似度比较")
    print("=" * 50)
    
    # 测试1：相似的文本
    text1 = "今天天气真好"
    text2 = "今天天气很不错"
    data = {"text1": text1, "text2": text2}
    response = requests.post(f"{BASE_URL}/similarity/text", data=data)
    result = response.json()
    print(f"文本1: {text1}")
    print(f"文本2: {text2}")
    print(f"相似度: {result['similarity']:.4f}")
    print(f"方法: {result['method']}")
    print()
    
    # 测试2：不相似的文本
    text1 = "今天天气真好"
    text2 = "我喜欢吃苹果"
    data = {"text1": text1, "text2": text2}
    response = requests.post(f"{BASE_URL}/similarity/text", data=data)
    result = response.json()
    print(f"文本1: {text1}")
    print(f"文本2: {text2}")
    print(f"相似度: {result['similarity']:.4f}")
    print(f"方法: {result['method']}")
    print()


def test_image_similarity_with_files():
    """测试图片相似度比较（使用文件上传）"""
    print("=" * 50)
    print("测试图片相似度比较（文件上传）")
    print("=" * 50)
    
    # 假设有两张测试图片
    try:
        with open("imgs/cir_query.png", "rb") as f1, \
             open("imgs/cir_candi_1.png", "rb") as f2:
            files = {
                "file1": ("image1.png", f1, "image/png"),
                "file2": ("image2.png", f2, "image/png")
            }
            response = requests.post(f"{BASE_URL}/similarity/image", files=files)
            result = response.json()
            print(f"图片1: imgs/cir_query.png")
            print(f"图片2: imgs/cir_candi_1.png")
            print(f"相似度: {result['similarity']:.4f}")
            print(f"方法: {result['method']}")
            print()
    except FileNotFoundError as e:
        print(f"文件未找到: {e}")
        print()


def test_image_similarity_with_url():
    """测试图片相似度比较（使用 URL）"""
    print("=" * 50)
    print("测试图片相似度比较（URL）")
    print("=" * 50)
    
    data = {
        "image_url1": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1143&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "image_url2": "https://plus.unsplash.com/premium_photo-1667030474693-6d0632f97029?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/similarity/image", data=data)
        result = response.json()
        print(f"图片1 URL: {data['image_url1']}")
        print(f"图片2 URL: {data['image_url2']}")
        print(f"相似度: {result['similarity']:.4f}")
        print(f"方法: {result['method']}")
        print()
    except Exception as e:
        print(f"URL 测试失败（这是正常的，如果 URL 不存在）: {e}")
        print()


def test_image_similarity_with_base64():
    """测试图片相似度比较（使用 Base64）"""
    print("=" * 50)
    print("测试图片相似度比较（Base64）")
    print("=" * 50)
    
    try:
        # 读取两张图片并转换为 Base64
        with open("imgs/wiki_candi_1.jpg", "rb") as f1:
            image1_base64 = base64.b64encode(f1.read()).decode("utf-8")
        
        with open("imgs/wiki_candi_2.jpg", "rb") as f2:
            image2_base64 = base64.b64encode(f2.read()).decode("utf-8")
        
        data = {
            "image_base641": image1_base64,
            "image_base642": image2_base64
        }
        
        response = requests.post(f"{BASE_URL}/similarity/image", data=data)
        result = response.json()
        print(f"图片1: imgs/wiki_candi_1.jpg")
        print(f"图片2: imgs/wiki_candi_2.jpg")
        print(f"相似度: {result['similarity']:.4f}")
        print(f"方法: {result['method']}")
        print()
    except FileNotFoundError as e:
        print(f"文件未找到: {e}")
        print()


def test_text_embedding():
    """测试文本向量化"""
    print("=" * 50)
    print("测试文本向量化")
    print("=" * 50)
    
    # 测试单个文本
    data = {"text": "今天天气真好"}
    response = requests.post(f"{BASE_URL}/embed/text", data=data)
    result = response.json()
    print(f"单个文本: {data['text']}")
    print(f"向量维度: {result['dim']}")
    print(f"向量数量: {len(result['vectors'])}")
    print()
    
    # 测试多个文本（使用 list 形式传递多个同名参数）
    texts = ["今天天气真好", "我喜欢吃苹果", "人工智能很有趣"]
    response = requests.post(f"{BASE_URL}/embed/text", data=[("text", t) for t in texts])
    result = response.json()
    print(f"多个文本: {texts}")
    print(f"向量维度: {result['dim']}")
    print(f"向量数量: {len(result['vectors'])}")
    print()


if __name__ == "__main__":
    # 首先检查服务是否运行
    try:
        response = requests.get(f"{BASE_URL}/health")
        health = response.json()
        print("服务健康状态:")
        print(f"  状态: {health['status']}")
        print(f"  文本模型已加载: {health['text_model_loaded']}")
        print(f"  视觉模型已加载: {health['visual_model_loaded']}")
        print()
    except Exception as e:
        print(f"无法连接到服务: {e}")
        print("请确保服务已启动（运行 uvicorn app.main:app）")
        exit(1)
    
    # 运行文本向量化测试
    test_text_embedding()
    
    # 运行文本相似度测试
    test_text_similarity()
    
    # 运行图片相似度测试
    test_image_similarity_with_files()
    test_image_similarity_with_url()
    test_image_similarity_with_base64()
