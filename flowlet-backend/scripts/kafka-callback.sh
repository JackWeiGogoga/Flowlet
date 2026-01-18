#!/bin/bash

# Kafka 回调测试脚本
# 用法: ./kafka-callback.sh <callbackKey> [success] [result]
# 例如: ./kafka-callback.sh abc123xyz
#       ./kafka-callback.sh abc123xyz true "处理成功"
#       ./kafka-callback.sh abc123xyz false "处理失败"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
KAFKA_CONTAINER="kafka"
CALLBACK_TOPIC="flowlet-test-callback"
BOOTSTRAP_SERVER="localhost:9092"

# 检查参数
if [ -z "$1" ]; then
    echo -e "${YELLOW}用法:${NC}"
    echo "  $0 <callbackKey> [success] [result]"
    echo ""
    echo -e "${YELLOW}参数:${NC}"
    echo "  callbackKey  - 回调唯一标识 (必填)"
    echo "  success      - 是否成功: true/false (可选, 默认 true)"
    echo "  result       - 返回结果信息 (可选, 默认 '处理完成')"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  $0 abc123xyz"
    echo "  $0 abc123xyz true '订单处理成功'"
    echo "  $0 abc123xyz false '库存不足'"
    exit 1
fi

CALLBACK_KEY=$1
SUCCESS=${2:-true}
RESULT=${3:-"处理完成"}

# 构建 JSON 消息 (压缩成一行)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
JSON_MESSAGE="{\"callbackKey\":\"${CALLBACK_KEY}\",\"success\":${SUCCESS},\"timestamp\":\"${TIMESTAMP}\",\"data\":{\"result\":\"${RESULT}\",\"processedAt\":\"${TIMESTAMP}\"}}"

echo -e "${GREEN}发送 Kafka 回调消息...${NC}"
echo -e "${YELLOW}Topic:${NC} ${CALLBACK_TOPIC}"
echo -e "${YELLOW}CallbackKey:${NC} ${CALLBACK_KEY}"
echo -e "${YELLOW}消息内容:${NC}"
echo "${JSON_MESSAGE}" | jq . 2>/dev/null || echo "${JSON_MESSAGE}"
echo ""

# 发送消息 (使用 echo -n 避免额外换行)
echo -n "${JSON_MESSAGE}" | docker exec -i ${KAFKA_CONTAINER} kafka-console-producer.sh \
    --topic ${CALLBACK_TOPIC} \
    --bootstrap-server ${BOOTSTRAP_SERVER} \
    2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 回调消息发送成功!${NC}"
else
    echo -e "${RED}❌ 回调消息发送失败!${NC}"
    echo -e "${YELLOW}请检查:${NC}"
    echo "  1. Kafka 容器是否运行: docker ps | grep kafka"
    echo "  2. Topic 是否存在: docker exec -it ${KAFKA_CONTAINER} kafka-topics.sh --list --bootstrap-server ${BOOTSTRAP_SERVER}"
    exit 1
fi
