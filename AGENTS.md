# Flowlet 项目指南

## 项目概览

- 业务定位: 可视化内容处理流程编排系统，支持拖拽设计流程、执行、监控与异步回调。
- 核心能力: 流程定义/执行、节点编排、异步回调 (HTTP/Kafka)、执行状态跟踪、项目与权限控制。

## 目录结构

- `flowlet-backend/`: Spring Boot 后端 (REST API + 执行引擎)
- `flowlet-frontend/`: React 前端 (流程编辑器 + 管理界面)
- `docs/`: 文档 (认证/功能说明)

## 技术栈与版本 (以配置为准)

后端 (`flowlet-backend/pom.xml`):

- Java 17
- Spring Boot 3.5.9
- Spring Security + OAuth2 Resource Server + OAuth2 Client
- MyBatis Plus 3.5.5
- SQLite (sqlite-jdbc 3.44.1.0)
- Spring Kafka
- WebFlux (异步 HTTP)

前端 (`flowlet-frontend/package.json`):

- React 19.2.0
- TypeScript ~5.9.3
- Vite 7.2.4
- Ant Design 6.1.0
- react-icons 5.5.0(不要使用 @ant-design/icons)
- antd-style 3.7.1
- React Flow (@xyflow/react) 12.10.0
- Zustand 5.0.9
- OIDC 客户端: oidc-client-ts 3.4.1

## 认证与权限 (Keycloak)

- 认证服务: Keycloak (OIDC)
- 文档: `docs/AUTH_SYSTEM.md`
- 启动脚本: `flowlet-backend/docker/docker-compose-keycloak.yml`, `flowlet-backend/scripts/keycloak-init.sh`
- 角色: ADMIN / EDITOR / VIEWER
- 多租户: 通过 Keycloak Realm 实现隔离 (`TenantContextHolder`)

## 关键后端入口

- 启动类: `flowlet-backend/src/main/java/com/flowlet/FlowletApplication.java`
- 配置类: `flowlet-backend/src/main/java/com/flowlet/config/`
- 安全配置: `flowlet-backend/src/main/java/com/flowlet/config/SecurityConfig.java`
- 控制器: `flowlet-backend/src/main/java/com/flowlet/controller/`
- 核心引擎: `flowlet-backend/src/main/java/com/flowlet/engine/`
- 服务层: `flowlet-backend/src/main/java/com/flowlet/service/`

## 关键前端入口

- 入口: `flowlet-frontend/src/main.tsx`
- 路由与布局: `flowlet-frontend/src/App.tsx`, `flowlet-frontend/src/layouts/AppLayout/AppLayout.tsx`
- 状态管理: `flowlet-frontend/src/store/`
- 流程编辑: `flowlet-frontend/src/pages/FlowEditor/FlowEditor.tsx`
- 认证集成: `flowlet-frontend/src/auth/`

## 配置与启动

后端:

- 配置: `flowlet-backend/src/main/resources/application.yml`
- 启动: `mvn spring-boot:run` 或 `java -jar target/flowlet-backend-1.0.0.jar`
- 端口: `http://localhost:8080`

前端:

- 启动: `npm run dev`
- 端口: `http://localhost:5173`

Kafka (可选):

- Compose: `flowlet-backend/docker/docker-compose-kafka.yml`
- 脚本: `flowlet-backend/scripts/kafka-init.sh`, `kafka-listen.sh`, `kafka-callback.sh`

## 前端代码类型检查

开发完成后，需要执行 `npm run typecheck` 检查前端代码。

## 数据模型与流程

- 流程定义: `flow_definition`
- 执行实例: `flow_execution`
- 节点执行: `node_execution`
- 回调记录: `async_callback`
- 数据库 schema: `flowlet-backend/src/main/resources/schema.sql`

## 常见变更点 (开发提示)

- 新增节点类型:
  - 后端: `flowlet-backend/src/main/java/com/flowlet/engine/handler/`
  - 前端: `flowlet-frontend/src/config/nodeTypes.tsx` 与 `flowlet-frontend/src/components/NodeConfigPanel/`
- 权限/角色变更:
  - 后端: `flowlet-backend/src/main/java/com/flowlet/config/SecurityConfig.java`
  - 前端: `flowlet-frontend/src/auth/`
- 项目与成员:
  - 后端: `flowlet-backend/src/main/java/com/flowlet/controller/ProjectController.java`
  - 前端: `flowlet-frontend/src/components/ProjectSwitcher/`

## 约定与注意事项

- 认证走 OIDC，默认 Keycloak Realm 为 `flowlet`，多租户 Realm 为 `tenant-*`。
- API 基于 `Result` 包装返回 (`flowlet-backend/src/main/java/com/flowlet/dto/Result.java`)。
- 前端优先走 `services/` 中的 API 封装。

## 新版 Ant Design 组件参数相关

### message, modal, notification

使用全局上下文`AntdAppContextComponent`处理 message, modal, notification.

```ts
import { message } from "@/components/AppMessageContext/staticMethods";
message.error("请先添加节点");
```

避免出现警告 "Warning: [antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead."

### Alert 组件

```ts
<Alert
  type="warning"
  showIcon
  title="还没有可用的模型提供方"
  description="请先在系统设置中配置并启用模型提供方。"
/>
```

'message' is deprecated.ts(6385)
@deprecated — please use title instead.
