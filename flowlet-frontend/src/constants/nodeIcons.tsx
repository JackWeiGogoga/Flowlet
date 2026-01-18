import React from "react";
import {
  AiOutlineApi,
  AiOutlineDatabase,
  AiOutlineUser,
  AiOutlineLink,
  AiOutlineFlag,
  AiOutlineStop,
  AiOutlineThunderbolt,
  AiOutlineBranches,
  AiOutlineCode,
  AiOutlineLock,
} from "react-icons/ai";
import { NodeType } from "@/types";
import { SiApachekafka } from "react-icons/si";
import { LuBrain } from "react-icons/lu";
import { TbFingerprint } from "react-icons/tb";

/**
 * 节点类型图标映射 (React 组件)
 * 用于下拉菜单、变量选择器等场景
 */
export const nodeTypeIcons: Record<string, React.ReactNode> = {
  // 变量来源分组图标
  input: <AiOutlineUser />,
  用户输入: <AiOutlineUser />,
  context: <AiOutlineDatabase />,
  全局上下文: <AiOutlineDatabase />,
  const: <AiOutlineLock />,
  项目常量: <AiOutlineLock />,
  流程常量: <AiOutlineLock />,
  输出别名: <AiOutlineLink />,
  alias: <AiOutlineLink />,

  // 节点类型图标
  [NodeType.START]: <AiOutlineFlag />,
  [NodeType.END]: <AiOutlineStop />,
  [NodeType.API]: <AiOutlineApi />,
  [NodeType.KAFKA]: <SiApachekafka />,
  [NodeType.CODE]: <AiOutlineCode />,
  [NodeType.CONDITION]: <AiOutlineBranches />,
  [NodeType.TRANSFORM]: <AiOutlineThunderbolt />,
  [NodeType.LLM]: <LuBrain />,
  [NodeType.VECTOR_STORE]: <AiOutlineDatabase />,
  [NodeType.SIMHASH]: <TbFingerprint />,
};

/**
 * 节点类型符号映射 (文字符号)
 * 用于 contentEditable 编辑器中的变量标签显示
 * 避免在 contentEditable 中直接渲染 React 组件
 */
export const nodeTypeSymbols: Record<string, string> = {
  input: "📥",
  context: "📦",
  const: "🔒",
  alias: "🏷️",
  [NodeType.START]: "▶️",
  [NodeType.END]: "🏁",
  [NodeType.API]: "🔗",
  [NodeType.KAFKA]: "📨",
  [NodeType.CODE]: "🧩",
  [NodeType.CONDITION]: "🔀",
  [NodeType.TRANSFORM]: "⚡",
  [NodeType.LLM]: "🤖",
  [NodeType.VECTOR_STORE]: "🧠",
  [NodeType.SIMHASH]: "🧬",
};

/**
 * 获取节点类型图标
 * @param nodeType 节点类型或分组名称
 * @param fallback 默认图标
 */
export const getNodeTypeIcon = (
  nodeType: string,
  fallback: React.ReactNode = <AiOutlineDatabase />
): React.ReactNode => {
  return nodeTypeIcons[nodeType] || fallback;
};

/**
 * 获取节点类型符号
 * @param nodeType 节点类型或分组名称
 * @param fallback 默认符号
 */
export const getNodeTypeSymbol = (
  nodeType: string,
  fallback: string = "📦"
): string => {
  return nodeTypeSymbols[nodeType] || fallback;
};
