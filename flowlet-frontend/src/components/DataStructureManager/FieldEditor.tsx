import React, { useCallback, useMemo } from "react";
import {
  Button,
  Input,
  Select,
  Switch,
  Space,
  Tooltip,
  Popconfirm,
  Tag,
} from "antd";
import {
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import type {
  FieldDefinition,
  TypeParameter,
  DataStructureResponse,
} from "@/services/dataStructureService";
import { useStyles } from "./DataStructureManager.style";

const BASE_FIELD_TYPES = [
  { value: "string", label: "字符串" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "布尔值" },
  { value: "object", label: "对象" },
  { value: "list", label: "List" },
];

const BASE_ITEM_TYPES = [
  { value: "string", label: "字符串" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "布尔值" },
  { value: "object", label: "对象" },
  { value: "list", label: "List" },
];

interface FieldEditorProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  readonly?: boolean;
  depth?: number;
  typeParameters?: TypeParameter[]; // 泛型参数列表
  dataStructures?: DataStructureResponse[];
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  fields,
  onChange,
  readonly = false,
  depth = 0,
  typeParameters = [],
  dataStructures = [],
}) => {
  const { styles } = useStyles();
  const [expandedFields, setExpandedFields] = React.useState<Set<number>>(
    new Set()
  );
  const isListType = useCallback((type?: string) => {
    return type === "list" || type === "array";
  }, []);

  // 构建字段类型选项（包括泛型参数）
  const fieldTypeOptions = useMemo(() => {
    const options = [...BASE_FIELD_TYPES];
    if (typeParameters.length > 0) {
      options.push({
        value: "__divider__",
        label: "──── 泛型参数 ────",
      });
      typeParameters.forEach((param) => {
        options.push({
          value: param.name,
          label: `${param.name}${
            param.description ? ` (${param.description})` : ""
          }`,
        });
      });
    }
    return options;
  }, [typeParameters]);

  // 构建数组元素类型选项（包括泛型参数）
  const itemTypeOptions = useMemo(() => {
    const options = [...BASE_ITEM_TYPES];
    if (dataStructures.length > 0) {
      options.push({
        value: "__divider__",
        label: "──── 数据结构 ────",
      });
      dataStructures.forEach((structure) => {
        options.push({
          value: `struct:${structure.id}`,
          label: structure.fullName || structure.name,
        });
      });
    }
    if (typeParameters.length > 0) {
      options.push({
        value: "__divider__",
        label: "──── 泛型参数 ────",
      });
      typeParameters.forEach((param) => {
        options.push({
          value: param.name,
          label: `${param.name}${
            param.description ? ` (${param.description})` : ""
          }`,
        });
      });
    }
    return options;
  }, [dataStructures, typeParameters]);

  // 判断类型是否为泛型参数
  const isGenericType = useCallback(
    (type: string) => {
      return typeParameters.some((p) => p.name === type);
    },
    [typeParameters]
  );

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedFields);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFields(newExpanded);
  };

  const addField = useCallback(() => {
    const newField: FieldDefinition = {
      name: "",
      type: "string",
      required: false,
    };
    onChange([...fields, newField]);
  }, [fields, onChange]);

  const updateField = useCallback(
    (index: number, updates: Partial<FieldDefinition>) => {
      const newFields = [...fields];
      newFields[index] = { ...newFields[index], ...updates };

      // 类型变化时，清理相关字段
      if (updates.type) {
        if (updates.type !== "object") {
          delete newFields[index].children;
        }
        if (!isListType(updates.type)) {
          delete newFields[index].itemType;
        }
        if (updates.type === "object" && !newFields[index].children) {
          newFields[index].children = [];
        }
        if (isListType(updates.type) && !newFields[index].itemType) {
          newFields[index].itemType = "string";
        }
      }

      onChange(newFields);
    },
    [fields, onChange, isListType]
  );

  const removeField = useCallback(
    (index: number) => {
      const newFields = fields.filter((_, i) => i !== index);
      onChange(newFields);
    },
    [fields, onChange]
  );

  const updateChildren = useCallback(
    (index: number, children: FieldDefinition[]) => {
      const newFields = [...fields];
      newFields[index] = { ...newFields[index], children };
      onChange(newFields);
    },
    [fields, onChange]
  );

  const hasNestedFields = (field: FieldDefinition) => {
    return (
      field.type === "object" ||
      (isListType(field.type) &&
        (field.itemType === "object" || isListType(field.itemType)))
    );
  };

  return (
    <div>
      <div className={styles.fieldList}>
        {fields.length === 0 ? (
          <div className={styles.emptyState}>暂无字段，点击下方按钮添加</div>
        ) : (
          fields.map((field, index) => (
            <div key={index}>
              <div className={styles.fieldItem}>
                {/* 展开/折叠按钮 */}
                {hasNestedFields(field) ? (
                  <Button
                    type="text"
                    size="small"
                    icon={
                      expandedFields.has(index) ? (
                        <FiChevronDown />
                      ) : (
                        <FiChevronRight />
                      )
                    }
                    onClick={() => toggleExpand(index)}
                  />
                ) : (
                  <div style={{ width: 24 }} />
                )}

                {/* 字段名 */}
                <Input
                  className={styles.fieldName}
                  placeholder="字段名"
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  disabled={readonly}
                />

                {/* 字段类型 */}
                <Select
                  className={styles.fieldType}
                  value={field.type}
                  onChange={(value) => {
                    if (value === "__divider__") return;
                    updateField(index, { type: value });
                  }}
                  disabled={readonly}
                >
                  {fieldTypeOptions.map((opt) =>
                    opt.value === "__divider__" ? (
                      <Select.Option key={opt.value} value={opt.value} disabled>
                        {opt.label}
                      </Select.Option>
                    ) : (
                      <Select.Option key={opt.value} value={opt.value}>
                        {isGenericType(opt.value) ? (
                          <Space>
                            <Tag color="blue" style={{ margin: 0 }}>
                              {opt.value}
                            </Tag>
                            <span style={{ fontSize: 12, color: "#999" }}>
                              {typeParameters.find((p) => p.name === opt.value)
                                ?.description || "泛型参数"}
                            </span>
                          </Space>
                        ) : (
                          opt.label
                        )}
                      </Select.Option>
                    )
                  )}
                </Select>
                {/* 泛型类型标记 */}
                {isGenericType(field.type) && (
                  <Tag color="blue" style={{ marginLeft: 4 }}>
                    泛型
                  </Tag>
                )}

                {/* 列表元素类型 */}
                {isListType(field.type) && (
                  <Select
                    style={{ width: 100 }}
                    value={field.itemType || "string"}
                    onChange={(value) => {
                      if (value === "__divider__") return;
                      if (value === "object" || isListType(value)) {
                        updateField(index, {
                          itemType: value,
                          children: field.children || [],
                        });
                        return;
                      }
                      updateField(index, {
                        itemType: value,
                        children: undefined,
                      });
                    }}
                    disabled={readonly}
                    placeholder="元素类型"
                  >
                    {itemTypeOptions.map((opt) =>
                      opt.value === "__divider__" ? (
                        <Select.Option
                          key={opt.value}
                          value={opt.value}
                          disabled
                        >
                          {opt.label}
                        </Select.Option>
                      ) : (
                        <Select.Option key={opt.value} value={opt.value}>
                          {isGenericType(opt.value) ? (
                            <Tag color="blue" style={{ margin: 0 }}>
                              {opt.value}
                            </Tag>
                          ) : (
                            opt.label
                          )}
                        </Select.Option>
                      )
                    )}
                  </Select>
                )}

                {/* 必填 */}
                <Tooltip title="必填">
                  <Switch
                    size="small"
                    checked={field.required}
                    onChange={(checked) =>
                      updateField(index, { required: checked })
                    }
                    disabled={readonly}
                  />
                </Tooltip>

                {/* 删除按钮 */}
                {!readonly && (
                  <Popconfirm
                    title="确定删除该字段？"
                    onConfirm={() => removeField(index)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<FiTrash2 />}
                    />
                  </Popconfirm>
                )}
              </div>

              {/* 嵌套字段 */}
              {hasNestedFields(field) && expandedFields.has(index) && (
                <div className={styles.nestedFields}>
                  <FieldEditor
                    fields={field.children || []}
                    onChange={(children) => updateChildren(index, children)}
                    readonly={readonly}
                    depth={depth + 1}
                    typeParameters={typeParameters}
                    dataStructures={dataStructures}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!readonly && (
        <Space style={{ marginTop: 8 }}>
          <Button
            type="dashed"
            size="small"
            icon={<FiPlus />}
            onClick={addField}
          >
            添加字段
          </Button>
        </Space>
      )}
    </div>
  );
};
