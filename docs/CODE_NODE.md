# Code 节点（Python）执行说明

## 功能概览

Code 节点用于在流程中执行 Python 脚本，入口函数固定为：

```python
def run(inputs, context):
    return {"ok": True}
```

- `inputs`: 聚合后的上下文数据（input / nodes / var / context 等）
- `context`: 执行元信息（executionId / flowId / currentNodeId）
- 返回值必须为 JSON 可序列化对象

## 代码入参映射

在节点配置中可以设置“代码入参”，每行一个映射：

- `key`: 传入 Python 的变量名
- `value`: 变量表达式（支持 `{{nodes.xxx}}`、`{{input.xxx}}` 等）

如果没有配置映射，将默认传入完整上下文 `getAllData()`。

## 后端执行服务

Code 节点通过外部执行服务运行脚本，默认地址为：

```
http://localhost:8090/execute
```

请求格式：

```json
{
  "language": "python",
  "code": "def run(inputs, context):\\n    return {}",
  "inputs": {},
  "context": {},
  "timeoutMs": 3000,
  "memoryMb": 128,
  "allowNetwork": false
}
```

响应格式：

```json
{
  "success": true,
  "output": {},
  "stdout": "",
  "stderr": "",
  "durationMs": 120
}
```

## 配置项

`flowlet-backend/src/main/resources/application.yml`：

```yaml
flowlet:
  code-executor:
    base-url: http://localhost:8090
    request-timeout-ms: 5000
    default-timeout-ms: 3000
    default-memory-mb: 128
    default-allow-network: false
```
