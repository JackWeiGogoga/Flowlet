import React, { useMemo, useCallback, useState, useEffect } from "react";
import { Form, Switch, Button, Select, Input, Tooltip, Tag } from "antd";
import {
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineSwap,
  AiOutlineFilter,
  AiOutlineDown,
  AiOutlineUp,
  AiOutlineDatabase,
} from "react-icons/ai";
import { useFlowStore, FlowNode } from "@/store/flowStore";
import { useProjectStore } from "@/store/projectStore";
import { SelectableVariable, VariableGroup } from "@/types";
import { nodeTypeIcons } from "@/constants/nodeIcons";
import { buildAvailableVariables } from "@/utils/flowUtils";
import { generateId } from "@/utils";
import { useEnumOptions } from "@/hooks/useEnumOptions";
import { EnumValuePicker } from "@/components/EnumValuePicker";
import { useStyles } from "./ExecutionConditionConfig.style";

// ============ 类型定义 ============

/** 逻辑操作符类型 */
type LogicOperator = "and" | "or";

/** 比较操作符类型 */
type ComparisonOperator =
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is"
  | "is_not"
  | "is_empty"
  | "is_not_empty"
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  | "is_true"
  | "is_false"
  | "exists"
  | "not_exists";

/** 单个条件项 */
interface ConditionItem {
  id: string;
  variableKey: string;
  operator: ComparisonOperator;
  value: string;
}

/** 执行条件配置 */
interface ExecutionConditionData {
  enabled: boolean;
  logicOperator: LogicOperator;
  conditions: ConditionItem[];
}

// ============ 常量配置 ============

const OPERATORS_CONFIG: Record<
  ComparisonOperator,
  { label: string; types: string[]; needsValue: boolean }
> = {
  contains: {
    label: "包含",
    types: ["string", "text", "paragraph"],
    needsValue: true,
  },
  not_contains: {
    label: "不包含",
    types: ["string", "text", "paragraph"],
    needsValue: true,
  },
  starts_with: {
    label: "开头是",
    types: ["string", "text", "paragraph"],
    needsValue: true,
  },
  ends_with: {
    label: "结尾是",
    types: ["string", "text", "paragraph"],
    needsValue: true,
  },
  is: {
    label: "是",
    types: ["string", "text", "paragraph", "select"],
    needsValue: true,
  },
  is_not: {
    label: "不是",
    types: ["string", "text", "paragraph", "select"],
    needsValue: true,
  },
  is_empty: {
    label: "为空",
    types: ["string", "text", "paragraph", "object", "array"],
    needsValue: false,
  },
  is_not_empty: {
    label: "不为空",
    types: ["string", "text", "paragraph", "object", "array"],
    needsValue: false,
  },
  equals: { label: "等于", types: ["number"], needsValue: true },
  not_equals: { label: "不等于", types: ["number"], needsValue: true },
  greater_than: { label: "大于", types: ["number"], needsValue: true },
  less_than: { label: "小于", types: ["number"], needsValue: true },
  greater_than_or_equal: {
    label: "大于等于",
    types: ["number"],
    needsValue: true,
  },
  less_than_or_equal: {
    label: "小于等于",
    types: ["number"],
    needsValue: true,
  },
  is_true: { label: "为真", types: ["boolean"], needsValue: false },
  is_false: { label: "为假", types: ["boolean"], needsValue: false },
  exists: { label: "存在", types: ["*"], needsValue: false },
  not_exists: { label: "不存在", types: ["*"], needsValue: false },
};

const getOperatorsByType = (varType: string): ComparisonOperator[] => {
  const operators: ComparisonOperator[] = [];
  Object.entries(OPERATORS_CONFIG).forEach(([key, config]) => {
    if (
      config.types.includes("*") ||
      config.types.includes(varType) ||
      config.types.includes("dynamic")
    ) {
      operators.push(key as ComparisonOperator);
    }
  });
  if (operators.length === 0 || varType === "dynamic") {
    return Object.keys(OPERATORS_CONFIG) as ComparisonOperator[];
  }
  return operators;
};

// ============ 子组件 ============

interface ConditionItemEditorProps {
  condition: ConditionItem;
  variables: SelectableVariable[];
  variableGroups: VariableGroup[];
  enumOptions: ReturnType<typeof useEnumOptions>["options"];
  onChange: (condition: ConditionItem) => void;
  onDelete: () => void;
  canDelete: boolean;
  styles: ReturnType<typeof useStyles>["styles"];
}

const ConditionItemEditor: React.FC<ConditionItemEditorProps> = ({
  condition,
  variables,
  variableGroups,
  enumOptions,
  onChange,
  onDelete,
  canDelete,
  styles,
}) => {
  const selectedVariable = variables.find(
    (v) => v.key === condition.variableKey
  );
  const varType = selectedVariable?.type || "string";
  const availableOperators = getOperatorsByType(varType);
  const currentOperatorConfig = OPERATORS_CONFIG[condition.operator];
  const needsValue = currentOperatorConfig?.needsValue ?? true;

  const variableOptions = useMemo(() => {
    return variableGroups.map((group) => ({
      label: (
        <div className={styles.variableGroupHeader}>
          {nodeTypeIcons[group.name] || <AiOutlineDatabase />}
          <span>{group.name}</span>
        </div>
      ),
      options: group.variables.map((v) => ({
        value: v.key,
        label: (
          <div className={styles.variableSelectorOption}>
            <span className={styles.variableOptionIcon}>
              {nodeTypeIcons[v.group] || <AiOutlineDatabase />}
            </span>
            <div className={styles.variableOptionContent}>
              <div className={styles.variableOptionPath}>{v.group}</div>
              <div className={styles.variableOptionName}>{v.name}</div>
            </div>
            <span className={styles.variableOptionType}>{v.type}</span>
          </div>
        ),
        data: { searchText: `${v.group} ${v.name} ${v.label} ${v.key}` },
      })),
    }));
  }, [variableGroups, styles]);

  return (
    <div className={styles.conditionItem}>
      <div className={styles.conditionContent}>
        <div className={styles.conditionRow}>
          <div className={styles.variableSelector}>
            <Select
              value={condition.variableKey || undefined}
              onChange={(value) =>
                onChange({
                  ...condition,
                  variableKey: value,
                  operator: (() => {
                    const newVar = variables.find((v) => v.key === value);
                    const newType = newVar?.type || "string";
                    const newOperators = getOperatorsByType(newType);
                    return newOperators.includes(condition.operator)
                      ? condition.operator
                      : newOperators[0];
                  })(),
                })
              }
              placeholder="选择变量"
              showSearch={{
                filterOption: (input, option) => {
                  const optionData = option as {
                    data?: { searchText?: string };
                  };
                  const searchText = optionData?.data?.searchText || "";
                  return searchText.toLowerCase().includes(input.toLowerCase());
                },
              }}
              allowClear
              options={variableOptions}
              popupMatchSelectWidth={false}
              style={{ width: "100%" }}
              labelRender={(props) => {
                const v = variables.find((item) => item.key === props.value);
                if (!v) return props.value;
                return (
                  <div className={styles.selectedVariableTag}>
                    <span className="tag-icon">
                      {nodeTypeIcons[v.group] || <AiOutlineDatabase />}
                    </span>
                    <span className="tag-path">{v.group}</span>
                    <span>/</span>
                    <span className="tag-var">{v.name}</span>
                  </div>
                );
              }}
            />
          </div>

          <div className={styles.operatorSelector}>
            <Select
              value={condition.operator}
              onChange={(value) => onChange({ ...condition, operator: value })}
              style={{ width: "100%" }}
              popupMatchSelectWidth={100}
            >
              {availableOperators.map((op) => (
                <Select.Option key={op} value={op}>
                  {OPERATORS_CONFIG[op].label}
                </Select.Option>
              ))}
            </Select>
          </div>

          {needsValue && (
            <div className={styles.valueInput}>
              <Input
                value={condition.value}
                onChange={(e) =>
                  onChange({ ...condition, value: e.target.value })
                }
                placeholder="输入值"
              />
              <EnumValuePicker
                options={enumOptions}
                onSelect={(value) => onChange({ ...condition, value })}
                className={styles.enumPicker}
                placeholder="枚举值"
                disabled={!enumOptions || enumOptions.length === 0}
              />
            </div>
          )}

          <Tooltip title={canDelete ? "删除条件" : "至少保留一个条件"}>
            <Button
              type="text"
              icon={<AiOutlineDelete />}
              onClick={onDelete}
              disabled={!canDelete}
              className={styles.deleteBtn}
              danger
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

// ============ 主组件 ============

const createDefaultConfig = (): ExecutionConditionData => ({
  enabled: false,
  logicOperator: "and",
  conditions: [
    { id: generateId(), variableKey: "", operator: "is", value: "" },
  ],
});

interface ExecutionConditionConfigProps {
  nodeId: string;
}

/**
 * 执行条件配置组件
 * 用于配置节点的执行条件，只有满足条件时才执行节点
 */
export const ExecutionConditionConfig: React.FC<
  ExecutionConditionConfigProps
> = ({ nodeId }) => {
  const { styles, cx } = useStyles();
  const form = Form.useFormInstance();
  const { nodes, edges, selectedNode, updateNode, dataStructures, constants } =
    useFlowStore();
  const { currentProject } = useProjectStore();
  const { options: enumOptions } = useEnumOptions(currentProject?.id);
  const reusableFlows = useFlowStore((state) => state.reusableFlows);

  const [expanded, setExpanded] = useState(false);

  // 获取当前配置
  const watchedConfig = Form.useWatch("executionCondition", form);

  const config: ExecutionConditionData = useMemo(() => {
    if (watchedConfig && typeof watchedConfig === "object") {
      return watchedConfig as ExecutionConditionData;
    }
    return createDefaultConfig();
  }, [watchedConfig]);

  // 初始化时设置默认配置
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentConfig = form.getFieldValue("executionCondition");
      if (!currentConfig) {
        form.setFieldValue("executionCondition", createDefaultConfig());
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [form, nodeId]);

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

  const allVariables = useMemo(
    () => variableGroups.flatMap((g) => g.variables),
    [variableGroups]
  );

  // 更新配置
  const updateConfig = useCallback(
    (newConfig: ExecutionConditionData) => {
      form.setFieldValue("executionCondition", newConfig);

      if (selectedNode) {
        updateNode(selectedNode.id, {
          config: {
            ...selectedNode.data.config,
            executionCondition: newConfig,
          },
        });
      }
    },
    [form, selectedNode, updateNode]
  );

  // 切换启用状态
  const handleEnableChange = useCallback(
    (enabled: boolean) => {
      updateConfig({ ...config, enabled });
    },
    [config, updateConfig]
  );

  // 切换逻辑操作符
  const toggleLogicOperator = useCallback(() => {
    updateConfig({
      ...config,
      logicOperator: config.logicOperator === "and" ? "or" : "and",
    });
  }, [config, updateConfig]);

  // 更新条件
  const updateCondition = useCallback(
    (index: number, newCondition: ConditionItem) => {
      const newConditions = [...config.conditions];
      newConditions[index] = newCondition;
      updateConfig({ ...config, conditions: newConditions });
    },
    [config, updateConfig]
  );

  // 删除条件
  const deleteCondition = useCallback(
    (index: number) => {
      if (config.conditions.length <= 1) return;
      const newConditions = config.conditions.filter((_, i) => i !== index);
      updateConfig({ ...config, conditions: newConditions });
    },
    [config, updateConfig]
  );

  // 添加条件
  const addCondition = useCallback(() => {
    const newCondition: ConditionItem = {
      id: generateId(),
      variableKey: "",
      operator: "is",
      value: "",
    };
    updateConfig({
      ...config,
      conditions: [...config.conditions, newCondition],
    });
  }, [config, updateConfig]);

  return (
    <>
      {/* 隐藏的表单字段 */}
      <Form.Item name="executionCondition" hidden>
        <Input />
      </Form.Item>

      <div className={styles.container}>
        {/* 头部 */}
        <div className={styles.header} onClick={() => setExpanded(!expanded)}>
          <div className={styles.headerLeft}>
            <AiOutlineFilter className={styles.headerIcon} />
            <span className={styles.headerTitle}>执行条件</span>
            {config.enabled && (
              <Tag color="processing" style={{ margin: 0 }}>
                已启用
              </Tag>
            )}
          </div>
          <div className={styles.headerRight}>
            {expanded ? (
              <AiOutlineUp className={styles.expandIcon} />
            ) : (
              <AiOutlineDown className={styles.expandIcon} />
            )}
          </div>
        </div>

        {/* 内容 */}
        {expanded && (
          <div className={styles.content}>
            {/* 启用开关 */}
            <div className={styles.enableRow}>
              <span className={styles.enableLabel}>
                启用条件过滤
                <Tooltip title="启用后，只有满足条件时才会执行此节点，否则跳过">
                  <span style={{ cursor: "help", color: "#8c8c8c" }}>(?)</span>
                </Tooltip>
              </span>
              <Switch
                checked={config.enabled}
                onChange={handleEnableChange}
                size="small"
              />
            </div>

            {/* 条件配置 */}
            {config.enabled ? (
              <>
                <div className={styles.conditionsWrapper}>
                  {/* 逻辑操作符切换器 */}
                  {config.conditions.length > 1 && (
                    <div className={styles.logicOperatorWrapper}>
                      <Tooltip
                        title={`点击切换为 ${
                          config.logicOperator === "and" ? "OR" : "AND"
                        }`}
                      >
                        <button
                          className={cx(
                            styles.logicOperatorToggle,
                            config.logicOperator
                          )}
                          onClick={toggleLogicOperator}
                        >
                          {config.logicOperator.toUpperCase()}
                          <AiOutlineSwap />
                        </button>
                      </Tooltip>
                    </div>
                  )}

                  {/* 条件列表 */}
                  <div className={styles.conditionsList}>
                    {config.conditions.map((condition, index) => (
                      <ConditionItemEditor
                        key={condition.id}
                        condition={condition}
                        variables={allVariables}
                        variableGroups={variableGroups}
                        enumOptions={enumOptions}
                        onChange={(newCondition) =>
                          updateCondition(index, newCondition)
                        }
                        onDelete={() => deleteCondition(index)}
                        canDelete={config.conditions.length > 1}
                        styles={styles}
                      />
                    ))}
                  </div>
                </div>

                {/* 添加条件按钮 */}
                <Button
                  type="dashed"
                  icon={<AiOutlinePlus />}
                  onClick={addCondition}
                  className={styles.addConditionBtn}
                  size="small"
                >
                  添加条件
                </Button>
              </>
            ) : (
              <div className={styles.disabledHint}>
                未启用条件过滤，节点将始终执行
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ExecutionConditionConfig;
