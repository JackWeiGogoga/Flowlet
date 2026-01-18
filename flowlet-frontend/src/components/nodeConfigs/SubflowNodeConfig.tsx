import React, { useState, useEffect, useCallback } from "react";
import {
  Select,
  Button,
  Space,
  Spin,
  Alert,
  Tooltip,
  Switch,
  InputNumber,
  Divider,
  Typography,
  Tag,
  Empty,
} from "antd";
import {
  AiOutlinePlus,
  AiOutlineDelete,
  AiOutlineWarning,
  AiOutlineLink,
  AiOutlineExclamationCircle,
  AiOutlineEdit,
} from "react-icons/ai";
import type { Node } from "@xyflow/react";
import type {
  FlowNodeData,
  SubflowNodeConfig,
  SubflowInputMapping,
  FlowDefinition,
  InputVariable,
  FlowGraphData,
} from "@/types";
import { flowApi } from "@/services/flowService";
import { VariableInput } from "@/components/VariableInput";
import { useDebounce } from "@/hooks/useDebounce";
import { useFlowStore } from "@/store/flowStore";

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface SubflowNodeConfigProps {
  node: Node<FlowNodeData>;
  flowId?: string; // 当前流程ID，用于循环检测
  onChange: (config: SubflowNodeConfig) => void;
}

/**
 * 子流程节点配置面板
 */
const SubflowNodeConfigComponent: React.FC<SubflowNodeConfigProps> = ({
  node,
  flowId,
  onChange,
}) => {
  const rawConfig = node.data.config as SubflowNodeConfig | undefined;
  const config: SubflowNodeConfig = {
    subflowId: rawConfig?.subflowId ?? "",
    subflowName: rawConfig?.subflowName ?? "",
    inputMappings: rawConfig?.inputMappings ?? [],
    continueOnError: rawConfig?.continueOnError ?? false,
    timeout: rawConfig?.timeout ?? 30000,
  };

  // 状态
  const [reusableFlows, setReusableFlows] = useState<FlowDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowDefinition | null>(null);
  const [subflowInputVariables, setSubflowInputVariables] = useState<
    InputVariable[]
  >([]);
  const [circularWarning, setCircularWarning] = useState<string | null>(null);
  const [checkingCircular, setCheckingCircular] = useState(false);

  // 获取 store 的 setReusableFlows 方法
  const setStoreReusableFlows = useFlowStore((state) => state.setReusableFlows);

  // 加载可复用的流程列表
  const loadReusableFlows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await flowApi.listReusable(1, 100, flowId);
      if (response.data.code === 200) {
        const flows = response.data.data.records;
        setReusableFlows(flows);
        // 同步到 store，供 OutputVariables 组件使用
        setStoreReusableFlows(flows);
      }
    } catch (error) {
      console.error("加载可复用流程失败:", error);
    } finally {
      setLoading(false);
    }
  }, [flowId, setStoreReusableFlows]);

  // 初始加载
  useEffect(() => {
    loadReusableFlows();
  }, [loadReusableFlows]);

  // 加载选中流程的详情和输入变量
  useEffect(() => {
    if (config.subflowId) {
      const flow = reusableFlows.find((f) => f.id === config.subflowId);
      if (flow) {
        setSelectedFlow(flow);
        // 解析流程的输入变量（从 graphData 中的 START 节点获取）
        try {
          const graphData: FlowGraphData = JSON.parse(flow.graphData);
          const startNode = graphData.nodes.find(
            (n) => n.data.nodeType === "start"
          );
          if (startNode?.data.config?.variables) {
            setSubflowInputVariables(
              startNode.data.config.variables as InputVariable[]
            );
          } else {
            setSubflowInputVariables([]);
          }
        } catch {
          setSubflowInputVariables([]);
        }
      }
    } else {
      setSelectedFlow(null);
      setSubflowInputVariables([]);
    }
  }, [config.subflowId, reusableFlows]);

  // 检查循环依赖
  const checkCircularDependency = useDebounce(async (targetFlowId: string) => {
    if (!flowId || !targetFlowId) {
      setCircularWarning(null);
      return;
    }

    setCheckingCircular(true);
    try {
      const response = await flowApi.checkCircularDependency(
        flowId,
        targetFlowId
      );
      if (response.data.code === 200) {
        const { wouldCauseCircular, message } = response.data.data;
        setCircularWarning(wouldCauseCircular ? message : null);
      }
    } catch (error) {
      console.error("检查循环依赖失败:", error);
    } finally {
      setCheckingCircular(false);
    }
  }, 300);

  // 选择子流程
  const handleSubflowChange = (subflowId: string) => {
    const flow = reusableFlows.find((f) => f.id === subflowId);

    // 检查循环依赖
    checkCircularDependency(subflowId);

    // 清空之前的映射，因为新流程的输入变量可能不同
    onChange({
      ...config,
      subflowId,
      subflowName: flow?.name || "",
      inputMappings: [],
    });
  };

  // 更新输入映射
  const handleMappingChange = (
    index: number,
    field: keyof SubflowInputMapping,
    value: string
  ) => {
    const newMappings = [...config.inputMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    onChange({ ...config, inputMappings: newMappings });
  };

  // 添加输入映射
  const handleAddMapping = () => {
    const newMappings = [
      ...config.inputMappings,
      { targetVariable: "", sourceExpression: "" },
    ];
    onChange({ ...config, inputMappings: newMappings });
  };

  // 删除输入映射
  const handleRemoveMapping = (index: number) => {
    const newMappings = config.inputMappings.filter((_, i) => i !== index);
    onChange({ ...config, inputMappings: newMappings });
  };

  // 自动填充所有输入变量
  const handleAutoFillMappings = () => {
    const mappings: SubflowInputMapping[] = subflowInputVariables.map((v) => ({
      targetVariable: v.name,
      sourceExpression: "", // 用户需要手动配置来源
    }));
    onChange({ ...config, inputMappings: mappings });
  };

  return (
    <div className="subflow-node-config">
      {/* 子流程选择 */}
      <div className="config-item">
        <div className="config-label">
          <span>选择子流程</span>
          <span style={{ color: "#ff4d4f" }}> *</span>
        </div>
        <Select
          placeholder="请选择子流程"
          value={config.subflowId || undefined}
          onChange={handleSubflowChange}
          loading={loading}
          showSearch
          optionFilterProp="children"
          notFoundContent={
            loading ? (
              <Spin size="small" />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无可复用的流程"
              />
            )
          }
        >
          {reusableFlows.map((flow) => (
            <Option key={flow.id} value={flow.id}>
              <Space>
                <AiOutlineLink />
                <span>{flow.name}</span>
                <Tag color={flow.status === "published" ? "green" : "orange"}>
                  {flow.status === "published" ? "已发布" : "草稿"}
                </Tag>
              </Space>
            </Option>
          ))}
        </Select>
      </div>

      {/* 循环依赖警告 */}
      {checkingCircular && (
        <Alert
          message="正在检查循环依赖..."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {circularWarning && (
        <Alert
          message="循环依赖警告"
          description={circularWarning}
          type="error"
          showIcon
          icon={<AiOutlineExclamationCircle />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 选中流程的信息 */}
      {selectedFlow && (
        <div
          style={{
            background: "#f5f5f5",
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1 }}>
              <Text strong>{selectedFlow.name}</Text>
              {selectedFlow.description && (
                <Paragraph
                  type="secondary"
                  style={{ marginBottom: 0, fontSize: 12 }}
                >
                  {selectedFlow.description}
                </Paragraph>
              )}
            </div>
            <Tooltip title="在新窗口中编辑子流程">
              <Button
                type="link"
                size="small"
                icon={<AiOutlineEdit />}
                onClick={() => {
                  window.open(`/flows/${selectedFlow.id}`, "_blank");
                }}
                style={{ padding: "0 4px" }}
              >
                编辑
              </Button>
            </Tooltip>
          </div>
        </div>
      )}

      <Divider style={{ margin: "16px 0" }}>输入参数映射</Divider>

      {/* 输入参数映射 */}
      {subflowInputVariables.length > 0 ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <Button
              type="link"
              size="small"
              onClick={handleAutoFillMappings}
              style={{ padding: 0 }}
            >
              自动填充所有参数
            </Button>
          </div>

          {config.inputMappings.map((mapping, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 8,
                alignItems: "flex-start",
              }}
            >
              {/* 目标变量选择 */}
              <div style={{ flex: 1 }}>
                <Select
                  placeholder="子流程参数"
                  value={mapping.targetVariable || undefined}
                  onChange={(value) =>
                    handleMappingChange(index, "targetVariable", value)
                  }
                  size="small"
                  style={{ width: "100%" }}
                >
                  {subflowInputVariables.map((v) => (
                    <Option key={v.name} value={v.name}>
                      <Space>
                        <span>{v.label || v.name}</span>
                        {v.required && (
                          <Tag color="red" style={{ fontSize: 10 }}>
                            必填
                          </Tag>
                        )}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </div>

              {/* 来源表达式 */}
              <div style={{ flex: 2 }}>
                <VariableInput
                  value={mapping.sourceExpression}
                  onChange={(value) =>
                    handleMappingChange(index, "sourceExpression", value)
                  }
                  placeholder="来源表达式"
                  currentNodeId={node.id}
                />
              </div>

              {/* 删除按钮 */}
              <Tooltip title="删除">
                <Button
                  type="text"
                  danger
                  icon={<AiOutlineDelete />}
                  onClick={() => handleRemoveMapping(index)}
                  size="small"
                />
              </Tooltip>
            </div>
          ))}

          <Button
            type="dashed"
            onClick={handleAddMapping}
            block
            icon={<AiOutlinePlus />}
            size="small"
          >
            添加参数映射
          </Button>

          {/* 未配置的必填参数警告 */}
          {(() => {
            const configuredVars = new Set(
              config.inputMappings.map((m) => m.targetVariable)
            );
            const missingRequired = subflowInputVariables.filter(
              (v) => v.required && !configuredVars.has(v.name)
            );
            if (missingRequired.length > 0) {
              return (
                <Alert
                  message="以下必填参数尚未配置"
                  description={missingRequired
                    .map((v) => v.label || v.name)
                    .join(", ")}
                  type="warning"
                  showIcon
                  icon={<AiOutlineWarning />}
                  style={{ marginTop: 12 }}
                />
              );
            }
            return null;
          })()}
        </>
      ) : selectedFlow ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="该子流程没有定义输入参数"
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="请先选择子流程"
        />
      )}

      <Divider style={{ margin: "16px 0" }}>高级设置</Divider>

      {/* 错误处理 */}
      <div className="config-item">
        <div className="config-label">
          <Tooltip title="子流程执行失败时，是否继续执行父流程">
            <span>失败时继续</span>
          </Tooltip>
        </div>
        <Switch
          size="small"
          checked={config.continueOnError}
          onChange={(checked) =>
            onChange({ ...config, continueOnError: checked })
          }
        />
      </div>

      {/* 超时设置 */}
      <div className="config-item">
        <div className="config-label">
          <Tooltip title="子流程执行的最大等待时间">
            <span>超时时间 (毫秒)</span>
          </Tooltip>
        </div>
        <InputNumber
          value={config.timeout}
          onChange={(value) => onChange({ ...config, timeout: value || 30000 })}
          min={1000}
          max={600000}
          step={1000}
          size="small"
          style={{ width: "100%" }}
          placeholder="30000"
        />
      </div>

      <style>{`
        .subflow-node-config .config-item {
          margin-bottom: 12px;
        }
        .subflow-node-config .config-label {
          margin-bottom: 4px;
          font-size: 13px;
          color: rgba(0, 0, 0, 0.88);
        }
      `}</style>
    </div>
  );
};

export default SubflowNodeConfigComponent;
