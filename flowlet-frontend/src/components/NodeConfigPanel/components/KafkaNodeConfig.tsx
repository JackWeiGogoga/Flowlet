import React from "react";
import { Form, Input, Select, Switch, Divider } from "antd";
import { VariableInput } from "@/components/VariableInput";
import { CallbackConfig } from "./CallbackConfig";
import { OutputAliasConfig } from "./OutputAliasConfig";

export interface KafkaNodeConfigProps {
  authType: string | undefined;
  waitForCallback: boolean | undefined;
  callbackType: string | undefined;
}

/**
 * Kafka 认证配置组件
 */
const KafkaAuthConfig: React.FC = () => (
  <>
    <Form.Item
      name="username"
      label="用户名"
      rules={[{ required: true, message: "请输入用户名" }]}
    >
      <Input placeholder="kafka-user" />
    </Form.Item>
    <Form.Item
      name="password"
      label="密码"
      rules={[{ required: true, message: "请输入密码" }]}
    >
      <Input.Password placeholder="请输入密码" />
    </Form.Item>
  </>
);

/**
 * Kafka 节点配置组件
 * 包含连接配置、消息配置和回调配置
 */
export const KafkaNodeConfig: React.FC<KafkaNodeConfigProps> = ({
  authType,
  waitForCallback,
  callbackType,
}) => {
  return (
    <>
      <Divider plain>连接配置</Divider>
      <Form.Item
        name="brokers"
        label="Broker 地址"
        rules={[{ required: true, message: "请输入 Kafka Broker 地址" }]}
        extra="多个地址用逗号分隔，如: localhost:9092,localhost:9093"
      >
        <Input placeholder="localhost:9092" />
      </Form.Item>

      <Form.Item name="authType" label="认证方式" initialValue="none">
        <Select>
          <Select.Option value="none">无认证</Select.Option>
          <Select.Option value="sasl_plain">SASL/PLAIN</Select.Option>
          <Select.Option value="sasl_scram">SASL/SCRAM-SHA-256</Select.Option>
        </Select>
      </Form.Item>

      {authType && authType !== "none" && <KafkaAuthConfig />}

      <Divider plain>消息配置</Divider>
      <Form.Item
        name="topic"
        label="Topic"
        rules={[{ required: true, message: "请输入 Topic 名称" }]}
      >
        <VariableInput placeholder="my-topic" />
      </Form.Item>
      <Form.Item name="keyExpression" label="消息 Key">
        <VariableInput placeholder="可使用变量作为消息 Key" />
      </Form.Item>
      <Form.Item
        name="messageTemplate"
        label="消息内容"
        rules={[{ required: true, message: "请输入消息模板" }]}
      >
        <VariableInput
          multiline
          placeholder={'{"action": "process", "data": "{{...}}"}'}
        />
      </Form.Item>

      <Divider plain>回调配置</Divider>
      <Form.Item
        name="waitForCallback"
        label="等待回调"
        valuePropName="checked"
        extra="开启后流程会暂停，直到收到回调"
      >
        <Switch />
      </Form.Item>

      {waitForCallback && (
        <CallbackConfig callbackType={callbackType} messageSource="kafka" />
      )}

      <Divider plain>输出设置</Divider>
      <OutputAliasConfig />
    </>
  );
};

export default KafkaNodeConfig;
