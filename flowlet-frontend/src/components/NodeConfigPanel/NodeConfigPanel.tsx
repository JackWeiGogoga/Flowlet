import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Tooltip,
  Tag,
  Alert,
  InputNumber,
  Select,
  Spin,
  Checkbox,
} from "antd";
import {
  AiOutlineDelete,
  AiOutlinePlayCircle,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineCopy,
  AiOutlineRight,
  AiOutlineDown,
  AiOutlineUp,
} from "react-icons/ai";
import { type Node } from "@xyflow/react";
import {
  NodeType,
  FlowNodeData,
  NodeDebugResult,
  InputVariable,
  VariableType,
  StartNodeConfig,
  OutputVariableConfig,
} from "@/types";
import { executionApi } from "@/services/flowService";
import dataStructureService from "@/services/dataStructureService";
import { message } from "@/components/AppMessageContext/staticMethods";
import { useNodeConfig } from "./hooks";
import {
  StartNodeConfig as StartNodeConfigComponent,
  EndNodeConfig as EndNodeConfigComponent,
  ApiNodeConfig,
  KafkaNodeConfig,
  CodeNodeConfig,
  ConditionNodeConfig,
  TransformNodeConfig,
  ForEachNodeConfig,
  LlmNodeConfig,
  VectorStoreNodeConfig,
  SimhashNodeConfig,
  KeywordMatchNodeConfig,
  VariableAssignerNodeConfig,
  JsonParserNodeConfig,
  OutputVariables,
  ExecutionConditionConfig,
} from "./components";
import SubflowNodeConfigComponent from "@/components/nodeConfigs/SubflowNodeConfig";
import type { SubflowNodeConfig } from "@/types";
import AddOutputVariableModal from "./AddOutputVariableModal";
import ResizablePanel from "../ResizablePanel";
import { useFlowStore } from "@/store/flowStore";
import { useProjectStore } from "@/store/projectStore";
import { useStyles } from "./NodeConfigPanel.style";

const NodeConfigPanel: React.FC = () => {
  const { styles } = useStyles();
  const [form] = Form.useForm();
  const [debugForm] = Form.useForm();
  const [executing, setExecuting] = useState(false);
  const [debugResult, setDebugResult] = useState<NodeDebugResult | null>(null);
  const [executionPanelOpen, setExecutionPanelOpen] = useState(false);
  const [saveDebugResult, setSaveDebugResult] = useState(false);

  // 获取 nodes 用于查找开始节点的变量
  const nodes = useFlowStore((state) => state.nodes);
  const flowId = useFlowStore((state) => state.flowId);
  const dataStructures = useFlowStore((state) => state.dataStructures);
  const setDataStructures = useFlowStore((state) => state.setDataStructures);
  const updateNode = useFlowStore((state) => state.updateNode);
  const { currentProject } = useProjectStore();

  // 使用自定义 hook 管理节点配置逻辑
  const {
    selectedNode,
    variableModalOpen,
    editingVariable,
    outputVariableModalOpen,
    editingOutputVariable,
    setVariableModalOpen,
    setEditingVariable,
    setOutputVariableModalOpen,
    setEditingOutputVariable,
    handleValuesChange,
    handleDelete,
    getVariables,
    handleVariableSave,
    handleVariableDelete,
    handleVariableEdit,
    handleDragEnd,
    // End 节点输出变量
    getOutputVariables,
    handleOutputVariableSave,
    handleOutputVariableDelete,
    handleOutputVariableEdit,
    handleOutputVariableDragEnd,
    canDelete,
    getPanelTitle,
  } = useNodeConfig(form);

  // 使用 Form.useWatch 监听表单值变化 - 使用可选参数避免警告
  const authType = Form.useWatch("authType", { form, preserve: true });
  const waitForCallback = Form.useWatch("waitForCallback", {
    form,
    preserve: true,
  });
  const callbackType = Form.useWatch("callbackType", { form, preserve: true });

  // 从字符串中提取 {{变量名}} 格式的变量引用
  const extractVariableReferences = (str: string): string[] => {
    if (!str || typeof str !== "string") return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      // 提取变量名，去掉可能的路径（如 inputs.name -> name）
      const varPath = match[1].trim();
      const varName = varPath.includes(".")
        ? varPath.split(".").pop() || varPath
        : varPath;
      if (!matches.includes(varName)) {
        matches.push(varName);
      }
    }
    return matches;
  };

  // 递归遍历对象，提取所有字符串中的变量引用
  const extractAllVariableReferences = (obj: unknown): string[] => {
    const refs: string[] = [];

    const traverse = (value: unknown) => {
      if (typeof value === "string") {
        refs.push(...extractVariableReferences(value));
      } else if (Array.isArray(value)) {
        value.forEach(traverse);
      } else if (value && typeof value === "object") {
        Object.values(value).forEach(traverse);
      }
    };

    traverse(obj);
    return [...new Set(refs)]; // 去重
  };

  // 获取当前节点配置中引用的变量，并从开始节点获取变量定义
  const getRequiredInputVariables = (): InputVariable[] => {
    if (!selectedNode) return [];

    // 获取当前节点的配置
    const currentConfig = form.getFieldsValue(true);

    // 提取配置中所有引用的变量名
    const referencedVars = extractAllVariableReferences(currentConfig);

    if (referencedVars.length === 0) return [];

    // 从开始节点获取变量定义
    const startNode = nodes.find(
      (n) => (n.data as FlowNodeData)?.nodeType === NodeType.START
    );
    const startConfig = startNode?.data?.config as StartNodeConfig | undefined;
    const allVariables = startConfig?.variables || [];

    // 只返回被引用的变量
    return allVariables.filter((v) => referencedVars.includes(v.name));
  };

  // 当选中节点变化时，重置执行结果
  useEffect(() => {
    setExecutionPanelOpen(false);
    setSaveDebugResult(false);
    // 不在这里重置表单，因为表单可能未渲染
    // debugForm 会在下次打开执行面板时自动重置
  }, [selectedNode?.id]);

  useEffect(() => {
    if (selectedNode?.data?.debugOutput) {
      setDebugResult({
        success: true,
        output: selectedNode.data.debugOutput as Record<string, unknown>,
        duration: 0,
      });
    } else {
      setDebugResult(null);
    }
  }, [selectedNode?.data?.debugOutput]);

  // 执行单个节点调试
  const handleExecuteNode = async () => {
    if (!selectedNode) return;

    // 先验证配置表单
    try {
      await form.validateFields();
    } catch {
      message.error("请先完善节点配置");
      return;
    }

    // 验证输入参数表单
    try {
      await debugForm.validateFields();
    } catch {
      // 表单验证失败，不需要额外提示
      return;
    }

    const values = form.getFieldsValue(true);
    const mockInputs = debugForm.getFieldsValue(true);
    const normalizedInputs = { ...mockInputs };
    const requiredVariables = getRequiredInputVariables();
    const structureVariables = requiredVariables.filter(
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

    setExecuting(true);
    setDebugResult(null);
    setExecutionPanelOpen(true);

    try {
      // 构建节点数据
      const nodeData = {
        id: selectedNode.id,
        type: selectedNode.type || "custom",
        position: selectedNode.position,
        data: {
          label: values.label || selectedNode.data.label,
          nodeType: selectedNode.data.nodeType,
          config: values,
        },
      };

      const response = await executionApi.debugNode({
        node: nodeData,
        mockInputs: normalizedInputs,
      });

      if (response.data.code === 200) {
        const result = response.data.data;
        setDebugResult(result);

        // 执行成功后，将输出数据保存到节点的 debugOutput 字段
        if (result.success && result.output && saveDebugResult) {
          const updateNode = useFlowStore.getState().updateNode;
          updateNode(selectedNode.id, {
            debugOutput: result.output,
          });
        }

        if (result.success) {
          message.success(`执行成功，耗时 ${result.duration}ms`);
          await autoGenerateCodeOutputSchema(result.output, values);
        } else {
          message.error(result.errorMessage || "执行失败");
        }
      } else {
        message.error(response.data.message || "请求失败");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "网络请求失败";
      message.error(errorMessage);
      setDebugResult({
        success: false,
        errorMessage,
        duration: 0,
      });
    } finally {
      setExecuting(false);
    }
  };

  // 判断当前节点是否支持单独执行
  const canExecuteNode = () => {
    if (!selectedNode) return false;
    return [
      NodeType.API,
      NodeType.KAFKA,
      NodeType.LLM,
      NodeType.CODE,
      NodeType.SIMHASH,
      NodeType.KEYWORD_MATCH,
    ].includes(
      selectedNode.data.nodeType
    );
  };

  const normalizeStructureName = (value: string) =>
    `code_result_${value.replace(/[^a-zA-Z0-9_]/g, "_")}`;

  const resolveCodeOutputSample = (
    output?: Record<string, unknown>
  ): {
    sample: Record<string, unknown>;
    collectionType?: "list";
  } | null => {
    if (!output) return null;
    const resultValue = output.result;
    if (resultValue && typeof resultValue === "object") {
      if (Array.isArray(resultValue)) {
        if (resultValue.length === 0) return null;
        const first = resultValue[0];
        if (!first || typeof first !== "object" || Array.isArray(first)) {
          return null;
        }
        return {
          sample: first as Record<string, unknown>,
          collectionType: "list",
        };
      }
      if (!Array.isArray(resultValue)) {
        return { sample: resultValue as Record<string, unknown> };
      }
    }
    return null;
  };

  const autoGenerateCodeOutputSchema = async (
    output?: Record<string, unknown>,
    formValues?: Record<string, unknown>
  ) => {
    if (!selectedNode || selectedNode.data.nodeType !== NodeType.CODE) {
      return;
    }
    const currentValues = formValues ?? form.getFieldsValue(true);
    const currentMode = currentValues.outputMode as
      | "custom"
      | "auto"
      | "schema"
      | undefined;
    if (currentMode === "custom" || currentMode === "schema") {
      return;
    }
    const existingStructureId =
      (currentValues.outputStructureId as string | undefined) ||
      (selectedNode.data.config as Record<string, unknown> | undefined)
        ?.outputStructureId;
    if (existingStructureId) {
      return;
    }
    if (!currentProject?.id || !flowId) {
      return;
    }
    const sampleInfo = resolveCodeOutputSample(output);
    if (!sampleInfo) {
      return;
    }

    const structureName = normalizeStructureName(selectedNode.id);
    let structure = dataStructures.find(
      (item) => item.flowId === flowId && item.name === structureName
    );

    try {
      if (!structure) {
        structure = await dataStructureService.generateFromJson(
          currentProject.id,
          {
            flowId,
            structureName,
            jsonSample: JSON.stringify(sampleInfo.sample),
            description: "从代码执行结果自动生成",
          }
        );
      }

      const nextStructures = (dataStructures || []).filter(
        (item) => item.id !== structure?.id
      );
      nextStructures.push(structure);
      setDataStructures(nextStructures);

      form.setFieldsValue({
        enableOutputSchema: true,
        outputStructureId: structure.id,
        outputCollectionType: sampleInfo.collectionType,
        outputMode: "auto",
      });

      updateNode(selectedNode.id, {
        config: {
          ...selectedNode.data.config,
          enableOutputSchema: true,
          outputStructureId: structure.id,
          outputCollectionType: sampleInfo.collectionType,
          outputMode: "auto",
        },
      });

      message.success("已根据代码输出生成数据结构");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "自动生成数据结构失败";
      message.error(errorMessage);
    }
  };

  // 复制内容到剪贴板
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success("已复制到剪贴板");
  };

  // 格式化 JSON（带行号）
  const formatJsonWithLineNumbers = (data: unknown) => {
    if (!data) return null;
    try {
      const formatted = JSON.stringify(data, null, 2);
      const lines = formatted.split("\n");
      return (
        <div className={styles.execCodeBlock}>
          <div className={styles.execLineNumbers}>
            {lines.map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <pre className={styles.execCodeContent}>{formatted}</pre>
        </div>
      );
    } catch {
      return <pre className={styles.execCodeContentPlain}>{String(data)}</pre>;
    }
  };

  // 渲染输入参数表单项
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
              size="middle"
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
              rows={2}
              maxLength={maxLength}
              showCount
              placeholder={`请输入${label || name}`}
              size="middle"
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
            <Select placeholder={`请选择${label || name}`} size="small">
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
              rows={2}
              placeholder="请输入 JSON"
              size="middle"
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
              size="middle"
            />
          </Form.Item>
        );
    }
  };

  /**
   * 根据节点类型渲染对应的配置表单
   */
  const renderConfigFields = (node: Node<FlowNodeData>) => {
    switch (node.data.nodeType) {
      case NodeType.START:
        return (
          <StartNodeConfigComponent
            variables={getVariables()}
            variableModalOpen={variableModalOpen}
            editingVariable={editingVariable}
            onVariableEdit={handleVariableEdit}
            onVariableDelete={handleVariableDelete}
            onVariableSave={handleVariableSave}
            onOpenModal={() => {
              setEditingVariable(undefined);
              setVariableModalOpen(true);
            }}
            onCloseModal={() => {
              setVariableModalOpen(false);
              setEditingVariable(undefined);
            }}
            onDragEnd={handleDragEnd}
          />
        );

      case NodeType.END:
        return (
          <>
            <EndNodeConfigComponent
              variables={getOutputVariables()}
              onVariableEdit={handleOutputVariableEdit}
              onVariableDelete={handleOutputVariableDelete}
              onOpenModal={() => {
                setEditingOutputVariable(undefined);
                setOutputVariableModalOpen(true);
              }}
              onDragEnd={handleOutputVariableDragEnd}
            />
            <AddOutputVariableModal
              open={outputVariableModalOpen}
              editingVariable={editingOutputVariable}
              existingNames={getOutputVariables().map(
                (v: OutputVariableConfig) => v.name
              )}
              nodeId={node.id}
              onOk={handleOutputVariableSave}
              onCancel={() => {
                setOutputVariableModalOpen(false);
                setEditingOutputVariable(undefined);
              }}
            />
          </>
        );

      case NodeType.API:
        return (
          <ApiNodeConfig
            waitForCallback={waitForCallback}
            callbackType={callbackType}
            nodeId={node.id}
          />
        );

      case NodeType.KAFKA:
        return (
          <KafkaNodeConfig
            authType={authType}
            waitForCallback={waitForCallback}
            callbackType={callbackType}
          />
        );

      case NodeType.CODE:
        return <CodeNodeConfig />;

      case NodeType.CONDITION:
        return <ConditionNodeConfig />;

      case NodeType.TRANSFORM:
        return <TransformNodeConfig />;

      case NodeType.SUBFLOW:
        return (
          <SubflowNodeConfigComponent
            node={node}
            flowId={useFlowStore.getState().flowId || undefined}
            onChange={(config: SubflowNodeConfig) => {
              // 更新节点配置
              const updateNode = useFlowStore.getState().updateNode;
              updateNode(node.id, { config });
            }}
          />
        );

      case NodeType.FOR_EACH:
        return <ForEachNodeConfig />;

      case NodeType.LLM:
        return <LlmNodeConfig />;

      case NodeType.VECTOR_STORE:
        return <VectorStoreNodeConfig />;

      case NodeType.VARIABLE_ASSIGNER:
        return <VariableAssignerNodeConfig nodeId={node.id} />;

      case NodeType.JSON_PARSER:
        return <JsonParserNodeConfig nodeId={node.id} />;

      case NodeType.SIMHASH:
        return <SimhashNodeConfig />;

      case NodeType.KEYWORD_MATCH:
        return <KeywordMatchNodeConfig />;

      default:
        return null;
    }
  };

  /**
   * 渲染执行面板
   */
  const renderExecutionPanel = () => {
    if (!canExecuteNode()) return null;

    const inputVariables = getRequiredInputVariables();

    return (
      <div className={styles.executionPanel}>
        <div
          className={styles.executionPanelHeader}
          onClick={() => setExecutionPanelOpen(!executionPanelOpen)}
        >
          <div className={styles.executionPanelTitle}>
            <AiOutlinePlayCircle className={styles.executionPanelIcon} />
            <span>测试执行</span>
            {debugResult && (
              <Tag
                color={debugResult.success ? "success" : "error"}
                style={{ marginLeft: 8 }}
              >
                {debugResult.success ? "成功" : "失败"}
              </Tag>
            )}
          </div>
          <div className={styles.executionPanelActions}>
            {executionPanelOpen ? <AiOutlineUp /> : <AiOutlineDown />}
          </div>
        </div>

        {executionPanelOpen && (
          <div className={styles.executionPanelContent}>
            {/* 输入参数 */}
            {inputVariables.length > 0 && (
              <div className={styles.execSection}>
                <div className={styles.execSectionTitle}>模拟输入参数</div>
                <Form
                  form={debugForm}
                  layout="vertical"
                  size="small"
                  className={styles.execInputForm}
                >
                  {inputVariables.map(renderInputField)}
                </Form>
              </div>
            )}

            {/* 执行按钮 */}
            <div className={styles.execActions}>
              <div className={styles.execActionRow}>
                <Checkbox
                  checked={saveDebugResult}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSaveDebugResult(checked);
                    if (
                      checked &&
                      selectedNode &&
                      debugResult?.success &&
                      debugResult.output
                    ) {
                      const updateNode = useFlowStore.getState().updateNode;
                      updateNode(selectedNode.id, {
                        debugOutput: debugResult.output,
                      });
                    }
                  }}
                >
                  保存测试执行
                </Checkbox>
                <Button
                  type="default"
                  size="small"
                  onClick={() => {
                    if (!selectedNode) return;
                    setDebugResult(null);
                    const updateNode = useFlowStore.getState().updateNode;
                    updateNode(selectedNode.id, {
                      debugOutput: undefined,
                    });
                  }}
                >
                  清空测试结果
                </Button>
              </div>
              <Button
                type="primary"
                icon={<AiOutlinePlayCircle />}
                loading={executing}
                onClick={handleExecuteNode}
                block
              >
                {executing ? "执行中..." : "执行节点"}
              </Button>
            </div>

            {/* 执行结果 */}
            {executing && !debugResult && (
              <div className={styles.execLoading}>
                <Spin tip="正在执行..." size="small">
                  <div style={{ padding: 20 }} />
                </Spin>
              </div>
            )}

            {debugResult && (
              <div className={styles.execResult}>
                {/* 执行概览 */}
                <div className={styles.execOverview}>
                  <div className={styles.execStatus}>
                    {debugResult.success ? (
                      <AiOutlineCheckCircle
                        className={styles.execStatusIconSuccess}
                      />
                    ) : (
                      <AiOutlineCloseCircle
                        className={styles.execStatusIconFailed}
                      />
                    )}
                    <span>{debugResult.success ? "执行成功" : "执行失败"}</span>
                  </div>
                  <div className={styles.execDuration}>
                    耗时: {debugResult.duration}ms
                  </div>
                </div>

                {/* 错误信息 */}
                {!debugResult.success && debugResult.errorMessage && (
                  <Alert
                    title={debugResult.errorMessage}
                    type="error"
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                )}

                {/* 请求详情 */}
                {debugResult.requestDetails && (
                  <div className={styles.execDetailSection}>
                    <div className={styles.execSectionHeader}>
                      <div className={styles.execSectionHeaderTitle}>
                        <AiOutlineRight className={styles.execSectionIcon} />
                        <span>请求详情 (request)</span>
                      </div>
                      <Tooltip title="复制">
                        <Button
                          type="text"
                          size="small"
                          icon={<AiOutlineCopy />}
                          onClick={() =>
                            handleCopy(
                              JSON.stringify(
                                debugResult.requestDetails,
                                null,
                                2
                              )
                            )
                          }
                        />
                      </Tooltip>
                    </div>
                    <div className={styles.execSectionContent}>
                      {formatJsonWithLineNumbers(debugResult.requestDetails)}
                    </div>
                  </div>
                )}

                {/* 输出数据 */}
                {debugResult.output && (
                  <div className={styles.execDetailSection}>
                    <div className={styles.execSectionHeader}>
                      <div className={styles.execSectionHeaderTitle}>
                        <AiOutlineRight className={styles.execSectionIcon} />
                        <span>响应数据 (output)</span>
                      </div>
                      <Tooltip title="复制">
                        <Button
                          type="text"
                          size="small"
                          icon={<AiOutlineCopy />}
                          onClick={() =>
                            handleCopy(
                              JSON.stringify(debugResult.output, null, 2)
                            )
                          }
                        />
                      </Tooltip>
                    </div>
                    <div className={styles.execSectionContent}>
                      {formatJsonWithLineNumbers(debugResult.output)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * 渲染节点配置内容
   */
  const renderConfigContent = () => {
    if (!selectedNode) return null;

    return (
      <div className={styles.configPanelContent}>
        {canDelete && (
          <div className={styles.configPanelActions}>
            <Button
              type="text"
              danger
              size="small"
              icon={<AiOutlineDelete />}
              onClick={handleDelete}
            >
              删除节点
            </Button>
          </div>
        )}

        <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
          <Form.Item name="label" label="节点名称" rules={[{ required: true }]}>
            <Input placeholder="输入节点名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="节点描述（可选）" />
          </Form.Item>

          {renderConfigFields(selectedNode)}

          {/* 执行条件配置 - 开始节点和结束节点不显示 */}
          {selectedNode.data.nodeType !== NodeType.START &&
            selectedNode.data.nodeType !== NodeType.END && (
              <ExecutionConditionConfig nodeId={selectedNode.id} />
            )}

          {/* 输出变量展示 */}
          <OutputVariables selectedNode={selectedNode} />
        </Form>

        {/* 测试执行面板 */}
        {renderExecutionPanel()}
      </div>
    );
  };

  const isPanelVisible = !!selectedNode;

  return (
    <ResizablePanel
      title={getPanelTitle()}
      position="right"
      defaultWidth={500}
      minWidth={350}
      maxWidth={700}
      collapsed={!isPanelVisible}
      showCollapseButton={false}
    >
      {renderConfigContent()}
    </ResizablePanel>
  );
};

export default NodeConfigPanel;
