#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Visual BGE 快速测试脚本
请确保已将 Visualized_base_en_v1.5.pth 放置在正确的路径
"""

import torch
from visual_bge.modeling import Visualized_BGE
import os

# 配置模型路径
MODEL_WEIGHT_PATH = "./data/bge-visualized/Visualized_m3.pth"  # 请根据实际情况修改
MODEL_NAME_BGE = "BAAI/bge-m3"


def test_composed_image_retrieval():
    """测试组合图像检索功能"""
    print("=" * 50)
    print("测试 1: Composed Image Retrieval")
    print("=" * 50)

    model = Visualized_BGE(model_name_bge=MODEL_NAME_BGE,
                           model_weight=MODEL_WEIGHT_PATH)
    model.eval()

    with torch.no_grad():
        query_emb = model.encode(
            image="./imgs/cir_query.png",
            text="Make the background dark, as if the camera has taken the photo at night"
        )
        candi_emb_1 = model.encode(image="./imgs/cir_candi_1.png")
        candi_emb_2 = model.encode(image="./imgs/cir_candi_2.png")

    assert query_emb is not None and candi_emb_1 is not None and candi_emb_2 is not None
    sim_1 = query_emb @ candi_emb_1.T
    sim_2 = query_emb @ candi_emb_2.T

    print(f"查询 vs 候选图1 相似度: {sim_1.item():.4f}")
    print(f"查询 vs 候选图2 相似度: {sim_2.item():.4f}")
    print(f"预期: 约 0.8750 和 0.7816")
    print("✓ 测试完成\n")

    return model  # 返回模型供下一个测试使用


def test_multimodal_knowledge_retrieval(model=None):
    """测试多模态知识检索功能"""
    print("=" * 50)
    print("测试 2: Multi-Modal Knowledge Retrieval")
    print("=" * 50)

    if model is None:
        model = Visualized_BGE(model_name_bge=MODEL_NAME_BGE,
                               model_weight=MODEL_WEIGHT_PATH)
        model.eval()

    with torch.no_grad():
        query_emb = model.encode(
            text="Are there sidewalks on both sides of the Mid-Hudson Bridge?")
        candi_emb_1 = model.encode(
            text="The Mid-Hudson Bridge, spanning the Hudson River between Poughkeepsie and Highland.",
            image="./imgs/wiki_candi_1.jpg"
        )
        candi_emb_2 = model.encode(
            text="Golden_Gate_Bridge", image="./imgs/wiki_candi_2.jpg")
        candi_emb_3 = model.encode(
            text="The Mid-Hudson Bridge was designated as a New York State Historic Civil Engineering Landmark by the American Society of Civil Engineers in 1983."
        )

    assert query_emb is not None and candi_emb_1 is not None and candi_emb_2 is not None and candi_emb_3 is not None
    sim_1 = query_emb @ candi_emb_1.T
    sim_2 = query_emb @ candi_emb_2.T
    sim_3 = query_emb @ candi_emb_3.T

    print(f"查询 vs 候选1 (Mid-Hudson Bridge + 图片) 相似度: {sim_1.item():.4f}")
    print(f"查询 vs 候选2 (Golden Gate Bridge + 图片) 相似度: {sim_2.item():.4f}")
    print(f"查询 vs 候选3 (Mid-Hudson Bridge 纯文本) 相似度: {sim_3.item():.4f}")
    print(f"预期: 约 0.6932, 0.4441, 0.6415")
    print("✓ 测试完成\n")


def test_text_only_retrieval(model=None):
    """测试纯文本检索功能（验证 BGE 原有能力）"""
    print("=" * 50)
    print("测试 3: Text-Only Retrieval (验证 BGE 原有能力)")
    print("=" * 50)

    if model is None:
        model = Visualized_BGE(model_name_bge=MODEL_NAME_BGE,
                               model_weight=MODEL_WEIGHT_PATH)
        model.eval()

    with torch.no_grad():
        query = model.encode(text="What is artificial intelligence?")
        doc1 = model.encode(
            text="Artificial intelligence is the simulation of human intelligence by machines.")
        doc2 = model.encode(text="Pizza is a popular Italian dish.")

    assert query is not None and doc1 is not None and doc2 is not None
    sim_1 = query @ doc1.T
    sim_2 = query @ doc2.T

    print(f"查询 vs 相关文档 相似度: {sim_1.item():.4f}")
    print(f"查询 vs 不相关文档 相似度: {sim_2.item():.4f}")
    print("✓ 测试完成\n")


def main():
    """主测试函数"""
    # 检查模型权重文件是否存在
    if not os.path.exists(MODEL_WEIGHT_PATH):
        print(f"错误: 模型权重文件不存在: {MODEL_WEIGHT_PATH}")
        print(
            f"请将 Visualized_base_en_v1.5.pth 放置在: {os.path.abspath(MODEL_WEIGHT_PATH)}")
        return

    print("\n" + "=" * 50)
    print("Visual BGE 测试开始")
    print("=" * 50 + "\n")

    try:
        # 运行所有测试
        model = test_composed_image_retrieval()
        test_multimodal_knowledge_retrieval(model)
        test_text_only_retrieval(model)

        print("=" * 50)
        print("✓ 所有测试完成！")
        print("=" * 50)

    except Exception as e:
        print(f"\n❌ 测试出错: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
