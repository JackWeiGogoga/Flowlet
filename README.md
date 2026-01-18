# Flowlet - 可视化内容处理流程编排系统

Flowlet 是一个轻量级的可视化流程编排系统，支持通过拖拽方式设计和执行数据处理流程。

## 项目结构

```
Flowlet/
├── flowlet-backend/           # 后端服务 (Spring Boot 3.x)
│   ├── docker/                # Docker 部署配置
│   │   └── docker-compose-kafka.yml
│   ├── scripts/               # 测试辅助脚本
│   │   ├── kafka-init.sh      # Kafka Topic 初始化
│   │   ├── kafka-listen.sh    # 消息监听脚本
│   │   └── kafka-callback.sh  # 回调测试脚本
│   └── src/main/java/com/flowlet/
│       ├── config/            # 配置类
│       ├── controller/        # REST 控制器
│       ├── engine/            # 流程执行引擎
│       │   ├── handler/       # 节点处理器
│       │   └── kafka/         # Kafka 动态客户端
│       ├── entity/            # 数据实体
│       ├── service/           # 业务服务
│       └── mapper/            # MyBatis 映射
└── flowlet-frontend/          # 前端应用 (React + TypeScript)
```

## 功能特性

### 核心功能

- 🎨 **可视化流程设计** - 基于 React Flow 的拖拽式流程编辑器
- 🚀 **流程执行引擎** - 支持同步和异步节点执行
- 🔄 **异步回调机制** - 支持 HTTP 和 Kafka 两种回调模式
- ⏸️ **暂停恢复执行** - 等待外部回调后自动恢复流程
- 📊 **执行监控** - 实时查看流程和节点执行状态
- 🔧 **动态 Kafka 配置** - 支持流程节点级别的 Kafka 配置

### 支持的节点类型

| 节点类型                     | 说明               | 特性                                  |
| ---------------------------- | ------------------ | ------------------------------------- |
| **开始节点** (start)         | 流程入口           | 接收外部输入参数                      |
| **结束节点** (end)           | 流程出口           | 输出最终结果                          |
| **API 节点** (api)           | HTTP 接口调用      | 支持 GET/POST/PUT/DELETE，模板变量    |
| **Kafka 节点** (kafka)       | 消息发送与异步等待 | 支持 HTTP/Kafka 回调，动态配置 Broker |
| **条件节点** (condition)     | 条件判断分支       | 支持表达式判断                        |
| **数据转换节点** (transform) | 数据映射与转换     | 支持 JSON 模板                        |

## 技术方案

### 后端技术栈

| 技术         | 版本  | 说明            |
| ------------ | ----- | --------------- |
| Java         | 17+   | 编程语言        |
| Spring Boot  | 3.x   | 应用框架        |
| MyBatis Plus | 3.5.x | ORM 框架        |
| SQLite       | -     | 轻量级数据库    |
| Apache Kafka | 3.6   | 消息队列 (可选) |
| WebFlux      | -     | 异步 HTTP 调用  |

### 前端技术栈

| 技术       | 版本 | 说明         |
| ---------- | ---- | ------------ |
| React      | 18   | UI 框架      |
| TypeScript | -    | 类型安全     |
| Vite       | -    | 构建工具     |
| React Flow | -    | 流程图编辑器 |
| Ant Design | -    | UI 组件库    |
| Zustand    | -    | 状态管理     |

### 异步回调架构

系统支持两种异步回调模式：

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Kafka 回调处理架构                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐     ┌─────────────────────────┐           │
│  │   CallbackConsumer      │     │ DynamicKafkaConsumer    │           │
│  │   (静态消费者)           │     │ Factory (动态消费者)     │           │
│  ├─────────────────────────┤     ├─────────────────────────┤           │
│  │ • Spring @KafkaListener │     │ • 手动创建 Consumer     │           │
│  │ • 固定 Topic:           │     │ • 任意 Topic:           │           │
│  │   flowlet-callback      │     │   用户自定义配置         │           │
│  │ • 全局共享              │     │ • 按需创建              │           │
│  └───────────┬─────────────┘     └───────────┬─────────────┘           │
│              │                               │                         │
│              └───────────────┬───────────────┘                         │
│                              ▼                                         │
│                 ┌─────────────────────────┐                            │
│                 │ FlowExecutionService    │                            │
│                 │   .handleCallback()     │                            │
│                 └─────────────────────────┘                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 回调模式对比

| 回调类型       | 适用场景              | 配置方式           |
| -------------- | --------------------- | ------------------ |
| **HTTP 回调**  | 外部系统调用 REST API | 自动生成回调 URL   |
| **Kafka 回调** | 消息队列异步处理      | 配置 callbackTopic |

### 数据库表结构

| 表名              | 说明         |
| ----------------- | ------------ |
| `flow_definition` | 流程定义     |
| `flow_execution`  | 流程执行实例 |
| `node_execution`  | 节点执行记录 |
| `async_callback`  | 异步回调记录 |

## 快速开始

### 环境要求

- Java 17+
- Node.js 18+
- Docker (可选，用于 Kafka)

### Docker 一键部署（单机全套，推荐）

```bash
MODE=domain \
APP_DOMAIN=flowlet.gogoga.top \
AUTH_DOMAIN=auth.gogoga.top \
ACME_EMAIL=admin@gogoga.top \
./scripts/flowlet-docker.sh up
```

详细说明见：`docs/DOCKER_DEPLOY.md`

### 后端启动

```bash
cd flowlet-backend

# 编译
mvn clean package -DskipTests

# 运行
java -jar target/flowlet-backend-1.0.0.jar

# 或使用 Maven 直接运行
mvn spring-boot:run
```

后端服务将在 http://localhost:8080 启动

### 前端启动

```bash
cd flowlet-frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

前端服务将在 http://localhost:5173 启动

### Kafka 环境 (可选)

```bash
cd flowlet-backend/docker

# 启动 Kafka (KRaft 模式，无需 Zookeeper)
docker-compose -f docker-compose-kafka.yml up -d

# 初始化 Topic
cd ../scripts
chmod +x *.sh
./kafka-init.sh
```

Kafka UI 访问: http://localhost:8090

## API 接口

### 流程定义

| 方法   | 路径                    | 说明         |
| ------ | ----------------------- | ------------ |
| POST   | /api/flows              | 创建流程     |
| PUT    | /api/flows/{id}         | 更新流程     |
| GET    | /api/flows/{id}         | 获取流程详情 |
| GET    | /api/flows              | 分页查询流程 |
| DELETE | /api/flows/{id}         | 删除流程     |
| POST   | /api/flows/{id}/publish | 发布流程     |
| POST   | /api/flows/{id}/disable | 禁用流程     |

### 流程执行

| 方法 | 路径                           | 说明             |
| ---- | ------------------------------ | ---------------- |
| POST | /api/executions                | 执行流程         |
| GET  | /api/executions/{id}           | 获取执行详情     |
| GET  | /api/executions/{id}/nodes     | 获取节点执行记录 |
| POST | /api/executions/callback/{key} | HTTP 回调接口    |
| POST | /api/executions/{id}/resume    | 恢复暂停的执行   |

### 通用回调接口

| 方法 | 路径                | 说明                    |
| ---- | ------------------- | ----------------------- |
| POST | /api/callback/{key} | 通用回调 (JSON Body)    |
| GET  | /api/callback/{key} | 通用回调 (Query Params) |

## 测试脚本使用

### 1. kafka-init.sh - Topic 初始化

```bash
cd flowlet-backend/scripts
./kafka-init.sh
```

创建以下 Topic:

- `flowlet-test` - 测试消息 Topic
- `flowlet-callback` - 默认回调 Topic

### 2. kafka-listen.sh - 消息监听

```bash
# 监听默认 Topic
./kafka-listen.sh

# 监听指定 Topic
./kafka-listen.sh flowlet-callback
./kafka-listen.sh flowlet-test
```

### 3. kafka-callback.sh - 回调测试

```bash
# 基本用法
./kafka-callback.sh <callbackKey>

# 带结果参数
./kafka-callback.sh <callbackKey> true "处理成功"
./kafka-callback.sh <callbackKey> false "处理失败"

# 示例
./kafka-callback.sh abc123xyz true "订单处理完成"
```

发送的消息格式:

```json
{
  "callbackKey": "abc123xyz",
  "success": true,
  "timestamp": "2025-12-14T10:00:00Z",
  "data": {
    "result": "订单处理完成",
    "processedAt": "2025-12-14T10:00:00Z"
  }
}
```

## 测试流程

### 1. 创建测试流程

```bash
curl -X POST http://localhost:8080/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kafka回调测试流程",
    "description": "测试Kafka节点的异步回调功能",
    "graphData": {
      "nodes": [
        {"id": "start", "type": "start", "data": {"label": "开始"}, "position": {"x": 250, "y": 0}},
        {"id": "kafka-1", "type": "kafka", "data": {"label": "发送Kafka消息", "config": {
          "brokers": "localhost:9093",
          "topic": "flowlet-test",
          "messageTemplate": "{\"orderId\": \"{{orderId}}\", \"action\": \"process\"}",
          "waitForCallback": true,
          "callbackType": "kafka",
          "callbackTopic": "flowlet-callback",
          "callbackKeyField": "callbackKey"
        }}, "position": {"x": 250, "y": 100}},
        {"id": "end", "type": "end", "data": {"label": "结束"}, "position": {"x": 250, "y": 200}}
      ],
      "edges": [
        {"id": "e1", "source": "start", "target": "kafka-1"},
        {"id": "e2", "source": "kafka-1", "target": "end"}
      ]
    }
  }'
```

### 2. 发布流程

```bash
curl -X POST http://localhost:8080/api/flows/{flowId}/publish
```

### 3. 执行流程

```bash
curl -X POST http://localhost:8080/api/executions \
  -H "Content-Type: application/json" \
  -d '{
    "flowId": "{flowId}",
    "inputs": {"orderId": "ORD-12345"}
  }'
```

### 4. 查看执行状态

```bash
# 流程应该处于 paused 状态
curl http://localhost:8080/api/executions/{executionId}

# 查看节点执行记录
curl http://localhost:8080/api/executions/{executionId}/nodes
```

### 5. 发送回调

方式一: HTTP 回调

```bash
curl -X POST http://localhost:8080/api/callback/{callbackKey} \
  -H "Content-Type: application/json" \
  -d '{"success": true, "result": "订单处理完成"}'
```

方式二: Kafka 回调

```bash
./scripts/kafka-callback.sh {callbackKey} true "订单处理完成"
```

### 6. 验证流程完成

```bash
# 流程应该变为 completed 状态
curl http://localhost:8080/api/executions/{executionId}
```

## 配置说明

### application.yml 主要配置

```yaml
server:
  port: 8080

spring:
  # 数据库配置 (SQLite)
  datasource:
    url: jdbc:sqlite:./data/flowlet.db
    driver-class-name: org.sqlite.JDBC

  # Kafka 配置 (可选)
  kafka:
    enabled: true # 设置为 true 启用 Kafka
    bootstrap-servers: localhost:9092
    consumer:
      group-id: flowlet-callback-group
      auto-offset-reset: latest

# Flowlet 自定义配置
flowlet:
  kafka:
    callback-topic: flowlet-callback # 默认回调 Topic
```

### Kafka 节点配置项

| 配置项           | 说明                                  | 必填              |
| ---------------- | ------------------------------------- | ----------------- |
| brokers          | Kafka Broker 地址                     | ✅                |
| topic            | 发送消息的 Topic                      | ✅                |
| messageTemplate  | 消息内容模板                          | ✅                |
| waitForCallback  | 是否等待回调                          | ❌                |
| callbackType     | 回调类型 (http/kafka)                 | ❌                |
| callbackTopic    | Kafka 回调 Topic                      | 仅 kafka 模式必填 |
| callbackKeyField | 回调消息中的关联字段                  | ❌                |
| keyExpression    | 消息 Key 表达式                       | ❌                |
| authType         | 认证类型 (none/sasl_plain/sasl_scram) | ❌                |
| username         | SASL 用户名                           | ❌                |
| password         | SASL 密码                             | ❌                |

## 流程图数据结构

```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "start",
      "data": {
        "label": "开始"
      },
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node-2",
      "type": "kafka",
      "data": {
        "label": "发送消息",
        "config": {
          "brokers": "localhost:9093",
          "topic": "my-topic",
          "messageTemplate": "{\"data\": \"{{inputData}}\"}",
          "waitForCallback": true,
          "callbackType": "kafka",
          "callbackTopic": "my-callback-topic"
        }
      },
      "position": { "x": 100, "y": 200 }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2"
    }
  ]
}
```

## 执行状态说明

### 流程执行状态 (ExecutionStatus)

| 状态      | 说明             |
| --------- | ---------------- |
| pending   | 等待执行         |
| running   | 执行中           |
| paused    | 暂停（等待回调） |
| completed | 执行完成         |
| failed    | 执行失败         |
| cancelled | 已取消           |

### 节点执行状态 (NodeExecutionStatus)

| 状态      | 说明     |
| --------- | -------- |
| pending   | 等待执行 |
| running   | 执行中   |
| waiting   | 等待回调 |
| completed | 执行完成 |
| failed    | 执行失败 |
| skipped   | 已跳过   |

## 常见问题排查

### 1. 回调不生效

检查日志关键词：

| 日志关键词               | 问题                       |
| ------------------------ | -------------------------- |
| `未找到待处理的回调记录` | callbackKey 不正确或已处理 |
| `回调已过期`             | 超过了设置的超时时间       |
| `执行实例状态不是暂停`   | 流程未处于暂停状态         |

### 2. Kafka 连接失败

- 检查 Broker 地址是否正确
- Docker 内部访问使用: `kafka:9092`
- 外部访问使用: `localhost:9093`

### 3. 流程执行失败

```bash
# 查看节点执行详情
curl http://localhost:8080/api/executions/{executionId}/nodes

# 检查后端日志
tail -f logs/flowlet.log
```

## License

MIT License
