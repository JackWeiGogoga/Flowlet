import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout, Button, Space, Input, Spin, Tag, Tooltip, Form } from "antd";
import { message, modal } from "@/components/AppMessageContext/staticMethods";
import {
  AiOutlineSave,
  AiOutlineArrowLeft,
  AiOutlineBug,
  AiOutlineSetting,
  AiOutlineDatabase,
} from "react-icons/ai";
import { Node } from "@xyflow/react";
import FlowDesigner from "@/components/FlowDesigner/FlowDesigner";
import { DebugPanel } from "@/components/DebugPanel";
import { useFlowStore } from "@/store/flowStore";
import { useProjectStore } from "@/store/projectStore";
import { flowApi, executionApi } from "@/services/flowService";
import dataStructureService from "@/services/dataStructureService";
import constantService from "@/services/constantService";
import {
  FlowNodeData,
  NodeType,
  StartNodeConfig,
  InputVariable,
  VariableType,
} from "@/types";
import { VscJson } from "react-icons/vsc";
import { LuBrainCircuit } from "react-icons/lu";

import { useStyles } from "./styles";
import { DSL_TEMPLATE } from "./constants";
import { useDsl, useFlowPersistence, useAiFlow } from "./hooks";
import {
  AiFlowDrawer,
  ExecuteModal,
  VersionModal,
  SettingsModal,
  DslIoModal,
  DslEditModal,
  DataDictDrawer,
  PublishPanel,
  SaveStatusOverlay,
} from "./components";

const { Header, Content } = Layout;

const FlowEditor: React.FC = () => {
  const { styles } = useStyles();
  const { t } = useTranslation("flow");
  const { t: tCommon } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const listUrl = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    return from || "/flows";
  }, [location.state]);

  const { currentProject } = useProjectStore();
  const {
    nodes,
    edges,
    flowId,
    selectedNode,
    setNodes,
    setEdges,
    setHasChanges,
    setDataStructures,
    setConstants,
    setReusableFlows,
    autoLayout,
    setSelectedNode,
  } = useFlowStore();

  const monacoPreloadedRef = useRef(false);
  const [settingsForm] = Form.useForm();
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [executeModalOpen, setExecuteModalOpen] = useState(false);
  const [executeInput, setExecuteInput] = useState("{}");
  const [executing, setExecuting] = useState(false);
  const [executeVersion, setExecuteVersion] = useState<number | undefined>();
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [dataStructureDrawerOpen, setDataStructureDrawerOpen] = useState(false);
  const [dslIoModalOpen, setDslIoModalOpen] = useState(false);
  const [dslImportText, setDslImportText] = useState("");
  const [dslIoApplyMode, setDslIoApplyMode] = useState<"replace" | "append">(
    "replace"
  );
  const [dslIoAutoLayout, setDslIoAutoLayout] = useState(true);
  const [dslIoTab, setDslIoTab] = useState<"export" | "import">("export");
  const [dslModalOpen, setDslModalOpen] = useState(false);
  const [dslText, setDslText] = useState(DSL_TEMPLATE);
  const [dslApplyMode, setDslApplyMode] = useState<"replace" | "append">(
    "replace"
  );
  const [dslAutoLayout, setDslAutoLayout] = useState(true);
  const [dslRequirement, setDslRequirement] = useState("");

  const persistence = useFlowPersistence({
    flowId: id,
    listUrl,
    currentProjectId: currentProject?.id,
  });

  const dsl = useDsl({
    nodes: nodes as Node<FlowNodeData>[],
    edges,
    flowName: persistence.flowName,
    currentFlow: persistence.currentFlow,
  });

  const dslPreview = useMemo(
    () => dsl.parseDsl(dslText),
    [dslText, dsl]
  );
  const importDslPreview = useMemo(() => {
    if (!dslImportText.trim()) return { errors: [], notes: [], dsl: null };
    return dsl.parseDsl(dslImportText);
  }, [dslImportText, dsl]);

  const applyDslToGraph = useCallback(
    (dslString: string) => {
      const { errors, dsl: parsed } = dsl.parseDsl(dslString);
      if (!parsed || errors.length > 0) {
        message.error(t("message.aiDslValidationFailed"));
        return;
      }
      const graph = dsl.buildNodesFromDsl(parsed);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      if (selectedNode) {
        const nextSelected = graph.nodes.find((n) => n.id === selectedNode.id);
        setSelectedNode(nextSelected ?? null);
      }
      setHasChanges(true);
    },
    [dsl, selectedNode, setEdges, setHasChanges, setNodes, setSelectedNode, t]
  );

  const aiFlow = useAiFlow({
    currentFlowId: persistence.currentFlow?.id,
    currentProjectId: currentProject?.id,
    graphToDsl: dsl.graphToDsl,
    applyDslToGraph,
  });

  const handleDslApply = useCallback(() => {
    const { errors, dsl: parsed } = dsl.parseDsl(dslText);
    if (!parsed || errors.length > 0) {
      message.error(t("message.dslValidationFailed"));
      return;
    }
    const graph = dsl.buildNodesFromDsl(parsed);
    if (dslApplyMode === "append") {
      const merged = dsl.mergeGraphData(graph);
      setNodes(merged.nodes);
      setEdges(merged.edges);
    } else {
      setNodes(graph.nodes);
      setEdges(graph.edges);
    }
    if (dslAutoLayout) setTimeout(() => autoLayout(), 0);
    setHasChanges(true);
    setDslModalOpen(false);
  }, [
    autoLayout,
    dsl,
    dslApplyMode,
    dslAutoLayout,
    dslText,
    setEdges,
    setHasChanges,
    setNodes,
    t,
  ]);

  const handleOpenDslIo = () => {
    setDslImportText("");
    setDslIoApplyMode("replace");
    setDslIoAutoLayout(true);
    setDslIoTab("export");
    setDslIoModalOpen(true);
  };

  const handleCopyDsl = async () => {
    if (!navigator.clipboard?.writeText) {
      message.error(t("message.clipboardNotSupported"));
      return;
    }
    try {
      await navigator.clipboard.writeText(dsl.exportDslText);
      message.success(t("message.copyDslSuccess"));
    } catch {
      message.error(t("message.copyDslFailed"));
    }
  };

  const handleDownloadDsl = () => {
    const safeName = (persistence.flowName || "flowlet")
      .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    const blob = new Blob([dsl.exportDslText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeName || "flowlet"}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleDslFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDslImportText(typeof reader.result === "string" ? reader.result : "");
      setDslIoTab("import");
    };
    reader.onerror = () => message.error(t("message.readDslFileFailed"));
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleImportDslApply = useCallback(() => {
    const { errors, dsl: parsed } = dsl.parseDsl(dslImportText);
    if (!parsed || errors.length > 0) {
      message.error(t("message.dslValidationFailed"));
      return;
    }
    const graph = dsl.buildNodesFromDsl(parsed);
    if (dslIoApplyMode === "append") {
      const merged = dsl.mergeGraphData(graph);
      setNodes(merged.nodes);
      setEdges(merged.edges);
    } else {
      setNodes(graph.nodes);
      setEdges(graph.edges);
    }
    if (dslIoAutoLayout) setTimeout(() => autoLayout(), 0);
    setHasChanges(true);
    setDslIoModalOpen(false);
  }, [
    autoLayout,
    dsl,
    dslImportText,
    dslIoApplyMode,
    dslIoAutoLayout,
    setEdges,
    setHasChanges,
    setNodes,
    t,
  ]);

  const handleDslIoOk = () => {
    if (dslIoTab === "import") {
      handleImportDslApply();
      return;
    }
    setDslIoModalOpen(false);
  };

  const handleRollbackVersion = (version: number) => {
    if (!persistence.currentFlow?.id) return;
    modal.confirm({
      title: t("confirm.rollbackTitle", { version }),
      content: t("confirm.rollbackContent"),
      okText: t("versionModal.rollback"),
      cancelText: tCommon("action.cancel"),
      onOk: async () => {
        try {
          await flowApi.rollbackVersion(persistence.currentFlow!.id, version);
          message.success(t("message.rollbackSuccess"));
          persistence.loadFlow(persistence.currentFlow!.id);
          persistence.loadVersions(persistence.currentFlow!.id);
          setVersionModalOpen(false);
        } catch {
          message.error(t("message.rollbackFailed"));
        }
      },
    });
  };

  const startNodeInputVariables = useMemo<InputVariable[]>(() => {
    const startNode = nodes.find(
      (n) => (n.data as FlowNodeData)?.nodeType === NodeType.START
    );
    return (
      (startNode?.data?.config as StartNodeConfig | undefined)?.variables || []
    );
  }, [nodes]);

  const generateDefaultExecuteInput = useCallback(() => {
    const required = startNodeInputVariables.filter((v) => v.required);
    if (required.length === 0) return "{}";
    const input: Record<string, unknown> = {};
    required.forEach((v) => {
      if (v.defaultValue !== undefined && v.defaultValue !== "") {
        if (
          v.type === VariableType.STRUCTURE &&
          typeof v.defaultValue === "string"
        ) {
          try {
            input[v.name] = JSON.parse(v.defaultValue);
          } catch {
            input[v.name] = {};
          }
        } else {
          input[v.name] = v.defaultValue;
        }
        return;
      }
      switch (v.type) {
        case VariableType.NUMBER:
          input[v.name] = v.min ?? 0;
          break;
        case VariableType.SELECT:
          input[v.name] = v.options?.[0]?.value || "";
          break;
        case VariableType.STRUCTURE:
          input[v.name] = {};
          break;
        case VariableType.PARAGRAPH:
          input[v.name] = `示例${v.label || v.name}内容`;
          break;
        default:
          input[v.name] = `示例${v.label || v.name}`;
          break;
      }
    });
    return JSON.stringify(input, null, 2);
  }, [startNodeInputVariables]);

  const handleOpenExecuteModal = useCallback(() => {
    setExecuteInput(generateDefaultExecuteInput());
    setExecuteVersion(undefined);
    setExecuteModalOpen(true);
  }, [generateDefaultExecuteInput]);

  const handleExecute = async () => {
    if (!persistence.currentFlow?.id) return;
    setExecuting(true);
    try {
      const inputs = JSON.parse(executeInput);
      const { data } = await executionApi.execute({
        flowId: persistence.currentFlow.id,
        inputs,
        flowVersion: executeVersion,
      });
      message.success(t("message.executeStarted", { id: data.data.id }));
      setExecuteModalOpen(false);
      navigate(`/executions/${data.data.id}`);
    } catch (err) {
      message.error(
        err instanceof SyntaxError
          ? t("message.inputJsonError")
          : t("message.executeFailed")
      );
    } finally {
      setExecuting(false);
    }
  };

  const handleOpenSettings = () => {
    if (!persistence.currentFlow?.id) {
      message.warning(t("message.saveThenSettings"));
      return;
    }
    settingsForm.setFieldsValue({
      name: persistence.flowName,
      description: persistence.currentFlow.description || "",
      isReusable: persistence.isReusable,
    });
    setSettingsModalOpen(true);
  };

  const handleSaveSettings = async () => {
    try {
      const values = await settingsForm.validateFields();
      if (!persistence.currentFlow?.id) return;
      setSettingsSaving(true);
      const graphData =
        typeof persistence.currentFlow.graphData === "string"
          ? JSON.parse(persistence.currentFlow.graphData)
          : persistence.currentFlow.graphData;
      await flowApi.update(persistence.currentFlow.id, {
        name: values.name,
        description: values.description,
        graphData,
        inputSchema: persistence.currentFlow.inputSchema,
      });
      if (values.isReusable !== persistence.isReusable) {
        await flowApi.setReusable(
          persistence.currentFlow.id,
          values.isReusable
        );
        persistence.setIsReusable(values.isReusable);
      }
      persistence.setFlowName(values.name);
      message.success(t("message.saveSuccess"));
      setSettingsModalOpen(false);
    } catch {
      message.error(t("message.saveFailed"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleBack = () => {
    if (persistence.hasChanges) {
      modal.confirm({
        title: t("confirm.leaveTitle"),
        content: t("confirm.leaveContent"),
        onOk: () => navigate(listUrl),
      });
    } else {
      navigate(listUrl);
    }
  };

  useEffect(() => {
    const projectId = currentProject?.id;
    if (!projectId) {
      setDataStructures([]);
      return;
    }
    let cancelled = false;
    dataStructureService
      .getAvailable(projectId, flowId || undefined)
      .then((list) => {
        if (!cancelled) setDataStructures(list);
      })
      .catch(() => {
        if (!cancelled) setDataStructures([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, flowId, setDataStructures]);

  useEffect(() => {
    const projectId = currentProject?.id;
    if (!projectId) {
      setConstants([]);
      return;
    }
    let cancelled = false;
    constantService
      .getAvailable(projectId, flowId || undefined)
      .then((list) => {
        if (!cancelled) setConstants(list);
      })
      .catch(() => {
        if (!cancelled) setConstants([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, flowId, setConstants]);

  useEffect(() => {
    if (!flowId) {
      setReusableFlows([]);
      return;
    }
    let cancelled = false;
    flowApi
      .listReusable(1, 100, flowId)
      .then((res) => {
        if (!cancelled && res.data.code === 200)
          setReusableFlows(res.data.data.records);
      })
      .catch(() => {
        if (!cancelled) setReusableFlows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [flowId, setReusableFlows]);

  useEffect(() => {
    if (monacoPreloadedRef.current) return;
    if (!nodes.some((n) => n.data.nodeType === NodeType.CODE)) return;
    monacoPreloadedRef.current = true;
    import("@monaco-editor/react").catch(() => {});
  }, [nodes]);

  if (persistence.loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip={t("editor.loading")}>
          <div style={{ padding: 50 }} />
        </Spin>
      </div>
    );
  }

  return (
    <Layout className={styles.flowEditor}>
      <Header className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <Button
            icon={<AiOutlineArrowLeft />}
            size="small"
            onClick={handleBack}
          >
            {t("editor.back")}
          </Button>
          <Input
            className={styles.flowNameInput}
            value={persistence.flowName}
            onChange={(e) => persistence.setFlowName(e.target.value)}
            placeholder={t("editor.flowNamePlaceholder")}
            variant="borderless"
          />
        </div>
        <div className={styles.headerRight}>
          <Space>
            {/* 未保存提示（仅新流程未创建时显示） */}
            {persistence.hasChanges && !persistence.currentFlow?.id && (
              <Tag color="warning">{t("editor.unsaved")}</Tag>
            )}
            {persistence.currentFlow?.id && (
              <>
                {persistence.currentFlow.version > 0 ? (
                  <Tooltip
                    title={
                      persistence.isDraftModified
                        ? t("editor.draftPendingPublish")
                        : undefined
                    }
                  >
                    <Tag color={persistence.isDraftModified ? "orange" : "blue"}>
                      {persistence.isDraftModified
                        ? `v${persistence.currentFlow.version} *`
                        : `v${persistence.currentFlow.version}`}
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag color="default">{t("editor.notPublished")}</Tag>
                )}
              </>
            )}
            <Tooltip title={t("editor.save")}>
              <Button
                icon={<AiOutlineSave />}
                onClick={persistence.handleSave}
                loading={persistence.saving}
              />
            </Tooltip>
            {/* {persistence.currentFlow?.id && (
              <Tooltip title={t("versionModal.title")}>
                <Button
                  icon={<AiOutlineHistory />}
                  onClick={() => setVersionModalOpen(true)}
                />
              </Tooltip>
            )} */}
            {currentProject?.id && (
              <Tooltip title={t("toolbar.dataDict")}>
                <Button
                  icon={<AiOutlineDatabase />}
                  onClick={() => setDataStructureDrawerOpen(true)}
                />
              </Tooltip>
            )}
            {persistence.currentFlow?.id && (
              <Tooltip title={t("toolbar.flowSettings")}>
                <Button
                  icon={<AiOutlineSetting />}
                  onClick={handleOpenSettings}
                />
              </Tooltip>
            )}
            <Tooltip title={t("dslIoModal.title")}>
              <Button icon={<VscJson />} onClick={handleOpenDslIo} />
            </Tooltip>
            <Tooltip title={t("aiDrawer.title")}>
              <Button
                icon={<LuBrainCircuit />}
                onClick={aiFlow.handleOpenAiDrawer}
              />
            </Tooltip>
            
            <Button
              type="primary"
              icon={<AiOutlineBug />}
              onClick={() => setDebugPanelOpen(true)}
            >
              {t("editor.debugRun")}
            </Button>
            {persistence.currentFlow?.id && (
              <PublishPanel
                flowStatus={persistence.currentFlow.status}
                currentVersion={persistence.currentFlow.version}
                versions={persistence.versions}
                versionsLoading={persistence.versionsLoading}
                isDraftModified={persistence.isDraftModified}
                onPublish={persistence.handlePublish}
                onExecute={handleOpenExecuteModal}
                onExecutionHistory={() =>
                  window.open(`/executions?flowId=${persistence.currentFlow?.id}`, "_blank")
                }
                onOpenVersionModal={() => setVersionModalOpen(true)}
                flowId={persistence.currentFlow.id}
              />
            )}
          </Space>
        </div>
      </Header>
      <Content className={styles.editorContent}>
        <SaveStatusOverlay
          autoSaveStatus={persistence.autoSaveStatus}
          lastSavedAt={persistence.lastSavedAt ?? undefined}
          versions={persistence.versions}
          hasFlowId={!!persistence.currentFlow?.id}
        />
        <FlowDesigner />
      </Content>

      <DebugPanel
        open={debugPanelOpen}
        onClose={() => setDebugPanelOpen(false)}
        flowId={persistence.currentFlow?.id}
        flowName={persistence.currentFlow?.name}
        projectId={currentProject?.id}
        nodes={nodes as Node<FlowNodeData>[]}
        edges={edges}
      />
      <ExecuteModal
        open={executeModalOpen}
        onOk={handleExecute}
        onCancel={() => setExecuteModalOpen(false)}
        loading={executing}
        executeInput={executeInput}
        onInputChange={setExecuteInput}
        executeVersion={executeVersion}
        onVersionChange={setExecuteVersion}
        versions={persistence.versions}
      />
      <VersionModal
        open={versionModalOpen}
        onCancel={() => setVersionModalOpen(false)}
        loading={persistence.versionsLoading}
        versions={persistence.versions}
        onRollback={handleRollbackVersion}
      />
      <DataDictDrawer
        open={dataStructureDrawerOpen}
        onClose={() => setDataStructureDrawerOpen(false)}
        projectId={currentProject?.id}
        flowId={persistence.currentFlow?.id}
      />
      <DslIoModal
        open={dslIoModalOpen}
        onCancel={() => setDslIoModalOpen(false)}
        onOk={handleDslIoOk}
        activeTab={dslIoTab}
        onTabChange={setDslIoTab}
        exportDslText={dsl.exportDslText}
        onCopyDsl={handleCopyDsl}
        onDownloadDsl={handleDownloadDsl}
        importText={dslImportText}
        onImportTextChange={setDslImportText}
        importPreview={importDslPreview}
        applyMode={dslIoApplyMode}
        onApplyModeChange={(m) => {
          setDslIoApplyMode(m);
          setDslIoAutoLayout(m !== "append");
        }}
        autoLayout={dslIoAutoLayout}
        onAutoLayoutChange={setDslIoAutoLayout}
        onFileChange={handleDslFileChange}
      />
      <AiFlowDrawer
        open={aiFlow.aiDrawerOpen}
        onClose={() => aiFlow.setAiDrawerOpen(false)}
        session={aiFlow.aiSession}
        messages={aiFlow.aiMessages}
        input={aiFlow.aiInput}
        onInputChange={aiFlow.setAiInput}
        sending={aiFlow.aiSending}
        regenerating={aiFlow.aiRegenerating}
        providerType={aiFlow.aiProviderType}
        onProviderTypeChange={aiFlow.setAiProviderType}
        providerKey={aiFlow.aiProviderKey}
        onProviderKeyChange={aiFlow.setAiProviderKey}
        providerId={aiFlow.aiProviderId}
        onProviderIdChange={aiFlow.setAiProviderId}
        model={aiFlow.aiModel}
        onModelChange={aiFlow.setAiModel}
        providersLoading={aiFlow.aiProvidersLoading}
        standardProviders={aiFlow.aiStandardProviders}
        customProviders={aiFlow.aiCustomProviders}
        onSend={aiFlow.handleAiSend}
        onRegenerate={aiFlow.handleAiRegenerate}
        onNewSession={aiFlow.handleAiNewSession}
        onOpenDslModal={() => setDslModalOpen(true)}
      />
      <SettingsModal
        open={settingsModalOpen}
        onOk={handleSaveSettings}
        onCancel={() => setSettingsModalOpen(false)}
        loading={settingsSaving}
        form={settingsForm}
      />
      <DslEditModal
        open={dslModalOpen}
        onCancel={() => setDslModalOpen(false)}
        onOk={handleDslApply}
        dslText={dslText}
        onDslTextChange={setDslText}
        dslPreview={dslPreview}
        requirement={dslRequirement}
        onRequirementChange={setDslRequirement}
        applyMode={dslApplyMode}
        onApplyModeChange={(m) => {
          setDslApplyMode(m);
          setDslAutoLayout(m !== "append");
        }}
        autoLayout={dslAutoLayout}
        onAutoLayoutChange={setDslAutoLayout}
      />
    </Layout>
  );
};

export default FlowEditor;
