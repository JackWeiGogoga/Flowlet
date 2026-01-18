import React from "react";
import { Form, Input, InputNumber, Select } from "antd";

export interface CallbackConfigProps {
  callbackType: string | undefined;
  messageSource?: "api" | "kafka";
}

/**
 * HTTP 回调说明组件
 */
const HttpCallbackInfo: React.FC<{ messageSource: string }> = ({
  messageSource,
}) => (
  <Form.Item label="HTTP 回调接口">
    <div
      style={{
        fontSize: 12,
        color: "#666",
        background: "#f5f5f5",
        padding: 12,
        borderRadius: 4,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <strong>回调地址：</strong>
        <code
          style={{
            background: "#fff",
            padding: "2px 6px",
            borderRadius: 2,
          }}
        >
          POST /api/callback/{"{callbackKey}"}
        </code>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>请求示例：</strong>
      </div>
      <pre
        style={{
          background: "#fff",
          padding: 8,
          borderRadius: 2,
          margin: 0,
          fontSize: 11,
          overflow: "auto",
        }}
      >
        {`{
  "success": true,
  "data": {
    "result": "处理结果",
    "imageUrl": "https://..."
  }
}`}
      </pre>
      <div style={{ marginTop: 8, color: "#999" }}>
        callbackKey 会在 {messageSource === "kafka" ? "Kafka 消息" : "API 响应"}
        中返回
      </div>
    </div>
  </Form.Item>
);

/**
 * Kafka 回调配置组件
 */
const KafkaCallbackConfig: React.FC<{ messageSource: string }> = ({
  messageSource,
}) => (
  <>
    <Form.Item
      name="callbackTopic"
      label="回调 Topic"
      rules={[{ required: true, message: "请输入回调 Topic" }]}
      extra="用于监听回调消息的 Kafka Topic"
    >
      <Input placeholder="callback-topic" />
    </Form.Item>
    <Form.Item
      name="callbackKeyField"
      label="关联字段"
      initialValue="callbackKey"
      extra="回调消息中用于匹配的字段名"
    >
      <Input placeholder="callbackKey" />
    </Form.Item>
    <Form.Item label="Kafka 回调说明">
      <div
        style={{
          fontSize: 12,
          color: "#666",
          background: "#f5f5f5",
          padding: 12,
          borderRadius: 4,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <strong>消息格式要求：</strong>
        </div>
        <pre
          style={{
            background: "#fff",
            padding: 8,
            borderRadius: 2,
            margin: 0,
            fontSize: 11,
            overflow: "auto",
          }}
        >
          {`{
  "callbackKey": "xxx-xxx-xxx",
  "success": true,
  "data": {
    "result": "处理结果",
    "imageUrl": "https://..."
  }
}`}
        </pre>
        <div style={{ marginTop: 8, color: "#999" }}>
          callbackKey 会在
          {messageSource === "kafka" ? "发送的 Kafka 消息" : " API 响应"}
          中返回，回调时需原样返回
        </div>
      </div>
    </Form.Item>
  </>
);

/**
 * 通用回调配置组件
 * 供 API 节点和 Kafka 节点共用
 */
export const CallbackConfig: React.FC<CallbackConfigProps> = ({
  callbackType,
  messageSource = "api",
}) => {
  return (
    <>
      <Form.Item
        name="callbackTimeout"
        label="回调超时(ms)"
        initialValue={60000}
        extra="超时后流程将标记为失败"
      >
        <InputNumber min={1000} max={3600000} style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item
        name="callbackType"
        label="回调方式"
        initialValue="http"
        extra="选择接收回调结果的方式"
      >
        <Select>
          <Select.Option value="http">HTTP 接口回调</Select.Option>
          <Select.Option value="kafka">Kafka 消息回调</Select.Option>
        </Select>
      </Form.Item>

      {(!callbackType || callbackType === "http") && (
        <HttpCallbackInfo messageSource={messageSource} />
      )}

      {callbackType === "kafka" && (
        <KafkaCallbackConfig messageSource={messageSource} />
      )}
    </>
  );
};

export default CallbackConfig;
