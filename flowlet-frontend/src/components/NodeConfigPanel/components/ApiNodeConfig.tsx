import React, { useState } from "react";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Collapse,
  Radio,
  Button,
  Space,
} from "antd";
import { AiOutlineSetting } from "react-icons/ai";
import { VariableInput } from "@/components/VariableInput";
import { KeyValueEditor } from "./KeyValueEditor";
import { AuthConfigModal, AuthConfig } from "./AuthConfigModal";
import { getAuthTypeLabel } from "./authUtils";
import { CallbackConfig } from "./CallbackConfig";
import { useStyles } from "./ApiNodeConfig.style";

export type BodyType =
  | "none"
  | "form-data"
  | "x-www-form-urlencoded"
  | "raw"
  | "json";

export interface ApiNodeConfigProps {
  waitForCallback: boolean | undefined;
  callbackType: string | undefined;
  nodeId?: string;
}

/**
 * API 节点 Kafka 回调配置
 */
const ApiKafkaCallbackConfig: React.FC = () => (
  <>
    <Form.Item
      name="kafkaBrokers"
      label="Kafka Broker"
      rules={[{ required: true, message: "请输入 Kafka Broker 地址" }]}
      extra="多个地址用逗号分隔"
    >
      <Input placeholder="localhost:9092" />
    </Form.Item>
    <Form.Item name="kafkaAuthType" label="认证方式" initialValue="none">
      <Select>
        <Select.Option value="none">无认证</Select.Option>
        <Select.Option value="sasl_plain">SASL/PLAIN</Select.Option>
        <Select.Option value="sasl_scram">SASL/SCRAM-SHA-256</Select.Option>
      </Select>
    </Form.Item>
  </>
);

/**
 * API 节点配置组件
 * 参考 Dify 设计，包含完整的 HTTP 请求配置
 */
export const ApiNodeConfig: React.FC<ApiNodeConfigProps> = ({
  waitForCallback,
  callbackType,
}) => {
  const { styles } = useStyles();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const form = Form.useFormInstance();

  // 监听 bodyType 变化 - 使用可选参数避免警告
  const bodyType = Form.useWatch("bodyType", {
    form,
    preserve: true,
  }) as BodyType;
  const authConfig = Form.useWatch("authConfig", { form, preserve: true }) as
    | AuthConfig
    | undefined;

  // 处理鉴权配置保存
  const handleAuthSave = (config: AuthConfig) => {
    form.setFieldValue("authConfig", config);
    setAuthModalOpen(false);
  };

  return (
    <div className={styles.apiNodeConfig}>
      {/* API 区域：请求方法 + URL + 鉴权 */}
      <div className={styles.apiSection}>
        <div className={styles.apiSectionHeader}>
          <span className={styles.sectionTitle}>API</span>
          <Button
            type="text"
            size="small"
            icon={<AiOutlineSetting />}
            onClick={() => setAuthModalOpen(true)}
            className={styles.authBtn}
          >
            鉴权 {getAuthTypeLabel(authConfig?.type || "none")}
          </Button>
        </div>
        <div className={styles.apiUrlRow}>
          <Form.Item name="method" initialValue="POST" noStyle>
            <Select className={styles.methodSelect}>
              <Select.Option value="GET">GET</Select.Option>
              <Select.Option value="POST">POST</Select.Option>
              <Select.Option value="PUT">PUT</Select.Option>
              <Select.Option value="PATCH">PATCH</Select.Option>
              <Select.Option value="DELETE">DELETE</Select.Option>
              <Select.Option value="HEAD">HEAD</Select.Option>
              <Select.Option value="OPTIONS">OPTIONS</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="url"
            rules={[{ required: true, message: "请输入 URL" }]}
            noStyle
          >
            <VariableInput
              placeholder="输入 URL，使用 {{ 插入变量"
              className={styles.urlInput}
            />
          </Form.Item>
        </div>
      </div>

      {/* 鉴权配置弹窗 */}
      <Form.Item name="authConfig" hidden>
        <Input />
      </Form.Item>
      <AuthConfigModal
        open={authModalOpen}
        value={authConfig}
        onOk={handleAuthSave}
        onCancel={() => setAuthModalOpen(false)}
      />

      {/* HEADERS */}
      <div className={styles.configSection}>
        <div className={styles.sectionLabel}>HEADERS</div>
        <Form.Item name="headers" noStyle>
          <KeyValueEditor />
        </Form.Item>
      </div>

      {/* PARAMS */}
      <div className={styles.configSection}>
        <div className={styles.sectionLabel}>PARAMS</div>
        <Form.Item name="params" noStyle>
          <KeyValueEditor />
        </Form.Item>
      </div>

      {/* BODY */}
      <div className={styles.configSection}>
        <div className={styles.sectionLabel}>BODY</div>
        <Form.Item name="bodyType" initialValue="none" noStyle>
          <Radio.Group className={styles.bodyTypeGroup}>
            <Radio value="none">none</Radio>
            <Radio value="form-data">form-data</Radio>
            <Radio value="x-www-form-urlencoded">x-www-form-urlencoded</Radio>
            <Radio value="raw">raw text</Radio>
            <Radio value="json">JSON</Radio>
          </Radio.Group>
        </Form.Item>

        {/* 根据 body 类型显示不同的编辑器 */}
        {bodyType === "form-data" && (
          <Form.Item name="formData" noStyle>
            <KeyValueEditor />
          </Form.Item>
        )}

        {bodyType === "x-www-form-urlencoded" && (
          <Form.Item name="urlEncodedData" noStyle>
            <KeyValueEditor />
          </Form.Item>
        )}

        {bodyType === "raw" && (
          <Form.Item name="rawBody" noStyle>
            <Input.TextArea
              rows={4}
              placeholder="输入原始文本内容"
              className={styles.bodyTextarea}
            />
          </Form.Item>
        )}

        {bodyType === "json" && (
          <div className={styles.bodyEditorContainer}>
            <div className={styles.bodyEditorHeader}>
              <span>JSON</span>
            </div>
            <div className={styles.bodyEditorContent}>
              <Form.Item name="jsonBody" noStyle>
                <VariableInput
                  multiline
                  placeholder={`{
  "key": "value",
  "variable": "{{变量名}}"
}`}
                />
              </Form.Item>
            </div>
          </div>
        )}
      </div>

      {/* 超时设置 - 可折叠 */}
      <Collapse
        ghost
        className={styles.configCollapse}
        items={[
          {
            key: "timeout",
            label: "超时设置",
            children: (
              <div className={styles.timeoutSettings}>
                <Form.Item
                  name={["timeout", "connect"]}
                  label="连接超时"
                  initialValue={10000}
                  extra="建立连接的最大等待时间"
                >
                  <Space.Compact style={{ width: "60%" }}>
                    <InputNumber
                      min={1000}
                      max={300000}
                      step={1000}
                      style={{ width: "100%" }}
                    />
                    <span className={styles.timeoutUnit}>ms</span>
                  </Space.Compact>
                </Form.Item>
                <Form.Item
                  name={["timeout", "read"]}
                  label="读取超时"
                  initialValue={30000}
                  extra="等待服务器响应的最大时间"
                >
                  <Space.Compact style={{ width: "60%" }}>
                    <InputNumber
                      min={1000}
                      max={300000}
                      step={1000}
                      style={{ width: "100%" }}
                    />
                    <span className={styles.timeoutUnit}>ms</span>
                  </Space.Compact>
                </Form.Item>
                <Form.Item
                  name={["timeout", "write"]}
                  label="写入超时"
                  initialValue={30000}
                  extra="发送请求数据的最大时间"
                >
                  <Space.Compact style={{ width: "60%" }}>
                    <InputNumber
                      min={1000}
                      max={300000}
                      step={1000}
                      style={{ width: "100%" }}
                    />
                    <span className={styles.timeoutUnit}>ms</span>
                  </Space.Compact>
                </Form.Item>
              </div>
            ),
          },
          {
            key: "callback",
            label: "异步回调配置",
            children: (
              <>
                <Form.Item
                  name="waitForCallback"
                  label="等待回调"
                  valuePropName="checked"
                  extra="开启后流程会暂停，直到收到回调结果"
                >
                  <Switch />
                </Form.Item>

                {waitForCallback && (
                  <>
                    <CallbackConfig
                      callbackType={callbackType}
                      messageSource="api"
                    />
                    {callbackType === "kafka" && <ApiKafkaCallbackConfig />}
                  </>
                )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ApiNodeConfig;
