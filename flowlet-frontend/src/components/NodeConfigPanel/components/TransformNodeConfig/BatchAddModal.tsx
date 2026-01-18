import React, { useState } from "react";
import {
  Modal,
  Tabs,
  Checkbox,
  Space,
  Tag,
  Empty,
  Alert,
  Badge,
} from "antd";
import type { FieldMapping, UpstreamNodeData } from "./types";
import { getFlatFieldList } from "./utils";

interface BatchAddModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (selectedFields: string[]) => void;
  upstreamNodesData: UpstreamNodeData[];
  existingMappings: FieldMapping[];
}

/**
 * 批量添加字段映射模态框
 */
export const BatchAddModal: React.FC<BatchAddModalProps> = ({
  visible,
  onCancel,
  onOk,
  upstreamNodesData,
  existingMappings,
}) => {
  const [selectedBatchFields, setSelectedBatchFields] = useState<string[]>([]);

  // 获取每个源节点的字段列表
  const nodeFieldsMap = upstreamNodesData.map((node) => ({
    nodeId: node.id,
    nodeLabel: node.label,
    fields: node.sampleData
      ? getFlatFieldList(node.sampleData, "", node.id)
      : [],
  }));

  // 已存在的映射源字段
  const existingSources = new Set(
    existingMappings?.map((m) => m.source) || []
  );

  const handleCancel = () => {
    setSelectedBatchFields([]);
    onCancel();
  };

  const handleOk = () => {
    onOk(selectedBatchFields);
    setSelectedBatchFields([]);
  };

  return (
    <Modal
      title="批量添加字段映射"
      open={visible}
      onCancel={handleCancel}
      onOk={handleOk}
      okText={`添加 ${selectedBatchFields.length} 个映射`}
      okButtonProps={{ disabled: selectedBatchFields.length === 0 }}
      width={600}
    >
      {nodeFieldsMap.every((n) => n.fields.length === 0) ? (
        <Alert
          title="暂无可选字段"
          description="请先执行上游节点的测试，以获取可用字段列表"
          type="warning"
          showIcon
        />
      ) : (
        <Tabs
          items={nodeFieldsMap
            .filter((n) => n.fields.length > 0)
            .map((nodeData) => {
              const availableFields = nodeData.fields.filter(
                (f) => !existingSources.has(f.key)
              );
              const selectedCount = selectedBatchFields.filter((k) =>
                k.startsWith(`${nodeData.nodeId}.`)
              ).length;

              return {
                key: nodeData.nodeId,
                label: (
                  <span>
                    {nodeData.nodeLabel}
                    {selectedCount > 0 && (
                      <Badge
                        count={selectedCount}
                        size="small"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </span>
                ),
                children: (
                  <div style={{ maxHeight: 350, overflowY: "auto" }}>
                    {availableFields.length === 0 ? (
                      <Empty description="所有字段已添加" />
                    ) : (
                      <>
                        <div style={{ marginBottom: 12 }}>
                          <Checkbox
                            indeterminate={
                              selectedCount > 0 &&
                              selectedCount < availableFields.length
                            }
                            checked={
                              availableFields.length > 0 &&
                              selectedCount === availableFields.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                // 全选当前节点的字段
                                const newFields = availableFields
                                  .map((f) => f.key)
                                  .filter(
                                    (k) => !selectedBatchFields.includes(k)
                                  );
                                setSelectedBatchFields([
                                  ...selectedBatchFields,
                                  ...newFields,
                                ]);
                              } else {
                                // 取消全选当前节点的字段
                                setSelectedBatchFields(
                                  selectedBatchFields.filter(
                                    (k) =>
                                      !k.startsWith(`${nodeData.nodeId}.`)
                                  )
                                );
                              }
                            }}
                          >
                            全选 ({availableFields.length} 个字段)
                          </Checkbox>
                        </div>
                        <Checkbox.Group
                          value={selectedBatchFields}
                          onChange={(checkedValues) => {
                            // 保留其他节点的选择，更新当前节点的选择
                            const otherNodeFields =
                              selectedBatchFields.filter(
                                (k) => !k.startsWith(`${nodeData.nodeId}.`)
                              );
                            const currentNodeFields = checkedValues.filter(
                              (k) =>
                                typeof k === "string" &&
                                k.startsWith(`${nodeData.nodeId}.`)
                            ) as string[];
                            setSelectedBatchFields([
                              ...otherNodeFields,
                              ...currentNodeFields,
                            ]);
                          }}
                          style={{ width: "100%" }}
                        >
                          <Space
                            direction="vertical"
                            style={{ width: "100%" }}
                          >
                            {availableFields.map((field) => (
                              <Checkbox key={field.key} value={field.key}>
                                <span style={{ fontFamily: "monospace" }}>
                                  {field.path}
                                </span>
                                <Tag
                                  color="default"
                                  style={{ marginLeft: 8, fontSize: 11 }}
                                >
                                  {field.type}
                                </Tag>
                              </Checkbox>
                            ))}
                          </Space>
                        </Checkbox.Group>
                      </>
                    )}
                  </div>
                ),
              };
            })}
        />
      )}
    </Modal>
  );
};

export default BatchAddModal;
