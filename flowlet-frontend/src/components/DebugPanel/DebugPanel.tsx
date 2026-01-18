import React, { useState, useEffect } from "react";
import {
  Drawer,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Divider,
  Alert,
  Spin,
  Tag,
  Typography,
  Tooltip,
} from "antd";
import {
  AiOutlinePlayCircle,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineLoading,
  AiOutlineClockCircle,
  AiOutlineApi,
  AiOutlineThunderbolt,
  AiOutlineBranches,
  AiOutlineFlag,
  AiOutlineStop,
  AiOutlineCopy,
  AiOutlineRight,
  AiOutlineMinusCircle,
} from "react-icons/ai";
import { TbFingerprint } from "react-icons/tb";
import {
  InputVariable,
  VariableType,
  StartNodeConfig,
  FlowNodeData,
  NodeType,
} from "@/types";
import { Node, Edge } from "@xyflow/react";
import { message } from "@/components/AppMessageContext/staticMethods";
import JsonViewerTabs from "@/components/JsonViewerTabs";
import { useStyles } from "./DebugPanel.style";
import { SiApachekafka } from "react-icons/si";
import api from "@/services/api";
import { LuBrain } from "react-icons/lu";

const { Text } = Typography;

interface DebugPanelProps {
  open: boolean;
  onClose: () => void;
  flowId?: string;
  flowName?: string;
  projectId?: string;
  nodes: Node[];
  edges: Edge[];
}

interface ExecutionResult {
  executionId: string;
  status: "running" | "completed" | "failed" | "pending" | "waiting";
  nodeExecutions: NodeExecutionRecord[];
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

interface NodeExecutionRecord {
  nodeId: string;
  nodeName: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  inputData?: string;
  outputData?: string;
  errorMessage?: string;
  executionData?: string; // 执行过程数据（等待回调时的请求/响应信息）
}

// 计算执行耗时
const calculateDuration = (start?: string, end?: string): string => {
  if (!start) return "-";
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const duration = endTime - startTime;
  if (duration < 1000) {
    return `${duration}ms`;
  }
  return `${(duration / 1000).toFixed(2)}s`;
};

const DebugPanel: React.FC<DebugPanelProps> = ({
  open,
  onClose,
  flowId,
  flowName,
  projectId,
  nodes,
  edges,
}) => {
  const { styles, cx } = useStyles();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(720);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 处理拖拽调整宽度
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 480 && newWidth <= 1200) {
        setDrawerWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const startNode = nodes.find(
    (n) => (n.data as { nodeType?: string })?.nodeType === "start"
  );
  const startConfig = startNode?.data?.config as StartNodeConfig | undefined;
  const inputVariables: InputVariable[] = startConfig?.variables || [];

  // 轮询执行状态
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    if (polling && executionResult?.executionId) {
      timer = setInterval(async () => {
        try {
          const { data } = await api.get(
            `/executions/${executionResult.executionId}`
          );

          if (data.code === 200) {
            const execution = data.data;
            const { data: nodesData } = await api.get(
              `/executions/${executionResult.executionId}/nodes`
            );

            const nodeExecs = nodesData.data || [];
            setExecutionResult({
              executionId: execution.id,
              status: execution.status,
              nodeExecutions: nodeExecs,
              errorMessage: execution.errorMessage,
              startedAt: execution.startedAt,
              completedAt: execution.completedAt,
            });

            // 自动选中第一个节点
            if (nodeExecs.length > 0 && !selectedNodeId) {
              setSelectedNodeId(nodeExecs[0].nodeId);
            }

            if (
              execution.status === "completed" ||
              execution.status === "failed"
            ) {
              setPolling(false);
            }
          }
        } catch (error) {
          console.error("轮询执行状态失败:", error);
        }
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [polling, executionResult?.executionId, selectedNodeId]);

  const buildGraphData = () => {
    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
        data: edge.data,
      })),
    };
  };

  const handleExecute = async () => {
    if (nodes.length === 0) {
      message.error("请先添加节点");
      return;
    }

    const hasStartNode = nodes.some(
      (n) => (n.data as FlowNodeData)?.nodeType === "start"
    );
    if (!hasStartNode) {
      message.error("请添加开始节点");
      return;
    }

    try {
      const values = await form.validateFields();
      const normalizedInputs = { ...values };
      const structureVariables = inputVariables.filter(
        (variable) => variable.type === VariableType.STRUCTURE
      );
      for (const variable of structureVariables) {
        const rawValue = normalizedInputs[variable.name];
        if (rawValue === undefined || rawValue === "") {
          continue;
        }
        if (typeof rawValue === "string") {
          try {
            normalizedInputs[variable.name] = JSON.parse(rawValue);
          } catch {
            message.error(`请输入有效的 JSON：${variable.label || variable.name}`);
            return;
          }
        }
      }
      setLoading(true);
      setExecutionResult(null);
      setSelectedNodeId(null);

      const graphData = buildGraphData();
      const { data } = await api.post("/executions/debug", {
        flowId,
        projectId,
        graphData,
        inputs: normalizedInputs,
        flowName: flowName || "调试流程",
      });

      if (data.code === 200) {
        message.success("调试执行已开始");
        setExecutionResult({
          executionId: data.data.id,
          status: data.data.status,
          nodeExecutions: [],
          startedAt: data.data.startedAt,
        });
        setPolling(true);
      } else {
        message.error(data.message || "调试执行失败");
      }
    } catch (error) {
      console.error("调试执行失败:", error);
      message.error("调试执行失败");
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (variable: InputVariable) => {
    const {
      name,
      label,
      type,
      required,
      options,
      min,
      max,
      maxLength,
      defaultValue,
    } = variable;

    switch (type) {
      case VariableType.NUMBER:
        return (
          <Form.Item
            key={name}
            name={name}
            label={label || name}
            rules={[{ required, message: `请输入${label || name}` }]}
            initialValue={defaultValue}
          >
            <InputNumber
              min={min}
              max={max}
              style={{ width: "100%" }}
              placeholder={`请输入${label || name}`}
            />
          </Form.Item>
        );
      case VariableType.PARAGRAPH:
        return (
          <Form.Item
            key={name}
            name={name}
            label={label || name}
            rules={[{ required, message: `请输入${label || name}` }]}
            initialValue={defaultValue}
          >
            <Input.TextArea
              rows={3}
              maxLength={maxLength}
              showCount
              placeholder={`请输入${label || name}`}
            />
          </Form.Item>
        );
      case VariableType.SELECT:
        return (
          <Form.Item
            key={name}
            name={name}
            label={label || name}
            rules={[{ required, message: `请选择${label || name}` }]}
            initialValue={defaultValue}
          >
            <Select placeholder={`请选择${label || name}`}>
              {options?.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      case VariableType.STRUCTURE:
        return (
          <Form.Item
            key={name}
            name={name}
            label={label || name}
            rules={[{ required, message: `请输入${label || name}` }]}
            initialValue={defaultValue}
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入 JSON"
            />
          </Form.Item>
        );
      default:
        return (
          <Form.Item
            key={name}
            name={name}
            label={label || name}
            rules={[{ required, message: `请输入${label || name}` }]}
            initialValue={defaultValue}
          >
            <Input
              maxLength={maxLength}
              placeholder={`请输入${label || name}`}
            />
          </Form.Item>
        );
    }
  };

  // 获取节点信息
  const getNodeInfo = (nodeId: string): { name: string; type: string } => {
    const node = nodes.find((n) => n.id === nodeId);
    const data = node?.data as FlowNodeData | undefined;
    return {
      name: data?.label || nodeId,
      type: data?.nodeType || "unknown",
    };
  };

  // 获取节点类型图标
  const getNodeTypeIcon = (type: string) => {
    switch (type) {
      case NodeType.START:
        return <AiOutlineFlag className={cx(styles.nodeTypeIcon, "start")} />;
      case NodeType.END:
        return <AiOutlineStop className={cx(styles.nodeTypeIcon, "end")} />;
      case NodeType.API:
        return <AiOutlineApi className={cx(styles.nodeTypeIcon, "api")} />;
      case NodeType.KAFKA:
        return <SiApachekafka className={cx(styles.nodeTypeIcon, "kafka")} />;
      case NodeType.TRANSFORM:
        return (
          <AiOutlineThunderbolt
            className={cx(styles.nodeTypeIcon, "transform")}
          />
        );
      case NodeType.CONDITION:
        return (
          <AiOutlineBranches className={cx(styles.nodeTypeIcon, "condition")} />
        );
      case NodeType.LLM:
        return <LuBrain className={cx(styles.nodeTypeIcon, "api")} />;
      case NodeType.SIMHASH:
        return <TbFingerprint className={cx(styles.nodeTypeIcon, "api")} />;
      default:
        return <AiOutlineApi className={cx(styles.nodeTypeIcon, "api")} />;
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return (
          <AiOutlineCheckCircle className={cx(styles.statusIcon, "success")} />
        );
      case "failed":
        return (
          <AiOutlineCloseCircle className={cx(styles.statusIcon, "failed")} />
        );
      case "running":
        return (
          <AiOutlineLoading
            className={cx(styles.statusIcon, "running", styles.anticonSpin)}
          />
        );
      case "skipped":
        return (
          <AiOutlineMinusCircle className={cx(styles.statusIcon, "skipped")} />
        );
      default:
        return (
          <AiOutlineClockCircle className={cx(styles.statusIcon, "pending")} />
        );
    }
  };

  // 复制内容
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success("已复制到剪贴板");
  };

  // 获取选中的节点执行记录
  const selectedNodeExecution = executionResult?.nodeExecutions.find(
    (n) => n.nodeId === selectedNodeId
  );
  const selectedNodeInfo = selectedNodeId ? getNodeInfo(selectedNodeId) : null;

  return (
    <Drawer
      title="调试运行"
      placement="right"
      size={drawerWidth}
      onClose={onClose}
      open={open}
      extra={
        <Button
          type="primary"
          icon={<AiOutlinePlayCircle />}
          loading={loading}
          onClick={handleExecute}
          disabled={nodes.length === 0}
        >
          运行
        </Button>
      }
    >
      {/* 拖拽调整宽度的手柄 */}
      <div
        className="drawer-resize-handle"
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: "ew-resize",
          backgroundColor: isResizing ? "#1890ff" : "transparent",
          transition: "background-color 0.2s",
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.backgroundColor = "#e6f4ff";
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            (e.target as HTMLElement).style.backgroundColor = "transparent";
          }
        }}
      />

      {/* 输入变量表单 */}
      <div className={styles.debugSection}>
        <div className={styles.debugSectionTitle}>输入变量</div>
        <Form form={form} layout="vertical" className={styles.debugForm}>
          {inputVariables.length > 0 ? (
            inputVariables.map(renderInputField)
          ) : (
            <Text type="secondary">开始节点未配置输入变量，可直接运行</Text>
          )}
        </Form>
      </div>

      <Divider />

      {/* 执行结果 */}
      <div className={styles.debugSection}>
        <div className={styles.debugSectionTitle}>执行结果</div>

        {loading && (
          <div className={styles.debugLoading}>
            <Spin tip="正在启动执行...">
              <div style={{ padding: 30 }} />
            </Spin>
          </div>
        )}

        {executionResult && (
          <div className={styles.traceContainer}>
            {/* 执行概览 */}
            <div className={styles.traceHeader}>
              <div className={styles.traceInfo}>
                <span className={styles.traceLabel}>Trace</span>
                <span className={styles.traceId}>
                  {executionResult.executionId.substring(0, 8)}
                </span>
              </div>
              {executionResult.status === "running" ||
              executionResult.status === "pending" ? (
                <Tag
                  color="processing"
                  icon={<AiOutlineLoading className={styles.anticonSpin} />}
                >
                  执行中
                </Tag>
              ) : executionResult.status === "completed" ? (
                <Tag color="success" icon={<AiOutlineCheckCircle />}>
                  成功
                </Tag>
              ) : executionResult.status === "failed" ? (
                <Tag color="error" icon={<AiOutlineCloseCircle />}>
                  失败
                </Tag>
              ) : (
                <Tag color="warning" icon={<AiOutlineClockCircle />}>
                  {executionResult.status}
                </Tag>
              )}
            </div>

            {executionResult.errorMessage && (
              <Alert
                title="执行失败"
                description={executionResult.errorMessage}
                type="error"
                showIcon
                style={{ margin: 12 }}
              />
            )}

            {/* 左右分栏布局 */}
            <div className={styles.traceContent}>
              {/* 左侧节点树 */}
              <div className={styles.traceTree}>
                <div className={styles.treeHeader}>
                  <Text type="secondary">节点列表</Text>
                </div>
                <div className={styles.treeNodes}>
                  {executionResult.nodeExecutions.map((node) => {
                    const nodeInfo = getNodeInfo(node.nodeId);
                    const isSelected = selectedNodeId === node.nodeId;
                    return (
                      <div
                        key={node.nodeId}
                        className={cx(
                          styles.treeNode,
                          isSelected && "selected"
                        )}
                        onClick={() => setSelectedNodeId(node.nodeId)}
                      >
                        <div className={styles.treeNodeMain}>
                          <span className={styles.treeNodeIcon}>
                            {getNodeTypeIcon(nodeInfo.type)}
                          </span>
                          <span className={styles.treeNodeName}>
                            {nodeInfo.name}
                          </span>
                        </div>
                        <div className={styles.treeNodeMeta}>
                          <span className={styles.treeNodeDuration}>
                            {calculateDuration(
                              node.startedAt,
                              node.completedAt
                            )}
                          </span>
                          {getStatusIcon(node.status)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {polling && (
                  <div className={styles.treeLoading}>
                    <AiOutlineLoading className={styles.anticonSpin} />
                    <span>执行中...</span>
                  </div>
                )}
              </div>

              {/* 右侧详情面板 */}
              <div className={styles.traceDetail}>
                {selectedNodeExecution ? (
                  <>
                    <div className={styles.detailHeader}>
                      <div className={styles.detailTitle}>
                        <span className={styles.detailIcon}>
                          {getNodeTypeIcon(selectedNodeInfo?.type || "")}
                        </span>
                        <span className={styles.detailName}>
                          {selectedNodeInfo?.name}
                        </span>
                      </div>
                      <span className={styles.detailTime}>
                        {calculateDuration(
                          selectedNodeExecution.startedAt,
                          selectedNodeExecution.completedAt
                        )}
                      </span>
                    </div>

                    {/* 输入数据 */}
                    {selectedNodeExecution.inputData && (
                      <div className={styles.detailSection}>
                        <div className={styles.sectionHeader}>
                          <div className={styles.sectionTitle}>
                            <AiOutlineRight className={styles.sectionIcon} />
                            <span>输入 (inputs)</span>
                          </div>
                          <div className={styles.sectionActions}>
                            <Tooltip title="复制">
                              <Button
                                type="text"
                                size="small"
                                icon={<AiOutlineCopy />}
                                onClick={() =>
                                  handleCopy(selectedNodeExecution.inputData!)
                                }
                              />
                            </Tooltip>
                          </div>
                        </div>
                        <div className={styles.sectionContent}>
                          <JsonViewerTabs
                            value={selectedNodeExecution.inputData}
                            variant="solid"
                          />
                        </div>
                      </div>
                    )}

                    {/* 执行过程数据（等待回调时展示请求/响应信息） */}
                    {selectedNodeExecution.executionData && (
                      <div className={styles.detailSection}>
                        <div className={styles.sectionHeader}>
                          <div className={styles.sectionTitle}>
                            <AiOutlineRight className={styles.sectionIcon} />
                            <span>执行信息</span>
                            <Tag
                              color="blue"
                              style={{ marginLeft: 8, fontSize: 10 }}
                            >
                              等待回调
                            </Tag>
                          </div>
                          <div className={styles.sectionActions}>
                            <Tooltip title="复制">
                              <Button
                                type="text"
                                size="small"
                                icon={<AiOutlineCopy />}
                                onClick={() =>
                                  handleCopy(
                                    selectedNodeExecution.executionData!
                                  )
                                }
                              />
                            </Tooltip>
                          </div>
                        </div>
                        <div className={styles.sectionContent}>
                          <JsonViewerTabs
                            value={selectedNodeExecution.executionData}
                            variant="solid"
                          />
                        </div>
                      </div>
                    )}

                    {/* 输出数据 */}
                    {selectedNodeExecution.outputData && (
                      <div className={styles.detailSection}>
                        <div className={styles.sectionHeader}>
                          <div className={styles.sectionTitle}>
                            <span>输出</span>
                          </div>
                        </div>
                        <div className={styles.sectionContent}>
                          <JsonViewerTabs
                            value={selectedNodeExecution.outputData}
                            variant="solid"
                          />
                        </div>
                      </div>
                    )}

                    {/* 跳过提示 */}
                    {selectedNodeExecution.status?.toLowerCase() ===
                      "skipped" && (
                      <div className={styles.detailSection}>
                        <div className={styles.sectionHeader}>
                          <div className={styles.sectionTitle}>
                            <AiOutlineMinusCircle
                              className={styles.sectionIcon}
                            />
                            <span>已跳过 (skipped)</span>
                          </div>
                        </div>
                        <div
                          className={cx(
                            styles.sectionContent,
                            "skippedContent"
                          )}
                        >
                          {selectedNodeExecution.errorMessage ||
                            "执行条件不满足，节点已跳过"}
                        </div>
                      </div>
                    )}

                    {/* 错误信息 */}
                    {selectedNodeExecution.errorMessage &&
                      selectedNodeExecution.status?.toLowerCase() !==
                        "skipped" && (
                        <div className={styles.detailSection}>
                          <div className={styles.sectionHeader}>
                            <div className={cx(styles.sectionTitle, "error")}>
                              <AiOutlineCloseCircle
                                className={styles.sectionIcon}
                              />
                              <span>错误 (error)</span>
                            </div>
                          </div>
                          <div
                            className={cx(
                              styles.sectionContent,
                              "errorContent"
                            )}
                          >
                            {selectedNodeExecution.errorMessage}
                          </div>
                        </div>
                      )}

                    {/* 无数据提示 */}
                    {!selectedNodeExecution.inputData &&
                      !selectedNodeExecution.outputData &&
                      !selectedNodeExecution.executionData &&
                      !selectedNodeExecution.errorMessage && (
                        <div className={styles.detailEmpty}>
                          <Text type="secondary">暂无数据</Text>
                        </div>
                      )}
                  </>
                ) : (
                  <div className={styles.detailEmpty}>
                    <Text type="secondary">
                      {executionResult.nodeExecutions.length > 0
                        ? "选择左侧节点查看详情"
                        : "等待节点执行..."}
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && !executionResult && (
          <div className={styles.emptyState}>
            <AiOutlinePlayCircle className={styles.emptyIcon} />
            <Text type="secondary">点击"运行"按钮开始调试</Text>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default DebugPanel;
