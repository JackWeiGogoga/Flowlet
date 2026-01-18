#!/bin/bash

# Kafka Topic 初始化脚本
# 创建 Flowlet 测试所需的 Topic

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
KAFKA_CONTAINER="kafka"
BOOTSTRAP_SERVER="localhost:9092"

# 要创建的 Topics
TOPICS=(
    "flowlet-test"
    "flowlet-callback"
)

echo -e "${GREEN}初始化 Kafka Topics...${NC}"
echo ""

for TOPIC in "${TOPICS[@]}"; do
    echo -e "${YELLOW}创建 Topic: ${TOPIC}${NC}"
    
    docker exec -it ${KAFKA_CONTAINER} kafka-topics.sh --create \
        --topic ${TOPIC} \
        --bootstrap-server ${BOOTSTRAP_SERVER} \
        --partitions 1 \
        --replication-factor 1 \
        --if-not-exists \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ ${TOPIC} 创建成功${NC}"
    else
        echo -e "${YELLOW}  ⚠️  ${TOPIC} 可能已存在${NC}"
    fi
done

echo ""
echo -e "${GREEN}当前所有 Topics:${NC}"
docker exec -it ${KAFKA_CONTAINER} kafka-topics.sh --list --bootstrap-server ${BOOTSTRAP_SERVER}
