import React from "react";
import { Modal, Form, Input, Select, Radio, Space } from "antd";
import { createStyles } from "antd-style";
import { AuthType } from "./authUtils";

const useStyles = createStyles(({ css }) => ({
  modal: css`
    .ant-radio-group {
      width: 100%;
    }

    .ant-radio-wrapper {
      padding: 8px 12px;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      margin-bottom: 8px;
      width: 100%;
      transition: all 0.2s;
    }

    .ant-radio-wrapper:hover {
      border-color: #1890ff;
    }

    .ant-radio-wrapper-checked {
      border-color: #1890ff;
      background: #e6f4ff;
    }
  `,
}));

export type { AuthType };

export interface AuthConfig {
  type: AuthType;
  // API Key 配置
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyPosition?: "header" | "query";
  // Basic Auth 配置
  username?: string;
  password?: string;
  // Bearer Token 配置
  token?: string;
}

export interface AuthConfigModalProps {
  open: boolean;
  value?: AuthConfig;
  onOk: (config: AuthConfig) => void;
  onCancel: () => void;
}

/**
 * 鉴权配置弹窗
 * 支持多种鉴权方式：无鉴权、API Key、Basic Auth、Bearer Token
 */
export const AuthConfigModal: React.FC<AuthConfigModalProps> = ({
  open,
  value,
  onOk,
  onCancel,
}) => {
  const { styles } = useStyles();
  const [form] = Form.useForm<AuthConfig>();
  const authType = Form.useWatch("type", { form, preserve: true });

  React.useEffect(() => {
    if (open) {
      form.setFieldsValue(value || { type: "none" });
    }
  }, [open, value, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onOk(values);
    } catch {
      // 验证失败，不关闭弹窗
    }
  };

  return (
    <Modal
      title="鉴权配置"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      width={480}
      destroyOnHidden
      className={styles.modal}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: "none", apiKeyPosition: "header" }}
      >
        <Form.Item name="type" label="鉴权方式">
          <Radio.Group>
            <Space direction="vertical">
              <Radio value="none">无鉴权</Radio>
              <Radio value="api-key">API Key</Radio>
              <Radio value="basic">Basic Auth</Radio>
              <Radio value="bearer">Bearer Token</Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {authType === "api-key" && (
          <>
            <Form.Item
              name="apiKeyPosition"
              label="传递位置"
              initialValue="header"
            >
              <Select>
                <Select.Option value="header">Header</Select.Option>
                <Select.Option value="query">Query Params</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="apiKeyName"
              label="Key 名称"
              rules={[{ required: true, message: "请输入 Key 名称" }]}
            >
              <Input placeholder="例如：X-API-Key, Authorization" />
            </Form.Item>
            <Form.Item
              name="apiKeyValue"
              label="Key 值"
              rules={[{ required: true, message: "请输入 Key 值" }]}
            >
              <Input.Password placeholder="输入 API Key 值" />
            </Form.Item>
          </>
        )}

        {authType === "basic" && (
          <>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: "请输入用户名" }]}
            >
              <Input placeholder="输入用户名" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password placeholder="输入密码" />
            </Form.Item>
          </>
        )}

        {authType === "bearer" && (
          <Form.Item
            name="token"
            label="Token"
            rules={[{ required: true, message: "请输入 Token" }]}
          >
            <Input.Password placeholder="输入 Bearer Token" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default AuthConfigModal;
