import React from "react";
import { Form, Input, Radio, Alert, Divider, Typography } from "antd";
import type { Node } from "@xyflow/react";
import { VariableInput } from "@/components/VariableInput";
import SubflowNodeConfigComponent from "@/components/nodeConfigs/SubflowNodeConfig";
import { useFlowStore } from "@/store/flowStore";
import type {
  FlowNodeData,
  ForEachNodeConfig as ForEachNodeConfigType,
  SubflowNodeConfig,
} from "@/types";

const { Text } = Typography;

/**
 * ForEach 循环节点配置
 */
export const ForEachNodeConfig: React.FC = () => {
  const form = Form.useFormInstance();
  const selectedNode = useFlowStore((state) =>
    state.nodes.find((n) => n.selected)
  ) as Node<FlowNodeData> | undefined;
  const updateNode = useFlowStore((state) => state.updateNode);
  const flowId = useFlowStore((state) => state.flowId);

  if (!selectedNode) return null;

  const handleSubflowChange = (config: SubflowNodeConfig) => {
    const currentConfig = (selectedNode.data.config ||
      {}) as ForEachNodeConfigType;
    updateNode(selectedNode.id, {
      config: {
        ...currentConfig,
        ...config,
      },
    });
    form.setFieldsValue(config);
  };

  return (
    <div>
      <Alert
        type="info"
        showIcon
        message="ForEach 会逐项调用子流程，支持串行或并行无序执行。"
        description="在子流程输入映射中可直接使用 {{item}} 与 {{index}}，也可引用上游节点输出。"
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        name="itemsExpression"
        label="迭代数据来源"
        rules={[{ required: true, message: "请输入迭代数据来源" }]}
      >
        <VariableInput placeholder="{{nodes.fetch.body.items}}" />
      </Form.Item>

      <Form.Item name="mode" label="执行模式" initialValue="serial">
        <Radio.Group buttonStyle="solid">
          <Radio.Button value="serial">串行（stream）</Radio.Button>
          <Radio.Button value="parallel">并行无序（parallelStream）</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item label="迭代变量">
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item
            name="itemVariable"
            initialValue="item"
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Input placeholder="item" />
          </Form.Item>
          <Form.Item
            name="indexVariable"
            initialValue="index"
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Input placeholder="index" />
          </Form.Item>
        </div>
        <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
          变量名可留空以禁用注入，避免与现有输入变量冲突。
        </Text>
      </Form.Item>

      <Divider style={{ margin: "16px 0" }} />

      <SubflowNodeConfigComponent
        node={selectedNode}
        flowId={flowId || undefined}
        onChange={handleSubflowChange}
      />
    </div>
  );
};
