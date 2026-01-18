import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import { createStyles } from "antd-style";
import { Link } from "react-router-dom";
import { VariableInput } from "@/components/VariableInput";
import { useVectorStoreStore } from "@/store/vectorStoreStore";
import {
  VECTOR_STORE_PROVIDER_LABELS,
  type VectorStoreProviderKey,
} from "@/config/vectorStores";
import {
  listCollections,
  createCollection,
} from "@/services/vectorStoreService";

const { Text } = Typography;

const useStyles = createStyles(({ css, token }) => ({
  section: css`
    display: flex;
    flex-direction: column;
    gap: 8px;

    .ant-form-item {
      margin-bottom: 8px;
    }

    .ant-form-item:last-child {
      margin-bottom: 0;
    }
  `,
  hint: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
    margin-top: 4px;
  `,
  collectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  `,
  collectionActions: css`
    display: flex;
    gap: 4px;
  `,
  fieldGroup: css`
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadius}px;
    padding: 12px;
    margin-bottom: 8px;
  `,
  fieldGroupTitle: css`
    font-weight: 500;
    margin-bottom: 8px;
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
}));

interface CreateCollectionModalProps {
  open: boolean;
  providerId: string;
  onClose: () => void;
  onSuccess: (collectionName: string) => void;
}

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
  open,
  providerId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { providers } = useVectorStoreStore();

  const provider = useMemo(
    () => providers.find((p) => p.id === providerId),
    [providers, providerId]
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!provider) return;

      setLoading(true);
      await createCollection({
        provider: {
          type: provider.providerKey as "milvus" | "qdrant",
          baseUrl: provider.baseUrl,
          database: provider.database || undefined,
        },
        collection: values.collection,
        dimension: values.dimension,
        metricType: values.metricType,
        database: provider.database || undefined,
      });

      message.success(`Collection "${values.collection}" 创建成功`);
      onSuccess(values.collection);
      form.resetFields();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "创建失败";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="新建 Collection"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ dimension: 1024, metricType: "COSINE" }}
      >
        <Form.Item
          name="collection"
          label="Collection 名称"
          rules={[
            { required: true, message: "请输入 Collection 名称" },
            {
              pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
              message: "仅支持字母、数字和下划线，且不能以数字开头",
            },
          ]}
        >
          <Input placeholder="例如 my_documents" />
        </Form.Item>
        <Form.Item
          name="dimension"
          label="向量维度"
          rules={[{ required: true, message: "请输入向量维度" }]}
          extra="常见维度：768 (BGE-base)、1024 (BGE-large)、1536 (OpenAI)、3072 (OpenAI-large)"
        >
          <InputNumber min={1} max={65536} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="metricType"
          label="相似度度量"
          rules={[{ required: true, message: "请选择相似度度量" }]}
        >
          <Select
            options={[
              { label: "COSINE (余弦相似度)", value: "COSINE" },
              { label: "L2 (欧氏距离)", value: "L2" },
              { label: "IP (内积)", value: "IP" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const VectorStoreNodeConfig: React.FC = () => {
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const { providers, loading, fetchProviders } = useVectorStoreStore();
  const [collections, setCollections] = useState<string[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const providerId = Form.useWatch("providerId", { form, preserve: true }) as
    | string
    | undefined;
  const operation = Form.useWatch("operation", { form, preserve: true }) as
    | "upsert"
    | "delete"
    | "search"
    | undefined;

  useEffect(() => {
    if (providers.length === 0) {
      fetchProviders();
    }
  }, [providers.length, fetchProviders]);

  // 获取选中 provider 的 collections
  useEffect(() => {
    const fetchCollections = async () => {
      if (!providerId) {
        setCollections([]);
        return;
      }

      const provider = providers.find((p) => p.id === providerId);
      if (!provider) return;

      setCollectionsLoading(true);
      try {
        const result = await listCollections({
          provider: {
            type: provider.providerKey as "milvus" | "qdrant",
            base_url: provider.baseUrl,
          },
          database: provider.database || undefined,
        });
        setCollections(result?.collections || []);
      } catch (error) {
        console.error("Failed to fetch collections:", error);
        setCollections([]);
      } finally {
        setCollectionsLoading(false);
      }
    };

    fetchCollections();
  }, [providerId, providers]);

  const providerOptions = useMemo(() => {
    return providers
      .filter((provider) => provider.enabled)
      .map((provider) => ({
        value: provider.id,
        label: `${provider.name} · ${
          VECTOR_STORE_PROVIDER_LABELS[
            provider.providerKey as VectorStoreProviderKey
          ]
        }`,
      }));
  }, [providers]);

  const collectionOptions = useMemo(() => {
    return collections.map((name) => ({
      value: name,
      label: name,
    }));
  }, [collections]);

  const handleRefreshCollections = async () => {
    if (!providerId) return;

    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    setCollectionsLoading(true);
    try {
      const result = await listCollections({
        provider: {
          type: provider.providerKey as "milvus" | "qdrant",
          base_url: provider.baseUrl,
        },
        database: provider.database || undefined,
      });
      setCollections(result?.collections || []);
      message.success("已刷新 Collection 列表");
    } catch (error) {
      console.error("Failed to refresh collections:", error);
      message.error("刷新失败");
    } finally {
      setCollectionsLoading(false);
    }
  };

  const handleCreateSuccess = (collectionName: string) => {
    setCollections((prev) => [...prev, collectionName]);
    form.setFieldValue("collection", collectionName);
    setCreateModalOpen(false);
  };

  const hasProviders = providerOptions.length > 0;

  return (
    <div className={styles.section}>
      {!loading && !hasProviders && (
        <Alert
          type="warning"
          showIcon
          message="还没有可用的向量存储提供方"
          description={
            <Text type="secondary">
              请先前往 <Link to="/settings">系统设置</Link> 配置 Milvus 或
              Qdrant。
            </Text>
          }
        />
      )}
      <Form.Item
        name="providerId"
        label="向量存储提供方"
        rules={[{ required: true, message: "请选择向量存储提供方" }]}
      >
        <Select
          loading={loading}
          placeholder="选择已配置的向量存储"
          options={providerOptions}
        />
      </Form.Item>
      <Form.Item
        name="operation"
        label="操作类型"
        rules={[{ required: true, message: "请选择操作类型" }]}
      >
        <Select
          options={[
            { label: "添加/更新文档", value: "upsert" },
            { label: "删除文档", value: "delete" },
            { label: "相似度检索", value: "search" },
          ]}
        />
      </Form.Item>

      <Form.Item
        name="collection"
        label={
          <div className={styles.collectionHeader}>
            <span>Collection</span>
            {providerId && (
              <Space className={styles.collectionActions} size={4}>
                <Button
                  type="text"
                  size="small"
                  icon={<LuRefreshCw />}
                  loading={collectionsLoading}
                  onClick={handleRefreshCollections}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<LuPlus />}
                  onClick={() => setCreateModalOpen(true)}
                >
                  新建
                </Button>
              </Space>
            )}
          </div>
        }
        rules={[{ required: true, message: "请选择或输入 Collection" }]}
      >
        <Select
          showSearch
          allowClear
          loading={collectionsLoading}
          placeholder="选择或输入 Collection 名称"
          options={collectionOptions}
          notFoundContent={
            collectionsLoading ? "加载中..." : "暂无 Collection"
          }
          filterOption={(input, option) =>
            (option?.label ?? "")
              .toLowerCase()
              .includes(input.toLowerCase())
          }
        />
      </Form.Item>

      {/* Upsert 操作配置 */}
      {operation === "upsert" && (
        <div className={styles.fieldGroup}>
          <div className={styles.fieldGroupTitle}>数据来源配置</div>
          
          <Form.Item
            name="vectorSource"
            label="向量来源"
            rules={[{ required: true, message: "请指定向量来源" }]}
            extra="引用前置向量化节点的输出，如 {{nodes.embedding.output.vectors}}"
          >
            <VariableInput placeholder="{{nodes.embedding.output.vectors}}" />
          </Form.Item>

          <Form.Item
            name="contentSource"
            label="内容来源"
            extra="原始文本内容，用于检索时返回。如 {{nodes.splitter.output.chunks}}"
          >
            <VariableInput placeholder="{{nodes.splitter.output.chunks}}" />
          </Form.Item>

          <Form.Item
            name="idSource"
            label="ID 来源"
            extra="文档 ID 列表（可选）。留空则自动生成 UUID"
          >
            <VariableInput placeholder="{{nodes.loader.output.ids}}" />
          </Form.Item>

          <Form.Item
            name="metadataSource"
            label="元数据来源"
            extra="元数据列表（可选）。如 {{nodes.loader.output.metadata}}"
          >
            <VariableInput placeholder="{{nodes.loader.output.metadata}}" />
          </Form.Item>
        </div>
      )}

      {/* Delete 操作配置 */}
      {operation === "delete" && (
        <Form.Item
          name="ids"
          label="待删除 ID"
          rules={[{ required: true, message: "请输入待删除 ID" }]}
          extra="支持 JSON 数组或变量引用"
        >
          <VariableInput 
            multiline 
            placeholder={'["doc-1", "doc-2"] 或 {{nodes.xxx.output.ids}}'} 
          />
        </Form.Item>
      )}

      {/* Search 操作配置 */}
      {operation === "search" && (
        <div className={styles.fieldGroup}>
          <div className={styles.fieldGroupTitle}>检索配置</div>
          
          <Form.Item
            name="queryVector"
            label="查询向量"
            rules={[{ required: true, message: "请指定查询向量" }]}
            extra="引用前置向量化节点的输出（单个向量）"
          >
            <VariableInput placeholder="{{nodes.embedding.output.vector}}" />
          </Form.Item>

          <Form.Item 
            name="topK" 
            label="返回数量" 
            initialValue={5}
          >
            <InputNumber min={1} max={100} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="scoreThreshold"
            label="相似度阈值"
            extra="可选，仅返回相似度大于该阈值的记录"
          >
            <VariableInput placeholder="0.8 或 {{nodes.xxx.output.threshold}}" />
          </Form.Item>

          <Form.Item
            name="excludeId"
            label="排除内容 ID"
            extra="可选，过滤掉当前内容，避免检索结果包含自身"
          >
            <VariableInput placeholder="{{input.contentId}}" />
          </Form.Item>

          <Form.Item 
            name="filter" 
            label="过滤条件"
            extra="JSON 格式的元数据过滤条件"
          >
            <VariableInput placeholder='{"category": "news"}' />
          </Form.Item>

          <Form.Item 
            name="includeMetadata" 
            valuePropName="checked"
            initialValue={true}
          >
            <Switch
              checkedChildren="包含元数据"
              unCheckedChildren="仅返回内容"
            />
          </Form.Item>
        </div>
      )}

      <div className={styles.hint}>
        💡 提示：本节点不进行向量化，请在前置节点完成向量化后，通过变量引用传入向量数据。
      </div>

      {providerId && (
        <CreateCollectionModal
          open={createModalOpen}
          providerId={providerId}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default VectorStoreNodeConfig;
