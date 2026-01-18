import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Spin,
  Typography,
  Row,
  Col,
  Tooltip,
  Tabs,
  Divider,
  Dropdown,
} from "antd";
import { message } from "@/components/AppMessageContext/staticMethods";
import JsonViewerTabs from "@/components/JsonViewerTabs";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  Panel,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AiOutlineCheckCircle,
  AiOutlineClockCircle,
  AiOutlineCloseCircle,
  AiOutlineSync,
  AiOutlineApi,
  AiOutlineDown,
  AiOutlineRight,
  AiOutlineCopy,
  AiOutlineZoomIn,
  AiOutlineZoomOut,
  AiOutlineExpand,
} from "react-icons/ai";
import {
  BsPlayCircle,
  BsStopCircle,
  BsArrowsCollapse,
  BsLightning,
} from "react-icons/bs";
import { SiApachekafka } from "react-icons/si";
import dayjs from "dayjs";
import { executionApi, flowApi } from "@/services/flowService";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import {
  FlowExecution,
  NodeExecution,
  ExecutionStatus,
  FlowGraphData,
  NodeType,
} from "@/types";
import { useStyles } from "./ExecutionDetail.style";
import { ExecutionStatusTag } from "@/components/ExecutionStatusTag";
import { LuBrain } from "react-icons/lu";
import { getNodeTypeConfig } from "@/config/nodeTypes";

const { Title, Text } = Typography;

// 解析 JSON 字符串
const parseJsonSafe = (str: string | undefined | null) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

// 复制到剪贴板 - 需要传入翻译后的消息
const copyToClipboard = (text: string, successMessage: string) => {
  navigator.clipboard.writeText(text);
  message.success(successMessage);
};

const parseFlowGraphData = (
  graphData: string | FlowGraphData | null | undefined
): FlowGraphData | null => {
  if (!graphData) return null;
  if (typeof graphData !== "string") return graphData;
  try {
    return JSON.parse(graphData) as FlowGraphData;
  } catch {
    return null;
  }
};

const getStatusMeta = (status: ExecutionStatus | undefined, t: (key: string) => string) => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return { label: t("detail.status.completed"), color: "#52c41a" };
    case ExecutionStatus.FAILED:
      return { label: t("detail.status.failed"), color: "#ff4d4f" };
    case ExecutionStatus.RUNNING:
      return { label: t("detail.status.running"), color: "#1890ff" };
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_CALLBACK:
      return { label: t("detail.status.waiting"), color: "#faad14" };
    case ExecutionStatus.PAUSED:
      return { label: t("detail.status.paused"), color: "#fa8c16" };
    case ExecutionStatus.PENDING:
      return { label: t("detail.status.pending"), color: "#bfbfbf" };
    default:
      return { label: t("detail.status.notExecuted"), color: "#bfbfbf" };
  }
};

type ExecutionFlowNodeData = {
  label: string;
  nodeType: NodeType;
  description?: string;
  status?: ExecutionStatus;
  executed: boolean;
  failed: boolean;
};

const ExecutionFlowNode: React.FC<NodeProps> = ({ data, selected }) => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation("execution");
  const nodeData = data as ExecutionFlowNodeData;
  const nodeTypeConfig = getNodeTypeConfig(nodeData.nodeType);
  const nodeIcon = nodeTypeConfig?.icon || <AiOutlineApi />;
  const nodeColor = nodeTypeConfig?.color || "#1890ff";
  const statusMeta = getStatusMeta(
    nodeData.executed ? nodeData.status : undefined,
    t
  );
  const typeLabel =
    nodeTypeConfig?.label || String(nodeData.nodeType).toUpperCase();

  const borderColor = nodeData.failed
    ? "#ff4d4f"
    : selected
      ? nodeColor
      : undefined;

  return (
    <div
      className={cx(
        styles.flowNode,
        nodeData.failed && styles.flowNodeFailed,
        selected && styles.flowNodeSelected
      )}
      style={borderColor ? { borderColor } : undefined}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={styles.flowHandle}
        style={{ backgroundColor: nodeColor, top: 20 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={styles.flowHandle}
        style={{ backgroundColor: nodeColor, top: 20 }}
      />
      <div
        className={styles.flowNodeHeader}
        style={{ backgroundColor: nodeColor }}
      >
        <span className={styles.flowNodeIcon}>{nodeIcon}</span>
        <span className={styles.flowNodeType}>{typeLabel}</span>
      </div>
      <div className={styles.flowNodeBody}>
        <div className={styles.flowNodeLabel}>{nodeData.label}</div>
        {nodeData.description && (
          <div className={styles.flowNodeDescription}>
            {nodeData.description}
          </div>
        )}
        <div className={styles.flowNodeMeta}>
          <span className={styles.flowNodeMetaDot} style={{ background: statusMeta.color }} />
          <span>{statusMeta.label}</span>
        </div>
      </div>
    </div>
  );
};

const ExecutionDetail: React.FC = () => {
  const { styles, cx } = useStyles();
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation("execution");
  const [loading, setLoading] = useState(true);
  const [execution, setExecution] = useState<FlowExecution | null>(null);
  const [nodeExecutions, setNodeExecutions] = useState<NodeExecution[]>([]);
  const [flowGraph, setFlowGraph] = useState<FlowGraphData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<
    ReactFlowInstance<Node<ExecutionFlowNodeData>, Edge> | null
  >(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [detailWidth, setDetailWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [expandedSections, setExpandedSections] = useState({
    input: true,
    executionData: true,
    error: true,
  });

  // 获取节点类型图标
  const getNodeTypeIcon = (nodeType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      START: (
        <BsPlayCircle
          className={cx(styles.nodeTypeIcon, styles.nodeTypeIconStart)}
        />
      ),
      END: (
        <BsStopCircle
          className={cx(styles.nodeTypeIcon, styles.nodeTypeIconEnd)}
        />
      ),
      API_CALL: (
        <AiOutlineApi
          className={cx(styles.nodeTypeIcon, styles.nodeTypeIconApi)}
        />
      ),
      KAFKA_PRODUCER: (
        <SiApachekafka
          className={cx(styles.nodeTypeIcon, styles.nodeTypeIconKafka)}
        />
      ),
      DATA_TRANSFORM: (
        <BsArrowsCollapse
          className={cx(styles.nodeTypeIcon, styles.nodeTypeIconTransform)}
        />
      ),
      CONDITION: (
        <BsLightning
          className={cx(styles.nodeTypeIcon, styles.nodeTypeIconCondition)}
        />
      ),
      LLM: (
        <LuBrain className={cx(styles.nodeTypeIcon, styles.nodeTypeIconApi)} />
      ),
      llm: (
        <LuBrain className={cx(styles.nodeTypeIcon, styles.nodeTypeIconApi)} />
      ),
    };
    return (
      iconMap[nodeType] || (
        <AiOutlineApi
          className={cx(styles.nodeTypeIcon, styles.nodeTypeIconApi)}
        />
      )
    );
  };

  // 获取状态图标
  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.COMPLETED:
        return (
          <AiOutlineCheckCircle
            className={cx(styles.statusIcon, styles.statusIconSuccess)}
          />
        );
      case ExecutionStatus.FAILED:
        return (
          <AiOutlineCloseCircle
            className={cx(styles.statusIcon, styles.statusIconFailed)}
          />
        );
      case ExecutionStatus.RUNNING:
        return (
          <AiOutlineSync
            className={cx(
              styles.statusIcon,
              styles.statusIconRunning,
              styles.spin
            )}
          />
        );
      default:
        return (
          <AiOutlineClockCircle
            className={cx(styles.statusIcon, styles.statusIconPending)}
          />
        );
    }
  };

  const loadExecution = useCallback(async () => {
    if (!id) return;

    try {
      const execRes = await executionApi.get(id);
      const executionData = execRes.data.data;
      const nodesRes = await executionApi.getNodes(id);
      setExecution(executionData);
      const nodes = nodesRes.data.data || [];
      setNodeExecutions(nodes);
      if (executionData.flowVersion > 0) {
        try {
          const versionRes = await flowApi.getVersion(
            executionData.flowId,
            executionData.flowVersion
          );
          setFlowGraph(parseFlowGraphData(versionRes.data.data.graphData));
        } catch {
          try {
            const flowRes = await flowApi.get(executionData.flowId);
            setFlowGraph(parseFlowGraphData(flowRes.data.data.graphData));
          } catch {
            setFlowGraph(null);
          }
        }
      } else {
        try {
          const flowRes = await flowApi.get(executionData.flowId);
          setFlowGraph(parseFlowGraphData(flowRes.data.data.graphData));
        } catch {
          setFlowGraph(null);
        }
      }
    } catch {
      message.error(t("detail.message.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadExecution();
  }, [loadExecution]);

  // 自动刷新
  useEffect(() => {
    if (
      execution?.status === ExecutionStatus.RUNNING ||
      execution?.status === ExecutionStatus.WAITING ||
      execution?.status === ExecutionStatus.PAUSED ||
      execution?.status === ExecutionStatus.WAITING_CALLBACK
    ) {
      const timer = setInterval(() => {
        loadExecution();
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [execution?.status, loadExecution]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!draggingRef.current || !flowContainerRef.current) return;
      const rect = flowContainerRef.current.getBoundingClientRect();
      const nextWidth = Math.max(280, Math.min(520, rect.right - event.clientX));
      setDetailWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadExecution();
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 获取选中的节点
  const selectedNode = nodeExecutions.find((n) => n.nodeId === selectedNodeId);
  const executionNodeMap = useMemo(() => {
    return new Map(nodeExecutions.map((node) => [node.nodeId, node]));
  }, [nodeExecutions]);
  const flowNodes = useMemo(() => {
    if (!flowGraph) return [];
    return flowGraph.nodes.map((node) => {
      const executionNode = executionNodeMap.get(node.id);
      return {
        id: node.id,
        type: "execution",
        position: node.position,
        data: {
          label: node.data.label || node.id,
          nodeType: node.data.nodeType || NodeType.API,
          description: node.data.description,
          status: executionNode?.status,
          executed: Boolean(executionNode),
          failed: executionNode?.status === ExecutionStatus.FAILED,
        },
        selected: selectedNodeId === node.id,
      } as Node<ExecutionFlowNodeData>;
    });
  }, [executionNodeMap, flowGraph, selectedNodeId]);
  const flowEdges = useMemo(() => {
    if (!flowGraph) return [];
    return flowGraph.edges.map((edge) => {
      return {
        ...edge,
        type: "default",
        sourceHandle: undefined,
        targetHandle: undefined,
        animated: false,
      } as Edge;
    });
  }, [flowGraph]);
  const flowNodeTypes = useMemo(() => ({ execution: ExecutionFlowNode }), []);

  // 构建面包屑（必须在所有条件返回之前调用）
  const breadcrumbItems = useMemo(
    () => [
      { title: t("history.title"), path: "/executions" },
      { title: t("detail.title") },
    ],
    [t]
  );
  useBreadcrumb(breadcrumbItems, [breadcrumbItems]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip={t("detail.loading")}>
          <div style={{ padding: 50 }} />
        </Spin>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className={styles.loadingContainer}>
        <Text type="secondary">{t("detail.message.notExist")}</Text>
      </div>
    );
  }

  const renderNodeDetail = () => {
    if (!selectedNode) return null;

    return (
      <div className={styles.traceDetail}>
        <div className={styles.detailHeader}>
          <div className={styles.detailTitle}>
            <span className={styles.detailIcon}>
              {getNodeTypeIcon(selectedNode.nodeType || "API_CALL")}
            </span>
            <span className={styles.detailName}>{selectedNode.nodeName}</span>
            <ExecutionStatusTag status={selectedNode.status} />
          </div>
          <div className={styles.detailMeta}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(selectedNode.startedAt).format("YYYY-MM-DD HH:mm:ss")}
              {selectedNode.completedAt &&
                ` → ${dayjs(selectedNode.completedAt).format("HH:mm:ss")}`}
            </Text>
          </div>
        </div>

        <div className={styles.detailBody}>
          {/* 输入数据 */}
          {selectedNode.inputData && (
            <div className={styles.detailSection}>
              <div
                className={styles.sectionHeader}
                onClick={() => toggleSection("input")}
              >
                <div className={styles.sectionTitle}>
                  {expandedSections.input ? (
                    <AiOutlineDown className={styles.sectionIcon} />
                  ) : (
                    <AiOutlineRight className={styles.sectionIcon} />
                  )}
                  {t("detail.sections.input")}
                </div>
                <div className={styles.sectionActions}>
                  <Tooltip title={t("detail.actions.copy")}>
                    <Button
                      type="text"
                      size="small"
                      icon={<AiOutlineCopy />}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(
                          JSON.stringify(
                            parseJsonSafe(selectedNode.inputData),
                            null,
                            2
                          ),
                          t("detail.message.copySuccess")
                        );
                      }}
                    />
                  </Tooltip>
                </div>
              </div>
              {expandedSections.input && (
                <div className={styles.sectionContent}>
                  <JsonViewerTabs
                    value={selectedNode.inputData}
                    variant="solid"
                  />
                </div>
              )}
            </div>
          )}

          {/* 执行过程数据（等待回调时展示请求/响应信息） */}
          {selectedNode.executionData && (
            <div className={styles.detailSection}>
              <div
                className={styles.sectionHeader}
                onClick={() => toggleSection("executionData")}
              >
                <div
                  className={cx(
                    styles.sectionTitle,
                    styles.sectionTitleExecutionData
                  )}
                >
                  {expandedSections.executionData ? (
                    <AiOutlineDown className={styles.sectionIcon} />
                  ) : (
                    <AiOutlineRight className={styles.sectionIcon} />
                  )}
                  {t("detail.sections.executionInfo")}
                  <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>
                    {t("detail.sections.waitingCallback")}
                  </Tag>
                </div>
                <div className={styles.sectionActions}>
                  <Tooltip title={t("detail.actions.copy")}>
                    <Button
                      type="text"
                      size="small"
                      icon={<AiOutlineCopy />}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(
                          JSON.stringify(
                            parseJsonSafe(selectedNode.executionData),
                            null,
                            2
                          ),
                          t("detail.message.copySuccess")
                        );
                      }}
                    />
                  </Tooltip>
                </div>
              </div>
              {expandedSections.executionData && (
                <div
                  className={cx(
                    styles.sectionContent,
                    styles.sectionContentExecutionData
                  )}
                >
                  <JsonViewerTabs
                    value={selectedNode.executionData}
                    variant="solid"
                  />
                </div>
              )}
            </div>
          )}

          {/* 输出数据 */}
          {selectedNode.outputData && (
            <div className={styles.detailCardWrap}>
              <Card size="small" title={t("detail.sections.output")} className={styles.detailCard}>
                <div className={styles.detailCardContent}>
                  <JsonViewerTabs
                    value={selectedNode.outputData}
                    variant="solid"
                  />
                </div>
              </Card>
            </div>
          )}

          {/* 错误信息 */}
          {selectedNode.errorMessage && (
            <div className={styles.detailSection}>
              <div
                className={styles.sectionHeader}
                onClick={() => toggleSection("error")}
              >
                <div
                  className={cx(
                    styles.sectionTitle,
                    styles.sectionTitleError
                  )}
                >
                  {expandedSections.error ? (
                    <AiOutlineDown className={styles.sectionIcon} />
                  ) : (
                    <AiOutlineRight className={styles.sectionIcon} />
                  )}
                  {t("detail.sections.error")}
                </div>
              </div>
              {expandedSections.error && (
                <div className={styles.sectionContent}>
                  <div className={styles.errorContent}>
                    {selectedNode.errorMessage}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={styles.pageHeader}>
        <Title level={4} style={{ margin: 0 }}>
          {t("detail.title")}
        </Title>
        <Button onClick={handleRefresh} loading={refreshing}>
          {t("detail.actions.refresh")}
        </Button>
      </div>
      <div>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title={t("detail.cards.executionInfo")}>
              <Descriptions column={3}>
                <Descriptions.Item label={t("detail.info.executionId")}>
                  {execution.id}
                </Descriptions.Item>
                <Descriptions.Item label={t("detail.info.flowId")}>
                  {execution.flowId}
                </Descriptions.Item>
                <Descriptions.Item label={t("detail.info.flowVersion")}>
                  v{execution.flowVersion}
                </Descriptions.Item>
                <Descriptions.Item label={t("detail.info.status")}>
                  <ExecutionStatusTag status={execution.status} />
                </Descriptions.Item>
                <Descriptions.Item label={t("detail.info.startedAt")}>
                  {dayjs(execution.startedAt).format("YYYY-MM-DD HH:mm:ss")}
                </Descriptions.Item>
                <Descriptions.Item label={t("detail.info.completedAt")}>
                  {execution.completedAt
                    ? dayjs(execution.completedAt).format("YYYY-MM-DD HH:mm:ss")
                    : "-"}
                </Descriptions.Item>
              </Descriptions>

              {execution.errorMessage && (
                <div className={styles.errorMessage}>
                  <Text type="danger">{t("detail.sections.error")}: {execution.errorMessage}</Text>
                </div>
              )}
            </Card>
          </Col>

          <Col span={12}>
            <Card title={t("detail.cards.inputData")} className={styles.dataCard}>
              <div className={styles.dataCardContent}>
                {execution.inputData ? (
                  <JsonViewerTabs value={execution.inputData} variant="solid" />
                ) : (
                  <Text type="secondary">{t("detail.noData")}</Text>
                )}
              </div>
            </Card>
          </Col>

          <Col span={12}>
            <Card title={t("detail.cards.outputData")} className={styles.dataCard}>
              <div className={styles.dataCardContent}>
                {execution.outputData ? (
                  <JsonViewerTabs value={execution.outputData} variant="solid" />
                ) : (
                  <Text type="secondary">{t("detail.noData")}</Text>
                )}
              </div>
            </Card>
          </Col>

          <Col span={24}>
            <Card title={t("detail.cards.nodeRecords")} className={styles.traceCard}>
              <Tabs
                className={styles.traceTabs}
                items={[
                  {
                    key: "list",
                    label: t("detail.tabs.nodeList"),
                    children:
                      nodeExecutions.length === 0 ? (
                        <div className={styles.emptyNodes}>
                          <Text type="secondary">{t("detail.nodeList.noRecords")}</Text>
                        </div>
                      ) : (
                        <div className={styles.traceContainer}>
                          {/* 左侧节点树 */}
                          <div className={styles.traceTree}>
                            <div className={styles.treeHeader}>
                              <Text strong>{t("detail.nodeList.title")}</Text>
                              <Text type="secondary">
                                {t("detail.nodeList.nodeCount", { count: nodeExecutions.length })}
                              </Text>
                            </div>
                            <div className={styles.treeNodes}>
                              {nodeExecutions.map((node) => {
                                const duration =
                                  node.startedAt && node.completedAt
                                    ? dayjs(node.completedAt).diff(
                                        dayjs(node.startedAt),
                                        "millisecond"
                                      )
                                    : null;
                                return (
                                  <div
                                    key={node.nodeId}
                                    className={cx(
                                      styles.treeNode,
                                      selectedNodeId === node.nodeId &&
                                        styles.treeNodeSelected
                                    )}
                                    onClick={() =>
                                      setSelectedNodeId(node.nodeId)
                                    }
                                  >
                                    <div className={styles.treeNodeMain}>
                                      <span className={styles.treeNodeIcon}>
                                        {getNodeTypeIcon(
                                          node.nodeType || "API_CALL"
                                        )}
                                      </span>
                                      <span className={styles.treeNodeName}>
                                        {node.nodeName}
                                      </span>
                                    </div>
                                    <div className={styles.treeNodeMeta}>
                                      {duration !== null && (
                                        <span className={styles.treeNodeDuration}>
                                          {duration >= 1000
                                            ? `${(duration / 1000).toFixed(2)}s`
                                            : `${duration}ms`}
                                        </span>
                                      )}
                                      {getStatusIcon(node.status)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 右侧详情面板 */}
                          {selectedNode && renderNodeDetail()}
                        </div>
                      ),
                  },
                  {
                    key: "graph",
                    label: t("detail.tabs.graph"),
                    children: flowGraph ? (
                      <div
                        className={styles.flowContainer}
                        ref={flowContainerRef}
                      >
                        <div className={styles.flowCanvas}>
                          <ReactFlow
                            nodes={flowNodes}
                            edges={flowEdges}
                            nodeTypes={flowNodeTypes}
                            fitView
                            fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable
                            panOnDrag
                            zoomOnScroll
                            style={{ width: "100%", height: "100%" }}
                            className={styles.reactFlowReadonly}
                            onNodeClick={(_, node) =>
                              setSelectedNodeId(node.id)
                            }
                            onPaneClick={() => setSelectedNodeId(null)}
                            onInit={(instance) => {
                              setReactFlowInstance(instance);
                              setZoomLevel(
                                Math.round(instance.getZoom() * 100)
                              );
                            }}
                            onMoveEnd={() => {
                              if (!reactFlowInstance) return;
                              setZoomLevel(
                                Math.round(reactFlowInstance.getZoom() * 100)
                              );
                            }}
                            proOptions={{ hideAttribution: true }}
                          >
                            <Background gap={15} size={1} />
                            <Panel
                              position="bottom-left"
                              className={styles.flowControlPanel}
                            >
                              <div className="control-group">
                                <Tooltip title={t("detail.zoom.zoomOut")} placement="top">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<AiOutlineZoomOut />}
                                    onClick={() => {
                                      if (!reactFlowInstance) return;
                                      reactFlowInstance.zoomOut({
                                        duration: 150,
                                      });
                                    }}
                                  />
                                </Tooltip>
                                <Dropdown
                                  menu={{
                                    items: [
                                      { key: "50", label: "50%" },
                                      { key: "75", label: "75%" },
                                      { key: "100", label: "100%" },
                                      { key: "125", label: "125%" },
                                      { key: "150", label: "150%" },
                                      { key: "200", label: "200%" },
                                    ],
                                    onClick: ({ key }) => {
                                      if (!reactFlowInstance) return;
                                      const zoom = Number(key) / 100;
                                      reactFlowInstance.zoomTo(zoom, {
                                        duration: 150,
                                      });
                                      setZoomLevel(Number(key));
                                    },
                                  }}
                                  trigger={["click"]}
                                >
                                  <Button type="text" size="small">
                                    <span className="zoom-level zoom-level-clickable">
                                      {zoomLevel}%
                                    </span>
                                  </Button>
                                </Dropdown>
                                <Tooltip title={t("detail.zoom.zoomIn")} placement="top">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<AiOutlineZoomIn />}
                                    onClick={() => {
                                      if (!reactFlowInstance) return;
                                      reactFlowInstance.zoomIn({
                                        duration: 150,
                                      });
                                    }}
                                  />
                                </Tooltip>
                              </div>
                              <Divider
                                orientation="vertical"
                                className="control-divider"
                              />
                              <Tooltip title={t("detail.zoom.fitView")} placement="top">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<AiOutlineExpand />}
                                  onClick={() => {
                                    if (!reactFlowInstance) return;
                                    reactFlowInstance.fitView({
                                      padding: 0.3,
                                      maxZoom: 1,
                                      duration: 200,
                                    });
                                  }}
                                />
                              </Tooltip>
                            </Panel>
                          </ReactFlow>
                        </div>
                        {selectedNode && (
                          <>
                            <div
                              className={cx(
                                styles.flowSplitter,
                                isResizing && styles.flowSplitterActive
                              )}
                              onMouseDown={() => {
                                draggingRef.current = true;
                                setIsResizing(true);
                                document.body.style.cursor = "col-resize";
                                document.body.style.userSelect = "none";
                              }}
                            />
                            <div
                              className={styles.flowDetail}
                              style={{ width: detailWidth }}
                            >
                              {renderNodeDetail()}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className={styles.emptyNodes}>
                        <Text type="secondary">{t("detail.nodeList.noGraphData")}</Text>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default ExecutionDetail;
