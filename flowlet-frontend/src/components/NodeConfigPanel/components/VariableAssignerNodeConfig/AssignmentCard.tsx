/**
 * 赋值卡片组件
 * 负责渲染单个赋值项的表单
 */

import React from "react";
import {
  Button,
  Select,
  Input,
  InputNumber,
  Tag,
  Space,
  AutoComplete,
  Radio,
  Tooltip,
} from "antd";
import type { SelectProps } from "antd";
import {
  AiOutlineDelete,
  AiOutlineDatabase,
  AiOutlineHolder,
} from "react-icons/ai";
import { TbVariable } from "react-icons/tb";
import {
  AssignmentItem,
  AssignmentMode,
  OperationParams,
  SelectableVariable,
} from "@/types";
import type { ConstantOptions } from "@/hooks/useConstantOptions";
import { nodeTypeIcons } from "@/constants/nodeIcons";
import { ValuePicker } from "@/components/ValuePicker/ValuePicker";
import VariableInput from "@/components/VariableInput/VariableInput";
import { isConstantRef, parseConstantRef } from "@/hooks/useConstantOptions";
import { VALUE_TYPES, MODE_OPTIONS, TRANSFORM_OPERATIONS, OPERATION_COLORS } from "./constants";
import { computeResultType, inferSourceTypeInfo, SourceTypeInfo } from "./utils";
import { useStyles } from "../VariableAssignerNodeConfig.style";

/** Enum options 类型（来自 useEnumOptions） */
type EnumOptions = NonNullable<SelectProps["options"]>;

interface AssignmentCardProps {
  assignment: AssignmentItem;
  nodeId: string;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  isNewVariable: boolean;
  onSearchTextChange: (text: string) => void;
  variableNameOptions: { value: string; label: React.ReactNode }[];
  sourceVariableOptions: {
    label: React.ReactNode;
    options: { value: string; label: React.ReactNode; data?: { searchText?: string; type?: string } }[];
  }[];
  numericVariableOptions: {
    label: React.ReactNode;
    options: { value: string; label: React.ReactNode; data?: { searchText?: string } }[];
  }[];
  allSourceVariables: SelectableVariable[];
  dataStructures: { id: string; name: string; fullName?: string }[];
  enumOptions: EnumOptions;
  constantOptions: ConstantOptions;
  onUpdate: (id: string, updates: Partial<AssignmentItem>) => void;
  onUpdateParams: (id: string, params: Partial<OperationParams>) => void;
  onDelete: (id: string) => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  nodeId,
  dragHandleProps,
  isNewVariable,
  onSearchTextChange,
  variableNameOptions,
  sourceVariableOptions,
  numericVariableOptions,
  allSourceVariables,
  dataStructures,
  enumOptions,
  constantOptions,
  onUpdate,
  onUpdateParams,
  onDelete,
}) => {
  const { styles } = useStyles();
  
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

  // 处理模式切换
  const handleModeChange = (newMode: AssignmentMode) => {
    const updates: Partial<AssignmentItem> = { mode: newMode };
    
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
    
    onUpdate(assignment.id, updates);
  };

  // 处理数据源变更
  const handleSourceChange = (value: string, resetOperation = false) => {
    const typeInfo: SourceTypeInfo = inferSourceTypeInfo(value, allSourceVariables, dataStructures);
    const updates: Partial<AssignmentItem> = {
      sourceExpression: value,
      sourceType: typeInfo.baseType,
      sourceFullType: typeInfo.fullType,
      elementType: typeInfo.elementType,
    };
    if (resetOperation) {
      updates.operation = undefined;
      updates.operationParams = undefined;
    }
    onUpdate(assignment.id, updates);
  };

  // 渲染变量选择器的标签
  const renderVariableLabel = (value: string | number) => {
    const v = allSourceVariables.find((item) => `{{${item.key}}}` === value);
    if (!v) return value;
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
  };

  return (
    <div className={styles.assignmentCard}>
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
            onSearch={onSearchTextChange}
            onChange={(value) => {
              if (value?.startsWith("__group_")) return;
              onUpdate(assignment.id, { variableName: value });
            }}
            options={variableNameOptions}
            allowClear
            style={{ width: 150 }}
          />
          {assignment.variableName && (
            <Tag
              color={isNewVariable ? "green" : "blue"}
              style={{ margin: 0, fontSize: 10, lineHeight: "18px", padding: "0 4px" }}
            >
              {isNewVariable ? "新建" : "覆盖"}
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
            onClick={() => onDelete(assignment.id)}
          />
        </Space>
      </div>

      <div className={styles.cardContent}>
        {/* 操作模式选择 */}
        <div className={styles.formRow}>
          <span className={styles.formLabel}>模式</span>
          <Radio.Group
            value={assignment.mode}
            onChange={(e) => handleModeChange(e.target.value as AssignmentMode)}
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
          <SetModeFields
            assignment={assignment}
            nodeId={nodeId}
            styles={styles}
            enumOptions={enumOptions}
            constantOptions={constantOptions}
            onUpdate={onUpdate}
          />
        )}

        {/* 模式 2: 变量赋值 */}
        {assignment.mode === "assign" && (
          <div className={styles.formRow}>
            <span className={styles.formLabel}>数据来源</span>
            <Select
              value={assignment.sourceExpression || undefined}
              onChange={(value) => handleSourceChange(value)}
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
              labelRender={(props) => renderVariableLabel(props.value as string)}
            />
          </div>
        )}

        {/* 模式 3: 变量运算 */}
        {assignment.mode === "transform" && (
          <TransformModeFields
            assignment={assignment}
            nodeId={nodeId}
            styles={styles}
            currentSourceType={currentSourceType}
            availableOperations={availableOperations}
            currentOperation={currentOperation}
            sourceVariableOptions={sourceVariableOptions}
            numericVariableOptions={numericVariableOptions}
            onSourceChange={(value) => handleSourceChange(value, true)}
            onUpdate={onUpdate}
            onUpdateParams={onUpdateParams}
            renderVariableLabel={renderVariableLabel}
          />
        )}
      </div>
    </div>
  );
};

// ============= 子组件：设置固定值模式 =============
interface SetModeFieldsProps {
  assignment: AssignmentItem;
  nodeId: string;
  styles: ReturnType<typeof useStyles>["styles"];
  enumOptions: EnumOptions;
  constantOptions: ConstantOptions;
  onUpdate: (id: string, updates: Partial<AssignmentItem>) => void;
}

const SetModeFields: React.FC<SetModeFieldsProps> = ({
  assignment,
  nodeId,
  styles,
  enumOptions,
  constantOptions,
  onUpdate,
}) => {
  return (
    <>
      <div className={styles.formRow}>
        <span className={styles.formLabel}>值类型</span>
        <Select
          size="small"
          value={assignment.valueType || "string"}
          onChange={(value) => onUpdate(assignment.id, { 
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
                  onClick={() => onUpdate(assignment.id, { value: undefined })}
                />
              </div>
            ) : (
              <InputNumber
                value={assignment.value as number}
                onChange={(value) => onUpdate(assignment.id, { value: value ?? 0 })}
                className={styles.formField}
                placeholder="输入数值"
              />
            )}
            <ValuePicker
              enumOptions={enumOptions}
              constantOptions={constantOptions}
              onSelect={(value) => {
                if (isConstantRef(value)) {
                  onUpdate(assignment.id, { value });
                  return;
                }
                const parsed = Number(value);
                if (!Number.isNaN(parsed)) {
                  onUpdate(assignment.id, { value: parsed });
                }
              }}
              className={styles.enumPicker}
              placeholder="选择值"
            />
          </div>
        ) : assignment.valueType === "boolean" ? (
          <Select
            value={assignment.value as boolean}
            onChange={(value) => onUpdate(assignment.id, { value })}
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
            onChange={(e) => onUpdate(assignment.id, { value: e.target.value })}
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
            onChange={(value) => onUpdate(assignment.id, { value })}
            placeholder="输入字符串值，支持 {{}} 变量"
            className={`${styles.formField} ${styles.valueInput}`}
            currentNodeId={nodeId}
            multiline
            showEnumPicker
          />
        )}
      </div>
    </>
  );
};

// ============= 子组件：变量运算模式 =============
interface TransformModeFieldsProps {
  assignment: AssignmentItem;
  nodeId: string;
  styles: ReturnType<typeof useStyles>["styles"];
  currentSourceType: string;
  availableOperations: { value: string; label: string; description: string; params?: string[] }[];
  currentOperation?: { value: string; label: string; description: string; params?: string[] };
  sourceVariableOptions: {
    label: React.ReactNode;
    options: { value: string; label: React.ReactNode; data?: { searchText?: string } }[];
  }[];
  numericVariableOptions: {
    label: React.ReactNode;
    options: { value: string; label: React.ReactNode; data?: { searchText?: string } }[];
  }[];
  onSourceChange: (value: string) => void;
  onUpdate: (id: string, updates: Partial<AssignmentItem>) => void;
  onUpdateParams: (id: string, params: Partial<OperationParams>) => void;
  renderVariableLabel: (value: string | number) => React.ReactNode;
}

const TransformModeFields: React.FC<TransformModeFieldsProps> = ({
  assignment,
  nodeId,
  styles,
  currentSourceType,
  availableOperations,
  currentOperation,
  sourceVariableOptions,
  numericVariableOptions,
  onSourceChange,
  onUpdate,
  onUpdateParams,
  renderVariableLabel,
}) => {
  return (
    <>
      <div className={styles.formRow}>
        <span className={styles.formLabel}>数据来源</span>
        <Select
          value={assignment.sourceExpression || undefined}
          onChange={onSourceChange}
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
          labelRender={(props) => renderVariableLabel(props.value as string)}
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
              onChange={(value) => onUpdate(assignment.id, { 
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
            onChange={(value) => onUpdate(assignment.id, { 
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
      <OperationParamsFields
        assignment={assignment}
        nodeId={nodeId}
        styles={styles}
        currentOperation={currentOperation}
        numericVariableOptions={numericVariableOptions}
        onUpdateParams={onUpdateParams}
        renderVariableLabel={renderVariableLabel}
      />
    </>
  );
};

// ============= 子组件：操作参数表单 =============
interface OperationParamsFieldsProps {
  assignment: AssignmentItem;
  nodeId: string;
  styles: ReturnType<typeof useStyles>["styles"];
  currentOperation?: { value: string; label: string; description: string; params?: string[] };
  numericVariableOptions: {
    label: React.ReactNode;
    options: { value: string; label: React.ReactNode; data?: { searchText?: string } }[];
  }[];
  onUpdateParams: (id: string, params: Partial<OperationParams>) => void;
  renderVariableLabel: (value: string | number) => React.ReactNode;
}

const OperationParamsFields: React.FC<OperationParamsFieldsProps> = ({
  assignment,
  nodeId,
  styles,
  currentOperation,
  numericVariableOptions,
  onUpdateParams,
  renderVariableLabel,
}) => {
  if (!currentOperation?.params) return null;

  return (
    <>
      {currentOperation.params.includes("arrayIndex") && (
        <div className={styles.formRow}>
          <span className={styles.formLabel}>索引</span>
          <InputNumber
            value={assignment.operationParams?.arrayIndex}
            onChange={(value) => onUpdateParams(assignment.id, { arrayIndex: value ?? 0 })}
            className={styles.formField}
            placeholder="输入索引（从0开始）"
            min={0}
          />
        </div>
      )}

      {currentOperation.params.includes("sliceStart") && (
        <>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>起始索引</span>
            <InputNumber
              value={assignment.operationParams?.sliceStart}
              onChange={(value) => onUpdateParams(assignment.id, { sliceStart: value ?? 0 })}
              className={styles.formField}
              placeholder="起始位置（从0开始）"
              min={0}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>结束索引</span>
            <InputNumber
              value={assignment.operationParams?.sliceEnd}
              onChange={(value) => onUpdateParams(assignment.id, { sliceEnd: value ?? undefined })}
              className={styles.formField}
              placeholder="结束位置（不填则到末尾）"
              min={0}
            />
          </div>
        </>
      )}

      {currentOperation.params.includes("joinSeparator") && (
        <div className={styles.formRow}>
          <span className={styles.formLabel}>分隔符</span>
          <Input
            value={assignment.operationParams?.joinSeparator}
            onChange={(e) => onUpdateParams(assignment.id, { joinSeparator: e.target.value })}
            className={styles.formField}
            placeholder="默认为逗号"
          />
        </div>
      )}

      {currentOperation.params.includes("arithmeticValue") && (
        <div className={styles.formRow}>
          <span className={styles.formLabel}>运算数</span>
          <div className={styles.arithmeticInputGroup}>
            <Button
              type={assignment.operationParams?.arithmeticUseVariable ? "primary" : "default"}
              size="small"
              icon={<TbVariable />}
              title={assignment.operationParams?.arithmeticUseVariable ? "切换为固定值" : "切换为变量"}
              onClick={() => onUpdateParams(assignment.id, {
                arithmeticUseVariable: !assignment.operationParams?.arithmeticUseVariable,
              })}
            />
            {assignment.operationParams?.arithmeticUseVariable ? (
              <Select
                value={assignment.operationParams?.arithmeticExpression || undefined}
                onChange={(value) => onUpdateParams(assignment.id, { arithmeticExpression: value })}
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
                labelRender={(props) => renderVariableLabel(props.value as string)}
              />
            ) : (
              <InputNumber
                value={assignment.operationParams?.arithmeticValue}
                onChange={(value) => onUpdateParams(assignment.id, { arithmeticValue: value ?? 0 })}
                className={styles.formField}
                placeholder="输入数值"
              />
            )}
          </div>
        </div>
      )}

      {currentOperation.params.includes("regexPattern") && (
        <>
          <div className={styles.formRow}>
            <span className={styles.formLabel}>正则</span>
            <div className={styles.regexRow}>
              <Input
                value={assignment.operationParams?.regexPattern}
                onChange={(e) => onUpdateParams(assignment.id, { regexPattern: e.target.value })}
                className={styles.regexField}
                placeholder="正则表达式"
              />
              <Input
                value={assignment.operationParams?.regexFlags}
                onChange={(e) => onUpdateParams(assignment.id, { regexFlags: e.target.value })}
                className={styles.regexFlags}
                placeholder="flags"
              />
            </div>
          </div>
          {currentOperation.params.includes("regexReplace") && (
            <div className={styles.formRow}>
              <span className={styles.formLabel}>替换为</span>
              <Input
                value={assignment.operationParams?.regexReplace}
                onChange={(e) => onUpdateParams(assignment.id, { regexReplace: e.target.value })}
                className={styles.formField}
                placeholder="替换文本"
              />
            </div>
          )}
          {currentOperation.params.includes("regexGroup") && (
            <div className={styles.formRow}>
              <span className={styles.formLabel}>分组</span>
              <InputNumber
                value={assignment.operationParams?.regexGroup}
                onChange={(value) => onUpdateParams(assignment.id, { regexGroup: value ?? 0 })}
                className={styles.formField}
                placeholder="分组索引"
                min={0}
              />
            </div>
          )}
        </>
      )}

      {currentOperation.params.includes("fieldPath") && (
        <div className={styles.formRow}>
          <span className={styles.formLabel}>字段路径</span>
          <Input
            value={assignment.operationParams?.fieldPath}
            onChange={(e) => onUpdateParams(assignment.id, { fieldPath: e.target.value })}
            className={styles.formField}
            placeholder="如: user.name"
          />
        </div>
      )}

      {currentOperation.params.includes("appendValue") && (
        <div className={styles.formRow}>
          <span className={styles.formLabel}>追加值</span>
          <VariableInput
            value={assignment.operationParams?.appendValue || ""}
            onChange={(value) => onUpdateParams(assignment.id, { appendValue: value })}
            placeholder="输入值或选择变量"
            className={styles.formField}
            currentNodeId={nodeId}
          />
        </div>
      )}
    </>
  );
};

export default AssignmentCard;
