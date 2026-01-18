import React from "react";
import { Button, Input, Select, Tag, Empty } from "antd";
import { AiOutlineDelete } from "react-icons/ai";
import type { FieldMapping, UpstreamNodeData } from "./types";
import { FieldSelector } from "./FieldSelector";

interface MappingListProps {
  mappings: FieldMapping[];
  upstreamNodesData: UpstreamNodeData[];
  duplicateTargets: Set<string>;
  onUpdateMapping: (id: string, field: keyof FieldMapping, value: string) => void;
  onRemoveMapping: (id: string) => void;
  styles: Record<string, string>;
  cx: (...args: (string | undefined | null | boolean)[]) => string;
}

/**
 * 映射列表组件
 * 显示和编辑字段映射配置
 */
export const MappingList: React.FC<MappingListProps> = ({
  mappings,
  upstreamNodesData,
  duplicateTargets,
  onUpdateMapping,
  onRemoveMapping,
  styles,
  cx,
}) => {
  if (!mappings || mappings.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无映射配置"
        style={{ padding: "20px 0" }}
      />
    );
  }

  // 按源节点分组
  const groups: Record<string, FieldMapping[]> = {};
  const ungrouped: FieldMapping[] = [];

  mappings.forEach((m) => {
    if (m.source) {
      const nodeId = m.source.split(".")[0];
      if (!groups[nodeId]) groups[nodeId] = [];
      groups[nodeId].push(m);
    } else {
      ungrouped.push(m);
    }
  });

  const renderRegexFields = (mapping: FieldMapping) => {
    if (!mapping.regexMode || mapping.regexMode === "none") return null;

    return (
      <div className={styles.mappingRegexRow}>
        <Input
          size="small"
          value={mapping.regexPattern}
          onChange={(e) =>
            onUpdateMapping(mapping.id, "regexPattern", e.target.value)
          }
          placeholder="正则表达式"
          className={styles.mappingRegexField}
        />
        <Input
          size="small"
          value={mapping.regexFlags}
          onChange={(e) =>
            onUpdateMapping(mapping.id, "regexFlags", e.target.value)
          }
          placeholder="flags"
          className={styles.mappingRegexFlags}
        />
        {mapping.regexMode === "replace" && (
          <Input
            size="small"
            value={mapping.regexReplace}
            onChange={(e) =>
              onUpdateMapping(mapping.id, "regexReplace", e.target.value)
            }
            placeholder="替换文本"
            className={styles.mappingRegexReplace}
          />
        )}
        {mapping.regexMode === "extract" && (
          <Input
            size="small"
            value={mapping.regexGroup}
            onChange={(e) =>
              onUpdateMapping(mapping.id, "regexGroup", e.target.value)
            }
            placeholder="分组索引"
            className={styles.mappingRegexGroup}
          />
        )}
      </div>
    );
  };

  const renderMappingRow = (
    mapping: FieldMapping,
    nodeId?: string,
    isUngrouped = false
  ) => (
    <div key={mapping.id}>
      <div
        className={cx(
          styles.mappingRow,
          isUngrouped && styles.mappingRowUngrouped
        )}
      >
        {isUngrouped ? (
          <div className={styles.mappingRowNode}>
            <Select
              placeholder="选择源节点"
              size="small"
              style={{ width: "100%" }}
              onChange={(selectedNodeId) => {
                onUpdateMapping(mapping.id, "source", `${selectedNodeId}.`);
              }}
            >
              {upstreamNodesData.map((node) => (
                <Select.Option key={node.id} value={node.id}>
                  {node.label}
                </Select.Option>
              ))}
            </Select>
          </div>
        ) : (
          <div className={styles.mappingRowSource}>
            <FieldSelector
              nodeId={nodeId!}
              value={
                mapping.source?.split(".").slice(1).join(".") || undefined
              }
              onChange={(fieldPath) => {
                onUpdateMapping(
                  mapping.id,
                  "source",
                  fieldPath ? `${nodeId}.${fieldPath}` : ""
                );
              }}
              upstreamNodesData={upstreamNodesData}
            />
          </div>
        )}
        <span className={styles.mappingRowArrow}>→</span>
        <div className={styles.mappingRowTarget}>
          <Input
            placeholder="目标字段名"
            value={mapping.target}
            size="small"
            status={
              mapping.target && duplicateTargets.has(mapping.target.trim())
                ? "error"
                : undefined
            }
            onChange={(e) =>
              onUpdateMapping(mapping.id, "target", e.target.value)
            }
          />
        </div>
        <div className={styles.mappingRowRegexMode}>
          <Select
            size="small"
            value={mapping.regexMode || "none"}
            onChange={(value) => onUpdateMapping(mapping.id, "regexMode", value)}
            options={[
              { value: "none", label: "无处理" },
              { value: "replace", label: "正则替换" },
              { value: "extract", label: "正则提取" },
              { value: "match", label: "正则匹配" },
            ]}
            placeholder="正则"
          />
        </div>
        <Button
          type="text"
          danger
          size="small"
          icon={<AiOutlineDelete />}
          onClick={() => onRemoveMapping(mapping.id)}
          className={styles.mappingRowDelete}
        />
      </div>
      {renderRegexFields(mapping)}
    </div>
  );

  return (
    <div className={styles.mappingGroups}>
      {/* 已分组的映射 */}
      {Object.entries(groups).map(([nodeId, nodeMappings]) => {
        const nodeInfo = upstreamNodesData.find((n) => n.id === nodeId);
        return (
          <div key={nodeId} className={styles.mappingGroup}>
            <div className={styles.mappingGroupHeader}>
              <Tag color="blue">{nodeInfo?.label || nodeId}</Tag>
              <span className={styles.mappingCount}>
                {nodeMappings.length} 个字段
              </span>
            </div>
            <div className={styles.mappingGroupContent}>
              {nodeMappings.map((mapping) =>
                renderMappingRow(mapping, nodeId)
              )}
            </div>
          </div>
        );
      })}

      {/* 未分组的映射（未选择源节点） */}
      {ungrouped.length > 0 && (
        <div
          className={cx(styles.mappingGroup, styles.mappingGroupUngrouped)}
        >
          <div
            className={cx(
              styles.mappingGroupHeader,
              styles.mappingGroupUngroupedHeader
            )}
          >
            <Tag color="default">待配置</Tag>
            <span className={styles.mappingCount}>
              {ungrouped.length} 个字段
            </span>
          </div>
          <div className={styles.mappingGroupContent}>
            {ungrouped.map((mapping) =>
              renderMappingRow(mapping, undefined, true)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingList;
