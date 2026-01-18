/**
 * VariableAssignerNodeConfig - 变量赋值节点配置组件
 * 重构后的模块入口
 */

import React, { useMemo } from "react";
import { Button } from "antd";
import { AiOutlinePlus } from "react-icons/ai";
import { TbVariablePlus } from "react-icons/tb";
import {
  DndContext,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useStyles } from "../VariableAssignerNodeConfig.style";
import { useVariableAssignerLogic } from "./useVariableAssignerLogic";
import { SortableAssignmentCard } from "./SortableAssignmentCard";
import { AssignmentCard } from "./AssignmentCard";

interface VariableAssignerNodeConfigProps {
  nodeId: string;
}

export const VariableAssignerNodeConfig: React.FC<VariableAssignerNodeConfigProps> = ({ nodeId }) => {
  const { styles } = useStyles();
  
  const {
    assignments,
    dataStructures,
    allSourceVariables,
    enumOptions,
    constantOptions,
    searchTexts,
    setSearchTexts,
    sensors,
    isNewVariable,
    buildVariableNameOptions,
    buildSourceVariableOptions,
    buildNumericVariableOptions,
    handleAddAssignment,
    handleDeleteAssignment,
    handleUpdateAssignment,
    handleUpdateOperationParams,
    handleSortEnd,
  } = useVariableAssignerLogic({ nodeId });

  // 构建选项（需要样式）
  const sourceVariableOptions = useMemo(
    () => buildSourceVariableOptions(styles),
    [buildSourceVariableOptions, styles]
  );
  
  const numericVariableOptions = useMemo(
    () => buildNumericVariableOptions(styles),
    [buildNumericVariableOptions, styles]
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
              {assignments.map((assignment) => {
                const searchText = searchTexts[assignment.id] ?? assignment.variableName;
                return (
                  <SortableAssignmentCard key={assignment.id} id={assignment.id}>
                    <AssignmentCard
                      assignment={assignment}
                      nodeId={nodeId}
                      isNewVariable={isNewVariable(assignment.variableName, assignment.id)}
                      onSearchTextChange={(text) => 
                        setSearchTexts((prev) => ({ ...prev, [assignment.id]: text }))
                      }
                      variableNameOptions={buildVariableNameOptions(searchText || "", assignment.id)}
                      sourceVariableOptions={sourceVariableOptions}
                      numericVariableOptions={numericVariableOptions}
                      allSourceVariables={allSourceVariables}
                      dataStructures={dataStructures}
                      enumOptions={enumOptions}
                      constantOptions={constantOptions}
                      onUpdate={handleUpdateAssignment}
                      onUpdateParams={handleUpdateOperationParams}
                      onDelete={handleDeleteAssignment}
                    />
                  </SortableAssignmentCard>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default VariableAssignerNodeConfig;
