import React from "react";
import { Button, Divider, Tooltip } from "antd";
import {
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineEdit,
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
import { createStyles } from "antd-style";
import { InputVariable, VariableType } from "@/types";
import AddVariableModal from "../AddVariableModal";
import { variableTypeIcons } from "../constants";
import { useFlowStore } from "@/store/flowStore";

const useStyles = createStyles(({ css }) => ({
  variableList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  `,

  variableItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    transition: all 0.2s;
    outline: none;

    &:hover {
      background: #f0f0f0;
      border-color: #d9d9d9;
    }

    &:focus,
    &:focus-visible {
      outline: none;
    }
  `,

  variableInfo: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;

    svg:focus {
      outline: none;
    }
  `,

  variableIcon: css`
    color: #1890ff;
    font-size: 14px;
  `,

  variableName: css`
    font-family: monospace;
    font-size: 12px;
    color: #722ed1;
    white-space: nowrap;
  `,

  variableLabel: css`
    font-size: 12px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,

  variableStructure: css`
    margin-left: 6px;
    font-size: 11px;
    color: #389e0d;
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    border-radius: 4px;
    padding: 0 4px;
    white-space: nowrap;
  `,

  variableRequired: css`
    margin-left: 4px;
    padding: 0 4px;
    font-size: 10px;
    color: #ff4d4f;
    background: #fff1f0;
    border-radius: 2px;
  `,

  variableActions: css`
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  `,

  emptyVariables: css`
    text-align: center;
    padding: 16px;
    color: #999;
    background: #fafafa;
    border-radius: 6px;
    margin-bottom: 12px;

    p {
      margin: 0;
    }
  `,

  addVariableBtn: css`
    margin-top: 8px;
  `,
}));

// 内部可排序变量项组件
interface SortableItemProps {
  variable: InputVariable;
  structureLabel?: string;
  onEdit: (variable: InputVariable) => void;
  onDelete: (name: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  variable,
  structureLabel,
  onEdit,
  onDelete,
}) => {
  const { styles } = useStyles();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: variable.name });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.variableItem}>
      <div className={styles.variableInfo}>
        <AiOutlineHolder
          style={{ color: "#bfbfbf", cursor: "grab" }}
          {...attributes}
          {...listeners}
        />
        <span className={styles.variableIcon}>
          {variableTypeIcons[variable.type]}
        </span>
        <span className={styles.variableName}>{`{${variable.name}}`}</span>
        <span className={styles.variableLabel}>
          {variable.label}
          {variable.required && (
            <span className={styles.variableRequired}>必填</span>
          )}
          {variable.type === VariableType.STRUCTURE && structureLabel && (
            <span className={styles.variableStructure}>{structureLabel}</span>
          )}
        </span>
      </div>
      <div className={styles.variableActions}>
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

export interface StartNodeConfigProps {
  variables: InputVariable[];
  variableModalOpen: boolean;
  editingVariable: InputVariable | undefined;
  onVariableEdit: (variable: InputVariable) => void;
  onVariableDelete: (name: string) => void;
  onVariableSave: (variable: InputVariable) => void;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onDragEnd: (event: DragEndEvent) => void;
}

/**
 * 开始节点配置组件
 * 管理输入变量的添加、编辑、删除和排序
 */
export const StartNodeConfig: React.FC<StartNodeConfigProps> = ({
  variables,
  variableModalOpen,
  editingVariable,
  onVariableEdit,
  onVariableDelete,
  onVariableSave,
  onOpenModal,
  onCloseModal,
  onDragEnd,
}) => {
  const { styles } = useStyles();
  const existingNames = variables.map((v) => v.name);
  const dataStructures = useFlowStore((state) => state.dataStructures);
  const structureNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    dataStructures.forEach((structure) => {
      const label = structure.fullName || structure.name;
      map.set(structure.id, label);
    });
    return map;
  }, [dataStructures]);

  // 拖拽排序传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <>
      <Divider plain>输入字段</Divider>

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
            <div className={styles.variableList}>
              {variables.map((variable) => {
                const structureId = variable.structureRef?.replace(
                  /^struct:/,
                  ""
                );
                const structureLabel = structureId
                  ? structureNameMap.get(structureId)
                  : undefined;
                return (
                  <SortableItem
                    key={variable.name}
                    variable={variable}
                    structureLabel={structureLabel}
                    onEdit={onVariableEdit}
                    onDelete={onVariableDelete}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className={styles.emptyVariables}>
          <p>暂无输入变量</p>
          <p style={{ fontSize: 12 }}>添加变量后可在后续节点中使用</p>
        </div>
      )}

      <Button
        type="dashed"
        block
        icon={<AiOutlinePlus />}
        onClick={onOpenModal}
        className={styles.addVariableBtn}
      >
        添加变量
      </Button>

      <AddVariableModal
        open={variableModalOpen}
        editingVariable={editingVariable}
        existingNames={existingNames}
        onOk={onVariableSave}
        onCancel={onCloseModal}
      />
    </>
  );
};

export default StartNodeConfig;
