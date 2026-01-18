import React from "react";
import {
  AiOutlinePlayCircle,
  AiOutlineStop,
  AiOutlineApi,
  AiOutlineBranches,
  AiOutlineSwap,
  AiOutlinePartition,
  AiOutlineCode,
  AiOutlineDatabase,
  AiOutlineReload,
  AiOutlineTags,
  AiOutlineMessage,
} from "react-icons/ai";
import { TbVariablePlus, TbJson, TbFingerprint } from "react-icons/tb";
import { NodeType } from "@/types";
import { SiApachekafka } from "react-icons/si";
import { LuBrain } from "react-icons/lu";
import i18n from "@/locales";

export interface NodeTypeConfig {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  category: "control" | "action" | "ai" | "utility";
}

/**
 * Node type base configuration (without i18n text)
 */
interface NodeTypeBaseConfig {
  type: NodeType;
  icon: React.ReactNode;
  color: string;
  i18nKey: string;
  category: "control" | "action" | "ai" | "utility";
}

const NODE_TYPE_BASE_CONFIGS: NodeTypeBaseConfig[] = [
  {
    type: NodeType.START,
    icon: <AiOutlinePlayCircle />,
    color: "#52c41a",
    i18nKey: "start",
    category: "control",
  },
  {
    type: NodeType.END,
    icon: <AiOutlineStop />,
    color: "#ff4d4f",
    i18nKey: "end",
    category: "control",
  },
  {
    type: NodeType.API,
    icon: <AiOutlineApi />,
    color: "#1890ff",
    i18nKey: "api",
    category: "action",
  },
  {
    type: NodeType.KAFKA,
    icon: <SiApachekafka />,
    color: "#722ed1",
    i18nKey: "kafka",
    category: "action",
  },
  {
    type: NodeType.CODE,
    icon: <AiOutlineCode />,
    color: "#6366f1",
    i18nKey: "code",
    category: "action",
  },
  {
    type: NodeType.CONDITION,
    icon: <AiOutlineBranches />,
    color: "#faad14",
    i18nKey: "condition",
    category: "control",
  },
  {
    type: NodeType.TRANSFORM,
    icon: <AiOutlineSwap />,
    color: "#13c2c2",
    i18nKey: "transform",
    category: "utility",
  },
  {
    type: NodeType.SUBFLOW,
    icon: <AiOutlinePartition />,
    color: "#eb2f96",
    i18nKey: "subflow",
    category: "control",
  },
  {
    type: NodeType.FOR_EACH,
    icon: <AiOutlineReload />,
    color: "#22c55e",
    i18nKey: "for_each",
    category: "control",
  },
  {
    type: NodeType.LLM,
    icon: <LuBrain />,
    color: "#3b82f6",
    i18nKey: "llm",
    category: "ai",
  },
  {
    type: NodeType.VECTOR_STORE,
    icon: <AiOutlineDatabase />,
    color: "#10b981",
    i18nKey: "vector_store",
    category: "ai",
  },
  {
    type: NodeType.VARIABLE_ASSIGNER,
    icon: <TbVariablePlus />,
    color: "#06b6d4",
    i18nKey: "variable_assigner",
    category: "utility",
  },
  {
    type: NodeType.JSON_PARSER,
    icon: <TbJson />,
    color: "#f59e0b",
    i18nKey: "json_parser",
    category: "utility",
  },
  {
    type: NodeType.SIMHASH,
    icon: <TbFingerprint />,
    color: "#14b8a6",
    i18nKey: "simhash",
    category: "utility",
  },
  {
    type: NodeType.KEYWORD_MATCH,
    icon: <AiOutlineTags />,
    color: "#f97316",
    i18nKey: "keyword_match",
    category: "utility",
  },
  {
    type: NodeType.NOTE,
    icon: <AiOutlineMessage />,
    color: "#8b5cf6",
    i18nKey: "note",
    category: "utility",
  },
];

/**
 * Get all node types with translated labels
 */
export const getNodeTypes = (): NodeTypeConfig[] => {
  const t = i18n.t.bind(i18n);
  return NODE_TYPE_BASE_CONFIGS.map((config) => ({
    type: config.type,
    icon: config.icon,
    color: config.color,
    category: config.category,
    label: t(`nodeTypes.${config.i18nKey}.label`, { ns: "common" }),
    description: t(`nodeTypes.${config.i18nKey}.description`, { ns: "common" }),
  }));
};

/**
 * Get node type configuration by type
 */
export const getNodeTypeConfig = (type: string): NodeTypeConfig | undefined => {
  const nodeTypes = getNodeTypes();
  return nodeTypes.find((n) => n.type === type);
};

/**
 * Get node type base config (without i18n, for color/icon lookup)
 */
export const getNodeTypeBaseConfig = (type: string): NodeTypeBaseConfig | undefined => {
  return NODE_TYPE_BASE_CONFIGS.find((n) => n.type === type);
};

/**
 * Hook for getting node types with reactive language switching
 */
export const useNodeTypes = (): NodeTypeConfig[] => {
  // This will be called from React components where language reactivity is needed
  return getNodeTypes();
};

// For backward compatibility, export NODE_TYPES as a getter
// Note: This won't automatically update when language changes
// Use getNodeTypes() or useNodeTypes() for reactive behavior
export const NODE_TYPES: NodeTypeConfig[] = getNodeTypes();
