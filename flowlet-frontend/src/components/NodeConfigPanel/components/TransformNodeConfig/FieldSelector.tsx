import React, { useState, useMemo } from "react";
import { Input, Select, Tree, Empty, Tag } from "antd";
import type { DataNode } from "antd/es/tree";
import type { UpstreamNodeData } from "./types";
import {
  convertToTreeData,
  API_NODE_TOP_FIELDS,
  API_NODE_DEFAULT_EXPANDED,
} from "./utils";

interface FieldSelectorProps {
  nodeId: string;
  value?: string;
  onChange?: (val: string) => void;
  upstreamNodesData: UpstreamNodeData[];
}

/**
 * 字段选择器组件
 * 提供树形结构的字段选择，支持搜索过滤
 */
export const FieldSelector: React.FC<FieldSelectorProps> = ({
  nodeId,
  value,
  onChange,
  upstreamNodesData,
}) => {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const nodeData = upstreamNodesData.find((n) => n.id === nodeId);
  const isApiNode = nodeData?.type === "api";
  const sampleData = nodeData?.sampleData;
  const hasSampleData = !!sampleData;

  // 对于 API 节点，只保留指定的顶级字段
  const filteredSampleData = useMemo(() => {
    if (!sampleData) return null;
    if (isApiNode) {
      return Object.fromEntries(
        Object.entries(sampleData).filter(([key]) =>
          API_NODE_TOP_FIELDS.includes(key)
        )
      );
    }
    return sampleData;
  }, [sampleData, isApiNode]);

  const treeData = useMemo(() => {
    if (!filteredSampleData || !nodeData) return [];
    return convertToTreeData(filteredSampleData, "", nodeData.id);
  }, [filteredSampleData, nodeData]);

  // 计算默认展开的 keys
  const defaultExpandedKeys = useMemo(() => {
    if (!isApiNode || searchText) {
      // 非 API 节点或有搜索时，展开所有
      const getAllKeys = (nodes: DataNode[]): string[] => {
        const keys: string[] = [];
        for (const node of nodes) {
          keys.push(String(node.key));
          if (node.children) {
            keys.push(...getAllKeys(node.children));
          }
        }
        return keys;
      };
      return getAllKeys(treeData);
    }
    // API 节点：只展开 body 下的字段
    const expandedKeys: string[] = [];
    const findBodyKeys = (
      nodes: DataNode[],
      parentPath: string = ""
    ): void => {
      for (const node of nodes) {
        const key = String(node.key);
        // 检查是否是默认展开的顶级字段
        const isDefaultExpanded = API_NODE_DEFAULT_EXPANDED.some(
          (field) => key.includes(`-${field}-`) || key.endsWith(`-${field}`)
        );
        if (isDefaultExpanded || parentPath) {
          expandedKeys.push(key);
        }
        if (node.children && (isDefaultExpanded || parentPath)) {
          findBodyKeys(node.children, key);
        }
      }
    };
    findBodyKeys(treeData);
    return expandedKeys;
  }, [isApiNode, treeData, searchText]);

  // 过滤树节点
  const filterTreeData = (data: DataNode[], search: string): DataNode[] => {
    if (!search.trim()) return data;
    const lowerSearch = search.toLowerCase();

    const result: DataNode[] = [];
    for (const node of data) {
      // 检查当前节点是否匹配
      const nodeKey = String(node.key).toLowerCase();
      const nodeMatches = nodeKey.includes(lowerSearch);

      // 递归过滤子节点
      const filteredChildren = node.children
        ? filterTreeData(node.children, search)
        : undefined;

      // 如果当前节点匹配或有匹配的子节点，则保留
      if (nodeMatches || (filteredChildren && filteredChildren.length > 0)) {
        result.push({
          ...node,
          children: filteredChildren,
        });
      }
    }
    return result;
  };

  const filteredTreeData = filterTreeData(treeData, searchText);

  // 如果没有节点数据，显示手动输入框
  if (!hasSampleData) {
    return (
      <Input
        placeholder="手动输入字段路径，如: data.userId"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    );
  }

  return (
    <Select
      placeholder="选择字段"
      value={value}
      open={open}
      onOpenChange={(visible) => {
        setOpen(visible);
        if (!visible) {
          setSearchText(""); // 关闭时清空搜索
        }
      }}
      onChange={(val) => {
        onChange?.(val ?? "");
        setOpen(false);
      }}
      popupMatchSelectWidth={false}
      popupRender={() => (
        <div
          style={{
            minWidth: 350,
            maxWidth: 500,
            maxHeight: 400,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid #f0f0f0",
              background: "#fff",
            }}
          >
            <Input
              placeholder="搜索字段..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="small"
              autoFocus
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div
            style={{
              padding: "4px 12px",
              borderBottom: "1px solid #f0f0f0",
              background: "#fafafa",
              fontSize: 12,
              color: "#666",
            }}
          >
            <strong>{nodeData?.label}</strong> 可用字段
            {isApiNode && (
              <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>
                API
              </Tag>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 300 }}>
            {filteredTreeData.length > 0 ? (
              <Tree
                treeData={filteredTreeData}
                showLine
                defaultExpandedKeys={defaultExpandedKeys}
                onSelect={(keys) => {
                  if (keys.length > 0) {
                    const key = keys[0] as string;
                    // key 格式: nodeId-path-index，需要提取中间的 path 部分
                    const keyPrefix = `${nodeId}-`;
                    if (key.startsWith(keyPrefix)) {
                      const rest = key.substring(keyPrefix.length);
                      // 找最后一个 - 来分割，移除末尾的 index
                      const lastDashIndex = rest.lastIndexOf("-");
                      const fieldPath =
                        lastDashIndex > 0
                          ? rest.substring(0, lastDashIndex)
                          : rest;
                      onChange?.(fieldPath);
                    } else {
                      onChange?.(key);
                    }
                    setOpen(false); // 选中后关闭菜单
                    setSearchText(""); // 清空搜索
                  }
                }}
                style={{ padding: "8px 0" }}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={searchText ? "未找到匹配字段" : "暂无示例数据"}
                style={{ padding: "20px 0" }}
              />
            )}
          </div>
        </div>
      )}
    />
  );
};

export default FieldSelector;
