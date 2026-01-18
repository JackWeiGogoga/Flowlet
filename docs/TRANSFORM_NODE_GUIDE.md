# 数据转换节点使用指南

## 概述

数据转换节点提供了**渐进式配置**的方式，让不同技术水平的用户都能轻松完成数据转换任务。

## 两种配置模式

### 🎯 模式一：字段映射（推荐普通用户）

**适用场景：**

- 从 API 响应中提取特定字段
- 字段重命名
- 简单的数据格式转换

**使用步骤：**

1. **选择源节点** - 从下拉列表选择上游节点（如 API 节点）
2. **选择源字段** - 从树形结构中选择要提取的字段
3. **设置目标字段名** - 输入转换后的字段名称
4. **可选：添加转换表达式** - 对字段值进行额外处理

**示例：**

假设上游 API 节点返回：

```json
{
  "statusCode": 200,
  "body": {
    "code": 0,
    "data": {
      "userId": 12345,
      "userName": "张三",
      "profile": {
        "avatar": "https://example.com/avatar.jpg",
        "score": 1500
      }
    }
  }
}
```

**配置映射：**

| 映射编号 | 源节点   | 源字段                   | 目标字段名 | 转换表达式    |
| -------- | -------- | ------------------------ | ---------- | ------------- |
| #1       | api_node | body.data.userId         | userId     | -             |
| #2       | api_node | body.data.userName       | name       | -             |
| #3       | api_node | body.data.profile.avatar | avatar     | -             |
| #4       | api_node | body.data.profile.score  | isVip      | #value > 1000 |

**输出结果：**

```json
{
  "userId": 12345,
  "name": "张三",
  "avatar": "https://example.com/avatar.jpg",
  "isVip": true
}
```

---

### 🚀 模式二：高级表达式（开发者专用）

**适用场景：**

- 复杂的数据转换逻辑
- 多字段计算
- 条件判断和数组操作

**语法：Spring Expression Language (SpEL)**

**示例 1：基础字段提取**

```spel
{
  "userId": #api_node.body.data.id,
  "fullName": #api_node.body.firstName + ' ' + #api_node.body.lastName,
  "age": #api_node.body.age
}
```

**示例 2：条件判断**

```spel
{
  "status": #api_node.body.score > 100 ? 'premium' : 'normal',
  "discount": #api_node.body.level == 'vip' ? 0.8 : 1.0
}
```

**示例 3：数组操作**

```spel
{
  "totalAmount": #api_node.body.items.![price].sum(),
  "itemCount": #api_node.body.items.size(),
  "expensiveItems": #api_node.body.items.?[price > 100]
}
```

**示例 4：字符串处理**

```spel
{
  "upperName": #api_node.body.name.toUpperCase(),
  "emailDomain": #api_node.body.email.substring(#api_node.body.email.indexOf('@') + 1),
  "initials": #api_node.body.firstName.substring(0, 1) + #api_node.body.lastName.substring(0, 1)
}
```

---

## SpEL 快速参考

### 访问节点输出

```spel
#节点ID.字段名              // 访问节点的输出字段
#api_node.body.data.userId  // 访问 API 节点的嵌套字段
```

### 字符串操作

```spel
#value.toUpperCase()        // 转大写
#value.toLowerCase()        // 转小写
#value.substring(0, 5)      // 截取子串
#value.length()             // 字符串长度
#value.concat(' suffix')    // 连接字符串
```

### 数学运算

```spel
#value1 + #value2           // 加法
#value1 * 0.8               // 乘法
#value1 > 100               // 比较
```

### 条件表达式

```spel
#condition ? '真值' : '假值'
#score > 60 ? 'pass' : 'fail'
```

### 数组操作

```spel
#list.size()                // 数组长度
#list[0]                    // 访问第一个元素
#list.![field]              // 投影：提取所有元素的某个字段
#list.?[price > 100]        // 过滤：价格大于100的元素
#list.^[price > 100]        // 第一个满足条件的元素
#list.$[price > 100]        // 最后一个满足条件的元素
```

### 安全导航

```spel
#object?.field              // 如果 object 为 null，返回 null 而不报错
```

---

## 最佳实践

### ✅ DO（推荐）

1. **优先使用字段映射模式**

   - 更直观，更易维护
   - 适合 80% 的场景

2. **为字段取有意义的名称**

   ```json
   // ✅ 好
   {"userId": 123, "userName": "张三"}

   // ❌ 差
   {"u": 123, "n": "张三"}
   ```

3. **先测试上游节点**

   - 确保上游节点有正确的输出
   - 查看调试结果，了解数据结构

4. **使用预览功能**
   - 在保存前预览转换结果
   - 发现问题及时调整

### ❌ DON'T（避免）

1. **避免过度嵌套**

   ```spel
   // ❌ 难以维护
   #api_node.body.data.user.profile.settings.privacy.level

   // ✅ 分步提取
   // 映射1: profile -> userProfile
   // 映射2: userProfile.settings.privacy.level -> privacyLevel
   ```

2. **避免在表达式中硬编码**

   ```spel
   // ❌ 硬编码
   {"apiKey": "sk-abc123456"}

   // ✅ 使用变量
   {"apiKey": #input.apiKey}
   ```

---

## 常见问题

### Q1: 字段选择器显示"暂无示例数据"？

**A:** 需要先执行上游节点的测试：

1. 选中上游节点（如 API 节点）
2. 在右侧面板点击"测试执行"
3. 执行成功后，返回转换节点即可看到字段列表

---

### Q2: 如何处理数组中的第一个元素？

**映射模式：**

```
源字段: body.items[0].name
目标字段: firstItemName
```

**高级模式：**

```spel
{"firstItemName": #api_node.body.items[0].name}
```

---

### Q3: 如何合并多个字段？

**映射模式（使用转换表达式）：**

```
源字段: body.firstName
目标字段: fullName
转换表达式: #value + ' ' + #api_node.body.lastName
```

**高级模式：**

```spel
{"fullName": #api_node.body.firstName + ' ' + #api_node.body.lastName}
```

---

### Q4: 如何设置默认值？

**高级模式：**

```spel
{
  "userName": #api_node.body.name ?: '匿名用户',
  "age": #api_node.body.age ?: 0
}
```

---

## 进阶技巧

### 技巧 1: 使用临时变量

在高级模式中，可以使用 SpEL 的投影功能：

```spel
{
  "totalPrice": (#temp = #api_node.body.items.![price]; #temp.sum()),
  "itemCount": #api_node.body.items.size()
}
```

### 技巧 2: 类型转换

```spel
{
  "ageString": #api_node.body.age.toString(),
  "scoreInt": T(Integer).parseInt(#api_node.body.score)
}
```

### 技巧 3: 日期处理

```spel
{
  "timestamp": T(System).currentTimeMillis(),
  "formattedDate": new java.text.SimpleDateFormat('yyyy-MM-dd').format(new java.util.Date())
}
```

---

## 对比：旧方案 vs 新方案

| 维度     | 旧方案（手写 JSON） | 新方案（字段映射） |
| -------- | ------------------- | ------------------ |
| 学习成本 | 需要学习 SpEL 语法  | 点击选择即可       |
| 配置时间 | 5-10 分钟           | 1-2 分钟           |
| 错误率   | 高（格式、语法）    | 低（可视化选择）   |
| 调试难度 | 难（只能看日志）    | 易（实时预览）     |
| 适用人群 | 开发者              | 所有人             |

---

## 示例场景

### 场景 1: 电商订单处理

**上游 API 返回：**

```json
{
  "order": {
    "orderId": "ORD123",
    "customer": { "name": "李四", "phone": "13800138000" },
    "items": [
      { "product": "笔记本", "price": 5999, "qty": 1 },
      { "product": "鼠标", "price": 199, "qty": 2 }
    ]
  }
}
```

**配置（字段映射）：**

- `order.orderId` → `orderId`
- `order.customer.name` → `customerName`
- `order.customer.phone` → `phone`
- `order.items[0].product` → `mainProduct`

**或使用高级模式：**

```spel
{
  "orderId": #api_node.body.order.orderId,
  "customerName": #api_node.body.order.customer.name,
  "phone": #api_node.body.order.customer.phone,
  "totalAmount": #api_node.body.order.items.![price * qty].sum(),
  "itemCount": #api_node.body.order.items.size()
}
```

---

## 总结

- **新手/普通用户** → 使用"字段映射"模式，可视化配置
- **开发者/复杂场景** → 使用"高级表达式"模式，SpEL 脚本
- **调试技巧** → 先测试上游节点 → 配置转换 → 预览结果
- **遇到问题** → 查看日志、使用预览、简化配置

Happy Flow Building! 🎉
