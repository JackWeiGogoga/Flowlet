#!/bin/bash

# Flowlet Kafka 测试脚本

echo "======================================"
echo "Flowlet Kafka 节点测试"
echo "======================================"

# 1. 检查 Kafka 是否运行
echo -e "\n[1] 检查 Kafka 状态..."
if docker ps | grep -q kafka; then
    echo "✅ Kafka 正在运行"
else
    echo "❌ Kafka 未运行，请先启动 Kafka"
    exit 1
fi

# 2. 检查后端是否运行
echo -e "\n[2] 检查后端服务..."
if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "✅ 后端服务正在运行"
else
    echo "❌ 后端服务未运行，请先启动后端"
    echo "   cd flowlet-backend && mvn spring-boot:run"
    exit 1
fi

# 3. 创建测试 Topic
echo -e "\n[3] 创建测试 Topic..."
docker exec kafka kafka-topics.sh --create --topic flowlet-test --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1 2>/dev/null || echo "Topic 已存在"

# 4. 列出 Topics
echo -e "\n[4] 当前 Topics 列表:"
docker exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092

# 5. 启动消费者监听 (后台)
echo -e "\n[5] 启动消息监听 (5秒后自动退出)..."
echo "等待接收消息..."
timeout 5 docker exec kafka kafka-console-consumer.sh --topic flowlet-test --from-beginning --bootstrap-server localhost:9092 2>/dev/null || true

echo -e "\n======================================"
echo "测试环境准备完成!"
echo ""
echo "访问地址:"
echo "  - 前端: http://localhost:5173"
echo "  - 后端: http://localhost:8080"
echo "  - Kafka UI: http://localhost:8090"
echo ""
echo "Kafka 连接配置:"
echo "  - Broker: localhost:9093"
echo "  - Topic: flowlet-test"
echo "======================================"
