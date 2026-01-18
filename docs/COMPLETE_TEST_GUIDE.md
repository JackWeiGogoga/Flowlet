# 转换节点完整测试指南

## 🎯 修复内容总结

### ✅ 问题 1：未执行测试的提示

**状态：已修复**

- 在转换节点中添加了警告提示
- 当上游节点没有执行测试时，显示黄色 Alert
- 列出所有需要执行测试的节点

### ✅ 问题 2：测试结果持久化

**状态：已确认正常工作**

- debugOutput 会随流程一起保存到数据库
- 刷新页面后数据不会丢失
- 无需重复执行测试

### ✅ 问题 3：转换节点配置回显

**状态：已修复**

- 添加了 useEffect 初始化 mappings 数据
- 移除了不必要的隐藏 Input 字段
- 确保配置正确加载和显示

### ✅ 问题 4：转换输出字段引用

**状态：已修复**

- 转换节点现在动态显示配置的输出字段
- 每个字段显示来源信息
- 提供清晰的引用示例

---

## 🧪 完整测试流程

### 第 1 步：创建并配置 API 节点

1. **拖拽 API 节点到画布**

   - 从左侧节点面板拖拽
   - 放置在画布上

2. **配置 API 请求**

   ```
   请求方式: GET
   URL: https://jsonplaceholder.typicode.com/users/1
   ```

3. **执行测试**

   - 点击"测试执行"按钮
   - 等待执行完成
   - 查看响应结果

   **预期响应：**

   ```json
   {
     "statusCode": 200,
     "body": {
       "id": 1,
       "name": "Leanne Graham",
       "username": "Bret",
       "email": "Sincere@april.biz",
       "phone": "1-770-736-8031 x56442",
       "website": "hildegard.org",
       "address": {
         "street": "Kulas Light",
         "city": "Gwenborough",
         "zipcode": "92998-3874"
       },
       "company": {
         "name": "Romaguera-Crona",
         "catchPhrase": "Multi-layered client-server neural-net"
       }
     },
     "headers": {...}
   }
   ```

4. **保存流程**
   - 点击顶部"保存"按钮
   - 等待保存成功提示

---

### 第 2 步：配置转换节点

1. **添加转换节点并连接**

   - 拖拽转换节点到画布
   - 从 API 节点拖出连线到转换节点

2. **查看提示（如果显示）**

   - 如果 API 节点没有 debugOutput，会显示黄色警告
   - 按提示回到 API 节点执行测试

3. **配置字段映射 - 示例 1：提取用户信息**

   | #   | 源节点   | 源字段              | 目标字段      | 说明    |
   | --- | -------- | ------------------- | ------------- | ------- |
   | 1   | API 节点 | `body.id`           | `userId`      | 用户 ID |
   | 2   | API 节点 | `body.name`         | `userName`    | 用户名  |
   | 3   | API 节点 | `body.email`        | `userEmail`   | 邮箱    |
   | 4   | API 节点 | `body.address.city` | `city`        | 城市    |
   | 5   | API 节点 | `body.company.name` | `companyName` | 公司    |

   **操作步骤：**

   - 点击"添加第一个映射"
   - 选择源节点：选择 API 节点
   - 选择源字段：从树形列表中选择 `body.id`
   - 输入目标字段：`userId`
   - 点击"添加映射"继续添加其他字段

4. **预览转换结果**

   - 点击"预览转换结果"按钮
   - 查看输出数据结构

   **预期输出：**

   ```json
   {
     "userId": "{{api_node.body.id}}",
     "userName": "{{api_node.body.name}}",
     "userEmail": "{{api_node.body.email}}",
     "city": "{{api_node.body.address.city}}",
     "companyName": "{{api_node.body.company.name}}"
   }
   ```

5. **查看输出变量**

   - 滚动到配置面板底部
   - 查看"输出变量"部分
   - 确认显示了所有配置的字段

   **预期显示：**

   ```
   输出变量
   ───────────────────────────────────
   [userId]  dynamic
   来源: api_node.body.id

   [userName]  dynamic
   来源: api_node.body.name

   [userEmail]  dynamic
   来源: api_node.body.email

   [city]  dynamic
   来源: api_node.body.address.city

   [companyName]  dynamic
   来源: api_node.body.company.name
   ───────────────────────────────────
   后续节点可通过 {{transform_node.字段名}} 引用这些字段
   例如: {{transform_node.userId}}
   ```

6. **保存流程**
   - 点击顶部"保存"按钮

---

### 第 3 步：验证配置持久化

1. **刷新页面**

   - 按 F5 或点击刷新按钮
   - 等待页面重新加载

2. **检查 API 节点的 debugOutput**

   - 选中 API 节点
   - 查看是否仍然显示测试结果
   - （可选）打开浏览器控制台验证：
     ```javascript
     const store = useFlowStore.getState();
     const apiNode = store.nodes.find((n) => n.data.nodeType === "api");
     console.log("debugOutput 是否存在:", !!apiNode?.data?.debugOutput);
     ```

3. **检查转换节点配置**

   - 选中转换节点
   - 确认所有字段映射都正确显示
   - 确认源节点、源字段、目标字段都完整
   - 确认输出变量列表正确

   **✅ 成功标志：**

   - [ ] 5 个字段映射都正确显示
   - [ ] 每个映射的源节点和源字段都正确
   - [ ] 输出变量部分显示了 5 个字段
   - [ ] 字段顺序与配置时一致

---

### 第 4 步：在后续节点中使用转换结果

1. **添加 Kafka 节点**

   - 拖拽 Kafka 节点到画布
   - 从转换节点连线到 Kafka 节点

2. **配置 Kafka 消息**

   ```json
   {
     "userId": "{{transform_node.userId}}",
     "userName": "{{transform_node.userName}}",
     "email": "{{transform_node.userEmail}}",
     "location": "{{transform_node.city}}",
     "company": "{{transform_node.companyName}}",
     "timestamp": "{{$now}}"
   }
   ```

   **操作步骤：**

   - 在消息模板中输入 `{{`
   - 应该弹出变量选择器
   - 选择 `transform_node` 的各个字段

3. **保存并发布流程**
   - 保存流程
   - 点击"发布"按钮
   - 使用 Postman 或 cURL 测试流程

---

## 🔍 调试技巧

### 1. 查看节点数据结构

```javascript
// 在浏览器控制台执行
const { nodes } = useFlowStore.getState();

// 查看 API 节点
const apiNode = nodes.find((n) => n.data.nodeType === "api");
console.log("API 节点数据:", apiNode?.data);
console.log("debugOutput:", apiNode?.data?.debugOutput);

// 查看转换节点
const transformNode = nodes.find((n) => n.data.nodeType === "transform");
console.log("转换节点配置:", transformNode?.data?.config);
console.log("字段映射:", transformNode?.data?.config?.mappings);
```

### 2. 检查持久化数据

```javascript
// 查看当前流程的完整数据
const { currentFlow } = useFlowStore.getState();
console.log("流程定义:", currentFlow);

if (currentFlow?.graphData) {
  const graphData = JSON.parse(currentFlow.graphData);
  console.log("节点数据:", graphData.nodes);
  console.log("边数据:", graphData.edges);
}
```

### 3. 验证字段映射格式

```javascript
const transformNode = nodes.find((n) => n.data.nodeType === "transform");
const mappings = transformNode?.data?.config?.mappings;

if (mappings && Array.isArray(mappings)) {
  console.log("映射数量:", mappings.length);
  mappings.forEach((m, i) => {
    console.log(`映射 #${i + 1}:`, {
      id: m.id,
      source: m.source,
      target: m.target,
      expression: m.expression,
    });
  });
} else {
  console.error("❌ mappings 不是数组或不存在");
}
```

---

## ⚠️ 常见问题排查

### Q1: 刷新后 API 节点的 debugOutput 丢失？

**原因：** 保存流程前刷新了页面

**解决：**

1. 执行 API 节点测试
2. **立即点击"保存"按钮**
3. 等待保存成功提示
4. 然后刷新页面

### Q2: 转换节点配置保存后看不到？

**检查项：**

1. ✅ 是否点击了"保存"按钮？
2. ✅ 保存是否成功（有成功提示）？
3. ✅ 字段映射是否完整（源节点、源字段、目标字段都填写了）？

**调试：**

```javascript
// 检查配置是否保存
const node = nodes.find((n) => n.id === "transform_node_id");
console.log("config:", node?.data?.config);
console.log("mappings:", node?.data?.config?.mappings);
```

### Q3: 字段选择器显示"暂无示例数据"？

**原因：** 上游节点没有执行测试或 debugOutput 丢失

**解决：**

1. 回到上游节点（如 API 节点）
2. 点击"测试执行"
3. 保存流程
4. 返回转换节点

### Q4: 输出变量部分显示"尚未配置字段映射"？

**原因：** mappings 数组为空或格式不正确

**解决：**

1. 确认已添加至少一个字段映射
2. 确认每个映射的 target 字段不为空
3. 保存后刷新页面

### Q5: 后续节点无法引用转换后的字段？

**前端显示问题：**

- 确认输出变量部分显示了字段列表
- 确认字段名正确无误

**后端执行问题：**

- 后端需要支持 SpEL 变量解析
- 引用格式：`#transform_node.userId`（注意前缀是 `#` 而非 `{{`）
- 后端需要根据转换节点的配置动态解析字段

---

## 📊 测试检查清单

### 基础功能

- [ ] API 节点测试执行成功
- [ ] debugOutput 正确保存到节点 data
- [ ] 保存流程成功
- [ ] 刷新后 debugOutput 仍然存在

### 转换节点配置

- [ ] 显示未执行测试的警告提示
- [ ] 字段选择器正确展示树形结构
- [ ] 可以选择嵌套字段（如 body.address.city）
- [ ] 可以手动输入字段路径
- [ ] 添加多个字段映射
- [ ] 预览转换结果正确

### 配置持久化

- [ ] 保存流程后刷新页面
- [ ] 字段映射正确回显
- [ ] 源节点选择正确
- [ ] 源字段路径正确
- [ ] 目标字段名正确
- [ ] 映射顺序一致

### 输出变量

- [ ] 输出变量部分显示动态字段
- [ ] 每个字段显示来源信息
- [ ] 显示引用示例
- [ ] 字段数量与配置一致

### 后续节点引用

- [ ] 可以在 Kafka/API 节点中引用
- [ ] 变量选择器显示转换节点字段
- [ ] 引用格式正确

---

## 🎉 预期最终效果

### 1. 用户体验

- ✅ 一次测试，永久保存
- ✅ 配置保存后完整回显
- ✅ 可视化字段选择，无需手写路径
- ✅ 清晰的输出字段列表
- ✅ 便捷的变量引用

### 2. 数据流

```
┌─────────────┐
│  API 节点   │ 执行测试
│             │ ↓
│ debugOutput │ 保存到 node.data
└──────┬──────┘
       │ 连线
       ↓
┌─────────────┐
│ 转换节点    │ 读取 debugOutput
│             │ ↓
│   mappings  │ 配置字段映射
│             │ ↓
│   output    │ 动态显示输出字段
└──────┬──────┘
       │ 连线
       ↓
┌─────────────┐
│ Kafka节点   │ 引用转换后的字段
│             │ {{transform_node.userId}}
└─────────────┘
```

### 3. 开发者友好

- 🔍 清晰的调试信息
- 📝 完善的类型定义
- 🐛 友好的错误提示
- 📚 详细的使用文档

---

## 📁 相关文件

- ✅ `flowlet-frontend/src/components/NodeConfigPanel/NodeConfigPanel.tsx` - 测试执行保存 debugOutput
- ✅ `flowlet-frontend/src/components/NodeConfigPanel/components/TransformNodeConfig.tsx` - 转换节点配置和回显
- ✅ `flowlet-frontend/src/components/NodeConfigPanel/components/OutputVariables.tsx` - 动态输出变量展示
- ✅ `flowlet-frontend/src/types/index.ts` - 类型定义
- ✅ `flowlet-frontend/src/pages/FlowEditor/FlowEditor.tsx` - 流程保存和加载

---

**开始测试吧！🚀**
