import React from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Switch,
  Typography,
} from "antd";
import type { FormInstance } from "antd";
import { AiOutlineDelete, AiOutlinePlus } from "react-icons/ai";
import type { CustomProviderConfig } from "@/store/modelHubStore";

const { Text } = Typography;

interface CustomProviderModalProps {
  open: boolean;
  form: FormInstance;
  saving: boolean;
  editingCustom: CustomProviderConfig | null;
  testMessage: string | null;
  onCancel: () => void;
  onSave: () => void;
  onClearKey: () => void;
  onTest: () => void;
}

const CustomProviderModal: React.FC<CustomProviderModalProps> = ({
  open,
  form,
  saving,
  editingCustom,
  testMessage,
  onCancel,
  onSave,
  onClearKey,
  onTest,
}) => {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");

  return (
    <Modal
      title={editingCustom ? t("customModal.editTitle") : t("customModal.createTitle")}
      open={open}
      onCancel={onCancel}
      onOk={onSave}
      confirmLoading={saving}
      okText={editingCustom ? tCommon("save") : tCommon("create")}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>,
        editingCustom?.hasKey ? (
          <Popconfirm
            key="clear"
            title={t("modal.confirmClearKey")}
            okText={t("modal.clearKey")}
            cancelText={tCommon("cancel")}
            onConfirm={onClearKey}
          >
            <Button danger loading={saving}>
              {t("modal.clearKey")}
            </Button>
          </Popconfirm>
        ) : null,
        <Button key="test" onClick={onTest}>
          {t("modal.testConnection")}
        </Button>,
        <Button key="submit" type="primary" loading={saving} onClick={onSave}>
          {editingCustom ? tCommon("save") : tCommon("create")}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t("customModal.providerName")}
          rules={[{ required: true, message: t("customModal.providerNameRequired") }]}
        >
          <Input placeholder={t("customModal.providerNamePlaceholder")} />
        </Form.Item>
        <Form.Item
          name="baseUrl"
          label={t("modal.baseUrl")}
          rules={[{ required: true, message: t("modal.baseUrlPlaceholder") }]}
        >
          <Input placeholder="https://your-openai-proxy.example.com/v1" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={t("modal.apiKey")}
          rules={[
            {
              validator: (_, value) => {
                if (!editingCustom?.hasKey && !value) {
                  return Promise.reject(new Error(t("modal.apiKeyRequired")));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password placeholder="your-key" />
        </Form.Item>
        <Form.Item label={t("customModal.modelListLabel")} required>
          <Form.List
            name="models"
            rules={[
              {
                validator: async (_, models) => {
                  if (!models || models.length === 0) {
                    return Promise.reject(new Error(t("customModal.atLeastOneModel")));
                  }
                  if (
                    (models as string[]).some(
                      (value) => !value || !value.trim()
                    )
                  ) {
                    return Promise.reject(new Error(t("customModal.modelIdRequired")));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field) => (
                  <Flex
                    gap={8}
                    key={field.key}
                    style={{
                      marginBottom: 8,
                    }}
                  >
                    <Form.Item
                      name={field.name}
                      key={field.key}
                      rules={[{ required: true, message: t("customModal.modelIdRequired") }]}
                      style={{ flex: 1, marginBottom: 0, minWidth: 0 }}
                    >
                      <Input placeholder={t("customModal.modelIdPlaceholder")} />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<AiOutlineDelete />}
                      onClick={() => remove(field.name)}
                    />
                  </Flex>
                ))}
                <Button
                  type="dashed"
                  icon={<AiOutlinePlus />}
                  onClick={() => add()}
                >
                  {t("customModal.addModel")}
                </Button>
                <Form.ErrorList errors={errors} />
              </>
            )}
          </Form.List>
        </Form.Item>
        <Form.Item name="enabled" valuePropName="checked">
          <Switch
            checkedChildren={t("status.enabled")}
            unCheckedChildren={t("status.disabled")}
          />
        </Form.Item>
        <Divider />
        {testMessage && (
          <Alert
            type="info"
            showIcon
            title={t("modal.testResultTitle")}
            description={testMessage}
            style={{ marginBottom: 12 }}
          />
        )}
        <Text type="secondary">
          {t("customModal.hint")}
        </Text>
      </Form>
    </Modal>
  );
};

export default CustomProviderModal;
