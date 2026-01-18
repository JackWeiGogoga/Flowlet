import React, { useCallback, useMemo, useState } from "react";
import {
  Button,
  Select,
  Input,
  InputNumber,
  Tag,
  Space,
  Form,
  AutoComplete,
  Radio,
  Tooltip,
} from "antd";
import {
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineDatabase,
  AiOutlineHolder,
} from "react-icons/ai";
import { TbVariablePlus, TbVariable } from "react-icons/tb";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFlowStore, FlowNode } from "@/store/flowStore";
import { useProjectStore } from "@/store/projectStore";
import {
  AssignmentItem,
  AssignmentMode,
  AssignmentValueType,
  SourceDataType,
  TransformOperation,
  OperationParams,
  VariableAssignerConfig,
  NodeType,
  FlowNodeData,
  SelectableVariable,
} from "@/types";
import { buildAvailableVariables } from "@/utils/flowUtils";
import { nodeTypeIcons } from "@/constants/nodeIcons";
import { useEnumOptions } from "@/hooks/useEnumOptions";
import {
  useConstantOptions,
  isConstantRef,
  parseConstantRef,
} from "@/hooks/useConstantOptions";
import { ValuePicker } from "@/components/ValuePicker/ValuePicker";
import VariableInput from "@/components/VariableInput/VariableInput";
import { useStyles } from "./VariableAssignerNodeConfig.style";

// ==================== 配置常量 ====================

// 值类型配置
const VALUE_TYPES: { value: AssignmentValueType; label: string; color: string }[] = [
  { value: "string", label: "字符串", color: "green" },
  { value: "number", label: "数字", color: "blue" },
  { value: "boolean", label: "布尔", color: "cyan" },
  { value: "object", label: "对象", color: "purple" },
  { value: "array", label: "数组", color: "orange" },
];

// 操作模式配置
const MODE_OPTIONS: { value: AssignmentMode; label: string; description: string }[] = [
  { value: "set", label: "设置固定值", description: "手动输入常量值" },
  { value: "assign", label: "变量赋值", description: "直接引用其他变量" },
  { value: "transform", label: "变量运算", description: "对变量进行操作后赋值" },
];

// 按源类型分类的变换操作
const TRANSFORM_OPERATIONS: Record<SourceDataType, {
  value: TransformOperation;
  label: string;
  description: string;
  resultType: string;
  params?: string[];
}[]> = {
  array: [
    { value: "get_first", label: "取首项", description: "获取数组第一个元素", resultType: "element" },
    { value: "get_last", label: "取末项", description: "获取数组最后一个元素", resultType: "element" },
    { value: "get_index", label: "取指定位置", description: "获取指定索引的元素", resultType: "element", params: ["arrayIndex"] },
    { value: "length", label: "获取长度", description: "返回数组元素个数", resultType: "number" },
    { value: "slice", label: "截取片段", description: "截取数组的一部分", resultType: "array", params: ["sliceStart", "sliceEnd"] },
    { value: "reverse", label: "反转", description: "反转数组顺序", resultType: "array" },
    { value: "unique", label: "去重", description: "移除重复元素", resultType: "array" },
    { value: "join", label: "连接成字符串", description: "用分隔符连接元素", resultType: "string", params: ["joinSeparator"] },
    { value: "append", label: "追加元素", description: "向数组添加元素", resultType: "array", params: ["appendValue"] },
    { value: "remove_first", label: "移除首项", description: "删除第一个元素", resultType: "array" },
    { value: "remove_last", label: "移除末项", description: "删除最后一个元素", resultType: "array" },
  ],
  string: [
    { value: "length", label: "获取长度", description: "返回字符串长度", resultType: "number" },
    { value: "trim", label: "去除空白", description: "去除首尾空白字符", resultType: "string" },
    { value: "uppercase", label: "转大写", description: "转换为大写字母", resultType: "string" },
    { value: "lowercase", label: "转小写", description: "转换为小写字母", resultType: "string" },
    { value: "regex_replace", label: "正则替换", description: "按正则表达式替换", resultType: "string", params: ["regexPattern", "regexFlags", "regexReplace"] },
    { value: "regex_extract", label: "正则提取", description: "按正则表达式提取", resultType: "string", params: ["regexPattern", "regexFlags", "regexGroup"] },
  ],
  number: [
    { value: "add", label: "加法", description: "加上一个数", resultType: "number", params: ["arithmeticValue"] },
    { value: "subtract", label: "减法", description: "减去一个数", resultType: "number", params: ["arithmeticValue"] },
    { value: "multiply", label: "乘法", description: "乘以一个数", resultType: "number", params: ["arithmeticValue"] },
    { value: "divide", label: "除法", description: "除以一个数", resultType: "number", params: ["arithmeticValue"] },
    { value: "round", label: "四舍五入", description: "四舍五入取整", resultType: "number" },
    { value: "floor", label: "向下取整", description: "向下取整", resultType: "number" },
    { value: "ceil", label: "向上取整", description: "向上取整", resultType: "number" },
    { value: "abs", label: "绝对值", description: "取绝对值", resultType: "number" },
  ],
  object: [
    { value: "get_field", label: "提取字段", description: "提取对象的某个字段", resultType: "dynamic", params: ["fieldPath"] },
    { value: "keys", label: "获取所有键", description: "返回对象的所有键名", resultType: "array" },
    { value: "values", label: "获取所有值", description: "返回对象的所有值", resultType: "array" },
  ],
  boolean: [
    { value: "not", label: "取反", description: "布尔值取反", resultType: "boolean" },
  ],
  unknown: [],
};

// 操作标签颜色
const OPERATION_COLORS: Record<string, string> = {
  get_first: "geekblue",
  get_last: "geekblue",
  get_index: "geekblue",
  length: "volcano",
  slice: "orange",
  reverse: "lime",
  unique: "lime",
  join: "purple",
  append: "gold",
  remove_first: "error",
  remove_last: "error",
  trim: "cyan",
  uppercase: "blue",
  lowercase: "blue",
  regex_replace: "magenta",
  regex_extract: "purple",
  add: "cyan",
  subtract: "cyan",
  multiply: "cyan",
  divide: "cyan",
  round: "blue",
  floor: "blue",
  ceil: "blue",
  abs: "blue",
  get_field: "geekblue",
  keys: "orange",
  values: "orange",
  not: "red",
};

// ==================== 辅助函数 ====================

/**
 * 从泛型类型中提取元素类型
 * 支持格式：List<ContentVO>, Array<String>, ContentVO[], array<number> 等
 */
function extractElementType(fullType: string): string | undefined {
  if (!fullType) return undefined;
  
  // 匹配 List<X>, ArrayList<X>, Array<X>, Set<X> 等 Java/通用泛型格式
  const genericMatch = fullType.match(/^(?:List|ArrayList|Set|HashSet|LinkedList|Array|Collection)<(.+)>$/i);
  if (genericMatch) {
    return genericMatch[1].trim();
  }
  
  // 匹配 X[] 数组格式
  const arrayMatch = fullType.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    return arrayMatch[1].trim();
  }
  
  // 匹配 array<X> 格式
  const arrayGenericMatch = fullType.match(/^array<(.+)>$/i);
  if (arrayGenericMatch) {
    return arrayGenericMatch[1].trim();
  }
  
  return undefined;
}

/**
 * 推断源变量的类型信息
 */
interface SourceTypeInfo {
  baseType: SourceDataType;
  fullType: string;
  elementType?: string;
}

/**
 * 解析类型引用，将 struct:xxx 转换为结构名称
 */
function resolveTypeRef(
  typeRef: string | undefined,
  dataStructures: { id: string; name: string; fullName?: string }[]
): string | undefined {
  if (!typeRef) return undefined;
  
  // 如果是 struct:xxx 格式，解析出结构名称
  if (typeRef.startsWith("struct:")) {
    const structId = typeRef.slice("struct:".length);
    const structure = dataStructures.find(s => s.id === structId);
    if (structure) {
      return structure.name || structure.fullName || structId;
    }
    return undefined; // 找不到结构，返回 undefined
  }
  
  // 如果是 generic:xxx 格式，暂时返回 object
  if (typeRef.startsWith("generic:")) {
    return "object";
  }
  
  // 其他情况直接返回
  return typeRef;
}

function inferSourceTypeInfo(
  expression: string,
  allVariables: SelectableVariable[],
  dataStructures: { id: string; name: string; fullName?: string }[] = []
): SourceTypeInfo {
  const defaultResult: SourceTypeInfo = { baseType: "unknown", fullType: "unknown" };
  
  if (!expression) return defaultResult;
  
  // 从表达式中提取变量 key
  const match = expression.match(/\{\{(.+?)\}\}/);
  if (!match) return defaultResult;
  
  const key = match[1];
  const variable = allVariables.find(v => v.key === key);
  
  if (!variable) return defaultResult;
  
  const fullType = variable.type || "unknown";
  
  // 基础类型映射
  const typeMap: Record<string, SourceDataType> = {
    string: "string",
    number: "number",
    integer: "number",
    float: "number",
    double: "number",
    boolean: "boolean",
    object: "object",
    array: "array",
  };
  
  // 判断是否为数组类型
  const lowerType = fullType.toLowerCase();
  const isArrayType = 
    lowerType === "array" ||
    lowerType.startsWith("list<") ||
    lowerType.startsWith("arraylist<") ||
    lowerType.startsWith("set<") ||
    lowerType.startsWith("collection<") ||
    lowerType.startsWith("array<") ||
    fullType.endsWith("[]");
  
  let baseType: SourceDataType;
  if (isArrayType) {
    baseType = "array";
  } else {
    baseType = typeMap[lowerType] || "unknown";
  }
  
  // 提取元素类型
  let elementType: string | undefined;
  if (baseType === "array") {
    // 先尝试从 fullType 中提取（如 List<ContentVO>）
    elementType = extractElementType(fullType);
    
    // 如果没有提取到，尝试从 itemTypeRef 解析
    if (!elementType && variable.itemTypeRef) {
      elementType = resolveTypeRef(variable.itemTypeRef, dataStructures);
    }
    
    // 如果 elementType 仍然是 struct:xxx 格式，解析它
    if (elementType?.startsWith("struct:")) {
      elementType = resolveTypeRef(elementType, dataStructures);
    }
  }
  
  return { baseType, fullType, elementType };
}

// 计算结果类型
function computeResultType(
  mode: AssignmentMode,
  valueType?: AssignmentValueType,
  sourceType?: SourceDataType,
  operation?: TransformOperation,
  elementType?: string,
  sourceFullType?: string
): string {
  if (mode === "set") {
    return valueType || "unknown";
  }
  
  if (mode === "assign") {
    // 对于赋值模式，优先返回完整类型
    return sourceFullType || sourceType || "unknown";
  }
  
  if (mode === "transform" && operation && sourceType) {
    const ops = TRANSFORM_OPERATIONS[sourceType] || [];
    const op = ops.find(o => o.value === operation);
    if (op) {
      if (op.resultType === "element") {
        // 元素提取操作：返回数组的元素类型
        return elementType || "object";
      }
      if (op.resultType === "dynamic") {
        return "unknown"; // 动态类型（如 get_field）
      }
      return op.resultType;
    }
  }
  
  return "unknown";
}

// ==================== 子组件 ====================

// 可排序的赋值卡片
interface SortableAssignmentCardProps {
  assignment: AssignmentItem;
  renderAssignmentCard: (
    assignment: AssignmentItem,
    dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>
  ) => React.ReactNode;
}

const SortableAssignmentCard: React.FC<SortableAssignmentCardProps> = React.memo(
  ({ assignment, renderAssignmentCard }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: assignment.id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div ref={setNodeRef} style={style}>
        {renderAssignmentCard(assignment, {
          ...attributes,
          ...listeners,
        })}
      </div>
    );
  }
);

SortableAssignmentCard.displayName = "SortableAssignmentCard";

// ==================== 主组件 ====================

interface VariableAssignerNodeConfigProps {
  nodeId: string;
}

export const VariableAssignerNodeConfig: React.FC<VariableAssignerNodeConfigProps> = ({ nodeId }) => {
  const { styles } = useStyles();
  const form = Form.useFormInstance();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const updateNode = useFlowStore((state) => state.updateNode);
  const { currentProject } = useProjectStore();
  const flowId = useFlowStore((state) => state.flowId);
  const { options: enumOptions } = useEnumOptions(currentProject?.id);
  const { options: constantOptions } = useConstantOptions(
    currentProject?.id,
    flowId ?? undefined
  );

  // 获取当前节点的配置
  const currentNode = nodes.find((n) => n.id === nodeId);
  const config = useMemo<VariableAssignerConfig>(() => {
    return (currentNode?.data?.config as VariableAssignerConfig) || { assignments: [] };
  }, [currentNode?.data?.config]);
  
  const assignments = useMemo(() => config.assignments || [], [config.assignments]);

  // 获取可复用流程列表
  const reusableFlows = useFlowStore((state) => state.reusableFlows);
  const dataStructures = useFlowStore((state) => state.dataStructures);
  const constants = useFlowStore((state) => state.constants);

  // 构建可用变量
  const variableGroups = useMemo(
    () => buildAvailableVariables(
      nodeId,
      nodes as FlowNode[],
      edges,
      reusableFlows,
      dataStructures,
      constants
    ),
    [nodeId, nodes, edges, reusableFlows, dataStructures, constants]
  );

  // 当前节点变量组
  const currentNodeVariableGroup = useMemo(() => {
    const variablesByName = new Map<string, SelectableVariable>();
    assignments
      .filter((assignment) => assignment.variableName?.trim())
      .forEach((assignment) => {
        const name = assignment.variableName!.trim();
        const resultType = computeResultType(
          assignment.mode,
          assignment.valueType,
          assignment.sourceType,
          assignment.operation
        );
        variablesByName.set(name, {
          key: `var.${name}`,
          name,
          label: name,
          type: resultType,
          description: "当前节点定义的变量",
          group: "当前节点变量",
        });
      });
    const variables = Array.from(variablesByName.values());

    if (variables.length === 0) return null;
    return { name: "当前节点变量", variables };
  }, [assignments]);

  const variableGroupsWithCurrent = useMemo(() => {
    if (!currentNodeVariableGroup) return variableGroups;
    return [...variableGroups, currentNodeVariableGroup];
  }, [currentNodeVariableGroup, variableGroups]);

  // 扁平化变量列表
  const allSourceVariables = useMemo(
    () => variableGroupsWithCurrent.flatMap((g) => g.variables),
    [variableGroupsWithCurrent]
  );

  // 收集所有已定义的变量名
  const variableDefinitions = useMemo(() => {
    const definitions = new Map<string, { firstAssignmentId: string; resultType: string }>();
    for (const node of nodes) {
      const nodeData = node.data as FlowNodeData;
      if (nodeData.nodeType === NodeType.VARIABLE_ASSIGNER) {
        const nodeConfig = nodeData.config as VariableAssignerConfig;
        if (nodeConfig?.assignments) {
          for (const a of nodeConfig.assignments) {
            const name = a.variableName?.trim();
            if (name && !definitions.has(name)) {
              definitions.set(name, {
                firstAssignmentId: a.id,
                resultType: computeResultType(
                  a.mode,
                  a.valueType,
                  a.sourceType,
                  a.operation
                ),
              });
            }
          }
        }
      }
    }
    return definitions;
  }, [nodes]);

  const allDefinedVariables = useMemo(() => {
    return Array.from(variableDefinitions.keys()).sort();
  }, [variableDefinitions]);

  // 判断变量是否为新建
  const isNewVariable = useCallback(
    (variableName: string, assignmentId: string) => {
      const name = variableName?.trim();
      if (!name) return false;
      const definition = variableDefinitions.get(name);
      // 如果没有定义记录，或者首次定义就是当前赋值项，则是"新建"
      return !definition || definition.firstAssignmentId === assignmentId;
    },
    [variableDefinitions]
  );

  // 构建变量名下拉选项
  const buildVariableNameOptions = useCallback(
    (searchText: string, currentAssignmentId: string) => {
      const options: { value: string; label: React.ReactNode }[] = [];
      const filteredExisting = allDefinedVariables.filter((name) =>
        name.toLowerCase().includes(searchText.toLowerCase())
      );

      // 过滤掉由当前赋值项首次定义的变量（它们应该显示为"新建"而不是"覆盖"）
      const existingFromOthers = filteredExisting.filter((name) => {
        const def = variableDefinitions.get(name);
        return def && def.firstAssignmentId !== currentAssignmentId;
      });

      if (existingFromOthers.length > 0) {
        options.push({
          value: "__group_existing__",
          label: <span style={{ color: "#999", fontSize: 11, fontWeight: 500 }}>已有变量</span>,
        });
        for (const name of existingFromOthers) {
          options.push({
            value: name,
            label: (
              <Space size={4}>
                <TbVariable style={{ color: "#1890ff" }} />
                <span>{name}</span>
                <Tag color="blue" style={{ margin: 0, fontSize: 10, lineHeight: "16px" }}>覆盖</Tag>
              </Space>
            ),
          });
        }
      }

      const trimmedSearch = searchText.trim();
      // 判断搜索词是否为当前赋值项的"新建"变量
      const searchDef = variableDefinitions.get(trimmedSearch);
      const isNewForCurrent = !searchDef || searchDef.firstAssignmentId === currentAssignmentId;

      if (trimmedSearch && isNewForCurrent) {
        if (options.length > 0) {
          options.push({
            value: "__group_new__",
            label: <span style={{ color: "#999", fontSize: 11, fontWeight: 500 }}>创建新变量</span>,
          });
        }
        options.push({
          value: trimmedSearch,
          label: (
            <Space size={4}>
              <TbVariablePlus style={{ color: "#52c41a" }} />
              <span>{trimmedSearch}</span>
              <Tag color="green" style={{ margin: 0, fontSize: 10, lineHeight: "16px" }}>新建</Tag>
            </Space>
          ),
        });
      }

      return options;
    },
    [allDefinedVariables, variableDefinitions]
  );

  // 构建数据来源下拉选项
  const sourceVariableOptions = useMemo(() => {
    return variableGroupsWithCurrent.map((group) => ({
      label: (
        <div className={styles.variableGroupHeader}>
          {nodeTypeIcons[group.name] || <AiOutlineDatabase />}
          <span>{group.name}</span>
        </div>
      ),
      options: group.variables.map((v) => ({
        value: `{{${v.key}}}`,
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
        data: { searchText: `${v.group} ${v.name} ${v.label} ${v.key}`, type: v.type },
      })),
    }));
  }, [variableGroupsWithCurrent, styles]);

  // 数字类型变量选项
  const numericVariableOptions = useMemo(() => {
    const numericGroups = variableGroupsWithCurrent
      .map((group) => ({
        ...group,
        variables: group.variables.filter((v) =>
          ["number", "integer", "float", "double"].includes(v.type)
        ),
      }))
      .filter((group) => group.variables.length > 0);

    return numericGroups.map((group) => ({
      label: (
        <div className={styles.variableGroupHeader}>
          {nodeTypeIcons[group.name] || <AiOutlineDatabase />}
          <span>{group.name}</span>
        </div>
      ),
      options: group.variables.map((v) => ({
        value: `{{${v.key}}}`,
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
  }, [variableGroupsWithCurrent, styles]);

  // 添加新赋值项
  const handleAddAssignment = useCallback(() => {
    const newAssignment: AssignmentItem = {
      id: `assign-${Date.now()}`,
      variableName: "",
      mode: "set",
      valueType: "string",
      value: "",
    };

    const newAssignments = [...assignments, newAssignment];
    form.setFieldValue("assignments", newAssignments);
    updateNode(nodeId, {
      config: { ...config, assignments: newAssignments },
    });
  }, [assignments, config, form, nodeId, updateNode]);

  // 删除赋值项
  const handleDeleteAssignment = useCallback(
    (id: string) => {
      const newAssignments = assignments.filter((a) => a.id !== id);
      form.setFieldValue("assignments", newAssignments);
      updateNode(nodeId, {
        config: { ...config, assignments: newAssignments },
      });
    },
    [assignments, config, form, nodeId, updateNode]
  );

  // 更新赋值项
  const handleUpdateAssignment = useCallback(
    (id: string, updates: Partial<AssignmentItem>) => {
      const newAssignments = assignments.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      form.setFieldValue("assignments", newAssignments);
      updateNode(nodeId, {
        config: { ...config, assignments: newAssignments },
      });
    },
    [assignments, config, form, nodeId, updateNode]
  );

  // 更新操作参数
  const handleUpdateOperationParams = useCallback(
    (id: string, paramUpdates: Partial<OperationParams>) => {
      const assignment = assignments.find(a => a.id === id);
      if (!assignment) return;
      
      const newParams = { ...(assignment.operationParams || {}), ...paramUpdates };
      handleUpdateAssignment(id, { operationParams: newParams });
    },
    [assignments, handleUpdateAssignment]
  );

  // 拖拽排序
  const handleSortEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = assignments.findIndex((a) => a.id === active.id);
      const newIndex = assignments.findIndex((a) => a.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const newAssignments = arrayMove(assignments, oldIndex, newIndex);
      form.setFieldValue("assignments", newAssignments);
      updateNode(nodeId, {
        config: { ...config, assignments: newAssignments },
      });
    },
    [assignments, config, form, nodeId, updateNode]
  );

  const [searchTexts, setSearchTexts] = useState<Record<string, string>>({});
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // 渲染赋值项卡片
  const renderAssignmentCard = useCallback(
    (assignment: AssignmentItem, dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>) => {
      const searchText = searchTexts[assignment.id] ?? assignment.variableName;
      const isNew = isNewVariable(assignment.variableName, assignment.id);
      const currentSourceType = assignment.sourceType || "unknown";
      const availableOperations = TRANSFORM_OPERATIONS[currentSourceType] || [];
      const currentOperation = availableOperations.find(op => op.value === assignment.operation);
      const resultType = computeResultType(
        assignment.mode,
        assignment.valueType,
        assignment.sourceType,
        assignment.operation,
        assignment.elementType,
        assignment.sourceFullType
      );

      return (
        <div key={assignment.id} className={styles.assignmentCard}>
          {/* 卡片头部：变量名 + 删除按钮 */}
          <div className={styles.cardHeader}>
            <div className={styles.variableInfo}>
              <span className={styles.dragHandle} {...dragHandleProps}>
                <AiOutlineHolder />
              </span>
              <AutoComplete
                size="small"
                placeholder="输入变量名"
                value={assignment.variableName}
                onSearch={(text) => setSearchTexts((prev) => ({ ...prev, [assignment.id]: text }))}
                onChange={(value) => {
                  if (value?.startsWith("__group_")) return;
                  handleUpdateAssignment(assignment.id, { variableName: value });
                }}
                options={buildVariableNameOptions(searchText || "", assignment.id)}
                allowClear
                style={{ width: 150 }}
              />
              {assignment.variableName && (
                <Tag
                  color={isNew ? "green" : "blue"}
                  style={{ margin: 0, fontSize: 10, lineHeight: "18px", padding: "0 4px" }}
                >
                  {isNew ? "新建" : "覆盖"}
                </Tag>
              )}
            </div>
            <Space>
              {resultType !== "unknown" && (
                <Tooltip title="结果类型">
                  <Tag color="default" style={{ margin: 0 }}>
                    → {resultType}
                  </Tag>
                </Tooltip>
              )}
              <Button
                type="text"
                size="small"
                danger
                icon={<AiOutlineDelete />}
                onClick={() => handleDeleteAssignment(assignment.id)}
              />
            </Space>
          </div>

          <div className={styles.cardContent}>
            {/* 操作模式选择 */}
            <div className={styles.formRow}>
              <span className={styles.formLabel}>模式</span>
              <Radio.Group
                value={assignment.mode}
                onChange={(e) => {
                  const newMode = e.target.value as AssignmentMode;
                  const updates: Partial<AssignmentItem> = { mode: newMode };
                  
                  // 切换模式时重置相关字段
                  if (newMode === "set") {
                    updates.valueType = assignment.valueType || "string";
                    updates.value = "";
                    updates.sourceExpression = undefined;
                    updates.sourceType = undefined;
                    updates.operation = undefined;
                    updates.operationParams = undefined;
                  } else if (newMode === "assign") {
                    updates.sourceExpression = assignment.sourceExpression || "";
                    updates.value = undefined;
                    updates.valueType = undefined;
                    updates.operation = undefined;
                    updates.operationParams = undefined;
                  } else if (newMode === "transform") {
                    updates.sourceExpression = assignment.sourceExpression || "";
                    updates.sourceType = assignment.sourceType || "unknown";
                    updates.value = undefined;
                    updates.valueType = undefined;
                  }
                  
                  handleUpdateAssignment(assignment.id, updates);
                }}
                size="small"
                optionType="button"
                buttonStyle="solid"
              >
                {MODE_OPTIONS.map((opt) => (
                  <Tooltip key={opt.value} title={opt.description}>
                    <Radio.Button value={opt.value}>{opt.label}</Radio.Button>
                  </Tooltip>
                ))}
              </Radio.Group>
            </div>

            {/* 模式 1: 设置固定值 */}
            {assignment.mode === "set" && (
              <>
                <div className={styles.formRow}>
                  <span className={styles.formLabel}>值类型</span>
                  <Select
                    size="small"
                    value={assignment.valueType || "string"}
                    onChange={(value) => handleUpdateAssignment(assignment.id, { 
                      valueType: value,
                      value: value === "boolean" ? false : (value === "number" ? 0 : ""),
                    })}
                    style={{ width: 120 }}
                    options={VALUE_TYPES.map((t) => ({
                      value: t.value,
                      label: <Tag color={t.color} style={{ margin: 0 }}>{t.label}</Tag>,
                    }))}
                  />
                </div>
                <div className={styles.formRow}>
                  <span className={styles.formLabel}>值</span>
                  {assignment.valueType === "number" ? (
                    <div className={styles.valueInputRow}>
                      {isConstantRef(String(assignment.value ?? "")) ? (
                        <div className={styles.constantRefTag}>
                          <span className={styles.constantRefIcon}>📦</span>
                          <span className={styles.constantRefName}>
                            {parseConstantRef(String(assignment.value))}
                          </span>
                          <Button
                            type="text"
                            size="small"
                            icon={<AiOutlineDelete />}
                            className={styles.constantRefClear}
                            onClick={() => handleUpdateAssignment(assignment.id, { value: undefined })}
                          />
                        </div>
                      ) : (
                        <InputNumber
                          value={assignment.value as number}
                          onChange={(value) => handleUpdateAssignment(assignment.id, { value: value ?? 0 })}
                          className={styles.formField}
                          placeholder="输入数值"
                        />
                      )}
                      <ValuePicker
                        enumOptions={enumOptions}
                        constantOptions={constantOptions}
                        onSelect={(value) => {
                          if (isConstantRef(value)) {
                            handleUpdateAssignment(assignment.id, { value });
                            return;
                          }
                          const parsed = Number(value);
                          if (!Number.isNaN(parsed)) {
                            handleUpdateAssignment(assignment.id, { value: parsed });
                          }
                        }}
                        className={styles.enumPicker}
                        placeholder="选择值"
                      />
                    </div>
                  ) : assignment.valueType === "boolean" ? (
                    <Select
                      value={assignment.value as boolean}
                      onChange={(value) => handleUpdateAssignment(assignment.id, { value })}
                      className={styles.formField}
                      options={[
                        { value: true, label: "true" },
                        { value: false, label: "false" },
                      ]}
                    />
                  ) : assignment.valueType === "object" || assignment.valueType === "array" ? (
                    <Input.TextArea
                      value={
                        typeof assignment.value === "string"
                          ? assignment.value
                          : JSON.stringify(assignment.value, null, 2)
                      }
                      onChange={(e) => handleUpdateAssignment(assignment.id, { value: e.target.value })}
                      className={`${styles.formField} ${styles.valueInput}`}
                      placeholder={
                        assignment.valueType === "object"
                          ? '输入 JSON 对象，如 {"key": "value"}'
                          : "输入 JSON 数组，如 [1, 2, 3]"
                      }
                      autoSize={{ minRows: 2, maxRows: 6 }}
                    />
                  ) : (
                    <VariableInput
                      value={typeof assignment.value === "string" ? assignment.value : ""}
                      onChange={(value) => handleUpdateAssignment(assignment.id, { value })}
                      placeholder="输入字符串值，支持 {{}} 变量"
                      className={`${styles.formField} ${styles.valueInput}`}
                      currentNodeId={nodeId}
                      multiline
                      showEnumPicker
                    />
                  )}
                </div>
              </>
            )}

            {/* 模式 2: 变量赋值 */}
            {assignment.mode === "assign" && (
              <div className={styles.formRow}>
                <span className={styles.formLabel}>数据来源</span>
                <Select
                  value={assignment.sourceExpression || undefined}
                  onChange={(value) => {
                    const typeInfo = inferSourceTypeInfo(value, allSourceVariables, dataStructures);
                    handleUpdateAssignment(assignment.id, {
                      sourceExpression: value,
                      sourceType: typeInfo.baseType,
                      sourceFullType: typeInfo.fullType,
                      elementType: typeInfo.elementType,
                    });
                  }}
                  className={`${styles.formField} ${styles.sourceSelector}`}
                  placeholder="选择变量"
                  showSearch={{
                    filterOption: (input, option) => {
                      const optionData = option as { data?: { searchText?: string } };
                      const searchText = optionData?.data?.searchText || "";
                      return searchText.toLowerCase().includes(input.toLowerCase());
                    },
                  }}
                  allowClear
                  popupMatchSelectWidth={false}
                  options={sourceVariableOptions}
                  labelRender={(props) => {
                    const v = allSourceVariables.find((item) => `{{${item.key}}}` === props.value);
                    if (!v) return props.value;
                    return (
                      <div className={styles.selectedVariableTag}>
                        <span className={styles.tagIcon}>
                          {nodeTypeIcons[v.group] || <AiOutlineDatabase />}
                        </span>
                        <span className={styles.tagPath}>{v.group}</span>
                        <span>/</span>
                        <span className={styles.tagVar}>{v.name}</span>
                        <Tag color="default" style={{ marginLeft: 4, fontSize: 10 }}>{v.type}</Tag>
                      </div>
                    );
                  }}
                />
              </div>
            )}

            {/* 模式 3: 变量运算 */}
            {assignment.mode === "transform" && (
              <>
                <div className={styles.formRow}>
                  <span className={styles.formLabel}>数据来源</span>
                  <Select
                    value={assignment.sourceExpression || undefined}
                    onChange={(value) => {
                      const typeInfo = inferSourceTypeInfo(value, allSourceVariables, dataStructures);
                      handleUpdateAssignment(assignment.id, {
                        sourceExpression: value,
                        sourceType: typeInfo.baseType,
                        sourceFullType: typeInfo.fullType,
                        elementType: typeInfo.elementType,
                        operation: undefined, // 切换源时重置操作
                        operationParams: undefined,
                      });
                    }}
                    className={`${styles.formField} ${styles.sourceSelector}`}
                    placeholder="选择要操作的变量"
                    showSearch={{
                      filterOption: (input, option) => {
                        const optionData = option as { data?: { searchText?: string } };
                        const searchText = optionData?.data?.searchText || "";
                        return searchText.toLowerCase().includes(input.toLowerCase());
                      },
                    }}
                    allowClear
                    popupMatchSelectWidth={false}
                    options={sourceVariableOptions}
                    labelRender={(props) => {
                      const v = allSourceVariables.find((item) => `{{${item.key}}}` === props.value);
                      if (!v) return props.value;
                      return (
                        <div className={styles.selectedVariableTag}>
                          <span className={styles.tagIcon}>
                            {nodeTypeIcons[v.group] || <AiOutlineDatabase />}
                          </span>
                          <span className={styles.tagPath}>{v.group}</span>
                          <span>/</span>
                          <span className={styles.tagVar}>{v.name}</span>
                          <Tag color="default" style={{ marginLeft: 4, fontSize: 10 }}>{v.type}</Tag>
                        </div>
                      );
                    }}
                  />
                </div>

                {/* 源类型指示 */}
                {assignment.sourceExpression && (
                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>源类型</span>
                    <Tag color={
                      currentSourceType === "array" ? "orange" :
                      currentSourceType === "string" ? "green" :
                      currentSourceType === "number" ? "blue" :
                      currentSourceType === "object" ? "purple" :
                      currentSourceType === "boolean" ? "cyan" : "default"
                    }>
                      {currentSourceType}
                    </Tag>
                    {currentSourceType === "unknown" && (
                      <Select
                        size="small"
                        value={assignment.sourceType}
                        onChange={(value) => handleUpdateAssignment(assignment.id, { 
                          sourceType: value,
                          operation: undefined,
                          operationParams: undefined,
                        })}
                        placeholder="手动指定类型"
                        style={{ width: 100, marginLeft: 8 }}
                        options={[
                          { value: "string", label: "字符串" },
                          { value: "number", label: "数字" },
                          { value: "boolean", label: "布尔" },
                          { value: "object", label: "对象" },
                          { value: "array", label: "数组" },
                        ]}
                      />
                    )}
                  </div>
                )}

                {/* 操作选择 */}
                {assignment.sourceExpression && availableOperations.length > 0 && (
                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>操作</span>
                    <Select
                      value={assignment.operation}
                      onChange={(value) => handleUpdateAssignment(assignment.id, { 
                        operation: value,
                        operationParams: undefined,
                      })}
                      className={styles.formField}
                      placeholder="选择操作"
                      options={availableOperations.map((op) => ({
                        value: op.value,
                        label: (
                          <span>
                            <Tag color={OPERATION_COLORS[op.value]} style={{ marginRight: 8 }}>
                              {op.label}
                            </Tag>
                            <span style={{ color: "#999", fontSize: 11 }}>{op.description}</span>
                          </span>
                        ),
                      }))}
                    />
                  </div>
                )}

                {/* 操作参数 */}
                {currentOperation?.params?.includes("arrayIndex") && (
                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>索引</span>
                    <InputNumber
                      value={assignment.operationParams?.arrayIndex}
                      onChange={(value) => handleUpdateOperationParams(assignment.id, { arrayIndex: value ?? 0 })}
                      className={styles.formField}
                      placeholder="输入索引（从0开始）"
                      min={0}
                    />
                  </div>
                )}

                {currentOperation?.params?.includes("sliceStart") && (
                  <>
                    <div className={styles.formRow}>
                      <span className={styles.formLabel}>起始索引</span>
                      <InputNumber
                        value={assignment.operationParams?.sliceStart}
                        onChange={(value) => handleUpdateOperationParams(assignment.id, { sliceStart: value ?? 0 })}
                        className={styles.formField}
                        placeholder="起始位置（从0开始）"
                        min={0}
                      />
                    </div>
                    <div className={styles.formRow}>
                      <span className={styles.formLabel}>结束索引</span>
                      <InputNumber
                        value={assignment.operationParams?.sliceEnd}
                        onChange={(value) => handleUpdateOperationParams(assignment.id, { sliceEnd: value ?? undefined })}
                        className={styles.formField}
                        placeholder="结束位置（不填则到末尾）"
                        min={0}
                      />
                    </div>
                  </>
                )}

                {currentOperation?.params?.includes("joinSeparator") && (
                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>分隔符</span>
                    <Input
                      value={assignment.operationParams?.joinSeparator}
                      onChange={(e) => handleUpdateOperationParams(assignment.id, { joinSeparator: e.target.value })}
                      className={styles.formField}
                      placeholder="默认为逗号"
                    />
                  </div>
                )}

                {currentOperation?.params?.includes("arithmeticValue") && (
                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>运算数</span>
                    <div className={styles.arithmeticInputGroup}>
                      <Button
                        type={assignment.operationParams?.arithmeticUseVariable ? "primary" : "default"}
                        size="small"
                        icon={<TbVariable />}
                        title={assignment.operationParams?.arithmeticUseVariable ? "切换为固定值" : "切换为变量"}
                        onClick={() => handleUpdateOperationParams(assignment.id, {
                          arithmeticUseVariable: !assignment.operationParams?.arithmeticUseVariable,
                        })}
                      />
                      {assignment.operationParams?.arithmeticUseVariable ? (
                        <Select
                          value={assignment.operationParams?.arithmeticExpression || undefined}
                          onChange={(value) => handleUpdateOperationParams(assignment.id, { arithmeticExpression: value })}
                          className={styles.formField}
                          placeholder="选择数字型变量"
                          showSearch={{
                            filterOption: (input, option) => {
                              const optionData = option as { data?: { searchText?: string } };
                              const searchText = optionData?.data?.searchText || "";
                              return searchText.toLowerCase().includes(input.toLowerCase());
                            },
                          }}
                          allowClear
                          popupMatchSelectWidth={false}
                          options={numericVariableOptions}
                          labelRender={(props) => {
                            const v = allSourceVariables.find((item) => `{{${item.key}}}` === props.value);
                            if (!v) return props.value;
                            return (
                              <div className={styles.selectedVariableTag}>
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
                      ) : (
                        <InputNumber
                          value={assignment.operationParams?.arithmeticValue}
                          onChange={(value) => handleUpdateOperationParams(assignment.id, { arithmeticValue: value ?? 0 })}
                          className={styles.formField}
                          placeholder="输入数值"
                        />
                      )}
                    </div>
                  </div>
                )}

                {currentOperation?.params?.includes("regexPattern") && (
                  <>
                    <div className={styles.formRow}>
                      <span className={styles.formLabel}>正则</span>
                      <div className={styles.regexRow}>
                        <Input
                          value={assignment.operationParams?.regexPattern}
                          onChange={(e) => handleUpdateOperationParams(assignment.id, { regexPattern: e.target.value })}
                          className={styles.regexField}
                          placeholder="正则表达式"
                        />
                        <Input
                          value={assignment.operationParams?.regexFlags}
                          onChange={(e) => handleUpdateOperationParams(assignment.id, { regexFlags: e.target.value })}
                          className={styles.regexFlags}
                          placeholder="flags"
                        />
                      </div>
                    </div>
                    {currentOperation?.params?.includes("regexReplace") && (
                      <div className={styles.formRow}>
                        <span className={styles.formLabel}>替换为</span>
                        <Input
                          value={assignment.operationParams?.regexReplace}
                          onChange={(e) => handleUpdateOperationParams(assignment.id, { regexReplace: e.target.value })}
                          className={styles.formField}
                          placeholder="替换文本"
                        />
                      </div>
                    )}
                    {currentOperation?.params?.includes("regexGroup") && (
                      <div className={styles.formRow}>
                        <span className={styles.formLabel}>分组</span>
                        <InputNumber
                          value={assignment.operationParams?.regexGroup}
                          onChange={(value) => handleUpdateOperationParams(assignment.id, { regexGroup: value ?? 0 })}
                          className={styles.formField}
                          placeholder="分组索引"
                          min={0}
                        />
                      </div>
                    )}
                  </>
                )}

                {currentOperation?.params?.includes("fieldPath") && (
                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>字段路径</span>
                    <Input
                      value={assignment.operationParams?.fieldPath}
                      onChange={(e) => handleUpdateOperationParams(assignment.id, { fieldPath: e.target.value })}
                      className={styles.formField}
                      placeholder="如: user.name"
                    />
                  </div>
                )}

                {currentOperation?.params?.includes("appendValue") && (
                  <div className={styles.formRow}>
                    <span className={styles.formLabel}>追加值</span>
                    <VariableInput
                      value={assignment.operationParams?.appendValue || ""}
                      onChange={(value) => handleUpdateOperationParams(assignment.id, { appendValue: value })}
                      placeholder="输入值或选择变量"
                      className={styles.formField}
                      currentNodeId={nodeId}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    },
    [
      styles,
      searchTexts,
      isNewVariable,
      handleUpdateAssignment,
      handleUpdateOperationParams,
      handleDeleteAssignment,
      buildVariableNameOptions,
      sourceVariableOptions,
      allSourceVariables,
      numericVariableOptions,
      enumOptions,
      constantOptions,
      nodeId,
      dataStructures,
    ]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>变量赋值</span>
        <Button
          type="primary"
          size="small"
          icon={<AiOutlinePlus />}
          onClick={handleAddAssignment}
        >
          添加变量
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <TbVariablePlus className={styles.emptyIcon} />
          <div className={styles.emptyText}>暂无变量赋值配置</div>
          <Button
            type="dashed"
            icon={<AiOutlinePlus />}
            onClick={handleAddAssignment}
          >
            添加第一个变量
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSortEnd}
        >
          <SortableContext
            items={assignments.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.assignmentList}>
              {assignments.map((assignment) => (
                <SortableAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  renderAssignmentCard={renderAssignmentCard}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default VariableAssignerNodeConfig;
