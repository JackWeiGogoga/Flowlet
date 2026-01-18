/**
 * 可排序的赋值卡片组件
 * 用于在拖放列表中展示单个赋值项
 */

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableAssignmentCardProps {
  id: string;
  children: React.ReactNode;
}

export const SortableAssignmentCard: React.FC<SortableAssignmentCardProps> = ({
  id,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};
