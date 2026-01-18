import React, { useMemo, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Button,
  Radio,
  InputNumber,
  type SelectProps,
} from "antd";
import { createStyles } from "antd-style";
import { AiOutlineDatabase } from "react-icons/ai";
import { OutputVariableConfig, NodeType, StartNodeConfig, VariableType } from "@/types";
import { useFlowStore, FlowNode } from "@/store/flowStore";
import { useProjectStore } from "@/store/projectStore";
import { buildAvailableVariables } from "@/utils/flowUtils";
import { nodeTypeIcons } from "@/constants/nodeIcons";
import { useEnumOptions } from "@/hooks/useEnumOptions";
import { EnumValuePicker } from "@/components/EnumValuePicker";

const useStyles = createStyles(({ css }) => ({
  // 分组标题
  groupHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    color: #666;
  `,

  // 选项样式
  selectorOption: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  `,

  optionIcon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: #1890ff;
  `,

  optionContent: css`
    flex: 1;
    min-width: 0;
  `,

  optionPath: css`
    font-size: 11px;
    color: #999;
    line-height: 1.2;
  `,

  optionName: css`
    font-size: 13px;
    color: #333;
    font-weight: 500;
    line-height: 1.3;
  `,

  optionType: css`
    font-size: 11px;
    color: #999;
    background: #f5f5f5;
    padding: 1px 6px;
    border-radius: 4px;
  `,

  // 已选中变量标签
  selectedTag: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
  `,

  tagIcon: css`
    display: flex;
    align-items: center;
    color: #1890ff;
  `,

  tagPath: css`
    color: #999;
    font-size: 12px;
  `,

  tagVar: css`
    color: #333;
    font-weight: 500;
  `,
}));

interface AddOutputVariableModalProps {
  open: boolean;
  editingVariable?: OutputVariableConfig;
  existingNames: string[];
  nodeId: string;
  onOk: (variable: OutputVariableConfig) => void;
  onCancel: () => void;
}

interface ModalContentProps {
  editingVariable?: OutputVariableConfig;
  existingNames: string[];
  nodeId: string;
  onOk: (variable: OutputVariableConfig) => void;
  onCancel: () => void;
}

const baseTypeOptions = [
  { value: "string", label: "字符串 (string)" },
  { value: "number", label: "数字 (number)" },
  { value: "boolean", label: "布尔值 (boolean)" },
  { value: "object", label: "对象 (object)" },
  { value: "array", label: "List" },
];

const normalizeStructRef = (ref: string) => ref.replace(/^(struct:)+/, "");

type SelectOptions = NonNullable<SelectProps["options"]>;
type SelectOption = SelectOptions[number];
type EnumOption = SelectOption & { data?: Record<string, unknown> };
type EnumOptionGroup = { label?: React.ReactNode; options?: EnumOption[] };

const formatTypeLabel = (type?: string) => {
  if (!type) return "";
  if (type === "array" || type === "list") {
    return "List";
  }
  return type;
};

/**
 * 表单内容组件 - 使用 key 控制重新初始化
 */
const ModalContent: React.FC<ModalContentProps> = ({
  editingVariable,
  existingNames,
  nodeId,
  onOk,
  onCancel,
}) => {
  const { styles } = useStyles();
  const [form] = Form.useForm();
  const { nodes, edges, reusableFlows, dataStructures, constants } =
    useFlowStore();
  const { currentProject } = useProjectStore();
  const { options: enumOptions } = useEnumOptions(currentProject?.id);

  // 构建可用变量
  const variableGroups = useMemo(
    () =>
      buildAvailableVariables(
        nodeId,
        nodes as FlowNode[],
        edges,
        reusableFlows,
        dataStructures,
        constants
      ),
    [nodeId, nodes, edges, reusableFlows, dataStructures, constants]
  );

  // 扁平化变量列表
  const allVariables = useMemo(
    () => variableGroups.flatMap((g) => g.variables),
    [variableGroups]
  );

  const inputGenericParams = useMemo(() => {
    const startNode = nodes.find((node) => node.data.nodeType === NodeType.START);
    const startConfig = startNode?.data?.config as StartNodeConfig | undefined;
    const inputVariables = startConfig?.variables || [];
    const structuresById = new Map(
      (dataStructures || []).map((structure) => [structure.id, structure])
    );
    const params = new Set<string>();

    inputVariables.forEach((variable) => {
      if (
        variable.type !== VariableType.STRUCTURE ||
        !variable.structureRef
      ) {
        return;
      }
      const structureId = normalizeStructRef(variable.structureRef);
      const structure =
        structuresById.get(structureId) ||
        (dataStructures || []).find(
          (item) =>
            item.fullName === variable.structureRef ||
            item.name === variable.structureRef
        );
      if (!structure?.isGeneric || !structure.typeParameters?.length) {
        return;
      }
      structure.typeParameters.forEach((param) => {
        if (param.name) {
          params.add(param.name);
        }
      });
    });

    return Array.from(params);
  }, [nodes, dataStructures]);

  // 构建下拉选项
  const variableOptions = useMemo(() => {
    return variableGroups.map((group) => ({
      label: (
        <div className={styles.groupHeader}>
          {nodeTypeIcons[group.name] || <AiOutlineDatabase />}
          <span>{group.name}</span>
        </div>
      ),
      options: group.variables.map((v) => ({
        value: `{{${v.key}}}`,
        label: (
          <div className={styles.selectorOption}>
            <span className={styles.optionIcon}>
              {nodeTypeIcons[v.group] || <AiOutlineDatabase />}
            </span>
            <div className={styles.optionContent}>
              <div className={styles.optionPath}>{v.group}</div>
              <div className={styles.optionName}>{v.name}</div>
            </div>
            <span className={styles.optionType}>{formatTypeLabel(v.type)}</span>
          </div>
        ),
        data: { searchText: `${v.group} ${v.name} ${v.label} ${v.key}` },
      })),
    }));
  }, [variableGroups, styles]);

  const typeOptions = useMemo(() => {
    const genericParamOptions = inputGenericParams.map((param) => ({
      value: `generic:${param}`,
      label: `${param} (泛型)`,
    }));

    const listGenericOptions = inputGenericParams.map((param) => ({
      value: `list:generic:${param}`,
      label: `List<${param}>`,
    }));

    const structureOptions = (dataStructures || []).map((s) => ({
      value: `struct:${s.id}`,
      label: s.fullName || s.name,
    }));

    const listStructureOptions = (dataStructures || []).map((s) => ({
      value: `list:struct:${s.id}`,
      label: `List<${s.fullName || s.name}>`,
    }));

    return [
      { label: "基础类型", options: baseTypeOptions },
      ...(genericParamOptions.length > 0
        ? [{ label: "泛型参数", options: genericParamOptions }]
        : []),
      ...(listGenericOptions.length > 0
        ? [{ label: "泛型列表", options: listGenericOptions }]
        : []),
      ...(structureOptions.length > 0
        ? [{ label: "数据结构", options: structureOptions }]
        : []),
      ...(listStructureOptions.length > 0
        ? [{ label: "数据结构列表", options: listStructureOptions }]
        : []),
    ];
  }, [dataStructures, inputGenericParams]);

  const resolveTypeSelectorValue = useCallback(
    (variable?: OutputVariableConfig) => {
      if (!variable) return "string";
      if (variable.itemTypeRef?.startsWith("generic:")) {
        return `list:${variable.itemTypeRef}`;
      }
      if (variable.typeRef?.startsWith("generic:")) {
        return variable.typeRef;
      }
      if (variable.itemTypeRef) {
        const normalized = normalizeStructRef(variable.itemTypeRef);
        return `list:struct:${normalized}`;
      }
      if (variable.typeRef) {
        const normalized = normalizeStructRef(variable.typeRef);
        return `struct:${normalized}`;
      }
      return variable.type;
    },
    []
  );

  const resolveOutputType = useCallback((selectorValue?: string) => {
    if (!selectorValue) return "string";
    if (
      selectorValue.startsWith("list:generic:") ||
      selectorValue.startsWith("list:struct:")
    ) {
      return "array";
    }
    if (selectorValue.startsWith("generic:") || selectorValue.startsWith("struct:")) {
      return "object";
    }
    return selectorValue;
  }, []);

  const isVariableExpression = useCallback((expression?: string) => {
    if (!expression) return false;
    return /^\s*\{\{.+\}\}\s*$/.test(expression);
  }, []);

  // 仅在组件挂载时初始化表单
  React.useEffect(() => {
    if (editingVariable) {
      form.setFieldsValue({
        ...editingVariable,
        type: resolveTypeSelectorValue(editingVariable),
        sourceType: isVariableExpression(editingVariable.expression)
          ? "variable"
          : "constant",
        enumValueType: editingVariable.enumValueType || "value",
      });
    } else {
      form.setFieldsValue({
        type: "string",
        sourceType: "variable",
        enumValueType: "value",
      });
    }
  }, [editingVariable, form, resolveTypeSelectorValue, isVariableExpression]);

  const sourceType = Form.useWatch("sourceType", form);
  const selectedType = Form.useWatch("type", form);
  const expressionValue = Form.useWatch("expression", form);
  const enumKeyValue = Form.useWatch("enumKey", form);
  const enumValueValue = Form.useWatch("enumValue", form);
  const enumValueTypeValue = Form.useWatch("enumValueType", form);
  const resolvedType = resolveOutputType(String(selectedType));
  const enumPickerOptions = useMemo<EnumOptionGroup[]>(() => {
    return ((enumOptions || []) as EnumOptionGroup[]).map((group) => ({
      ...group,
      options: (group.options || []).map((option: EnumOption) => {
        const optionData = option.data;
        const rawValue = optionData?.rawValue ?? option.value;
        return {
          ...option,
          value: `${group.label}::${rawValue}`,
          data: {
            ...(optionData || {}),
            enumKey: group.label,
            rawValue,
            displayLabel: optionData?.displayLabel ?? rawValue,
          },
        };
      }),
    }));
  }, [enumOptions]);
  const enumOptionMap = useMemo(() => {
    const map = new Map<
      string,
      Array<{ rawValue: string; displayLabel: string }>
    >();
    (enumPickerOptions || []).forEach((group) => {
      const groupKey = String(group.label || "");
      if (!groupKey) return;
      const entries: Array<{ rawValue: string; displayLabel: string }> = [];
      (group.options || []).forEach((option) => {
        const optionData = (option as { data?: Record<string, unknown> })?.data;
        const rawValue = optionData?.rawValue ?? option.value;
        const displayLabel = optionData?.displayLabel ?? rawValue;
        entries.push({
          rawValue: String(rawValue),
          displayLabel: String(displayLabel),
        });
      });
      if (entries.length > 0) {
        map.set(groupKey, entries);
      }
    });
    return map;
  }, [enumPickerOptions]);
  const resolvedEnumRawValue = useMemo(() => {
    if (!enumKeyValue) return undefined;
    if (enumValueValue) return String(enumValueValue);
    if (expressionValue === undefined || expressionValue === null) {
      return undefined;
    }
    const entries = enumOptionMap.get(String(enumKeyValue));
    if (!entries) return undefined;
    const expr = String(expressionValue);
    const found = entries.find(
      (entry) => entry.rawValue === expr || entry.displayLabel === expr
    );
    return found?.rawValue;
  }, [enumKeyValue, enumOptionMap, enumValueValue, expressionValue]);
  const selectedEnumValue = useMemo(() => {
    if (!enumKeyValue || !resolvedEnumRawValue) {
      return undefined;
    }
    return `${enumKeyValue}::${resolvedEnumRawValue}`;
  }, [enumKeyValue, resolvedEnumRawValue]);
  const resolveEnumDisplayValue = useCallback(
    (enumKey?: string, rawValue?: string, outputType?: "value" | "label") => {
      if (!enumKey || rawValue === undefined || rawValue === null) {
        return undefined;
      }
      if (outputType !== "label") {
        return rawValue;
      }
      const entries = enumOptionMap.get(String(enumKey));
      const match = entries?.find((entry) => entry.rawValue === String(rawValue));
      return match?.displayLabel ?? rawValue;
    },
    [enumOptionMap]
  );

  React.useEffect(() => {
    if (sourceType !== "constant" || resolvedType !== "string") {
      return;
    }
    if (!enumKeyValue || !resolvedEnumRawValue) {
      return;
    }
    const nextValue = resolveEnumDisplayValue(
      String(enumKeyValue),
      String(resolvedEnumRawValue),
      enumValueTypeValue || "value"
    );
    if (nextValue !== undefined && nextValue !== expressionValue) {
      form.setFieldValue("expression", nextValue);
    }
  }, [
    enumKeyValue,
    enumValueTypeValue,
    expressionValue,
    form,
    resolvedEnumRawValue,
    resolvedType,
    resolveEnumDisplayValue,
    sourceType,
  ]);

  const validateConstantByType = useCallback(
    (_: unknown, value: string) => {
      if (value === undefined || value === null || value === "") {
        return Promise.reject(new Error("请输入常量值"));
      }
      const trimmed = String(value).trim();
      if (resolvedType === "number") {
        if (!/^[-+]?(\d+(\.\d+)?|\.\d+)$/.test(trimmed)) {
          return Promise.reject(new Error("常量值需为数字"));
        }
      }
      if (resolvedType === "boolean") {
        if (!/^(true|false)$/i.test(trimmed)) {
          return Promise.reject(new Error("常量值需为 true 或 false"));
        }
      }
      if (resolvedType === "object" || resolvedType === "array") {
        try {
          const parsed = JSON.parse(trimmed);
          if (resolvedType === "array" && !Array.isArray(parsed)) {
            return Promise.reject(new Error("常量值需为 JSON 数组"));
          }
          if (
            resolvedType === "object" &&
            (parsed === null || Array.isArray(parsed) || typeof parsed !== "object")
          ) {
            return Promise.reject(new Error("常量值需为 JSON 对象"));
          }
        } catch {
          return Promise.reject(new Error("常量值需为合法 JSON"));
        }
      }
      return Promise.resolve();
    },
    [resolvedType]
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const restValues = { ...values };
      delete restValues.sourceType;
      const rawType = String(values.type);
      const output: OutputVariableConfig = {
        ...restValues,
        type: "string",
      };

      if (rawType.startsWith("list:generic:")) {
        output.type = "array";
        output.itemTypeRef = rawType.replace(/^list:/, "");
        delete output.typeRef;
      } else if (rawType.startsWith("generic:")) {
        output.type = "object";
        output.typeRef = rawType;
        delete output.itemTypeRef;
      } else if (rawType.startsWith("list:")) {
        output.type = "array";
        output.itemTypeRef = normalizeStructRef(rawType.replace(/^list:/, ""));
        delete output.typeRef;
      } else if (rawType.startsWith("struct:")) {
        output.type = "object";
        output.typeRef = normalizeStructRef(rawType);
        delete output.itemTypeRef;
      } else {
        output.type = rawType as OutputVariableConfig["type"];
        delete output.typeRef;
        delete output.itemTypeRef;
      }

      onOk(output);
    } catch {
      // 表单验证失败
    }
  };

  const validateVariableName = (_: unknown, value: string) => {
    if (!value) {
      return Promise.reject(new Error("请输入变量名称"));
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
      return Promise.reject(
        new Error("变量名称只能包含字母、数字和下划线，且不能以数字开头")
      );
    }
    // 编辑时，如果名称没变，不需要检查重复
    if (editingVariable && editingVariable.name === value) {
      return Promise.resolve();
    }
    if (existingNames.includes(value)) {
      return Promise.reject(new Error("变量名称已存在"));
    }
    return Promise.resolve();
  };

  return (
    <Form form={form} layout="vertical">
      <Form.Item
        name="name"
        label="变量名称"
        required
        rules={[{ validator: validateVariableName }]}
        extra="流程输出中的字段名"
      >
        <Input placeholder="请输入变量名称，如 result" />
      </Form.Item>

      <Form.Item
        name="label"
        label="显示名称"
        rules={[{ required: true, message: "请输入显示名称" }]}
      >
        <Input placeholder="请输入显示名称，如 处理结果" />
      </Form.Item>

      <Form.Item
        name="type"
        label="变量类型"
        rules={[{ required: true, message: "请选择变量类型" }]}
      >
        <Select options={typeOptions} placeholder="请选择变量类型" />
      </Form.Item>

      <Form.Item
        name="sourceType"
        label="数据来源"
        rules={[{ required: true, message: "请选择数据来源类型" }]}
      >
        <Radio.Group
          onChange={() => {
            form.setFieldValue("expression", undefined);
            form.setFieldValue("enumKey", undefined);
            form.setFieldValue("enumValue", undefined);
            form.setFieldValue("enumValueType", "value");
          }}
        >
          <Radio value="variable">上游变量</Radio>
          <Radio value="constant">常量值</Radio>
        </Radio.Group>
      </Form.Item>

      <Form.Item name="enumKey" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="enumValue" hidden>
        <Input />
      </Form.Item>
      <Form.Item name="enumValueType" hidden>
        <Input />
      </Form.Item>

      {sourceType === "constant" ? (
        <Form.Item
          name="expression"
          label="常量值"
          rules={[{ validator: validateConstantByType }]}
          extra={
            resolvedType === "number"
              ? "输入数字，如 123 或 3.14"
              : resolvedType === "boolean"
              ? "选择 true 或 false"
              : resolvedType === "object"
              ? "输入 JSON 对象，如 {\"a\":1}"
              : resolvedType === "array"
              ? "输入 JSON 数组，如 [1,2]"
              : "输入字符串常量"
          }
        >
          {resolvedType === "number" ? (
            <Space.Compact style={{ width: "100%" }}>
              <InputNumber
                style={{ width: "100%" }}
                placeholder="请输入数字"
                stringMode
                onChange={() => {
                  form.setFieldValue("enumKey", undefined);
                  form.setFieldValue("enumValue", undefined);
                }}
              />
              <EnumValuePicker
                options={enumPickerOptions}
                onSelect={(value, option) => {
                  const data = (option as { data?: Record<string, unknown> })?.data;
                  const rawValue = data?.rawValue;
                  const enumKey = data?.enumKey;
                  if (typeof rawValue === "string") {
                    form.setFieldValue("expression", rawValue);
                  } else {
                    form.setFieldValue("expression", value);
                  }
                  if (typeof enumKey === "string") {
                    form.setFieldValue("enumKey", enumKey);
                  }
                  if (typeof rawValue === "string") {
                    form.setFieldValue("enumValue", rawValue);
                  }
                }}
                placeholder="枚举值"
                value={selectedEnumValue}
              />
            </Space.Compact>
          ) : resolvedType === "boolean" ? (
            <Radio.Group>
              <Radio value="true">true</Radio>
              <Radio value="false">false</Radio>
            </Radio.Group>
          ) : resolvedType === "object" || resolvedType === "array" ? (
            <Input.TextArea
              rows={4}
              placeholder={
                resolvedType === "object"
                  ? '请输入 JSON 对象，如 {"a":1}'
                  : "请输入 JSON 数组，如 [1,2]"
              }
              onChange={() => {
                form.setFieldValue("enumKey", undefined);
                form.setFieldValue("enumValue", undefined);
              }}
            />
          ) : (
            <div style={{ width: "100%" }}>
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  placeholder='请输入字符串，如 ok 或 "ok"'
                  onChange={() => {
                    form.setFieldValue("enumKey", undefined);
                    form.setFieldValue("enumValue", undefined);
                  }}
                />
                <EnumValuePicker
                  options={enumPickerOptions}
                  onSelect={(value, option) => {
                    const data = (option as { data?: Record<string, unknown> })?.data;
                    const rawValue = data?.rawValue;
                    const enumKey = data?.enumKey;
                    const displayLabel = data?.displayLabel;
                    const outputValue =
                      enumValueTypeValue === "label"
                        ? String(displayLabel ?? rawValue ?? value)
                        : String(rawValue ?? value);
                    if (typeof rawValue === "string" || typeof value === "string") {
                      form.setFieldValue("expression", outputValue);
                    }
                    if (typeof enumKey === "string") {
                      form.setFieldValue("enumKey", enumKey);
                    }
                    if (typeof rawValue === "string") {
                      form.setFieldValue("enumValue", rawValue);
                    }
                  }}
                  placeholder="枚举值"
                  value={selectedEnumValue}
                />
              </Space.Compact>
              <div style={{ marginTop: 8 }}>
                <Radio.Group
                  size="small"
                  value={enumValueTypeValue || "value"}
                  onChange={(event) =>
                    form.setFieldValue("enumValueType", event.target.value)
                  }
                >
                  <Radio.Button value="value">使用值</Radio.Button>
                  <Radio.Button value="label">使用显示值</Radio.Button>
                </Radio.Group>
              </div>
            </div>
          )}
        </Form.Item>
      ) : (
        <Form.Item
          name="expression"
          label="数据来源"
          rules={[{ required: true, message: "请选择数据来源" }]}
          extra="选择上游节点的输出变量作为数据来源"
        >
          <Select
            placeholder="选择变量"
            onChange={(value) => {
              const key = String(value).replace(/^\{\{|\}\}$/g, "");
              const v = allVariables.find((item) => item.key === key);
              if (!v) return;
              if (v.itemTypeRef) {
                if (v.itemTypeRef.startsWith("generic:")) {
                  form.setFieldValue("type", `list:${v.itemTypeRef}`);
                  return;
                }
                const normalized = normalizeStructRef(v.itemTypeRef);
                form.setFieldValue("type", `list:struct:${normalized}`);
                return;
              }
              if (v.typeRef) {
                if (v.typeRef.startsWith("generic:")) {
                  form.setFieldValue("type", v.typeRef);
                  return;
                }
                const normalized = normalizeStructRef(v.typeRef);
                form.setFieldValue("type", `struct:${normalized}`);
                return;
              }
              if (v.type === "array") {
                form.setFieldValue("type", "array");
                return;
              }
              if (v.type === "object") {
                form.setFieldValue("type", "object");
                return;
              }
              if (
                v.type === "string" ||
                v.type === "number" ||
                v.type === "boolean"
              ) {
                form.setFieldValue("type", v.type);
              }
            }}
            showSearch={{
              filterOption: (input, option) => {
                const optionData = option as { data?: { searchText?: string } };
                const searchText = optionData?.data?.searchText || "";
                return searchText.toLowerCase().includes(input.toLowerCase());
              },
            }}
            allowClear
            options={variableOptions}
            popupMatchSelectWidth={false}
            labelRender={(props) => {
              // 从 {{key}} 格式中提取 key
              const key = String(props.value).replace(/^\{\{|\}\}$/g, "");
              const v = allVariables.find((item) => item.key === key);
              if (!v) return props.value;
              return (
                <div className={styles.selectedTag}>
                  <span className={styles.tagIcon}>
                    {nodeTypeIcons[v.group] || <AiOutlineDatabase />}
                  </span>
                  <span className={styles.tagPath}>{v.group}</span>
                  <span>/</span>
                  <span className={styles.tagVar}>{v.name}</span>
                </div>
              );
            }}
          />
        </Form.Item>
      )}

      <Form.Item name="description" label="描述">
        <Input.TextArea rows={2} placeholder="变量描述（可选）" />
      </Form.Item>

      {/* 底部按钮 */}
      <div style={{ textAlign: "right", marginTop: 16 }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            保存
          </Button>
        </Space>
      </div>
    </Form>
  );
};

/**
 * 添加/编辑输出变量弹窗
 */
const AddOutputVariableModal: React.FC<AddOutputVariableModalProps> = ({
  open,
  editingVariable,
  existingNames,
  nodeId,
  onOk,
  onCancel,
}) => {
  // 使用状态记录打开次数，用于生成唯一 key
  const [openCount, setOpenCount] = React.useState(0);

  // 当 modal 打开时递增计数器
  React.useEffect(() => {
    if (open) {
      setOpenCount((c) => c + 1);
    }
  }, [open]);

  const contentKey = `${editingVariable?.name ?? "new"}-${openCount}`;

  return (
    <Modal
      title={editingVariable ? "编辑输出变量" : "添加输出变量"}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={520}
      destroyOnHidden
    >
      {open && (
        <ModalContent
          key={contentKey}
          editingVariable={editingVariable}
          existingNames={existingNames}
          nodeId={nodeId}
          onOk={onOk}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
};

export default AddOutputVariableModal;
