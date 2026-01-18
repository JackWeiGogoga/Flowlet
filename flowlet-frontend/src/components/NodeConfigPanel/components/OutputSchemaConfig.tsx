import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Form,
  Input,
  Tooltip,
  Switch,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Collapse,
} from "antd";
import {
  AiOutlineQuestionCircle,
  AiOutlineDatabase,
  AiOutlinePlus,
} from "react-icons/ai";
import { createStyles } from "antd-style";
import { useProjectStore } from "@/store/projectStore";
import { useFlowStore } from "@/store/flowStore";
import dataStructureService, {
  DataStructureResponse,
  TypeParameter,
} from "@/services/dataStructureService";
import { DataStructureDrawer } from "@/components/DataStructureManager";
import { NodeType, StartNodeConfig, VariableType } from "@/types";

const { Text } = Typography;

const useStyles = createStyles(({ token, css }) => ({
  container: css`
    margin-top: ${token.marginMD}px;
  `,
  schemaSection: css`
    background: ${token.colorBgLayout};
    border-radius: ${token.borderRadius}px;
    padding: ${token.paddingSM}px;
    margin-top: ${token.marginSM}px;
  `,
  schemaHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${token.marginSM}px;
  `,
  schemaTitle: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
  `,
  structurePreview: css`
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
    padding: ${token.paddingSM}px;
    margin-top: ${token.marginSM}px;
  `,
  fieldList: css`
    font-size: ${token.fontSizeSM}px;
    line-height: 1.8;
  `,
  fieldItem: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
  `,
  fieldName: css`
    font-family: "Monaco", "Menlo", monospace;
    color: ${token.colorPrimary};
  `,
  fieldType: css`
    color: ${token.colorTextDescription};
  `,
  noSchema: css`
    text-align: center;
    padding: ${token.paddingMD}px;
    color: ${token.colorTextDescription};
  `,
  genericConfig: css`
    background: ${token.colorPrimaryBg};
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: ${token.borderRadius}px;
    padding: ${token.paddingSM}px;
    margin-top: ${token.marginSM}px;
  `,
  genericTitle: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorPrimary};
    margin-bottom: ${token.marginSM}px;
    font-weight: 500;
  `,
  genericParamRow: css`
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    padding: ${token.paddingXS}px ${token.paddingSM}px;
    margin-bottom: ${token.marginXS}px;
  `,
  genericParamHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${token.marginXS}px;
  `,
  genericParamLabel: css`
    font-family: "Monaco", "Menlo", monospace;
    font-weight: 600;
    font-size: 14px;
    color: ${token.colorPrimary};
  `,
  genericParamDesc: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
    margin-left: ${token.marginXS}px;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  typePreview: css`
    font-family: "Monaco", "Menlo", monospace;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorSuccess};
    background: ${token.colorSuccessBg};
    padding: 2px 8px;
    border-radius: ${token.borderRadiusSM}px;
  `,
  genericParamControls: css`
    display: flex;
    align-items: center;
    gap: ${token.marginSM}px;
  `,
}));

// 泛型参数配置项组件
interface GenericParamItemProps {
  param: TypeParameter;
  structures: DataStructureResponse[];
  selectedStructureId: string;
  genericParams: string[];
  form: ReturnType<typeof Form.useFormInstance>;
}

const GenericParamItem: React.FC<GenericParamItemProps> = ({
  param,
  structures,
  selectedStructureId,
  genericParams,
  form,
}) => {
  const { styles } = useStyles();

  // 监听当前参数的配置
  const isArray = Form.useWatch(["genericTypeArgs", param.name, "isArray"], {
    form,
    preserve: true,
  });
  const elementType = Form.useWatch(
    ["genericTypeArgs", param.name, "elementType"],
    { form, preserve: true }
  );
  const collectionType = Form.useWatch(
    ["genericTypeArgs", param.name, "collectionType"],
    { form, preserve: true }
  );
  const mapKeyType = Form.useWatch(
    ["genericTypeArgs", param.name, "keyType"],
    { form, preserve: true }
  );
  const mapValueType = Form.useWatch(
    ["genericTypeArgs", param.name, "valueType"],
    { form, preserve: true }
  );

  useEffect(() => {
    if (isArray && !collectionType) {
      form.setFieldValue(
        ["genericTypeArgs", param.name, "collectionType"],
        "list"
      );
      form.setFieldValue(["genericTypeArgs", param.name, "isArray"], false);
    }
  }, [collectionType, form, isArray, param.name]);

  // 计算类型预览文本
  const typePreview = useMemo(() => {
    const resolvedName = (value?: string) => {
      if (!value) return null;
      if (value.startsWith("struct:")) {
        const structId = value.replace("struct:", "");
        const struct = structures.find((s) => s.id === structId);
        return struct?.name || "Unknown";
      }
      if (value.startsWith("generic:")) {
        return value.replace("generic:", "");
      }
      return value;
    };

    if (collectionType === "map") {
      const keyName = resolvedName(mapKeyType) || "string";
      const valueName = resolvedName(mapValueType) || "object";
      return `Map<${keyName}, ${valueName}>`;
    }

    const typeName = resolvedName(elementType);
    if (!typeName) return null;

    if (collectionType === "set") {
      return `Set<${typeName}>`;
    }
    if (collectionType === "list") {
      return `List<${typeName}>`;
    }

    return typeName;
  }, [
    collectionType,
    elementType,
    mapKeyType,
    mapValueType,
    structures,
  ]);

  return (
    <div className={styles.genericParamRow}>
      {/* 第一行：参数名、描述、类型预览 */}
      <div className={styles.genericParamHeader}>
        <Space size={4}>
          <span className={styles.genericParamLabel}>{param.name}</span>
          {param.description && (
            <Tooltip title={param.description}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                (
                {param.description.length > 8
                  ? param.description.slice(0, 8) + "..."
                  : param.description}
                )
              </Text>
            </Tooltip>
          )}
        </Space>
        {typePreview && (
          <span className={styles.typePreview}>= {typePreview}</span>
        )}
      </div>
      {/* 第二行：配置控件 */}
      <div className={styles.genericParamControls}>
        <Form.Item
          name={["genericTypeArgs", param.name, "collectionType"]}
          noStyle
          initialValue=""
        >
          <Select
            placeholder="集合类型"
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="">无</Select.Option>
            <Select.Option value="list">List</Select.Option>
            <Select.Option value="set">Set</Select.Option>
            <Select.Option value="map">Map</Select.Option>
          </Select>
        </Form.Item>

        {collectionType === "map" ? (
          <>
            <Form.Item
              name={["genericTypeArgs", param.name, "keyType"]}
              noStyle
              initialValue="string"
            >
              <Select style={{ width: 140 }} placeholder="Key 类型">
                <Select.Option value="string">string</Select.Option>
                <Select.Option value="number">number</Select.Option>
                <Select.Option value="boolean">boolean</Select.Option>
                {genericParams.length > 0 && (
                  <Select.OptGroup label="输入泛型">
                    {genericParams.map((paramName) => (
                      <Select.Option
                        key={`key-generic-${paramName}`}
                        value={`generic:${paramName}`}
                      >
                        {paramName}
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                )}
              </Select>
            </Form.Item>
            <Form.Item
              name={["genericTypeArgs", param.name, "valueType"]}
              noStyle
              initialValue=""
            >
              <Select placeholder="Value 类型" style={{ flex: 1 }}>
                <Select.OptGroup label="基础类型">
                  <Select.Option value="string">string</Select.Option>
                  <Select.Option value="number">number</Select.Option>
                  <Select.Option value="boolean">boolean</Select.Option>
                  <Select.Option value="object">object</Select.Option>
                </Select.OptGroup>
                {genericParams.length > 0 && (
                  <Select.OptGroup label="输入泛型">
                    {genericParams.map((paramName) => (
                      <Select.Option
                        key={`value-generic-${paramName}`}
                        value={`generic:${paramName}`}
                      >
                        {paramName}
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                )}
                {structures.filter(
                  (s) => s.id !== selectedStructureId && !s.isGeneric
                ).length > 0 && (
                  <Select.OptGroup label="数据结构">
                    {structures
                      .filter((s) => s.id !== selectedStructureId && !s.isGeneric)
                      .map((s) => (
                        <Select.Option key={s.id} value={`struct:${s.id}`}>
                          {s.name}
                        </Select.Option>
                      ))}
                  </Select.OptGroup>
                )}
              </Select>
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item
              name={["genericTypeArgs", param.name, "elementType"]}
              noStyle
              initialValue=""
            >
              <Select
                placeholder={
                  collectionType ? "选择元素类型" : `选择 ${param.name} 的类型`
                }
                style={{ flex: 1, minWidth: 0 }}
                allowClear
              >
                <Select.OptGroup label="基础类型">
                  <Select.Option value="string">string</Select.Option>
                  <Select.Option value="number">number</Select.Option>
                  <Select.Option value="boolean">boolean</Select.Option>
                  <Select.Option value="object">object</Select.Option>
                </Select.OptGroup>
                {genericParams.length > 0 && (
                  <Select.OptGroup label="输入泛型">
                    {genericParams.map((paramName) => (
                      <Select.Option
                        key={`element-generic-${paramName}`}
                        value={`generic:${paramName}`}
                      >
                        {paramName}
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                )}
                {structures.filter(
                  (s) => s.id !== selectedStructureId && !s.isGeneric
                ).length > 0 && (
                  <Select.OptGroup label="数据结构">
                    {structures
                      .filter((s) => s.id !== selectedStructureId && !s.isGeneric)
                      .map((s) => (
                        <Select.Option key={s.id} value={`struct:${s.id}`}>
                          {s.name}
                        </Select.Option>
                      ))}
                  </Select.OptGroup>
                )}
              </Select>
            </Form.Item>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * 输出结构配置组件
 * 允许用户为节点输出选择或创建数据结构定义
 */
interface OutputSchemaConfigProps {
  embedded?: boolean;
  showAlias?: boolean;
  title?: string;
}

export const OutputSchemaConfig: React.FC<OutputSchemaConfigProps> = ({
  embedded = false,
  showAlias = true,
  title = "输出结构定义",
}) => {
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const { currentProject } = useProjectStore();
  const { flowId, dataStructures, setDataStructures, nodes } = useFlowStore();

  const [structures, setStructures] = useState<DataStructureResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] =
    useState<DataStructureResponse | null>(null);

  // 监听表单中的输出结构配置
  const outputStructureId = Form.useWatch("outputStructureId", {
    form,
    preserve: true,
  });
  const enableOutputSchema = Form.useWatch("enableOutputSchema", {
    form,
    preserve: true,
  });
  const outputCollectionType = Form.useWatch("outputCollectionType", {
    form,
    preserve: true,
  });
  const isGenericOutput =
    typeof outputStructureId === "string" &&
    outputStructureId.startsWith("generic:");
  const selectedGenericParam = isGenericOutput
    ? outputStructureId.replace("generic:", "")
    : null;

  // 加载数据结构列表
  const loadStructures = useCallback(async () => {
    if (!currentProject?.id) return;

    setLoading(true);
    try {
      const list = await dataStructureService.getAvailable(
        currentProject.id,
        flowId || undefined
      );
      setStructures(list);
      setDataStructures(list);
    } catch (error) {
      console.error("加载数据结构失败:", error);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, flowId, setDataStructures]);

  useEffect(() => {
    loadStructures();
  }, [loadStructures]);

  useEffect(() => {
    if (!dataStructures || dataStructures.length === 0) return;
    setStructures(dataStructures);
  }, [dataStructures]);

  const inputGenericParams = useMemo(() => {
    const startNode = nodes.find((node) => node.data.nodeType === NodeType.START);
    const startConfig = startNode?.data?.config as StartNodeConfig | undefined;
    const inputVariables = startConfig?.variables || [];
    const params = new Set<string>();

    inputVariables.forEach((variable) => {
      if (
        variable.type !== VariableType.STRUCTURE ||
        !variable.structureRef
      ) {
        return;
      }
      const structureRef = variable.structureRef;
      const structureId = structureRef.replace(/^struct:/, "");
      const structure =
        structures.find((item) => item.id === structureId) ||
        structures.find(
          (item) =>
            item.fullName === structureRef || item.name === structureRef
        );
      if (structure?.isGeneric && structure.typeParameters?.length) {
        structure.typeParameters.forEach((param) => {
          if (param.name) {
            params.add(param.name);
          }
        });
        return;
      }

      const normalizedRef = structureRef.toLowerCase();
      if (normalizedRef.includes("list")) {
        params.add("T");
        return;
      }
      if (normalizedRef.includes("set")) {
        params.add("T");
        return;
      }
      if (normalizedRef.includes("map")) {
        params.add("K");
        params.add("V");
      }
    });

    return Array.from(params);
  }, [nodes, structures]);

  // 当选择的结构 ID 变化时，更新预览
  useEffect(() => {
    if (outputStructureId && !isGenericOutput) {
      const structure = structures.find((s) => s.id === outputStructureId);
      setSelectedStructure(structure || null);
    } else {
      setSelectedStructure(null);
    }
  }, [isGenericOutput, outputStructureId, structures]);

  // 处理结构创建成功
  const handleStructureCreated = (structure: DataStructureResponse) => {
    setStructures((prev) => {
      const next = prev.filter((item) => item.id !== structure.id);
      next.push(structure);
      return next;
    });
    const nextStructures = (dataStructures || []).filter(
      (item) => item.id !== structure.id
    );
    nextStructures.push(structure);
    setDataStructures(nextStructures);
    form.setFieldValue("outputStructureId", structure.id);
    setDrawerOpen(false);
  };

  // 构建选择器选项
  const selectOptions = React.useMemo(() => {
    const projectLevel = structures.filter((s) => !s.flowId);
    const currentFlowLevel = structures.filter((s) => s.flowId === flowId);
    const otherFlowLevel = structures.filter(
      (s) => s.flowId && s.flowId !== flowId
    );

    const options: {
      label: React.ReactNode;
      options: { value: string; label: React.ReactNode }[];
    }[] = [];

    if (inputGenericParams.length > 0) {
      options.push({
        label: "输入泛型",
        options: inputGenericParams.map((param) => ({
          value: `generic:${param}`,
          label: (
            <Space>
              <span>{param}</span>
              <Tag color="purple" style={{ fontSize: 10 }}>
                泛型
              </Tag>
            </Space>
          ),
        })),
      });
    }

    // 渲染结构名称，包含泛型标记
    const renderStructureName = (s: DataStructureResponse) => (
      <Space>
        <span>{s.fullName || s.name}</span>
        {s.isGeneric && (
          <Tag color="purple" style={{ fontSize: 10 }}>
            泛型
          </Tag>
        )}
      </Space>
    );

    if (projectLevel.length > 0) {
      options.push({
        label: "项目级 (global)",
        options: projectLevel.map((s) => ({
          value: s.id,
          label: renderStructureName(s),
        })),
      });
    }

    if (currentFlowLevel.length > 0) {
      options.push({
        label: "当前流程",
        options: currentFlowLevel.map((s) => ({
          value: s.id,
          label: renderStructureName(s),
        })),
      });
    }

    if (otherFlowLevel.length > 0) {
      options.push({
        label: "其他流程",
        options: otherFlowLevel.map((s) => ({
          value: s.id,
          label: (
            <Space>
              <span>{s.fullName || s.name}</span>
              {s.isGeneric && (
                <Tag color="purple" style={{ fontSize: 10 }}>
                  泛型
                </Tag>
              )}
              <Tag color="orange" style={{ fontSize: 10 }}>
                {s.flowName}
              </Tag>
            </Space>
          ),
        })),
      });
    }

    return options;
  }, [structures, flowId, inputGenericParams]);

  // 渲染字段预览
  const renderFieldPreview = (
    fields: DataStructureResponse["fields"],
    depth = 0
  ) => {
    const formatTypeLabel = (type?: string) => {
      if (!type) return "";
      if (type === "array" || type === "list") {
        return "List";
      }
      return type;
    };
    return (
      <div style={{ marginLeft: depth * 16 }}>
        {fields.map((field, index) => (
          <div key={index} className={styles.fieldItem}>
            <span className={styles.fieldName}>{field.name}</span>
            <span className={styles.fieldType}>
              : {formatTypeLabel(field.type)}
              {(field.type === "array" || field.type === "list") &&
                field.itemType &&
                `<${formatTypeLabel(field.itemType)}>`}
              {field.required && <Text type="danger">*</Text>}
            </span>
            {field.children && field.children.length > 0 && (
              <div>{renderFieldPreview(field.children, depth + 1)}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const header = (
    <Space>
      <AiOutlineDatabase />
      <span>{title}</span>
      {selectedStructure && (
        <Tag color="processing">{selectedStructure.name}</Tag>
      )}
      {selectedGenericParam && (
        <Tag color="purple">泛型 {selectedGenericParam}</Tag>
      )}
    </Space>
  );

  const content = (
    <div className={styles.container}>
      {showAlias && (
        <Form.Item
          name="outputAlias"
          label={
            <span>
              输出别名
              <Tooltip
                title={
                  <div>
                    <p>为节点输出设置一个全局变量别名。</p>
                    <p>
                      在条件分支中，多个分支节点可以使用相同的别名，
                      汇聚后的节点可以通过统一的变量名引用输出结果。
                    </p>
                  </div>
                }
              >
                <AiOutlineQuestionCircle
                  style={{ marginLeft: 4, cursor: "help" }}
                />
              </Tooltip>
            </span>
          }
          extra="设置后可通过 {{别名.字段名}} 引用此节点输出"
        >
          <Input placeholder="如: llmResult、apiData" style={{ width: "100%" }} />
        </Form.Item>
      )}

      {/* 启用输出结构定义 */}
      <Form.Item
        name="enableOutputSchema"
        label="使用数据结构"
        valuePropName="checked"
        extra="启用后可选择预定义的数据结构来规范输出格式"
      >
        <Switch />
      </Form.Item>

      {enableOutputSchema && (
        <div className={styles.schemaSection}>
          <div className={styles.schemaHeader}>
            <div className={styles.schemaTitle}>
              <AiOutlineDatabase />
              <span>选择输出结构</span>
            </div>
            <Button
              type="link"
              size="small"
              icon={<AiOutlinePlus />}
              onClick={() => setDrawerOpen(true)}
            >
              新建
            </Button>
          </div>

                  <Form.Item name="outputStructureId" noStyle>
                    <Select
                      placeholder="选择数据结构"
              allowClear
              loading={loading}
              options={selectOptions}
              style={{ width: "100%" }}
              onChange={(value) => {
                if (typeof value === "string" && value.startsWith("generic:")) {
                  form.setFieldValue("outputCollectionType", undefined);
                  form.setFieldValue("genericTypeArgs", {});
                }
              }}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label;
                if (typeof label === "string") {
                  return label.toLowerCase().includes(input.toLowerCase());
                }
                return false;
              }}
                    />
                  </Form.Item>

                  {!selectedGenericParam &&
                    selectedStructure &&
                    !selectedStructure.isGeneric && (
                    <Form.Item
                      name="outputCollectionType"
                      label="集合类型"
                      extra="用于将结构整体包装为集合类型"
                      style={{ marginTop: 8 }}
                    >
                      <Select style={{ width: 200 }} allowClear placeholder="无">
                        <Select.Option value="">无</Select.Option>
                        <Select.Option value="list">List</Select.Option>
                        <Select.Option value="set">Set</Select.Option>
                        <Select.Option value="map">Map</Select.Option>
                      </Select>
                    </Form.Item>
                  )}

                  {/* 结构预览 */}
                  {selectedStructure ? (
                    <div className={styles.structurePreview}>
                      <Text strong>
                        {selectedStructure.fullName || selectedStructure.name}
                      </Text>
                      {selectedStructure.isGeneric && (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          泛型
                        </Tag>
                      )}
                      {!selectedStructure.isGeneric &&
                        (outputCollectionType === "list" ||
                          outputCollectionType === "set" ||
                          outputCollectionType === "map") && (
                          <Tag color="geekblue" style={{ marginLeft: 8 }}>
                            {outputCollectionType.toUpperCase()}
                          </Tag>
                        )}
                      {selectedGenericParam && (
                        <Tag color="purple" style={{ marginLeft: 8 }}>
                          泛型 {selectedGenericParam}
                        </Tag>
                      )}
                      {selectedStructure.description && (
                        <Text
                          type="secondary"
                          style={{ display: "block", marginBottom: 8 }}
                        >
                          {selectedStructure.description}
                        </Text>
                      )}
                      <div className={styles.fieldList}>
                        {renderFieldPreview(selectedStructure.fields)}
                      </div>
                    </div>
                  ) : selectedGenericParam ? (
                    <div className={styles.structurePreview}>
                      <Text strong>{selectedGenericParam}</Text>
                      <Tag color="purple" style={{ marginLeft: 8 }}>
                        输入泛型
                      </Tag>
                      <Text
                        type="secondary"
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        输出结果将使用输入变量的泛型类型 {selectedGenericParam}
                      </Text>
                    </div>
                  ) : (
                    <div className={styles.noSchema}>
                      <Text type="secondary">请选择或创建数据结构</Text>
                    </div>
                  )}

          {/* 泛型参数配置 */}
          {selectedStructure?.isGeneric &&
            selectedStructure.typeParameters &&
            selectedStructure.typeParameters.length > 0 && (
              <div className={styles.genericConfig}>
                <div className={styles.genericTitle}>
                  <Tag color="blue">泛型参数配置</Tag>
                  <Text type="secondary" style={{ fontWeight: "normal" }}>
                    指定泛型参数的具体类型
                  </Text>
                </div>
                {selectedStructure.typeParameters.map((param: TypeParameter) => (
                  <GenericParamItem
                    key={param.name}
                    param={param}
                    structures={structures}
                    selectedStructureId={selectedStructure.id}
                    genericParams={inputGenericParams}
                    form={form}
                  />
                ))}
              </div>
            )}
        </div>
      )}

      {/* 数据结构创建抽屉 */}
      {currentProject?.id && (
        <DataStructureDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSaved={handleStructureCreated}
          projectId={currentProject.id}
          flowId={flowId || undefined}
        />
      )}
    </div>
  );

  if (embedded) {
    return (
      <div>
        <div className={styles.schemaTitle}>{header}</div>
        {content}
      </div>
    );
  }

  return (
    <Collapse
      ghost
      items={[
        {
          key: "outputSchema",
          label: header,
          children: content,
        },
      ]}
    />
  );
};

export default OutputSchemaConfig;
