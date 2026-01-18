import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Form, Input, Button, Tree, Tag, Empty, Alert, Select } from "antd";
import {
  AiOutlineThunderbolt,
  AiOutlineDelete,
  AiOutlineDown,
  AiOutlineRight,
} from "react-icons/ai";
import { TbJson } from "react-icons/tb";
import { VariableInput } from "@/components/VariableInput";
import { createStyles } from "antd-style";
import type { JsonParserOutputField } from "@/types";
import type { DataNode } from "antd/es/tree";
import { useFlowStore } from "@/store/flowStore";
import type {
  DataStructureResponse,
  FieldDefinition,
} from "@/services/dataStructureService";

const useStyles = createStyles(({ token, css }) => ({
  container: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  section: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  sectionTitle: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  sampleJsonContainer: css`
    position: relative;
  `,
  sampleJsonTextarea: css`
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 12px;
  `,
  parseButton: css`
    margin-top: 8px;
  `,
  outputFieldsContainer: css`
    background: ${token.colorFillQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    padding: 12px;
    min-height: 100px;
  `,
  outputFieldsHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  `,
  outputFieldsTitle: css`
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,
  clearButton: css`
    font-size: 12px;
  `,
  fieldTree: css`
    background: transparent;
    .ant-tree-treenode {
      padding: 2px 0;
    }
    .ant-tree-node-content-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `,
  fieldItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  `,
  fieldName: css`
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    color: ${token.colorText};
  `,
  fieldType: css`
    font-size: 11px;
  `,
  emptyContainer: css`
    padding: 20px 0;
    text-align: center;
  `,
  jsonIcon: css`
    font-size: 14px;
    color: ${token.colorPrimary};
  `,
}));

/**
 * 获取 JSON 值的类型
 */
const getJsonType = (
  value: unknown
): "string" | "number" | "boolean" | "object" | "array" => {
  if (value === null) return "object";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  if (type === "string") return "string";
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  return "object";
};

/**
 * 递归解析 JSON 对象，生成输出字段配置
 */
const parseJsonToFields = (
  obj: unknown,
  parentPath = ""
): JsonParserOutputField[] => {
  const fields: JsonParserOutputField[] = [];

  if (obj === null || obj === undefined) {
    return fields;
  }

  if (Array.isArray(obj)) {
    // 对于数组，取第一个元素来推断结构
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      const itemFields = parseJsonToFields(obj[0], "");
      fields.push({
        path: parentPath || "[*]",
        type: "array",
        children: itemFields,
      });
    } else {
      fields.push({
        path: parentPath || "[*]",
        type: "array",
      });
    }
  } else if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const type = getJsonType(value);

      if (type === "object" && value !== null) {
        const children = parseJsonToFields(value, path);
        fields.push({
          path: key,
          type: "object",
          children: children.length > 0 ? children : undefined,
        });
      } else if (type === "array" && Array.isArray(value)) {
        // 对于数组，取第一个元素来推断结构
        if (
          value.length > 0 &&
          typeof value[0] === "object" &&
          value[0] !== null
        ) {
          const itemFields = parseJsonToFields(value[0], "");
          fields.push({
            path: key,
            type: "array",
            children: itemFields,
          });
        } else {
          fields.push({
            path: key,
            type: "array",
          });
        }
      } else {
        fields.push({
          path: key,
          type,
        });
      }
    }
  }

  return fields;
};

/**
 * 获取类型对应的颜色
 */
const getTypeColor = (
  type: string
): "blue" | "green" | "orange" | "purple" | "cyan" | "default" => {
  switch (type) {
    case "string":
      return "green";
    case "number":
      return "blue";
    case "boolean":
      return "orange";
    case "object":
      return "purple";
    case "array":
      return "cyan";
    default:
      return "default";
  }
};

/**
 * 将输出字段转换为 Tree 的数据格式
 */
const fieldsToTreeData = (
  fields: JsonParserOutputField[],
  parentKey = ""
): DataNode[] => {
  return fields.map((field, index) => {
    const key = parentKey
      ? `${parentKey}.${field.path}`
      : field.path || `${index}`;
    return {
      key,
      title: (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          <span
            style={{
              fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
            }}
          >
            {field.path}
          </span>
          <Tag
            color={getTypeColor(field.type)}
            style={{ fontSize: 11, margin: 0 }}
          >
            {field.type}
          </Tag>
        </span>
      ),
      children: field.children
        ? fieldsToTreeData(field.children, key)
        : undefined,
    };
  });
};

export interface JsonParserNodeConfigProps {
  nodeId?: string;
}

/**
 * JSON 解析器节点配置组件
 */
export const JsonParserNodeConfig: React.FC<JsonParserNodeConfigProps> = () => {
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const [parseError, setParseError] = useState<string | null>(null);

  // 监听 outputFields 变化
  const outputFields = Form.useWatch("outputFields", {
    form,
    preserve: true,
  }) as JsonParserOutputField[] | undefined;

  // 将字段转换为树形数据
  const treeData = useMemo(() => {
    if (!outputFields || outputFields.length === 0) {
      return [];
    }
    return fieldsToTreeData(outputFields);
  }, [outputFields]);

  const dataStructures = useFlowStore((state) => state.dataStructures);
  const selectedNode = useFlowStore((state) => state.selectedNode);
  const updateNode = useFlowStore((state) => state.updateNode);
  const parseMode = Form.useWatch("parseMode", {
    form,
    preserve: true,
  }) as "structure" | "sample" | undefined;
  const dataStructureId = Form.useWatch("dataStructureId", {
    form,
    preserve: true,
  }) as string | undefined;
  const sampleJson = Form.useWatch("sampleJson", {
    form,
    preserve: true,
  }) as string | undefined;

  const structureIndex = useMemo(() => {
    const byId = new Map<string, DataStructureResponse>();
    const byFullName = new Map<string, DataStructureResponse>();
    const byName = new Map<string, DataStructureResponse>();
    (dataStructures || []).forEach((structure) => {
      byId.set(structure.id, structure);
      if (structure.fullName) {
        byFullName.set(structure.fullName, structure);
      }
      if (structure.name) {
        byName.set(structure.name, structure);
      }
    });
    return { byId, byFullName, byName };
  }, [dataStructures]);

  const resolveStructure = useCallback(
    (ref?: string) => {
      if (!ref) return undefined;
      const normalized = ref.replace(/^struct:/, "");
      return (
        structureIndex.byId.get(normalized) ||
        structureIndex.byFullName.get(ref) ||
        structureIndex.byName.get(ref)
      );
    },
    [structureIndex]
  );

  const normalizeFieldType = useCallback(
    (type?: string): JsonParserOutputField["type"] => {
      switch (type) {
        case "string":
        case "number":
        case "boolean":
        case "object":
        case "array":
        case "list":
          return type === "list" ? "array" : type;
        default:
          return "object";
      }
    },
    []
  );

  const buildOutputFieldsFromStructure = useCallback(
    function buildFields(fields?: FieldDefinition[]): JsonParserOutputField[] {
      if (!fields || fields.length === 0) {
        return [];
      }

      const result: JsonParserOutputField[] = [];

      fields.forEach((field) => {
        if (!field.name) {
          return;
        }

        const type = normalizeFieldType(field.type);
        let children: JsonParserOutputField[] | undefined;

        if (type === "object") {
          const nested =
            resolveStructure(field.refStructure || field.refType)?.fields ||
            field.children;
          if (nested && nested.length > 0) {
            children = buildFields(nested);
          }
        }

        if (type === "array") {
          const refStructure = resolveStructure(field.itemType);
          const nested = refStructure?.fields || field.children;
          if (nested && nested.length > 0) {
            children = buildFields(nested);
          }
        }

        result.push({
          path: field.name,
          type,
          description: field.description,
          children: children && children.length > 0 ? children : undefined,
        });
      });

      return result;
    },
    [normalizeFieldType, resolveStructure]
  );

  useEffect(() => {
    if (
      parseMode === "structure" &&
      !dataStructureId &&
      sampleJson &&
      sampleJson.trim()
    ) {
      form.setFieldValue("parseMode", "sample");
      return;
    }
    if (parseMode) {
      return;
    }
    if (sampleJson && sampleJson.trim()) {
      form.setFieldValue("parseMode", "sample");
      return;
    }
    if (dataStructureId) {
      form.setFieldValue("parseMode", "structure");
      return;
    }
    form.setFieldValue("parseMode", "structure");
  }, [dataStructureId, form, parseMode, sampleJson]);

  useEffect(() => {
    if (parseMode !== "structure") {
      return;
    }
    if (!dataStructureId) {
      form.setFieldValue("outputFields", []);
      return;
    }
    const structure = structureIndex.byId.get(dataStructureId);
    if (!structure) {
      form.setFieldValue("outputFields", []);
      return;
    }
    const fields = buildOutputFieldsFromStructure(structure.fields);
    form.setFieldValue("outputFields", fields);
    setParseError(null);
  }, [
    buildOutputFieldsFromStructure,
    dataStructureId,
    form,
    parseMode,
    structureIndex,
  ]);

  // 解析示例 JSON
  const handleParseSampleJson = () => {
    const sampleJson = form.getFieldValue("sampleJson");
    if (!sampleJson || !sampleJson.trim()) {
      setParseError("请先输入示例 JSON 字符串");
      return;
    }

    try {
      const parsed = JSON.parse(sampleJson);
      const fields = parseJsonToFields(parsed);
      form.setFieldValue("parseMode", "sample");
      form.setFieldValue("outputFields", fields);
      form.setFieldValue("dataStructureId", undefined);
      if (selectedNode) {
        updateNode(selectedNode.id, {
          config: {
            ...selectedNode.data.config,
            parseMode: "sample",
            dataStructureId: undefined,
            outputFields: fields,
          },
        });
      }
      setParseError(null);
    } catch (error) {
      setParseError(`JSON 解析失败: ${(error as Error).message}`);
    }
  };

  // 清除输出字段
  const handleClearFields = () => {
    form.setFieldValue("outputFields", []);
    if (selectedNode) {
      updateNode(selectedNode.id, {
        config: {
          ...selectedNode.data.config,
          outputFields: [],
        },
      });
    }
  };

  return (
    <div className={styles.container}>
      {/* 解析方式 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>解析方式</div>
        <Form.Item name="parseMode" noStyle>
          <Select
            options={[
              { label: "数据结构", value: "structure" },
              { label: "示例 JSON", value: "sample" },
            ]}
            onChange={(value) => {
              if (value === "sample") {
                form.setFieldValue("dataStructureId", undefined);
              }
            }}
          />
        </Form.Item>
      </div>

      {/* 数据来源 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <TbJson className={styles.jsonIcon} />
          JSON 数据来源
        </div>
        <Form.Item
          name="sourceExpression"
          rules={[{ required: true, message: "请输入数据来源表达式" }]}
          extra="输入变量表达式，如 {{nodes.api-1.body}} 或 {{input.jsonString}}"
          noStyle
        >
          <VariableInput placeholder="输入数据来源，使用 {{ 插入变量" />
        </Form.Item>
      </div>

      {/* 数据结构 */}
      {parseMode === "structure" && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>数据结构</div>
          <Form.Item
            name="dataStructureId"
            rules={[{ required: true, message: "请选择数据结构" }]}
            noStyle
          >
            <Select
              placeholder="请选择数据结构"
              options={(dataStructures || []).map((structure) => ({
                label: structure.fullName || structure.name,
                value: structure.id,
              }))}
              allowClear
            />
          </Form.Item>
          {(!dataStructures || dataStructures.length === 0) && (
            <Alert
              type="warning"
              showIcon
              title="暂无可用的数据结构"
              description="请先在系统设置中配置并启用数据结构。"
            />
          )}
        </div>
      )}

      {/* 示例 JSON */}
      {parseMode === "sample" && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>示例 JSON</div>
          <div className={styles.sampleJsonContainer}>
            <Form.Item name="sampleJson" noStyle>
              <Input.TextArea
                rows={8}
                placeholder={`粘贴示例 JSON 字符串，例如：
{
  "code": 200,
  "data": {
    "user": {
      "id": 1,
      "name": "张三",
      "email": "zhangsan@example.com"
    },
    "items": [
      { "id": 1, "title": "项目1" }
    ]
  },
  "message": "success"
}`}
                className={styles.sampleJsonTextarea}
              />
            </Form.Item>
            <Button
              type="primary"
              icon={<AiOutlineThunderbolt />}
              onClick={handleParseSampleJson}
              className={styles.parseButton}
              block
            >
              解析 JSON 结构
            </Button>
          </div>
          {parseError && <Alert type="error" title={parseError} showIcon />}
        </div>
      )}

      {/* 输出字段 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>输出字段</div>
        <div className={styles.outputFieldsContainer}>
          <div className={styles.outputFieldsHeader}>
            <span className={styles.outputFieldsTitle}>
              已解析 {outputFields?.length || 0} 个字段
            </span>
            {outputFields && outputFields.length > 0 && (
              <Button
                type="text"
                danger
                size="small"
                icon={<AiOutlineDelete />}
                onClick={handleClearFields}
                className={styles.clearButton}
              >
                清除
              </Button>
            )}
          </div>
          {treeData.length > 0 ? (
            <Tree
              treeData={treeData}
              defaultExpandAll
              showLine={{ showLeafIcon: false }}
              switcherIcon={(props: { expanded?: boolean }) =>
                props.expanded ? (
                  <AiOutlineDown style={{ fontSize: 10 }} />
                ) : (
                  <AiOutlineRight style={{ fontSize: 10 }} />
                )
              }
              className={styles.fieldTree}
              selectable={false}
            />
          ) : (
            <div className={styles.emptyContainer}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无输出字段，请先解析示例 JSON"
              />
            </div>
          )}
        </div>
      </div>

      {/* 隐藏字段存储 outputFields */}
      <Form.Item name="outputFields" hidden>
        <Input />
      </Form.Item>
    </div>
  );
};

export default JsonParserNodeConfig;
