import { Tag } from "antd";
import type { DataNode } from "antd/es/tree";
import type { FieldMapping } from "./types";

/**
 * 类型守卫：检查是否为对象类型
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * 规范化正则模式值
 */
export const normalizeRegexMode = (
  value: unknown
): FieldMapping["regexMode"] => {
  if (
    value === "none" ||
    value === "replace" ||
    value === "extract" ||
    value === "match"
  ) {
    return value;
  }
  return "none";
};

/**
 * 将对象转换为树形数据结构（用于字段选择器）
 */
export const convertToTreeData = (
  obj: Record<string, unknown>,
  prefix: string = "",
  nodeId: string = "",
  parentKey: string = ""
): DataNode[] => {
  if (!obj || typeof obj !== "object") return [];

  return Object.entries(obj).map(([key, value], index) => {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    // 使用 nodeId + path + index 确保 key 唯一
    const nodeKey = `${nodeId || "tree"}-${currentPath}-${parentKey}${index}`;
    const valueType = Array.isArray(value)
      ? "array"
      : typeof value === "object" && value !== null
      ? "object"
      : typeof value;

    const hasChildren = isRecord(value) && Object.keys(value).length > 0;

    // 对于数组，展示第一个元素的结构
    let children: DataNode[] | undefined = undefined;
    if (hasChildren) {
      children = convertToTreeData(value, currentPath, nodeId);
    } else if (Array.isArray(value) && value.length > 0 && isRecord(value[0])) {
      children = convertToTreeData(value[0], `${currentPath}[0]`, nodeId);
    }

    return {
      title: (
        <span>
          <span style={{ fontWeight: 500 }}>{key}</span>
          {Array.isArray(value) && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              [{value.length}]
            </Tag>
          )}
          {!hasChildren && !Array.isArray(value) && (
            <Tag color="default" style={{ marginLeft: 8 }}>
              {valueType}
            </Tag>
          )}
          {!hasChildren && value !== undefined && value !== null && (
            <span style={{ color: "#999", marginLeft: 8, fontSize: 12 }}>
              {String(value).substring(0, 30)}
              {String(value).length > 30 ? "..." : ""}
            </span>
          )}
        </span>
      ),
      key: nodeKey,
      children,
      isLeaf: !children || children.length === 0,
    };
  });
};

/**
 * 获取扁平化的字段列表（用于批量选择）
 */
export const getFlatFieldList = (
  obj: Record<string, unknown>,
  prefix: string = "",
  nodeId: string = ""
): { key: string; path: string; label: string; type: string }[] => {
  if (!obj || typeof obj !== "object") return [];

  const result: { key: string; path: string; label: string; type: string }[] =
    [];

  Object.entries(obj).forEach(([key, value]) => {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    const fullKey = nodeId ? `${nodeId}.${currentPath}` : currentPath;
    const valueType = Array.isArray(value)
      ? "array"
      : typeof value === "object" && value !== null
      ? "object"
      : typeof value;

    // 添加当前字段
    result.push({
      key: fullKey,
      path: currentPath,
      label: key,
      type: valueType,
    });

    // 递归处理子字段
    if (isRecord(value) && Object.keys(value).length > 0) {
      result.push(...getFlatFieldList(value, currentPath, nodeId));
    } else if (
      Array.isArray(value) &&
      value.length > 0 &&
      isRecord(value[0])
    ) {
      result.push(...getFlatFieldList(value[0], `${currentPath}[0]`, nodeId));
    }
  });

  return result;
};

/**
 * 创建空映射项
 */
export const createEmptyMapping = (): FieldMapping => ({
  id: Date.now().toString(),
  target: "",
  regexMode: "none",
});

/**
 * API 节点的顶级字段配置
 */
export const API_NODE_TOP_FIELDS = ["headers", "statusCode", "body"];

/**
 * 默认展开的字段
 */
export const API_NODE_DEFAULT_EXPANDED = ["body"];
