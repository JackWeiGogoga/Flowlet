# 数据转换节点改进方案实现

## 📋 改进概览

本次改进针对**数据转换节点（Transform Node）**，从原来需要手写 JSON + SpEL 表达式的方式，升级为**渐进式可视化配置**，大幅降低了使用门槛。

---

## ✨ 核心改进

### 1️⃣ 前端：可视化配置界面

**新增组件：**

- `flowlet-frontend/src/components/NodeConfigPanel/components/TransformNodeConfig.tsx`
- `flowlet-frontend/src/components/NodeConfigPanel/components/TransformNodeConfig.css`

**主要特性：**

- ✅ **字段映射模式**：可视化选择源字段 → 目标字段
- ✅ **高级表达式模式**：保留 SpEL 脚本能力
- ✅ **树形字段选择器**：自动解析上游节点数据结构
- ✅ **实时预览**：配置完成后立即查看转换结果
- ✅ **智能提示**：显示字段类型和示例值

### 2️⃣ 后端：增强的转换引擎

**更新文件：**

- `flowlet-backend/src/main/java/com/flowlet/engine/handler/TransformNodeHandler.java`

**功能增强：**

- ✅ 支持两种模式：`mapping` 和 `advanced`
- ✅ 字段映射模式：自动从路径提取值（如 `api_node.body.data.userId`）
- ✅ 高级模式：完整的 SpEL 脚本支持
- ✅ 智能字段提取：支持嵌套对象和数组访问
- ✅ 错误处理：映射失败时返回 null 而不中断流程

---

## 🎯 用户体验对比

### 旧方案（手写 JSON）

```json
// 用户需要手写完整的 JSON 配置
{
  "mappings": [
    {
      "source": "#api_node.body.data.userId",
      "target": "userId"
    },
    {
      "source": "#api_node.body.data.userName",
      "target": "name"
    }
  ]
}
```

**问题：**

- ❌ 需要记住 SpEL 语法
- ❌ 不知道上游节点有哪些字段
- ❌ 容易出现格式错误
- ❌ 调试困难

### 新方案（可视化配置）

**字段映射模式：**

```
┌─────────────────────────────────────────────┐
│  映射 #1                                     │
├─────────────────────────────────────────────┤
│  源节点: [API节点 ▼]                         │
│  源字段: [body.data.userId ▼] (树形选择)     │
│         →                                   │
│  目标字段: [userId        ]                  │
└─────────────────────────────────────────────┘
```

**优势：**

- ✅ 点击选择，无需手写
- ✅ 自动提示可用字段
- ✅ 实时预览转换结果
- ✅ 学习成本低

---

## 📊 技术实现

### 前端架构

```
TransformNodeConfig (主组件)
│
├─ Mode Selection (模式选择)
│  ├─ mapping (字段映射)
│  └─ advanced (高级表达式)
│
├─ Mapping Mode (映射模式)
│  ├─ Field Selector (字段选择器)
│  │  ├─ Tree Data (树形数据)
│  │  └─ Sample Data (示例数据)
│  │
│  ├─ Mapping Items (映射列表)
│  │  ├─ Source Node (源节点)
│  │  ├─ Source Field (源字段)
│  │  ├─ Target Field (目标字段)
│  │  └─ Expression (可选表达式)
│  │
│  └─ Preview (预览)
│
└─ Advanced Mode (高级模式)
   ├─ SpEL Editor (SpEL 编辑器)
   └─ Syntax Help (语法帮助)
```

### 后端处理流程

```
TransformNodeHandler.execute()
│
├─ 检测配置模式 (mode: mapping | advanced)
│
├─ Mapping Mode
│  ├─ 遍历映射列表
│  ├─ 提取源字段值 (extractSourceValue)
│  │  ├─ 解析路径: nodeId.field.subfield
│  │  ├─ 获取节点输出
│  │  └─ 使用 SpEL 提取嵌套字段
│  │
│  └─ 应用转换表达式 (可选)
│
└─ Advanced Mode
   ├─ 解析 SpEL 脚本
   ├─ 构建评估上下文
   └─ 执行脚本并返回结果
```

---

## 📝 配置数据结构

### 字段映射模式

```json
{
  "mode": "mapping",
  "mappings": [
    {
      "id": "1234567890",
      "source": "api_node.body.data.userId",
      "target": "userId",
      "expression": ""
    },
    {
      "id": "1234567891",
      "source": "api_node.body.data.profile.score",
      "target": "isVip",
      "expression": "#value > 1000"
    }
  ]
}
```

### 高级表达式模式

```json
{
  "mode": "advanced",
  "advancedScript": "{\n  \"userId\": #api_node.body.data.id,\n  \"fullName\": #api_node.body.firstName + ' ' + #api_node.body.lastName\n}"
}
```

---

## 🚀 使用示例

### 场景：API 节点返回用户数据，需要提取关键字段

**步骤 1：执行上游 API 节点测试**

```json
// API 节点输出
{
  "statusCode": 200,
  "body": {
    "code": 0,
    "data": {
      "userId": 12345,
      "userName": "张三",
      "email": "zhangsan@example.com",
      "profile": {
        "avatar": "https://...",
        "level": "vip",
        "score": 1500
      }
    }
  }
}
```

**步骤 2：配置数据转换节点**

选择"字段映射"模式，添加以下映射：

| #   | 源节点   | 源字段                  | 目标字段  | 转换表达式    |
| --- | -------- | ----------------------- | --------- | ------------- |
| 1   | api_node | body.data.userId        | userId    | -             |
| 2   | api_node | body.data.userName      | name      | -             |
| 3   | api_node | body.data.email         | email     | -             |
| 4   | api_node | body.data.profile.level | userLevel | -             |
| 5   | api_node | body.data.profile.score | isVip     | #value > 1000 |

**步骤 3：预览结果**

```json
{
  "userId": 12345,
  "name": "张三",
  "email": "zhangsan@example.com",
  "userLevel": "vip",
  "isVip": true
}
```

---

## 🛠️ 开发者指南

### 如何扩展字段选择器

如果需要支持更复杂的数据结构展示：

```typescript
// 在 convertToTreeData 函数中添加自定义逻辑
const convertToTreeData = (obj: any, prefix: string = "") => {
  // 1. 检测特殊类型（如日期、文件等）
  // 2. 自定义图标和标签
  // 3. 添加操作按钮（如复制路径）

  return treeData;
};
```

### 如何添加内置转换函数

在后端 `TransformNodeHandler` 中注册自定义函数：

```java
StandardEvaluationContext evalContext = new StandardEvaluationContext();

// 注册自定义函数
evalContext.registerFunction("formatDate",
    TransformNodeHandler.class.getDeclaredMethod("formatDate", Long.class));

// 使用
// #formatDate(#timestamp)
```

---

## 📚 文档

完整使用指南：[docs/TRANSFORM_NODE_GUIDE.md](./TRANSFORM_NODE_GUIDE.md)

包含：

- ✅ 快速开始
- ✅ SpEL 语法参考
- ✅ 常见问题解答
- ✅ 最佳实践
- ✅ 进阶技巧

---

## 🔄 向后兼容

### 现有流程无需修改

旧的配置格式仍然支持：

```json
{
  "mappings": [{ "source": "#api_node.body.id", "target": "userId" }]
}
```

后端会自动识别并处理。新增的 `mode` 字段默认值为 `"mapping"`。

---

## 🎯 性能优化

1. **树形数据懒加载**

   - 只在展开节点时加载子节点
   - 减少初始渲染时间

2. **表达式缓存**

   - SpEL 表达式解析结果缓存
   - 避免重复解析

3. **示例数据限制**
   - 树形展示最多 100 个节点
   - 字符串值截断到 30 字符

---

## 🐛 已知问题

1. **深层嵌套对象**

   - 超过 10 层嵌套可能导致性能下降
   - 解决：限制树形深度 + 手动输入路径

2. **大数组处理**
   - 数组元素超过 1000 时仅展示前 10 个
   - 解决：使用分页或搜索功能

---

## 🚧 未来规划

### Phase 2: 智能推荐

- [ ] AI 建议常用映射
- [ ] 自动检测字段类型不匹配
- [ ] 智能生成转换表达式

### Phase 3: 批量操作

- [ ] 批量导入映射配置
- [ ] 导出为 JSON/CSV
- [ ] 映射模板库

### Phase 4: 可视化调试

- [ ] 字段级别的调试
- [ ] 数据流追踪
- [ ] 性能分析

---

## 📞 反馈

如有问题或建议，请：

1. 查看 [使用指南](./TRANSFORM_NODE_GUIDE.md)
2. 提交 Issue
3. 联系开发团队

---

**总结：** 本次改进将数据转换节点从"开发者专用"升级为"人人可用"，同时保留了高级功能的灵活性。这是 Flowlet 迈向低代码平台的重要一步！🎉
