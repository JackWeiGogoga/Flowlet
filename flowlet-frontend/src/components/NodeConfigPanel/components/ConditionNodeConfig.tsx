import React, { useMemo, useCallback, useEffect, useRef } from "react";
import { useUpdateNodeInternals } from "@xyflow/react";
import { Form, Button, Select, Input, Tooltip, Divider } from "antd";
import {
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineSwap,
  AiOutlineQuestionCircle,
  AiOutlineDatabase,
} from "react-icons/ai";
import { useFlowStore, FlowNode } from "@/store/flowStore";
import { useProjectStore } from "@/store/projectStore";
import { SelectableVariable, VariableGroup } from "@/types";
import { nodeTypeIcons } from "@/constants/nodeIcons";
import { buildAvailableVariables } from "@/utils/flowUtils";
import { generateId } from "@/utils";
import { useEnumOptions } from "@/hooks/useEnumOptions";
import {
  useConstantOptions,
  parseConstantRef,
  isConstantRef,
} from "@/hooks/useConstantOptions";
import { ValuePicker } from "@/components/ValuePicker";
import { OutputAliasConfig } from "./OutputAliasConfig";
import { flowApi } from "@/services/flowService";
import { useStyles } from "./ConditionNodeConfig.style";

// ============ 类型定义 ============

/** 逻辑操作符类型 */
type LogicOperator = "and" | "or";

/** 比较操作符类型 */
type ComparisonOperator =
  // 字符串操作符
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "matches"
  | "not_matches"
  | "is"
  | "is_not"
  | "is_empty"
  | "is_not_empty"
  // 数值操作符
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal"
  // 布尔操作符
  | "is_true"
  | "is_false"
  // 通用操作符
  | "exists"
  | "not_exists";

/** 单个条件项 */
interface ConditionItem {
  id: string;
  variableKey: string;
  operator: ComparisonOperator;
  value: string;
}

/** 条件分支（IF 或 ELIF） */
interface ConditionBranch {
  id: string;
  type: "if" | "elif";
  logicOperator: LogicOperator;
  conditions: ConditionItem[];
  alias?: string;
}

/** 条件配置数据 */
interface ConditionConfigData {
  branches: ConditionBranch[];
}

// ============ 常量配置 ============

/** 操作符配置 */
const OPERATORS_CONFIG: Record<
  ComparisonOperator,
  { label: string; types: string[]; needsValue: boolean }
> = {
  // 字符串操作符
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
  matches: {
    label: "匹配正则",
    types: ["string", "text", "paragraph"],
    needsValue: true,
  },
  not_matches: {
    label: "不匹配正则",
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
  // 数值操作符
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
  // 布尔操作符
  is_true: { label: "为真", types: ["boolean"], needsValue: false },
  is_false: { label: "为假", types: ["boolean"], needsValue: false },
  // 通用操作符
  exists: { label: "存在", types: ["*"], needsValue: false },
  not_exists: { label: "不存在", types: ["*"], needsValue: false },
};

/** 根据变量类型获取可用操作符 */
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
  // 如果是动态类型或未知类型，返回所有操作符
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
  constantOptions: ReturnType<typeof useConstantOptions>["options"];
  onChange: (condition: ConditionItem) => void;
  onDelete: () => void;
  canDelete: boolean;
  styles: ReturnType<typeof useStyles>["styles"];
}

/** 单个条件编辑器 */
const ConditionItemEditor: React.FC<ConditionItemEditorProps> = ({
  condition,
  variables,
  variableGroups,
  enumOptions,
  constantOptions,
  onChange,
  onDelete,
  canDelete,
  styles,
}) => {
  // 获取选中变量的类型
  const selectedVariable = variables.find(
    (v) => v.key === condition.variableKey
  );
  const varType = selectedVariable?.type || "string";
  const availableOperators = getOperatorsByType(varType);
  const currentOperatorConfig = OPERATORS_CONFIG[condition.operator];
  const needsValue = currentOperatorConfig?.needsValue ?? true;

  // 构建下拉选项
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
        // 用于搜索过滤的数据，存储在 data 属性中避免传递到 DOM
        data: { searchText: `${v.group} ${v.name} ${v.label} ${v.key}` },
      })),
    }));
  }, [variableGroups, styles]);

  return (
    <div className={styles.conditionItem}>
      <div className={styles.conditionContent}>
        <div className={styles.conditionRow}>
          {/* 变量选择器 */}
          <div className={styles.variableSelector}>
            <Select
              value={condition.variableKey || undefined}
              onChange={(value) =>
                onChange({
                  ...condition,
                  variableKey: value,
                  // 切换变量时，检查当前操作符是否仍然适用
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
                  // 从 option 中获取 searchText 进行过滤（使用类型断言）
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

          {/* 操作符选择器 */}
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

          {/* 值输入框 */}
          {needsValue && (
            <div className={styles.valueInput}>
              {/* 检查是否是常量引用，如果是则显示标签 */}
              {isConstantRef(condition.value) ? (
                <div className={styles.constantRefTag}>
                  <span className={styles.constantRefIcon}>📦</span>
                  <span className={styles.constantRefName}>
                    {parseConstantRef(condition.value)}
                  </span>
                  <Button
                    type="text"
                    size="small"
                    icon={<AiOutlineDelete />}
                    onClick={() => onChange({ ...condition, value: "" })}
                    className={styles.constantRefClear}
                  />
                </div>
              ) : (
                <Input
                  value={condition.value}
                  onChange={(e) =>
                    onChange({ ...condition, value: e.target.value })
                  }
                  placeholder="输入值"
                />
              )}
              <ValuePicker
                enumOptions={enumOptions}
                constantOptions={constantOptions}
                onSelect={(value) => onChange({ ...condition, value })}
                className={styles.valuePicker}
                placeholder="选择值"
              />
            </div>
          )}

          {/* 删除按钮 */}
          <Tooltip title={canDelete ? "删除条件" : "至少保留一个条件"}>
            <Button
              type="text"
              icon={<AiOutlineDelete />}
              onClick={onDelete}
              disabled={!canDelete}
              className={styles.conditionDeleteBtn}
              danger
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

interface BranchEditorProps {
  branch: ConditionBranch;
  branchIndex: number;
  variables: SelectableVariable[];
  variableGroups: VariableGroup[];
  enumOptions: ReturnType<typeof useEnumOptions>["options"];
  constantOptions: ReturnType<typeof useConstantOptions>["options"];
  onChange: (branch: ConditionBranch) => void;
  onDelete: () => void;
  canDelete: boolean;
  styles: ReturnType<typeof useStyles>["styles"];
  cx: ReturnType<typeof useStyles>["cx"];
}

/** 分支编辑器 */
const BranchEditor: React.FC<BranchEditorProps> = ({
  branch,
  branchIndex,
  variables,
  variableGroups,
  enumOptions,
  constantOptions,
  onChange,
  onDelete,
  canDelete,
  styles,
  cx,
}) => {
  // 切换逻辑操作符
  const toggleLogicOperator = useCallback(() => {
    onChange({
      ...branch,
      logicOperator: branch.logicOperator === "and" ? "or" : "and",
    });
  }, [branch, onChange]);

  // 更新条件
  const updateCondition = useCallback(
    (conditionIndex: number, newCondition: ConditionItem) => {
      const newConditions = [...branch.conditions];
      newConditions[conditionIndex] = newCondition;
      onChange({ ...branch, conditions: newConditions });
    },
    [branch, onChange]
  );

  // 删除条件
  const deleteCondition = useCallback(
    (conditionIndex: number) => {
      if (branch.conditions.length <= 1) return;
      const newConditions = branch.conditions.filter(
        (_, i) => i !== conditionIndex
      );
      onChange({ ...branch, conditions: newConditions });
    },
    [branch, onChange]
  );

  // 添加条件
  const addCondition = useCallback(() => {
    const newCondition: ConditionItem = {
      id: generateId(),
      variableKey: "",
      operator: "is",
      value: "",
    };
    onChange({ ...branch, conditions: [...branch.conditions, newCondition] });
  }, [branch, onChange]);

  return (
    <div className={styles.branch}>
      {/* 分支头部 */}
      <div className={styles.branchHeader}>
        <div className={styles.branchHeaderLeft}>
          <span className={styles.branchLabel}>
            {branch.type === "if" ? "IF" : `ELIF ${branchIndex}`}
          </span>
          <Input
            size="small"
            value={branch.alias}
            onChange={(e) => onChange({ ...branch, alias: e.target.value })}
            placeholder="分支名称"
            className={styles.branchAliasInput}
          />
        </div>
        <div className={styles.branchActions}>
          {canDelete && (
            <Tooltip title="删除分支">
              <Button
                type="text"
                icon={<AiOutlineDelete />}
                onClick={onDelete}
                size="small"
                danger
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* 条件组容器 */}
      <div className={styles.conditionsContainer}>
        {/* 条件列表包装器 - 用于定位 AND/OR 按钮 */}
        <div className={styles.conditionsListWrapper}>
          {/* 逻辑操作符切换器 - 仅当有多个条件时显示 */}
          {branch.conditions.length > 1 && (
            <div className={styles.logicOperatorWrapper}>
              <Tooltip
                title={`点击切换为 ${
                  branch.logicOperator === "and" ? "OR" : "AND"
                }`}
              >
                <button
                  className={cx(
                    styles.logicOperatorToggle,
                    branch.logicOperator
                  )}
                  onClick={toggleLogicOperator}
                >
                  {branch.logicOperator.toUpperCase()}
                  <AiOutlineSwap />
                </button>
              </Tooltip>
            </div>
          )}

          {/* 条件列表 */}
          <div className={styles.conditionsList}>
            {branch.conditions.map((condition, condIndex) => (
              <ConditionItemEditor
                key={condition.id}
                condition={condition}
                variables={variables}
                variableGroups={variableGroups}
                enumOptions={enumOptions}
                constantOptions={constantOptions}
                onChange={(newCondition) =>
                  updateCondition(condIndex, newCondition)
                }
                onDelete={() => deleteCondition(condIndex)}
                canDelete={branch.conditions.length > 1}
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
      </div>
    </div>
  );
};

// ============ 主组件 ============

/** 分支表达式数据结构 */
interface BranchExpression {
  branchId: string;
  type: "if" | "elif";
  handleId: string;
  expression: string;
}

/** 条件判断配置（用于后端执行） */
interface ConditionEvalConfig {
  branches: BranchExpression[];
  elseHandleId: string;
}

/** 生成单个条件的表达式 */
const generateConditionExpression = (c: ConditionItem): string => {
  if (!c.variableKey) return "";
  const varRef = `{{${c.variableKey}}}`;

  switch (c.operator) {
    case "contains":
      return `${varRef}.includes('${c.value}')`;
    case "not_contains":
      return `!${varRef}.includes('${c.value}')`;
    case "starts_with":
      return `${varRef}.startsWith('${c.value}')`;
    case "ends_with":
      return `${varRef}.endsWith('${c.value}')`;
    case "matches":
      return `${varRef}.matches('${c.value}')`;
    case "not_matches":
      return `!${varRef}.matches('${c.value}')`;
    case "is":
      return `${varRef} === '${c.value}'`;
    case "is_not":
      return `${varRef} !== '${c.value}'`;
    case "is_empty":
      return `${varRef} == null || ${varRef}.isEmpty()`;
    case "is_not_empty":
      return `${varRef} != null && !${varRef}.isEmpty()`;
    case "equals":
      return `${varRef} === ${c.value}`;
    case "not_equals":
      return `${varRef} !== ${c.value}`;
    case "greater_than":
      return `${varRef} > ${c.value}`;
    case "less_than":
      return `${varRef} < ${c.value}`;
    case "greater_than_or_equal":
      return `${varRef} >= ${c.value}`;
    case "less_than_or_equal":
      return `${varRef} <= ${c.value}`;
    case "is_true":
      return `${varRef} === true`;
    case "is_false":
      return `${varRef} === false`;
    case "exists":
      return `${varRef} !== undefined && ${varRef} !== null`;
    case "not_exists":
      return `${varRef} === undefined || ${varRef} === null`;
    default:
      return "";
  }
};

/** 生成分支表达式配置（用于后端按顺序评估） */
const generateBranchExpressions = (
  config: ConditionConfigData
): ConditionEvalConfig => {
  const branches: BranchExpression[] = config.branches.map((branch, index) => {
    // Handle ID 与 CustomNode 中的逻辑保持一致
    const handleId = branch.type === "if" ? "true" : `elif-${index}`;

    const conditionStrings = branch.conditions
      .map(generateConditionExpression)
      .filter(Boolean);

    const joiner = branch.logicOperator === "and" ? " && " : " || ";
    const expression =
      conditionStrings.length > 0
        ? conditionStrings.length === 1
          ? conditionStrings[0]
          : `(${conditionStrings.join(joiner)})`
        : "true"; // 如果没有配置条件，默认为 true

    return {
      branchId: branch.id,
      type: branch.type,
      handleId: handleId,
      expression: expression,
    };
  });

  return {
    branches,
    elseHandleId: "false",
  };
};

/** 生成简单的表达式字符串（用于显示，已废弃用于执行） */
const generateExpression = (config: ConditionConfigData): string => {
  const evalConfig = generateBranchExpressions(config);
  // 返回 JSON 格式，方便后端解析
  return JSON.stringify(evalConfig);
};

/** 创建默认配置 */
const createDefaultConfig = (): ConditionConfigData => ({
  branches: [
    {
      id: generateId(),
      type: "if",
      logicOperator: "and",
      conditions: [
        { id: generateId(), variableKey: "", operator: "is", value: "" },
      ],
    },
  ],
});

/**
 * 条件节点配置组件
 * 支持 IF/ELIF/ELSE 分支配置，多条件 AND/OR 切换
 */
export const ConditionNodeConfig: React.FC = () => {
  const { styles, cx } = useStyles();
  const form = Form.useFormInstance();
  const { nodes, edges, selectedNode, dataStructures, constants, flowId } =
    useFlowStore();
  const { currentProject } = useProjectStore();
  const { options: enumOptions } = useEnumOptions(currentProject?.id);
  const { options: constantOptions } = useConstantOptions(
    currentProject?.id,
    flowId ?? undefined
  );
  const setReusableFlows = useFlowStore((state) => state.setReusableFlows);
  const reusableFlows = useFlowStore((state) => state.reusableFlows);
  const hasRequestedReusableFlows = useRef(false);

  // 获取当前配置
  const watchedConfig = Form.useWatch("conditionConfig", form);

  // 使用 useMemo 确保配置的稳定性
  const conditionConfig: ConditionConfigData = useMemo(() => {
    if (
      watchedConfig &&
      watchedConfig.branches &&
      watchedConfig.branches.length > 0
    ) {
      return watchedConfig;
    }
    return createDefaultConfig();
  }, [watchedConfig]);

  // 初始化时设置默认配置到表单
  // 使用 selectedNode?.id 作为依赖，确保切换节点时重新检查
  useEffect(() => {
    // 使用 setTimeout 确保 useNodeConfig 的 setFieldsValue 先执行完成
    const timer = setTimeout(() => {
      const currentConfig = form.getFieldValue("conditionConfig");
      if (
        !currentConfig ||
        !currentConfig.branches ||
        currentConfig.branches.length === 0
      ) {
        const defaultConfig = createDefaultConfig();
        form.setFieldValue("conditionConfig", defaultConfig);
        form.setFieldValue("expression", generateExpression(defaultConfig));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [form, selectedNode?.id]);

  // 预加载可复用流程，避免首次进入时子流程变量无法解析
  useEffect(() => {
    if (hasRequestedReusableFlows.current) {
      return;
    }
    if (!flowId || reusableFlows.length > 0) {
      return;
    }
    hasRequestedReusableFlows.current = true;
    flowApi
      .listReusable(1, 100, flowId)
      .then((response) => {
        if (response.data.code === 200) {
          setReusableFlows(response.data.data.records);
        }
      })
      .catch((error) => {
        console.error("加载可复用流程失败:", error);
      });
  }, [flowId, reusableFlows.length, setReusableFlows]);

  // 构建可用变量
  const variableGroups = useMemo(
    () =>
      buildAvailableVariables(
        selectedNode?.id,
        nodes as FlowNode[],
        edges,
        reusableFlows,
        dataStructures,
        constants
      ),
    [selectedNode?.id, nodes, edges, reusableFlows, dataStructures, constants]
  );

  // 扁平化变量列表
  const allVariables = useMemo(
    () => variableGroups.flatMap((g) => g.variables),
    [variableGroups]
  );

  // 获取 store 的 updateNode 函数
  const updateNode = useFlowStore((state) => state.updateNode);

  // 用于通知 React Flow 更新节点内部状态（包括 Handles）
  const updateNodeInternals = useUpdateNodeInternals();

  // 更新配置
  const updateConfig = useCallback(
    (newConfig: ConditionConfigData) => {
      form.setFieldValue("conditionConfig", newConfig);
      // 同时生成表达式字符串以便后端使用
      const expression = generateExpression(newConfig);
      form.setFieldValue("expression", expression);

      // form.setFieldValue 不会触发 onValuesChange，需要手动更新节点数据
      if (selectedNode) {
        updateNode(selectedNode.id, {
          config: {
            ...selectedNode.data.config,
            conditionConfig: newConfig,
            expression: expression,
          },
        });

        // 当分支数量变化时，通知 React Flow 更新节点的 Handles
        // 使用 setTimeout 确保节点数据先更新完成
        setTimeout(() => {
          updateNodeInternals(selectedNode.id);
        }, 0);
      }
    },
    [form, selectedNode, updateNode, updateNodeInternals]
  );

  // 更新分支
  const updateBranch = useCallback(
    (branchIndex: number, newBranch: ConditionBranch) => {
      const newBranches = [...conditionConfig.branches];
      newBranches[branchIndex] = newBranch;
      updateConfig({ ...conditionConfig, branches: newBranches });
    },
    [conditionConfig, updateConfig]
  );

  // 删除分支
  const deleteBranch = useCallback(
    (branchIndex: number) => {
      if (conditionConfig.branches.length <= 1) return;
      const newBranches = conditionConfig.branches.filter(
        (_, i) => i !== branchIndex
      );
      updateConfig({ ...conditionConfig, branches: newBranches });
    },
    [conditionConfig, updateConfig]
  );

  // 添加 ELIF 分支
  const addElifBranch = useCallback(() => {
    const newBranch: ConditionBranch = {
      id: generateId(),
      type: "elif",
      logicOperator: "and",
      conditions: [
        { id: generateId(), variableKey: "", operator: "is", value: "" },
      ],
    };
    updateConfig({
      ...conditionConfig,
      branches: [...conditionConfig.branches, newBranch],
    });
  }, [conditionConfig, updateConfig]);

  return (
    <>
      <Divider plain>
        条件配置
        <Tooltip title="配置条件分支，支持多个 IF/ELIF 分支，每个分支可配置多个条件并用 AND/OR 连接">
          <AiOutlineQuestionCircle
            style={{ marginLeft: 8, color: "#8c8c8c" }}
          />
        </Tooltip>
      </Divider>

      <div className={styles.config}>
        {/* 隐藏的表单字段用于存储数据 */}
        <Form.Item name="conditionConfig" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="expression" hidden>
          <Input />
        </Form.Item>

        <div className={styles.branches}>
          {/* 分支列表 */}
          {conditionConfig.branches.map((branch, index) => (
            <BranchEditor
              key={branch.id}
              branch={branch}
              branchIndex={index}
              variables={allVariables}
              variableGroups={variableGroups}
              enumOptions={enumOptions}
              constantOptions={constantOptions}
              onChange={(newBranch) => updateBranch(index, newBranch)}
              onDelete={() => deleteBranch(index)}
              canDelete={
                conditionConfig.branches.length > 1 || branch.type !== "if"
              }
              styles={styles}
              cx={cx}
            />
          ))}

          {/* 添加 ELIF 分支按钮 */}
          <div className={styles.addBranchContainer}>
            <Button
              type="dashed"
              icon={<AiOutlinePlus />}
              onClick={addElifBranch}
              className={styles.addBranchBtn}
            >
              ELIF
            </Button>
          </div>

          {/* ELSE 分支说明 */}
          <Divider style={{ margin: "16px 0" }} />
          <div className={styles.elseBranch}>
            <div className={styles.elseHeader}>
              <span className={styles.elseLabel}>ELSE</span>
            </div>
            <div className={styles.elseDescription}>
              用于定义当 IF 条件不满足时应执行的逻辑。
            </div>
          </div>
        </div>

        <Divider style={{ margin: "16px 0" }} />
        <OutputAliasConfig />
      </div>
    </>
  );
};

export default ConditionNodeConfig;
