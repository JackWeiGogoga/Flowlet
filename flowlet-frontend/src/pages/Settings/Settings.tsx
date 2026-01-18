import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Form,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Tabs,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AiOutlinePlus,
  AiOutlineSetting,
  AiOutlineDelete,
} from "react-icons/ai";
import dayjs from "dayjs";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import {
  useModelHubStore,
  StandardProviderId,
  CustomProviderConfig,
} from "@/store/modelHubStore";
import {
  useVectorStoreStore,
  VectorStoreProviderConfig,
} from "@/store/vectorStoreStore";
import {
  modelHubService,
  StandardProviderModelItem,
} from "@/services/modelHubService";
import { message } from "@/components/AppMessageContext/staticMethods";
import IconMap from "@/components/LLMIcons";
import StandardProviderModal from "./components/StandardProviderModal";
import CustomProviderModal from "./components/CustomProviderModal";
import VectorStoreProviderModal from "./components/VectorStoreProviderModal";
import { useStyles } from "./Settings.styles";
import {
  STANDARD_PROVIDERS,
  ICON_ORDER,
  buildStandardRows,
  type StandardProvider,
} from "./Settings.constants";
import {
  VECTOR_STORE_PROVIDER_COLORS,
  VECTOR_STORE_PROVIDER_LABELS,
  type VectorStoreProviderKey,
} from "@/config/vectorStores";

const { Title, Text } = Typography;

const formatTime = (value?: string) => {
  if (!value) {
    return "-";
  }
  return dayjs(value).format("YYYY-MM-DD HH:mm");
};

const Settings: React.FC = () => {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const { styles } = useStyles();
  const {
    standardConfigs,
    customProviders,
    fetchProviders,
    saveStandard,
    toggleStandard,
    removeStandard,
    addCustomProvider,
    updateCustomProvider,
    removeCustomProvider,
    toggleCustomProvider,
    loading,
  } = useModelHubStore();
  const {
    providers: vectorStoreProviders,
    fetchProviders: fetchVectorStoreProviders,
    createProvider: createVectorStoreProvider,
    updateProvider: updateVectorStoreProvider,
    removeProvider: removeVectorStoreProvider,
    toggleProvider: toggleVectorStoreProvider,
    loading: vectorStoreLoading,
  } = useVectorStoreStore();

  const [standardForm] = Form.useForm();
  const [customForm] = Form.useForm();
  const [vectorStoreForm] = Form.useForm();
  const [standardModalOpen, setStandardModalOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [vectorStoreModalOpen, setVectorStoreModalOpen] = useState(false);
  const [activeStandard, setActiveStandard] = useState<StandardProvider | null>(
    null
  );
  const [editingCustom, setEditingCustom] =
    useState<CustomProviderConfig | null>(null);
  const [editingVectorStore, setEditingVectorStore] =
    useState<VectorStoreProviderConfig | null>(null);
  const [standardSaving, setStandardSaving] = useState(false);
  const [customSaving, setCustomSaving] = useState(false);
  const [vectorStoreSaving, setVectorStoreSaving] = useState(false);
  const [standardTestMessage, setStandardTestMessage] = useState<string | null>(
    null
  );
  const [customTestMessage, setCustomTestMessage] = useState<string | null>(
    null
  );
  const [standardModelCatalog, setStandardModelCatalog] = useState<
    StandardProviderModelItem[]
  >([]);
  const [standardEnabledModels, setStandardEnabledModels] = useState<string[]>(
    []
  );
  const [standardModelLoading, setStandardModelLoading] = useState(false);
  const [standardModelQuery, setStandardModelQuery] = useState("");

  useBreadcrumb([{ title: t("breadcrumb.settings"), path: "/settings" }], [t]);
  React.useEffect(() => {
    fetchProviders();
    fetchVectorStoreProviders();
  }, [fetchProviders, fetchVectorStoreProviders]);

  const orderedStandardProviders = useMemo(() => {
    return [...STANDARD_PROVIDERS].sort((a, b) => {
      const aIndex = a.iconKey ? ICON_ORDER.indexOf(a.iconKey) : -1;
      const bIndex = b.iconKey ? ICON_ORDER.indexOf(b.iconKey) : -1;
      if (aIndex === -1 && bIndex === -1) {
        return 0;
      }
      if (aIndex === -1) {
        return 1;
      }
      if (bIndex === -1) {
        return -1;
      }
      return aIndex - bIndex;
    });
  }, []);

  const standardRows = useMemo(
    () => buildStandardRows(orderedStandardProviders, standardConfigs),
    [standardConfigs, orderedStandardProviders]
  );
  const activeStandardConfig = activeStandard
    ? standardConfigs[activeStandard.id]
    : undefined;
  const modelGroups = useMemo(() => {
    const catalog = standardModelCatalog || [];
    const query = standardModelQuery.trim().toLowerCase();
    const filteredCatalog = query
      ? catalog.filter((item) => item.id.toLowerCase().includes(query))
      : catalog;

    if (activeStandard?.id === "openrouter") {
      const vendorGroups = new Map<string, StandardProviderModelItem[]>();
      filteredCatalog.forEach((item) => {
        const vendor = item.id.includes("/") ? item.id.split("/")[0] : t("modelTypes.other");
        if (!vendorGroups.has(vendor)) {
          vendorGroups.set(vendor, []);
        }
        vendorGroups.get(vendor)!.push(item);
      });
      return Array.from(vendorGroups.entries()).map(([label, items]) => ({
        label,
        items,
      }));
    }

    const hasTyped = filteredCatalog.some(
      (item) => item.type || item.multimodal
    );
    if (!hasTyped) {
      return [
        {
          label: t("modelTypes.modelList"),
          items: filteredCatalog,
        },
      ];
    }
    const groups = new Map<string, StandardProviderModelItem[]>();
    filteredCatalog.forEach((item) => {
      const key = item.type || "unknown";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      label: t(`modelTypes.${key}`, { defaultValue: key }),
      items,
    }));
  }, [standardModelCatalog, standardModelQuery, activeStandard?.id, t]);

  const openStandardModal = (provider: StandardProvider) => {
    const config = standardConfigs[provider.id];
    setActiveStandard(provider);
    standardForm.setFieldsValue({
      baseUrl: config?.baseUrl ?? provider.baseUrl,
      apiKey: "",
      model: config?.defaultModel ?? "",
      enabled: config?.enabled ?? true,
    });
    setStandardModelCatalog(config?.modelCatalog ?? []);
    setStandardEnabledModels(config?.models ?? []);
    setStandardModelQuery("");
    setStandardTestMessage(null);
    setStandardModalOpen(true);
  };

  const handleSaveStandard = async () => {
    const values = await standardForm.validateFields();
    if (!activeStandard) {
      return;
    }
    setStandardSaving(true);
    try {
      await saveStandard({
        providerKey: activeStandard.id,
        baseUrl: values.baseUrl.trim(),
        apiKey: values.apiKey?.trim() || undefined,
        defaultModel: values.model?.trim() || undefined,
        models: standardEnabledModels,
        enabled: values.enabled ?? true,
      });
      setStandardModalOpen(false);
    } finally {
      setStandardSaving(false);
    }
  };

  const handleRefreshStandardModels = async () => {
    if (!activeStandard) {
      return;
    }
    const values = standardForm.getFieldsValue();
    if (!values.baseUrl) {
      message.error(t("message.fillBaseUrl"));
      return;
    }
    if (!values.apiKey && !activeStandardConfig?.hasKey) {
      message.error(t("message.fillApiKey"));
      return;
    }
    setStandardModelLoading(true);
    try {
      const response = await modelHubService.refreshStandardModels(
        activeStandard.id,
        {
          baseUrl: values.baseUrl.trim(),
          apiKey: values.apiKey?.trim(),
        }
      );
      setStandardModelCatalog(response.modelCatalog || []);
      setStandardEnabledModels(response.enabledModels || []);
      await fetchProviders();
      message.success(t("message.modelListRefreshed"));
    } finally {
      setStandardModelLoading(false);
    }
  };

  const handleToggleStandardModel = (modelId: string, enabled: boolean) => {
    setStandardEnabledModels((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.add(modelId);
      } else {
        next.delete(modelId);
      }
      return Array.from(next);
    });
  };

  const handleClearStandardKey = async () => {
    if (!activeStandard) {
      return;
    }
    const values = standardForm.getFieldsValue();
    setStandardSaving(true);
    try {
      await saveStandard({
        providerKey: activeStandard.id,
        baseUrl: values.baseUrl.trim(),
        defaultModel: values.model?.trim() || undefined,
        models: standardEnabledModels,
        enabled: values.enabled ?? true,
        clearKey: true,
      });
      standardForm.setFieldsValue({ apiKey: "" });
      setStandardTestMessage(null);
    } finally {
      setStandardSaving(false);
    }
  };

  const handleTestStandard = async () => {
    const values = standardForm.getFieldsValue();
    if (!values.baseUrl || (!values.apiKey && !activeStandardConfig?.hasKey)) {
      message.error(t("message.fillUrlAndKey"));
      return;
    }
    const result = await modelHubService.testConnection({
      providerType: "STANDARD",
      providerKey: activeStandard?.id,
      baseUrl: values.baseUrl.trim(),
      apiKey: values.apiKey?.trim(),
      model: values.model?.trim(),
    });
    setStandardTestMessage(
      `${result.success ? t("message.testResult.success") : t("message.testResult.failed")} · ${result.message} · ${
        result.latencyMs
      }ms`
    );
    if (result.success) {
      message.success(t("message.connectionSuccess"));
    } else {
      message.error(result.message);
    }
  };

  const handleDeleteStandard = (providerId: StandardProviderId) => {
    removeStandard(providerId);
  };

  const openCustomModal = (provider?: CustomProviderConfig) => {
    setEditingCustom(provider ?? null);
    customForm.setFieldsValue({
      name: provider?.name ?? "",
      baseUrl: provider?.baseUrl ?? "",
      apiKey: "",
      models:
        provider?.models && provider.models.length > 0
          ? provider.models
          : provider?.model
          ? [provider.model]
          : [""],
      enabled: provider?.enabled ?? true,
    });
    setCustomTestMessage(null);
    setCustomModalOpen(true);
  };

  const handleSaveCustom = async () => {
    const values = await customForm.validateFields();
    const models = (values.models ?? [])
      .map((value: string) => value.trim())
      .filter((value: string) => value.length > 0);
    const payload = {
      name: values.name.trim(),
      baseUrl: values.baseUrl.trim(),
      apiKey: values.apiKey?.trim() || undefined,
      model: models[0] ?? "",
      models,
      enabled: values.enabled ?? true,
    };
    setCustomSaving(true);
    try {
      if (editingCustom) {
        await updateCustomProvider(editingCustom.id, payload);
      } else {
        await addCustomProvider(payload);
      }
      setCustomModalOpen(false);
    } finally {
      setCustomSaving(false);
    }
  };

  const handleClearCustomKey = async () => {
    if (!editingCustom) {
      return;
    }
    const values = customForm.getFieldsValue();
    setCustomSaving(true);
    try {
      await updateCustomProvider(editingCustom.id, {
        name: values.name.trim(),
        baseUrl: values.baseUrl.trim(),
        model: (values.models ?? [])[0]?.trim() ?? "",
        models: (values.models ?? [])
          .map((value: string) => value.trim())
          .filter((value: string) => value.length > 0),
        enabled: values.enabled ?? true,
        clearKey: true,
      });
      customForm.setFieldsValue({ apiKey: "" });
      setCustomTestMessage(null);
    } finally {
      setCustomSaving(false);
    }
  };

  const handleTestCustom = async () => {
    const values = customForm.getFieldsValue();
    if (!values.baseUrl || (!values.apiKey && !editingCustom?.hasKey)) {
      message.error(t("message.fillUrlAndKey"));
      return;
    }
    const models = (values.models ?? [])
      .map((value: string) => value.trim())
      .filter((value: string) => value.length > 0);
    const result = await modelHubService.testConnection({
      providerType: "CUSTOM",
      providerId: editingCustom?.id,
      baseUrl: values.baseUrl.trim(),
      apiKey: values.apiKey?.trim(),
      model: models[0],
    });
    setCustomTestMessage(
      `${result.success ? t("message.testResult.success") : t("message.testResult.failed")} · ${result.message} · ${
        result.latencyMs
      }ms`
    );
    if (result.success) {
      message.success(t("message.connectionSuccess"));
    } else {
      message.error(result.message);
    }
  };

  const openVectorStoreModal = (provider?: VectorStoreProviderConfig) => {
    setEditingVectorStore(provider ?? null);
    vectorStoreForm.setFieldsValue({
      name: provider?.name ?? "",
      providerKey: provider?.providerKey ?? ("milvus" as VectorStoreProviderKey),
      baseUrl: provider?.baseUrl ?? "",
      apiKey: "",
      database: provider?.database ?? "",
      grpcUrl: provider?.grpcUrl ?? "",
      preferGrpc: provider?.preferGrpc ?? false,
      enabled: provider?.enabled ?? true,
    });
    setVectorStoreModalOpen(true);
  };

  const handleSaveVectorStore = async () => {
    const values = await vectorStoreForm.validateFields();
    const payload = {
      name: values.name.trim(),
      providerKey: values.providerKey,
      baseUrl: values.baseUrl.trim(),
      apiKey: values.apiKey?.trim() || undefined,
      database: values.database?.trim() || undefined,
      grpcUrl: values.grpcUrl?.trim() || undefined,
      preferGrpc: values.preferGrpc ?? false,
      enabled: values.enabled ?? true,
    };
    setVectorStoreSaving(true);
    try {
      if (editingVectorStore) {
        await updateVectorStoreProvider(editingVectorStore.id, payload);
      } else {
        await createVectorStoreProvider(payload);
      }
      setVectorStoreModalOpen(false);
    } finally {
      setVectorStoreSaving(false);
    }
  };

  const handleClearVectorStoreKey = async () => {
    if (!editingVectorStore) {
      return;
    }
    const values = vectorStoreForm.getFieldsValue();
    setVectorStoreSaving(true);
    try {
      await updateVectorStoreProvider(editingVectorStore.id, {
        name: values.name.trim(),
        providerKey: values.providerKey,
        baseUrl: values.baseUrl.trim(),
        database: values.database?.trim() || undefined,
        grpcUrl: values.grpcUrl?.trim() || undefined,
        preferGrpc: values.preferGrpc ?? false,
        enabled: values.enabled ?? true,
        clearKey: true,
      });
      vectorStoreForm.setFieldsValue({ apiKey: "" });
    } finally {
      setVectorStoreSaving(false);
    }
  };

  const standardColumns: ColumnsType<(typeof standardRows)[number]> = [
    {
      title: t("columns.provider"),
      dataIndex: "name",
      key: "name",
      render: (_, record) => {
        const ProviderIcon = record.iconKey
          ? IconMap[record.iconKey]
          : undefined;
        return (
          <div className={styles.providerRow}>
            {ProviderIcon ? (
              <span className={styles.providerIconBadge}>
                <ProviderIcon className={styles.providerIcon} />
              </span>
            ) : (
              <span
                className={styles.providerBadge}
                style={{ background: record.color }}
              >
                {record.initial}
              </span>
            )}
            <div className={styles.providerMeta}>
              <Text className={styles.providerName}>{record.name}</Text>
            </div>
          </div>
        );
      },
    },
    {
      title: t("columns.status"),
      dataIndex: "status",
      key: "status",
      render: (_, record) => {
        if (!record.configured) {
          return <Tag color={"default"}>{t("status.notConfigured")}</Tag>;
        }
        return (
          <Space>
            <Tag color={record.status ? "green" : "warning"}>
              {record.status ? t("status.enabled") : t("status.disabled")}
            </Tag>
            <Switch
              size="small"
              checked={record.status}
              onChange={(checked) => toggleStandard(record.id, checked)}
            />
          </Space>
        );
      },
    },
    {
      title: t("columns.configTime"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => formatTime(value),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Space>
          <Button type="text" onClick={() => openStandardModal(record)}>
            <AiOutlineSetting />
          </Button>
          {record.configured && (
            <Popconfirm
              title={t("confirm.deleteProvider")}
              okText={tCommon("delete")}
              cancelText={tCommon("cancel")}
              onConfirm={() => handleDeleteStandard(record.id)}
            >
              <Button type="text" danger>
                <AiOutlineDelete />
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const customColumns: ColumnsType<CustomProviderConfig> = [
    {
      title: t("columns.provider"),
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div className={styles.providerRow}>
          <span
            className={styles.providerBadge}
            style={{ background: "#4b5563" }}
          >
            {record.name.charAt(0).toUpperCase()}
          </span>
          <div className={styles.providerMeta}>
            <Text className={styles.providerName}>{record.name}</Text>
            <span className={styles.providerHint}>{record.baseUrl}</span>
          </div>
        </div>
      ),
    },
    {
      title: t("columns.modelList"),
      dataIndex: "models",
      key: "models",
      render: (_, record) => {
        const models =
          record.models && record.models.length > 0
            ? record.models
            : record.model
            ? [record.model]
            : [];
        if (models.length === 0) {
          return "-";
        }
        const visible = models.slice(0, 3);
        const hidden = models.length - visible.length;
        return (
          <Space size={[4, 4]} wrap>
            {visible.map((model) => (
              <Tag key={model}>{model}</Tag>
            ))}
            {hidden > 0 && <Tag>+{hidden}</Tag>}
          </Space>
        );
      },
    },
    {
      title: t("columns.status"),
      dataIndex: "enabled",
      key: "enabled",
      render: (_, record) => (
        <Space>
          <Tag color={record.enabled ? "green" : "default"}>
            {record.enabled ? t("status.active") : t("status.inactive")}
          </Tag>
          <Switch
            size="small"
            checked={record.enabled}
            onChange={(checked) => toggleCustomProvider(record.id, checked)}
          />
        </Space>
      ),
    },
    {
      title: t("columns.configTime"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => formatTime(value),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Space>
          <Button type="text" onClick={() => openCustomModal(record)}>
            <AiOutlineSetting />
          </Button>
          <Popconfirm
            title={t("confirm.deleteProvider")}
            okText={tCommon("delete")}
            cancelText={tCommon("cancel")}
            onConfirm={() => removeCustomProvider(record.id)}
          >
            <Button type="text" danger>
              <AiOutlineDelete />
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const vectorStoreColumns: ColumnsType<VectorStoreProviderConfig> = [
    {
      title: t("columns.vectorStore"),
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <div className={styles.providerRow}>
          <span
            className={styles.providerBadge}
            style={{
              background:
                VECTOR_STORE_PROVIDER_COLORS[
                  record.providerKey as VectorStoreProviderKey
                ],
            }}
          >
            {record.name.charAt(0).toUpperCase()}
          </span>
          <div className={styles.providerMeta}>
            <Text className={styles.providerName}>{record.name}</Text>
            <span className={styles.providerHint}>
              {VECTOR_STORE_PROVIDER_LABELS[
                record.providerKey as VectorStoreProviderKey
              ]}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: t("columns.address"),
      dataIndex: "baseUrl",
      key: "baseUrl",
      render: (value) => (
        <span className={styles.providerHint}>{value}</span>
      ),
    },
    {
      title: t("columns.status"),
      dataIndex: "enabled",
      key: "enabled",
      render: (_, record) => (
        <Space>
          <Tag color={record.enabled ? "green" : "default"}>
            {record.enabled ? t("status.active") : t("status.inactive")}
          </Tag>
          <Switch
            size="small"
            checked={record.enabled}
            onChange={(checked) => toggleVectorStoreProvider(record.id, checked)}
          />
        </Space>
      ),
    },
    {
      title: t("columns.configTime"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => formatTime(value),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Space>
          <Button type="text" onClick={() => openVectorStoreModal(record)}>
            <AiOutlineSetting />
          </Button>
          <Popconfirm
            title={t("confirm.deleteVectorStore")}
            okText={tCommon("delete")}
            cancelText={tCommon("cancel")}
            onConfirm={() => removeVectorStoreProvider(record.id)}
          >
            <Button type="text" danger>
              <AiOutlineDelete />
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitle}>
          <Title level={3}>{t("pageTitle")}</Title>
          <span className={styles.headerMeta}>
            {t("pageDescription")}
          </span>
        </div>
      </div>

      <Tabs
        defaultActiveKey="models"
        items={[
          {
            key: "models",
            label: t("tabs.models"),
            children: (
              <div>
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderLeft}>
                      <div className={styles.sectionTitle}>{t("sections.standardProviders")}</div>
                    </div>
                  </div>
                  <Table
                    rowKey="id"
                    columns={standardColumns}
                    dataSource={standardRows}
                    loading={loading}
                    pagination={false}
                  />
                </div>

                <div>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderLeft}>
                      <div className={styles.sectionTitle}>{t("sections.customModels")}</div>
                      <Tag color="blue">OpenAI Compatible</Tag>
                    </div>
                    <Button
                      type="primary"
                      icon={<AiOutlinePlus />}
                      onClick={() => openCustomModal()}
                    >
                      {t("buttons.addModel")}
                    </Button>
                  </div>
                  <Table
                    rowKey="id"
                    columns={customColumns}
                    dataSource={customProviders}
                    loading={loading}
                    pagination={false}
                  />
                </div>
              </div>
            ),
          },
          {
            key: "vector-stores",
            label: t("tabs.vectorStores"),
            children: (
              <div>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionHeaderLeft}>
                    <div className={styles.sectionTitle}>{t("sections.vectorStoreProviders")}</div>
                    <Tag color="green">Milvus / Qdrant</Tag>
                  </div>
                  <Button
                    type="primary"
                    icon={<AiOutlinePlus />}
                    onClick={() => openVectorStoreModal()}
                  >
                    {t("buttons.addProvider")}
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  columns={vectorStoreColumns}
                  dataSource={vectorStoreProviders}
                  loading={vectorStoreLoading}
                  pagination={false}
                />
              </div>
            ),
          },
        ]}
      />

      <StandardProviderModal
        title={
          activeStandard
            ? t("modal.configureProviderWithName", { name: activeStandard.name })
            : t("modal.configureProvider")
        }
        open={standardModalOpen}
        form={standardForm}
        saving={standardSaving}
        hasKey={Boolean(activeStandardConfig?.hasKey)}
        testMessage={standardTestMessage}
        onCancel={() => setStandardModalOpen(false)}
        onSave={handleSaveStandard}
        onClearKey={handleClearStandardKey}
        onTest={handleTestStandard}
        showModelSection={Boolean(activeStandardConfig?.hasKey)}
        modelCatalog={standardModelCatalog}
        modelGroups={modelGroups}
        enabledModels={standardEnabledModels}
        modelQuery={standardModelQuery}
        onModelQueryChange={setStandardModelQuery}
        onRefreshModels={handleRefreshStandardModels}
        modelLoading={standardModelLoading}
        onToggleModel={handleToggleStandardModel}
        styles={styles}
      />

      <CustomProviderModal
        open={customModalOpen}
        form={customForm}
        saving={customSaving}
        editingCustom={editingCustom}
        testMessage={customTestMessage}
        onCancel={() => setCustomModalOpen(false)}
        onSave={handleSaveCustom}
        onClearKey={handleClearCustomKey}
        onTest={handleTestCustom}
      />

      <VectorStoreProviderModal
        open={vectorStoreModalOpen}
        form={vectorStoreForm}
        saving={vectorStoreSaving}
        editingProvider={editingVectorStore}
        onCancel={() => setVectorStoreModalOpen(false)}
        onSave={handleSaveVectorStore}
        onClearKey={handleClearVectorStoreKey}
      />
    </div>
  );
};

export default Settings;
