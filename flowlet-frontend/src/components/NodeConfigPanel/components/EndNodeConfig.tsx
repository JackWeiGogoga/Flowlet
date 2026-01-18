import React, { useMemo, useCallback } from "react";
import { Button, Divider, Tooltip, Tag } from "antd";
import { createStyles } from "antd-style";
import {
  AiOutlinePlus,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineHolder,
} from "react-icons/ai";
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
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OutputVariableConfig } from "@/types";
import { useFlowStore, FlowNode } from "@/store/flowStore";

const useStyles = createStyles(({ css }) => ({
  hint: css`
    font-size: 12px;
    color: #666;
    margin-bottom: 12px;
    line-height: 1.5;
  `,

  variableList: css`
    margin-bottom: 12px;
  `,

  variableItem: css`
    display: flex;
    align-items: flex-start;
    padding: 10px 12px;
    background: #fafafa;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    margin-bottom: 8px;
    transition: all 0.2s;

    &:hover {
      border-color: #1890ff;
      background: #f0f7ff;
    }
  `,

  dragHandle: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 8px;
    cursor: grab;
    color: #999;
    flex-shrink: 0;

    &:hover {
      color: #1890ff;
    }

    &:active {
      cursor: grabbing;
    }
  `,

  variableContent: css`
    flex: 1;
    min-width: 0;
  `,

  variableHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,

  variableName: css`
    font-weight: 500;
    color: #333;
    font-size: 13px;
  `,

  variableType: css`
    font-size: 11px;
    margin: 0;
  `,

  variableLabel: css`
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  `,

  variableExpression: css`
    font-size: 11px;
    color: #999;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "Monaco", "Menlo", monospace;
      font-size: 11px;
      color: #666;
    }
  `,

  variableActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    opacity: 0;
    transition: opacity 0.2s;
  `,

  variableItemHover: css`
    &:hover .variable-actions-visible {
      opacity: 1;
    }
  `,

  emptyVariables: css`
    text-align: center;
    padding: 24px;
    color: #999;
    background: #fafafa;
    border-radius: 6px;
    border: 1px dashed #d9d9d9;
    margin-bottom: 12px;

    p {
      margin: 0;
    }

    p:first-child {
      margin-bottom: 4px;
      color: #666;
    }
  `,

  addBtn: css`
    margin-top: 8px;
  `,
}));

export interface EndNodeConfigProps {
  variables: OutputVariableConfig[];
  onVariableEdit: (variable: OutputVariableConfig) => void;
  onVariableDelete: (name: string) => void;
  onOpenModal: () => void;
  onDragEnd: (event: DragEndEvent) => void;
}

// 变量类型颜色映射
const typeColors: Record<string, string> = {
  string: "blue",
  number: "green",
  boolean: "orange",
  object: "purple",
  array: "cyan",
};

const normalizeStructRef = (ref: string) => ref.replace(/^(struct:)+/, "");

/**
 * 将表达式中的节点 ID 替换为节点名称
 * 例如: {{nodes.subflow-1765942235470.title}} -> {{nodes.获取推荐.title}}
 */
const formatExpressionWithNodeNames = (
  expression: string,
  nodes: FlowNode[]
): string => {
  if (!expression) return expression;

  // 创建 nodeId -> label 的映射
  const nodeMap = new Map<string, string>();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node.data.label);
  });

  // 替换 {{nodes.nodeId.xxx}} 中的 nodeId 为节点名称
  return expression.replace(
    /\{\{nodes\.([^.}]+)\.([^}]+)\}\}/g,
    (match, nodeId, field) => {
      const nodeName = nodeMap.get(nodeId);
      if (nodeName) {
        return `{{nodes.${nodeName}.${field}}}`;
      }
      return match; // 如果找不到节点，保持原样
    }
  );
};

// 可排序的输出变量项组件
interface SortableOutputVariableItemProps {
  variable: OutputVariableConfig;
  onEdit: (variable: OutputVariableConfig) => void;
  onDelete: (name: string) => void;
  styles: ReturnType<typeof useStyles>["styles"];
  nodes: FlowNode[];
  resolveTypeLabel: (variable: OutputVariableConfig) => string;
}

const SortableOutputVariableItem: React.FC<SortableOutputVariableItemProps> = ({
  variable,
  onEdit,
  onDelete,
  styles,
  nodes,
  resolveTypeLabel,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: variable.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 格式化后的表达式（用于显示）
  const displayExpression = useMemo(
    () => formatExpressionWithNodeNames(variable.expression, nodes),
    [variable.expression, nodes]
  );

  return (
    <div ref={setNodeRef} style={style} className={styles.variableItem}>
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <AiOutlineHolder />
      </div>
      <div className={styles.variableContent}>
        <div className={styles.variableHeader}>
          <span className={styles.variableName}>{variable.name}</span>
          <Tag
            color={typeColors[variable.type] || "default"}
            className={styles.variableType}
          >
            {resolveTypeLabel(variable)}
          </Tag>
        </div>
        {variable.label && (
          <div className={styles.variableLabel}>{variable.label}</div>
        )}
        <div className={styles.variableExpression}>
          <Tooltip title={variable.expression}>
            <code>{displayExpression}</code>
          </Tooltip>
        </div>
      </div>
      <div className={`${styles.variableActions} variable-actions-visible`}>
        <Tooltip title="编辑">
          <Button
            type="text"
            size="small"
            icon={<AiOutlineEdit />}
            onClick={() => onEdit(variable)}
          />
        </Tooltip>
        <Tooltip title="删除">
          <Button
            type="text"
            size="small"
            danger
            icon={<AiOutlineDelete />}
            onClick={() => onDelete(variable.name)}
          />
        </Tooltip>
      </div>
    </div>
  );
};

/**
 * 结束节点配置组件
 * 管理输出变量的添加、编辑、删除和排序
 */
export const EndNodeConfig: React.FC<EndNodeConfigProps> = ({
  variables,
  onVariableEdit,
  onVariableDelete,
  onOpenModal,
  onDragEnd,
}) => {
  const { styles } = useStyles();
  const { nodes, dataStructures } = useFlowStore();

  const resolveTypeLabel = useCallback(
    (variable: OutputVariableConfig) => {
      if (variable.itemTypeRef) {
        const structId = normalizeStructRef(variable.itemTypeRef);
        const structure = dataStructures.find(
          (s) =>
            s.id === structId || s.name === structId || s.fullName === structId
        );
        const structName = structure?.name || structure?.fullName || structId;
        return `List<${structName}>`;
      }
      if (variable.typeRef) {
        const structId = normalizeStructRef(variable.typeRef);
        const structure = dataStructures.find(
          (s) =>
            s.id === structId || s.name === structId || s.fullName === structId
        );
        return structure?.name || structure?.fullName || structId;
      }
      return variable.type;
    },
    [dataStructures]
  );

  // 拖拽排序传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <>
      <Divider plain>输出变量配置</Divider>

      <div className={styles.hint}>
        配置流程执行完成后返回的输出变量，可以从上游节点中选择数据或直接填写常量值。
      </div>

      {variables.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={variables.map((v) => v.name)}
            strategy={verticalListSortingStrategy}
          >
            <div
              className={`${styles.variableList} ${styles.variableItemHover}`}
            >
              {variables.map((variable) => (
                <SortableOutputVariableItem
                  key={variable.name}
                  variable={variable}
                  onEdit={onVariableEdit}
                  onDelete={onVariableDelete}
                  styles={styles}
                  nodes={nodes as FlowNode[]}
                  resolveTypeLabel={resolveTypeLabel}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className={styles.emptyVariables}>
          <p>暂无输出变量</p>
          <p style={{ fontSize: 12 }}>
            添加输出变量后，流程执行结果将包含这些变量
          </p>
        </div>
      )}

      <Button
        type="dashed"
        block
        icon={<AiOutlinePlus />}
        onClick={onOpenModal}
        className={styles.addBtn}
      >
        添加输出变量
      </Button>
    </>
  );
};

export default EndNodeConfig;
