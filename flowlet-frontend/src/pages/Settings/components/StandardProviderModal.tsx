import React from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import type { FormInstance } from "antd";
import type { StandardProviderModelItem } from "@/services/modelHubService";

const { Text } = Typography;

interface ModelGroup {
  label: string;
  items: StandardProviderModelItem[];
}

interface StandardProviderModalProps {
  title: string;
  open: boolean;
  form: FormInstance;
  saving: boolean;
  hasKey: boolean;
  testMessage: string | null;
  onCancel: () => void;
  onSave: () => void;
  onClearKey: () => void;
  onTest: () => void;
  showModelSection: boolean;
  modelCatalog: StandardProviderModelItem[];
  modelGroups: ModelGroup[];
  enabledModels: string[];
  modelQuery: string;
  onModelQueryChange: (value: string) => void;
  onRefreshModels: () => void;
  modelLoading: boolean;
  onToggleModel: (modelId: string, enabled: boolean) => void;
  styles: Record<string, string>;
}

const StandardProviderModal: React.FC<StandardProviderModalProps> = ({
  title,
  open,
  form,
  saving,
  hasKey,
  testMessage,
  onCancel,
  onSave,
  onClearKey,
  onTest,
  showModelSection,
  modelCatalog,
  modelGroups,
  enabledModels,
  modelQuery,
  onModelQueryChange,
  onRefreshModels,
  modelLoading,
  onToggleModel,
  styles,
}) => {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={onSave}
      confirmLoading={saving}
      okText={tCommon("save")}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>,
        hasKey ? (
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
          {tCommon("save")}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="baseUrl"
          label={t("modal.baseUrl")}
          rules={[{ required: true, message: t("modal.baseUrlPlaceholder") }]}
        >
          <Input placeholder="https://api.openai.com/v1" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={t("modal.apiKey")}
          rules={[
            {
              validator: (_, value) => {
                if (!hasKey && !value) {
                  return Promise.reject(new Error(t("modal.apiKeyRequired")));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password placeholder="sk-..." />
        </Form.Item>
        <Form.Item name="model" label={t("modal.defaultModel")}>
          <Input placeholder={t("modal.defaultModelPlaceholder")} />
        </Form.Item>
        {showModelSection && (
          <div className={styles.modelSection}>
            <div className={styles.modelSectionHeader}>
              <Text strong>{t("modal.modelList")}</Text>
              <Space size={8}>
                <Input
                  placeholder={t("modal.searchModels")}
                  size="small"
                  allowClear
                  value={modelQuery}
                  onChange={(event) => onModelQueryChange(event.target.value)}
                />
                <Button
                  size="small"
                  onClick={onRefreshModels}
                  loading={modelLoading}
                >
                  {t("modal.refreshModels")}
                </Button>
              </Space>
            </div>
            {modelCatalog.length === 0 ? (
              <Alert
                type="info"
                showIcon
                title={t("modal.noModelsYet")}
                description={t("modal.noModelsYetDescription")}
                style={{ marginBottom: 12 }}
              />
            ) : (
              <div className={styles.modelList}>
                {modelGroups.length === 0 ? (
                  <div className={styles.modelHint}>{t("modal.noMatchingModels")}</div>
                ) : (
                  modelGroups.map((group) => (
                    <div key={group.label} className={styles.modelGroup}>
                      <div className={styles.modelGroupTitle}>
                        {group.label}
                      </div>
                      {group.items.map((item) => (
                        <div key={item.id} className={styles.modelItem}>
                          <div className={styles.modelItemMeta}>
                            <span className={styles.modelItemName}>
                              {item.id}
                            </span>
                            {item.multimodal && <Tag color="blue">{t("modal.multimodal")}</Tag>}
                          </div>
                          <Switch
                            checked={enabledModels.includes(item.id)}
                            onChange={(checked) =>
                              onToggleModel(item.id, checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
            <div className={styles.modelHint}>
              {t("modal.enabledModelsCount", { count: enabledModels.length })}
            </div>
          </div>
        )}
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
      </Form>
    </Modal>
  );
};

export default StandardProviderModal;
