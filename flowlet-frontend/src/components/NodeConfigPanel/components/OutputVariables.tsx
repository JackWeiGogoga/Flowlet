import React, { useEffect } from "react";
import { Divider, Tag, Alert, Form, Select, Input, Button } from "antd";
import { type Node } from "@xyflow/react";
import { createStyles } from "antd-style";
import { AiOutlinePlus, AiOutlineDelete } from "react-icons/ai";
import {
  FlowNodeData,
  NODE_OUTPUT_VARIABLES,
  OutputVariable,
  NodeType,
  SubflowNodeConfig,
  FlowGraphData,
  OutputVariableConfig,
  LlmNodeConfig,
  JsonParserOutputField,
  JsonParserNodeConfig,
  CodeNodeConfig,
  CodeOutputVariable,
  VectorStoreNodeConfig,
} from "@/types";
import { useFlowStore } from "@/store/flowStore";
import { OutputSchemaConfig } from "./OutputSchemaConfig";
import { OutputAliasConfig } from "./OutputAliasConfig";

export interface OutputVariablesProps {
  selectedNode: Node<FlowNodeData> | null;
}

const useStyles = createStyles(({ css, token }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  item: css`
    padding: 8px 10px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    background: ${token.colorBgContainer};
  `,
  header: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  nameTag: css`
    margin-right: 0;
  `,
  typeBadge: css`
    font-size: 11px;
    color: ${token.colorTextSecondary};
  `,
  info: css`
    margin-top: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  label: css`
    color: ${token.colorTextSecondary};
  `,
  desc: css`
    color: ${token.colorTextTertiary};
    margin-left: 4px;
  `,
  tip: css`
    margin-top: 8px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  bodySchema: css`
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px dashed ${token.colorBorderSecondary};
  `,
  modeRow: css`
    margin-top: 8px;
    margin-bottom: 12px;
  `,
  customEditor: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  `,
  customRow: css`
    display: grid;
    grid-template-columns: 1.2fr 1.2fr 0.8fr 1.4fr auto;
    gap: 8px;
    align-items: center;
  `,
  customHeader: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    margin-bottom: 4px;
  `,
  customAction: css`
    display: flex;
    align-items: center;
  `,
}));

/**
 * 转换节点字段映射配置类型
 */
interface TransformMapping {
  id: string;
  target: string;
  source?: string;
  expression?: string;
}

/**
 * 转换节点配置类型
 */
interface TransformConfig {
  mappings?: TransformMapping[];
  mode?: string;
  advancedScript?: string;
}

/**
 * 动态输出字段类型
 */
interface DynamicOutputField {
  id: string; // 唯一标识符，用于 React key
  name: string;
  label: string;
  type: "dynamic";
  description?: string;
}

/**
 * 获取转换节点的动态输出字段
 */
const getTransformOutputFields = (
  node: Node<FlowNodeData>
): DynamicOutputField[] => {
  const config = node.data.config as TransformConfig;
  if (config?.mappings && Array.isArray(config.mappings)) {
    return config.mappings
      .filter((m: TransformMapping) => m.target)
      .map((m: TransformMapping, index: number) => ({
        id: m.id || `mapping-${index}`, // 使用 mapping 的唯一 id，不依赖用户修改的字段名
        name: m.target,
        label: m.target,
        type: "dynamic" as const,
        description: m.source ? `来源: ${m.source}` : m.expression || undefined,
      }));
  }
  return [];
};

/**
 * 获取子流程节点的动态输出字段
 * 从选中的子流程结束节点配置中提取输出变量
 */
const useSubflowOutputFields = (
  node: Node<FlowNodeData> | null
): DynamicOutputField[] => {
  const reusableFlows = useFlowStore((state) => state.reusableFlows);

  if (!node) {
    return [];
  }

  const config = node.data.config as SubflowNodeConfig;

  if (!config?.subflowId) {
    return [];
  }

  // 从 store 中查找子流程
  const subflow = reusableFlows?.find((f) => f.id === config.subflowId);
  if (!subflow?.graphData) {
    return [];
  }

  try {
    const graphData: FlowGraphData = JSON.parse(subflow.graphData);
    // 找到结束节点
    const endNode = graphData.nodes.find(
      (n) => n.data.nodeType === NodeType.END
    );

    if (!endNode?.data.config) {
      return [];
    }

    const endConfig = endNode.data.config as {
      outputVariables?: OutputVariableConfig[];
    };
    const outputVariables = endConfig.outputVariables || [];

    return outputVariables.map((v, index) => ({
      id: `subflow-output-${index}`,
      name: v.name,
      label: v.label || v.name,
      type: "dynamic" as const,
      description: v.description || `来源: ${v.expression}`,
    }));
  } catch {
    return [];
  }
};

/**
 * 获取 LLM 节点的 JSON 输出字段
 */
const getLlmOutputFields = (node: Node<FlowNodeData>): DynamicOutputField[] => {
  const config = node.data.config as LlmNodeConfig | undefined;
  if (!config?.outputJsonEnabled || !config.outputJsonFields) {
    return [];
  }

  return config.outputJsonFields
    .map((field, index) => ({
      id: `llm-output-${index}`,
      name: field,
      label: field,
      type: "dynamic" as const,
      description: "解析自 JSON 输出",
    }))
    .filter((field) => field.name && field.name.trim());
};

const formatTypeLabel = (type?: string) => {
  if (!type) return "";
  if (type === "array" || type === "list") {
    return "List";
  }
  return type;
};

/**
 * 递归遍历 JSON Parser 输出字段，生成扁平化的输出字段列表
 */
const flattenJsonParserFields = (
  fields: JsonParserOutputField[],
  parentPath = "",
  result: DynamicOutputField[] = []
): DynamicOutputField[] => {
  for (const field of fields) {
    const fullPath = parentPath ? `${parentPath}.${field.path}` : field.path;
    result.push({
      id: `json-parser-${fullPath}`,
      name: fullPath,
      label: field.path,
      type: "dynamic" as const,
      description: `类型: ${formatTypeLabel(field.type)}`,
    });
    // 递归处理子字段
    if (field.children && field.children.length > 0) {
      flattenJsonParserFields(field.children, fullPath, result);
    }
  }
  return result;
};

/**
 * 获取 JSON Parser 节点的动态输出字段
 */
const getJsonParserOutputFields = (
  node: Node<FlowNodeData>
): DynamicOutputField[] => {
  const config = node.data.config as JsonParserNodeConfig | undefined;
  if (!config?.outputFields || config.outputFields.length === 0) {
    return [];
  }

  return flattenJsonParserFields(config.outputFields);
};

/**
 * 输出变量展示组件
 * 显示当前节点可用的输出变量列表
 */
export const OutputVariables: React.FC<OutputVariablesProps> = ({
  selectedNode,
}) => {
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  // 获取子流程的动态输出字段（需要在组件顶层调用 hook）
  const subflowOutputFields = useSubflowOutputFields(selectedNode);
  const updateNode = useFlowStore((state) => state.updateNode);

  const nodeType = selectedNode?.data.nodeType;
  const outputs = nodeType ? NODE_OUTPUT_VARIABLES[nodeType] : [];
  const collectionType = selectedNode?.data.config?.outputCollectionType as
    | "list"
    | "set"
    | "map"
    | ""
    | undefined;
  const outputMode = Form.useWatch("outputMode", {
    form,
    preserve: true,
  }) as CodeNodeConfig["outputMode"] | undefined;
  const customOutputs = Form.useWatch("customOutputs", {
    form,
    preserve: true,
  }) as CodeOutputVariable[] | undefined;

  useEffect(() => {
    if (!selectedNode || nodeType !== NodeType.CODE) return;
    if (outputMode) return;
    const config = selectedNode.data.config as CodeNodeConfig | undefined;
    const nextMode: CodeNodeConfig["outputMode"] =
      config?.customOutputs?.length
        ? "custom"
        : config?.outputStructureId
        ? "schema"
        : "auto";
    form.setFieldValue("outputMode", nextMode);
    if (nextMode !== "custom") {
      form.setFieldValue("enableOutputSchema", true);
    }
  }, [
    form,
    nodeType,
    outputMode,
    selectedNode,
    selectedNode?.data.config,
    selectedNode?.id,
  ]);

  useEffect(() => {
    if (!selectedNode || nodeType !== NodeType.CODE) return;
    if (!outputMode && !customOutputs) return;

    const config = selectedNode.data.config as CodeNodeConfig | undefined;
    const currentMode = config?.outputMode;
    const currentCustom = config?.customOutputs;
    const nextCustom = customOutputs && customOutputs.length > 0
      ? customOutputs
      : undefined;

    const sameMode = currentMode === outputMode;
    const sameCustom =
      JSON.stringify(currentCustom || []) === JSON.stringify(nextCustom || []);
    if (sameMode && sameCustom) {
      return;
    }

    updateNode(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        outputMode,
        customOutputs: nextCustom,
      },
    });
  }, [customOutputs, nodeType, outputMode, selectedNode, updateNode]);

  if (!selectedNode) return null;


  const handleOutputModeChange = (value: CodeNodeConfig["outputMode"]) => {
    if (value === "custom") {
      form.setFieldValue("enableOutputSchema", false);
      form.setFieldValue("outputStructureId", undefined);
      form.setFieldValue("outputCollectionType", undefined);
      return;
    }
    form.setFieldValue("enableOutputSchema", true);
  };

  const renderCustomOutputs = () => (
    <Form.List name="customOutputs">
      {(fields, { add, remove }) => (
        <div className={styles.customEditor}>
          <div className={styles.customHeader}>
            变量名 / 显示名 / 类型 / 描述
          </div>
          {fields.map((field) => (
            <div key={field.key} className={styles.customRow}>
              <Form.Item
                name={[field.name, "name"]}
                rules={[{ required: true, message: "请输入变量名" }]}
              >
                <Input placeholder="变量名" />
              </Form.Item>
              <Form.Item name={[field.name, "label"]}>
                <Input placeholder="显示名" />
              </Form.Item>
              <Form.Item
                name={[field.name, "type"]}
                initialValue="string"
                rules={[{ required: true, message: "请选择类型" }]}
              >
                <Select
                  options={[
                    { value: "string", label: "string" },
                    { value: "number", label: "number" },
                    { value: "boolean", label: "boolean" },
                    { value: "object", label: "object" },
                    { value: "array", label: "List" },
                  ]}
                />
              </Form.Item>
              <Form.Item name={[field.name, "description"]}>
                <Input placeholder="描述" />
              </Form.Item>
              <div className={styles.customAction}>
                <Button
                  danger
                  type="text"
                  icon={<AiOutlineDelete />}
                  onClick={() => remove(field.name)}
                />
              </div>
            </div>
          ))}
          <Button
            type="dashed"
            icon={<AiOutlinePlus />}
            onClick={() => add({ type: "string" })}
          >
            添加输出变量
          </Button>
        </div>
      )}
    </Form.List>
  );

  // 子流程节点显示动态输出字段
  if (nodeType === NodeType.SUBFLOW) {
    const config = selectedNode.data.config as SubflowNodeConfig;

    return (
      <>
        <Divider plain>输出变量</Divider>

        {!config?.subflowId ? (
          <Alert
            title="请先选择子流程"
            description="选择子流程后将显示其输出变量"
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
        ) : subflowOutputFields.length === 0 ? (
          <Alert
            title="子流程未定义输出变量"
            description="请在子流程的结束节点中配置输出变量"
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
          />
        ) : (
          <>
            <div className={styles.list}>
              {/* 动态输出变量（来自子流程结束节点） */}
              {subflowOutputFields.map((field) => (
                <div key={field.id} className={styles.item}>
                  <div className={styles.header}>
                    <Tag color="green" className={styles.nameTag}>
                      {field.name}
                    </Tag>
                    <span className={styles.typeBadge}>
                      {formatTypeLabel(field.type)}
                    </span>
                  </div>
                  <div className={styles.info}>
                    <span className={styles.label}>{field.label}</span>
                    {field.description && (
                      <span className={styles.desc}>- {field.description}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* 元数据字段 */}
              {outputs.map((output: OutputVariable) => (
                <div key={output.name} className={styles.item}>
                  <div className={styles.header}>
                    <Tag color="default" className={styles.nameTag}>
                      {output.name}
                    </Tag>
                    <span className={styles.typeBadge}>
                      {formatTypeLabel(output.type)}
                    </span>
                  </div>
                  <div className={styles.info}>
                    <span className={styles.label}>{output.label}</span>
                    {output.description && (
                      <span className={styles.desc}>
                        - {output.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.tip}>
              后续节点可通过{" "}
              <code>
                {"{{"} {selectedNode.id}.
                {subflowOutputFields[0]?.name || "变量名"} {"}"}
              </code>{" "}
              引用子流程输出
            </div>
          </>
        )}
      </>
    );
  }

  // 转换节点显示动态字段
  if (nodeType === NodeType.TRANSFORM) {
    const dynamicFields = getTransformOutputFields(selectedNode);

    return (
      <>
        <Divider plain>输出变量</Divider>

        {dynamicFields.length === 0 ? (
          <Alert
            title="尚未配置字段映射"
            description="请在上方配置字段映射后，这里将显示可用的输出字段"
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
        ) : (
          <>
            <div className={styles.list}>
              {dynamicFields.map((field) => (
                <div key={field.id} className={styles.item}>
                  <div className={styles.header}>
                    <Tag color="green" className={styles.nameTag}>
                      {field.name}
                    </Tag>
                    <span className={styles.typeBadge}>
                      {formatTypeLabel(field.type)}
                    </span>
                  </div>
                  <div className={styles.info}>
                    {field.description && (
                      <span className={styles.desc}>{field.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.tip}>
              后续节点可通过{" "}
              <code>
                {"{{"} {selectedNode.id}.字段名 {"}"}
              </code>{" "}
              引用这些字段
              <br />
              例如:{" "}
              <code>
                {"{{"} {selectedNode.id}.{dynamicFields[0]?.name || "userId"}{" "}
                {"}"}
              </code>
            </div>
          </>
        )}
      </>
    );
  }

  // JSON_PARSER 节点显示动态解析字段
  if (nodeType === NodeType.JSON_PARSER) {
    const jsonParserFields = getJsonParserOutputFields(selectedNode);

    return (
      <>
        <Divider plain>输出变量</Divider>

        {jsonParserFields.length === 0 ? (
          <Alert
            title="尚未解析 JSON 结构"
            description="请在上方粘贴示例 JSON 并点击解析按钮"
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
        ) : (
          <>
            <div className={styles.list}>
              {jsonParserFields.map((field) => (
                <div key={field.id} className={styles.item}>
                  <div className={styles.header}>
                    <Tag color="orange" className={styles.nameTag}>
                      {field.name}
                    </Tag>
                    <span className={styles.typeBadge}>
                      {formatTypeLabel(field.type)}
                    </span>
                  </div>
                  <div className={styles.info}>
                    {field.description && (
                      <span className={styles.desc}>{field.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.tip}>
              后续节点可通过{" "}
              <code>
                {"{{"} {selectedNode.id}.字段名 {"}"}
              </code>{" "}
              引用这些字段
              <br />
              例如:{" "}
              <code>
                {"{{"} {selectedNode.id}.
                {jsonParserFields[0]?.name || "data.id"} {"}"}
              </code>
            </div>
          </>
        )}
      </>
    );
  }

  // LLM 节点显示 JSON 解析字段
  if (nodeType === NodeType.LLM) {
    const outputNames = new Set((outputs || []).map((output) => output.name));
    const llmOutputFields = getLlmOutputFields(selectedNode).filter(
      (field) => !outputNames.has(field.name)
    );

    return (
      <>
        <Divider plain>输出变量</Divider>

        {llmOutputFields.length > 0 && (
          <div className={styles.list}>
            {llmOutputFields.map((field) => (
              <div key={field.id} className={styles.item}>
                <div className={styles.header}>
                  <Tag color="green" className={styles.nameTag}>
                    {field.name}
                  </Tag>
                  <span className={styles.typeBadge}>
                    {formatTypeLabel(field.type)}
                  </span>
                </div>
                <div className={styles.info}>
                  {field.description && (
                    <span className={styles.desc}>{field.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {outputs && outputs.length > 0 && (
          <div className={styles.list}>
            {outputs.map((output: OutputVariable) => (
              <div key={output.name} className={styles.item}>
                <div className={styles.header}>
                  <Tag color="blue" className={styles.nameTag}>
                    {output.name}
                  </Tag>
                  <span className={styles.typeBadge}>
                    {formatTypeLabel(output.type)}
                  </span>
                </div>
                <div className={styles.info}>
                  <span className={styles.label}>{output.label}</span>
                  {output.description && (
                    <span className={styles.desc}>- {output.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.tip}>
          后续节点可通过输入 <code>{"{{"}</code> 选择使用这些变量
        </div>
      </>
    );
  }

  // 根据节点配置过滤输出变量
  let filteredOutputs = outputs || [];

  if (nodeType === NodeType.VECTOR_STORE) {
    const config = selectedNode.data.config as VectorStoreNodeConfig | undefined;
    const operation = config?.operation;
    const scoreThreshold = config?.scoreThreshold;
    const hasScoreThreshold =
      typeof scoreThreshold === "number" ||
      (typeof scoreThreshold === "string" && scoreThreshold.trim().length > 0);

    if (operation === "search") {
      filteredOutputs = filteredOutputs.filter(
        (output) => output.name !== "count"
      );
      if (!hasScoreThreshold) {
        filteredOutputs = filteredOutputs.filter(
          (output) => output.name !== "matchedIds"
        );
      }
    } else if (operation === "upsert" || operation === "delete") {
      filteredOutputs = filteredOutputs.filter(
        (output) => output.name !== "matches" && output.name !== "matchedIds"
      );
    } else if (!hasScoreThreshold) {
      filteredOutputs = filteredOutputs.filter(
        (output) => output.name !== "matchedIds"
      );
    }
  }

  // Kafka/API 节点：未开启等待回调时，过滤掉回调相关字段
  if (nodeType === NodeType.KAFKA || nodeType === NodeType.API) {
    const waitForCallback = selectedNode.data.config?.waitForCallback as
      | boolean
      | undefined;
    if (!waitForCallback) {
      filteredOutputs = filteredOutputs.filter(
        (output) =>
          output.name !== "callbackData" && output.name !== "callbackKey"
      );
    }
  }

  if (
    (nodeType === NodeType.API || nodeType === NodeType.CODE) &&
    (collectionType === "list" || collectionType === "set")
  ) {
    const targetName = nodeType === NodeType.API ? "body" : "result";
    filteredOutputs = filteredOutputs.map((output) =>
      output.name === targetName ? { ...output, type: "array" } : output
    );
  }

  if (nodeType === NodeType.CODE) {
    const customList = customOutputs || [];
    const hasCustomOutputs = customList.length > 0;

    if (outputMode === "custom") {
      return (
        <>
          <Divider plain>输出变量</Divider>
          <OutputAliasConfig />
          <Form.Item
            name="outputMode"
            label="输出变量模式"
            initialValue="auto"
            className={styles.modeRow}
          >
            <Select
              onChange={handleOutputModeChange}
              options={[
                { value: "custom", label: "自定义变量列表" },
                { value: "auto", label: "自动推理数据结构" },
                { value: "schema", label: "配置数据结构" },
              ]}
            />
          </Form.Item>

          {renderCustomOutputs()}

          {hasCustomOutputs ? (
            <div className={styles.list}>
              {customList.map((output, index) => (
                <div key={`${output.name}-${index}`} className={styles.item}>
                  <div className={styles.header}>
                    <Tag color="green" className={styles.nameTag}>
                      {output.name}
                    </Tag>
                    <span className={styles.typeBadge}>
                      {formatTypeLabel(output.type)}
                    </span>
                  </div>
                  <div className={styles.info}>
                    <span className={styles.label}>
                      {output.label || output.name}
                    </span>
                    {output.description && (
                      <span className={styles.desc}>
                        - {output.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert
              title="尚未配置输出变量"
              description="请在上方添加需要暴露的输出字段"
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
            />
          )}

          {filteredOutputs.length > 0 && (
            <>
              <div className={styles.customHeader}>系统输出</div>
              <div className={styles.list}>
                {filteredOutputs.map((output: OutputVariable) => (
                  <div key={output.name} className={styles.item}>
                    <div className={styles.header}>
                      <Tag color="default" className={styles.nameTag}>
                        {output.name}
                      </Tag>
                      <span className={styles.typeBadge}>
                        {formatTypeLabel(output.type)}
                      </span>
                    </div>
                    <div className={styles.info}>
                      <span className={styles.label}>{output.label}</span>
                      {output.description && (
                        <span className={styles.desc}>
                          - {output.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={styles.tip}>
            自定义变量将映射到 <code>result</code> 输出下，例如{" "}
            <code>
              {"{{"} {selectedNode.id}.result.{hasCustomOutputs
                ? customList[0]?.name
                : "field"}{" "}
              {"}"}
            </code>
          </div>
        </>
      );
    }
  }

  // 其他节点类型显示默认输出变量
  if (!filteredOutputs || filteredOutputs.length === 0) return null;

  return (
    <>
      <Divider plain>输出变量</Divider>
      {(nodeType === NodeType.API || nodeType === NodeType.CODE) && (
        <OutputAliasConfig />
      )}
      {nodeType === NodeType.CODE && (
        <Form.Item
          name="outputMode"
          label="输出变量模式"
          initialValue="auto"
          className={styles.modeRow}
        >
          <Select
            onChange={handleOutputModeChange}
            options={[
              { value: "custom", label: "自定义变量列表" },
              { value: "auto", label: "自动推理数据结构" },
              { value: "schema", label: "配置数据结构" },
            ]}
          />
        </Form.Item>
      )}
      <div className={styles.list}>
        {filteredOutputs.map((output: OutputVariable) => (
          <div key={output.name} className={styles.item}>
            <div className={styles.header}>
              <Tag color="blue" className={styles.nameTag}>
                {output.name}
              </Tag>
              <span className={styles.typeBadge}>
                {formatTypeLabel(output.type)}
              </span>
            </div>
            <div className={styles.info}>
              <span className={styles.label}>{output.label}</span>
              {output.description && (
                <span className={styles.desc}>- {output.description}</span>
              )}
            </div>
            {nodeType === NodeType.API && output.name === "body" && (
              <div className={styles.bodySchema}>
                <OutputSchemaConfig
                  embedded
                  showAlias={false}
                  title="body 输出结构"
                />
              </div>
            )}
            {nodeType === NodeType.CODE && output.name === "result" && (
              <div className={styles.bodySchema}>
                <OutputSchemaConfig
                  embedded
                  showAlias={false}
                  title="result 输出结构"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.tip}>
        后续节点可通过输入 <code>{"{{"}</code> 选择使用这些变量
      </div>
    </>
  );
};

export default OutputVariables;
