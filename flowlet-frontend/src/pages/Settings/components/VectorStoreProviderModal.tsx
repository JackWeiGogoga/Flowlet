import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Typography,
  Space,
  Alert,
} from "antd";
import type { FormInstance } from "antd";
import type { VectorStoreProviderConfig } from "@/store/vectorStoreStore";
import { modal, message } from "@/components/AppMessageContext/staticMethods";
import {
  VECTOR_STORE_PROVIDER_HINTS,
  VECTOR_STORE_PROVIDER_LABELS,
  type VectorStoreProviderKey,
} from "@/config/vectorStores";
import { vectorStoreService } from "@/services/vectorStoreService";
import { AiOutlinePlus } from "react-icons/ai";

const { Text } = Typography;

interface VectorStoreProviderModalProps {
  open: boolean;
  form: FormInstance;
  saving: boolean;
  editingProvider: VectorStoreProviderConfig | null;
  onCancel: () => void;
  onSave: () => void;
  onClearKey: () => void;
}

const VectorStoreProviderModal: React.FC<VectorStoreProviderModalProps> = ({
  open,
  form,
  saving,
  editingProvider,
  onCancel,
  onSave,
  onClearKey,
}) => {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");

  const providerKey = Form.useWatch("providerKey", { form, preserve: true }) as
    | VectorStoreProviderKey
    | undefined;
  const baseUrl = Form.useWatch("baseUrl", { form, preserve: true });
  const apiKey = Form.useWatch("apiKey", { form, preserve: true });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);

  const loadDatabases = useCallback(async () => {
    if (!providerKey || !baseUrl) return;

    setLoadingDatabases(true);
    try {
      const result = await vectorStoreService.listDatabases({
        provider: {
          type: providerKey,
          base_url: baseUrl,
          api_key: apiKey || undefined,
        },
      });

      if (result.success && result.databases) {
        setDatabases(result.databases);
      }
    } catch (error) {
      console.error("Failed to load databases:", error);
    } finally {
      setLoadingDatabases(false);
    }
  }, [providerKey, baseUrl, apiKey]);

  // Auto-load databases when connection info changes
  useEffect(() => {
    if (providerKey === "milvus" && baseUrl) {
      loadDatabases();
    }
  }, [providerKey, baseUrl, loadDatabases]);

  const handleTestConnection = async () => {
    if (!providerKey || !baseUrl) {
      message.warning(t("vectorStoreModal.fillTypeAndUrl"));
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const database = form.getFieldValue("database");

      const result = await vectorStoreService.testConnection({
        provider: {
          type: providerKey,
          base_url: baseUrl,
          api_key: apiKey || undefined,
        },
        database: database || undefined,
      });

      setTestResult(result);

      if (result.success) {
        message.success(t("vectorStoreModal.connectionSuccess"));
        // Update databases list if returned
        if (result.databases && result.databases.length > 0) {
          console.log("Setting databases:", result.databases);
          setDatabases(result.databases);
        }
      } else {
        message.error(t("vectorStoreModal.connectionFailed"));
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `${t("vectorStoreModal.networkError")}: ${error}`,
      });
      message.error(t("vectorStoreModal.testFailed"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      title={editingProvider ? t("vectorStoreModal.editTitle") : t("vectorStoreModal.addTitle")}
      open={open}
      onCancel={onCancel}
      onOk={onSave}
      confirmLoading={saving}
      okText={editingProvider ? tCommon("save") : tCommon("create")}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>,
        editingProvider?.hasKey ? (
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
        <Button key="submit" type="primary" loading={saving} onClick={onSave}>
          {editingProvider ? tCommon("save") : tCommon("create")}
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t("vectorStoreModal.name")}
          rules={[{ required: true, message: t("vectorStoreModal.nameRequired") }]}
        >
          <Input placeholder={t("vectorStoreModal.namePlaceholder")} />
        </Form.Item>
        <Form.Item
          name="providerKey"
          label={t("vectorStoreModal.providerType")}
          rules={[{ required: true, message: t("vectorStoreModal.providerTypeRequired") }]}
        >
          <Select
            options={(
              Object.keys(VECTOR_STORE_PROVIDER_LABELS) as VectorStoreProviderKey[]
            ).map((key) => ({
              value: key,
              label: `${VECTOR_STORE_PROVIDER_LABELS[key]} · ${VECTOR_STORE_PROVIDER_HINTS[key]}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="baseUrl"
          label={t("modal.baseUrl")}
          rules={[{ required: true, message: t("modal.baseUrlPlaceholder") }]}
        >
          <Input placeholder="http://148.135.6.189:9091" />
        </Form.Item>
        <Form.Item name="apiKey" label={t("vectorStoreModal.tokenApiKey")}>
          <Input.Password placeholder={t("vectorStoreModal.tokenPlaceholder")} />
        </Form.Item>

        {/* Test Connection Button */}
        <Form.Item>
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Button
              onClick={handleTestConnection}
              loading={testing}
              disabled={!providerKey || !baseUrl}
              block
            >
              {t("modal.testConnection")}
            </Button>
            {testResult && (
              <Alert
                type={testResult.success ? "success" : "error"}
                message={testResult.message}
                showIcon
                closable
                onClose={() => setTestResult(null)}
              />
            )}
          </Space>
        </Form.Item>

        {/* Milvus Database Selection */}
        {providerKey === "milvus" && (
          <Form.Item
            name="database"
            label={t("vectorStoreModal.database")}
            tooltip={t("vectorStoreModal.databaseTooltip")}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                💡 {t("vectorStoreModal.databaseExtra")}
              </Text>
            }
          >
            <Select
              placeholder={t("vectorStoreModal.databasePlaceholder")}
              loading={loadingDatabases}
              showSearch
              allowClear
              options={databases.map((db) => ({ label: db, value: db }))}
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              popupRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ padding: "4px 8px 8px" }}>
                    <Button
                      type="text"
                      icon={<AiOutlinePlus />}
                      style={{
                        width: "100%",
                        textAlign: "left",
                      }}
                      onClick={() => {
                        modal.confirm({
                          title: t("vectorStoreModal.createDbTitle"),
                          content: (
                            <Input
                              id="new-database-input"
                              placeholder={t("vectorStoreModal.createDbPlaceholder")}
                              autoFocus
                            />
                          ),
                          okText: tCommon("create"),
                          cancelText: tCommon("cancel"),
                          onOk: () => {
                            const input = document.getElementById(
                              "new-database-input"
                            ) as HTMLInputElement;
                            const newDbName = input?.value.trim();
                            if (!newDbName) {
                              message.warning(t("vectorStoreModal.dbNameRequired"));
                              return Promise.reject();
                            }
                            if (databases.includes(newDbName)) {
                              message.warning(t("vectorStoreModal.dbExists"));
                              return Promise.reject();
                            }
                            // Add to local list
                            setDatabases([...databases, newDbName]);
                            // Set as current value
                            form.setFieldValue("database", newDbName);
                            message.success(
                              t("vectorStoreModal.dbAddedSuccess", { name: newDbName }),
                              5
                            );
                            return Promise.resolve();
                          },
                        });
                      }}
                    >
                      {t("vectorStoreModal.createNewDb")}
                    </Button>
                    {databases.length > 0 && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, marginLeft: 8 }}
                      >
                        {t("vectorStoreModal.totalDatabases", { count: databases.length })}
                      </Text>
                    )}
                  </div>
                </>
              )}
            />
          </Form.Item>
        )}
        {providerKey === "qdrant" && (
          <>
            <Form.Item name="grpcUrl" label={t("vectorStoreModal.grpcUrl")}>
              <Input placeholder="grpc://your-qdrant:6334" />
            </Form.Item>
            <Form.Item name="preferGrpc" valuePropName="checked">
              <Switch
                checkedChildren={t("vectorStoreModal.preferGrpc")}
                unCheckedChildren={t("vectorStoreModal.useHttp")}
              />
            </Form.Item>
          </>
        )}
        <Form.Item name="enabled" valuePropName="checked">
          <Switch
            checkedChildren={t("status.enabled")}
            unCheckedChildren={t("status.disabled")}
          />
        </Form.Item>
        <Divider />
        <Text type="secondary">
          {t("vectorStoreModal.hint")}
        </Text>
      </Form>
    </Modal>
  );
};

export default VectorStoreProviderModal;
