#!/bin/bash

# Kafka 消息监听脚本
# 用法: ./kafka-listen.sh [topic]
# 例如: ./kafka-listen.sh flowlet-test
#       ./kafka-listen.sh flowlet-callback

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
KAFKA_CONTAINER="kafka"
BOOTSTRAP_SERVER="localhost:9092"
DEFAULT_TOPIC="flowlet-test"

TOPIC=${1:-$DEFAULT_TOPIC}

echo -e "${GREEN}开始监听 Kafka 消息...${NC}"
echo -e "${YELLOW}Topic:${NC} ${TOPIC}"
echo -e "${YELLOW}按 Ctrl+C 退出${NC}"
echo "-------------------------------------------"

docker exec -it ${KAFKA_CONTAINER} kafka-console-consumer.sh \
    --topic ${TOPIC} \
    --bootstrap-server ${BOOTSTRAP_SERVER} \
    --from-beginning
