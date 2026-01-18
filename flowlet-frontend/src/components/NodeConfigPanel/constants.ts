import React from "react";
import {
  AiOutlineFontSize,
  AiOutlineAlignLeft,
  AiOutlineUnorderedList,
  AiOutlineNumber,
  AiOutlineDatabase,
} from "react-icons/ai";
import { VariableType } from "@/types";

// 变量类型图标映射
export const variableTypeIcons: Record<VariableType, React.ReactNode> = {
  [VariableType.TEXT]: React.createElement(AiOutlineFontSize),
  [VariableType.PARAGRAPH]: React.createElement(AiOutlineAlignLeft),
  [VariableType.SELECT]: React.createElement(AiOutlineUnorderedList),
  [VariableType.NUMBER]: React.createElement(AiOutlineNumber),
  [VariableType.STRUCTURE]: React.createElement(AiOutlineDatabase),
};
