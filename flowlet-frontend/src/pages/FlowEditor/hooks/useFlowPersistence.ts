import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { message } from "@/components/AppMessageContext/staticMethods";
import { flowApi } from "@/services/flowService";
import { useFlowStore } from "@/store/flowStore";
import { FlowDefinitionRequest, FlowDefinitionVersion } from "@/types";
import { Node } from "@xyflow/react";
import { FlowNodeData } from "@/types";
import { GraphData } from "../types";

/** 自动保存防抖延迟（毫秒） */
const AUTO_SAVE_DELAY = 3000;

/** 自动保存状态 */
export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

interface UseFlowPersistenceOptions {
  flowId?: string;
  listUrl: string;
  currentProjectId?: string;
}

/**
 * 流程加载、保存和版本管理的 Hook
 */
export function useFlowPersistence({
  flowId,
  listUrl,
  currentProjectId,
}: UseFlowPersistenceOptions) {
  const { t } = useTranslation("flow");
  const navigate = useNavigate();

  const {
    currentFlow,
    nodes,
    edges,
    hasChanges,
    setCurrentFlow,
    setNodes,
    setEdges,
    setHasChanges,
    reset,
    initializeHistory,
  } = useFlowStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flowName, setFlowName] = useState(t("newFlow"));
  const [isReusable, setIsReusable] = useState(false);
  const [versions, setVersions] = useState<FlowDefinitionVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // 自动保存定时器引用
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 自动保存状态重置定时器
  const autoSaveStatusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 判断草稿是否有未发布的改动
   * 通过比较流程的 updatedAt 与最新发布版本的 createdAt 来判断
   * 加入 2 秒的容差，避免发布后由于时间精度问题误判
   */
  const isDraftModified = useMemo(() => {
    if (!currentFlow || currentFlow.version <= 0) return false;
    if (versions.length === 0) return false;

    // 最新版本（versions 按版本号倒序排列）
    const latestVersion = versions[0];
    if (!latestVersion) return false;

    // 比较时间：如果流程的 updatedAt > 最新版本的 createdAt + 容差，说明有改动
    const flowUpdatedAt = new Date(currentFlow.updatedAt).getTime();
    const versionCreatedAt = new Date(latestVersion.createdAt).getTime();

    // 2 秒容差，避免发布时数据库写入的时间差导致误判
    const TOLERANCE_MS = 2000;
    return flowUpdatedAt > versionCreatedAt + TOLERANCE_MS;
  }, [currentFlow, versions]);

  /**
   * 加载流程
   */
  const loadFlow = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const { data } = await flowApi.get(id);
        const flow = data.data;
        setCurrentFlow(flow);
        setFlowName(flow.name);
        setIsReusable(flow.isReusable || false);

        if (flow.graphData) {
          const graphData: GraphData = JSON.parse(flow.graphData);
          setNodes(graphData.nodes || []);
          const edges = (graphData.edges || []).map((edge) => ({
            ...edge,
            type: "addable",
            animated: edge.animated ?? false,
          }));
          setEdges(edges);
        }
        setHasChanges(false);
        initializeHistory();
      } catch {
        message.error(t("message.loadFailed"));
        navigate(listUrl);
      } finally {
        setLoading(false);
      }
    },
    [
      navigate,
      listUrl,
      setCurrentFlow,
      setNodes,
      setEdges,
      setHasChanges,
      initializeHistory,
      t,
    ]
  );

  /**
   * 加载版本列表
   */
  const loadVersions = useCallback(async (id: string) => {
    setVersionsLoading(true);
    try {
      const { data } = await flowApi.listVersions(id);
      setVersions(data.data || []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  /**
   * 保存流程
   */
  const handleSave = useCallback(async () => {
    if (!flowName.trim()) {
      message.warning(t("message.enterFlowName"));
      return;
    }

    setSaving(true);
    try {
      const request: FlowDefinitionRequest = {
        name: flowName,
        graphData: {
          nodes: nodes.map((node: Node<FlowNodeData>) => ({
            id: node.id,
            type: node.type || "custom",
            position: node.position,
            data: node.data,
            measured: node.measured,
            selected: node.selected,
            dragging: node.dragging,
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle ?? undefined,
            targetHandle: edge.targetHandle ?? undefined,
            label: typeof edge.label === "string" ? edge.label : undefined,
            type: edge.type,
            animated: edge.animated,
          })),
        },
      };

      if (currentFlow?.id) {
        await flowApi.update(currentFlow.id, request);
        setLastSavedAt(new Date());
        message.success(t("message.saveSuccess"));
      } else {
        if (!currentProjectId) {
          message.error(t("message.selectProject"));
          return;
        }
        const { data } = await flowApi.create(currentProjectId, request);
        setCurrentFlow(data.data);
        setLastSavedAt(new Date());
        navigate(`/flows/${data.data.id}`, { replace: true });
        message.success(t("message.createSuccess"));
      }
      setHasChanges(false);
    } catch {
      message.error(t("message.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [
    flowName,
    nodes,
    edges,
    currentFlow?.id,
    currentProjectId,
    setCurrentFlow,
    navigate,
    setHasChanges,
    t,
  ]);

  /**
   * 静默自动保存（不显示 message 提示）
   */
  const performAutoSave = useCallback(async () => {
    // 仅当流程已创建且有改动时才自动保存
    if (!currentFlow?.id || !hasChanges || !flowName.trim()) {
      setAutoSaveStatus("idle");
      return;
    }

    setAutoSaveStatus("saving");
    try {
      const request: FlowDefinitionRequest = {
        name: flowName,
        graphData: {
          nodes: nodes.map((node: Node<FlowNodeData>) => ({
            id: node.id,
            type: node.type || "custom",
            position: node.position,
            data: node.data,
            measured: node.measured,
            selected: node.selected,
            dragging: node.dragging,
          })),
          edges: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle ?? undefined,
            targetHandle: edge.targetHandle ?? undefined,
            label: typeof edge.label === "string" ? edge.label : undefined,
            type: edge.type,
            animated: edge.animated,
          })),
        },
      };

      await flowApi.update(currentFlow.id, request);
      setHasChanges(false);
      setLastSavedAt(new Date());
      setAutoSaveStatus("saved");

      // 清除之前的重置定时器
      if (autoSaveStatusResetRef.current) {
        clearTimeout(autoSaveStatusResetRef.current);
      }
      // 3秒后重置状态为 idle
      autoSaveStatusResetRef.current = setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 3000);
    } catch {
      setAutoSaveStatus("error");
      // 5秒后重置状态
      if (autoSaveStatusResetRef.current) {
        clearTimeout(autoSaveStatusResetRef.current);
      }
      autoSaveStatusResetRef.current = setTimeout(() => {
        setAutoSaveStatus("idle");
      }, 5000);
    }
  }, [currentFlow?.id, hasChanges, flowName, nodes, edges, setHasChanges]);

  /**
   * 发布流程
   */
  const handlePublish = useCallback(async () => {
    if (!currentFlow?.id) {
      message.warning(t("message.saveThenPublish"));
      return;
    }

    // 发布前先取消待执行的自动保存
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    try {
      await flowApi.publish(currentFlow.id);
      message.success(t("message.publishSuccess"));
      setAutoSaveStatus("idle");
      loadFlow(currentFlow.id);
      loadVersions(currentFlow.id);
    } catch {
      message.error(t("message.publishFailed"));
    }
  }, [currentFlow?.id, loadFlow, loadVersions, t]);

  /**
   * 初始化加载
   */
  useEffect(() => {
    if (flowId && flowId !== "new") {
      loadFlow(flowId);
    } else {
      reset();
      setFlowName(t("newFlow"));
    }

    return () => {
      reset();
    };
  }, [flowId, loadFlow, reset, t]);

  /**
   * 加载版本
   */
  useEffect(() => {
    if (currentFlow?.id) {
      loadVersions(currentFlow.id);
    } else {
      setVersions([]);
    }
  }, [currentFlow?.id, loadVersions]);

  /**
   * 快捷键保存
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "s") {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handleSave]);

  /**
   * 离开页面提示
   */
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  /**
   * 自动保存 - 防抖策略
   * 当 hasChanges 变为 true 时，启动定时器
   * 如果在 AUTO_SAVE_DELAY 内再次变化，重置定时器
   */
  useEffect(() => {
    // 仅当流程已创建且有改动时才启动自动保存
    if (!currentFlow?.id || !hasChanges) {
      // 清除待执行的自动保存
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    // 设置状态为 pending
    setAutoSaveStatus("pending");

    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 启动新的定时器
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
      autoSaveTimerRef.current = null;
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [currentFlow?.id, hasChanges, performAutoSave]);

  /**
   * 清理定时器
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (autoSaveStatusResetRef.current) {
        clearTimeout(autoSaveStatusResetRef.current);
      }
    };
  }, []);

  return {
    loading,
    saving,
    flowName,
    setFlowName,
    isReusable,
    setIsReusable,
    versions,
    versionsLoading,
    currentFlow,
    hasChanges,
    isDraftModified,
    autoSaveStatus,
    lastSavedAt,
    loadFlow,
    loadVersions,
    handleSave,
    handlePublish,
  };
}
