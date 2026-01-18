import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { message } from "@/components/AppMessageContext/staticMethods";
import { aiFlowService } from "@/services/aiFlowService";
import { modelHubService } from "@/services/modelHubService";
import { AiFlowSession, AiFlowMessageRecord } from "@/types";

interface UseAiFlowOptions {
  currentFlowId?: string;
  currentProjectId?: string;
  graphToDsl: () => string;
  applyDslToGraph: (dsl: string) => void;
}

interface StandardProvider {
  providerKey: string;
  enabled: boolean;
  hasKey: boolean;
  models?: string[];
}

interface CustomProvider {
  id: string;
  name: string;
  enabled: boolean;
  hasKey: boolean;
  models?: string[];
}

/**
 * AI 流程生成的 Hook
 */
export function useAiFlow({
  currentFlowId,
  currentProjectId,
  graphToDsl,
  applyDslToGraph,
}: UseAiFlowOptions) {
  const { t } = useTranslation("flow");

  // Drawer 状态
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // 会话状态
  const [aiSession, setAiSession] = useState<AiFlowSession | null>(null);
  const [aiMessages, setAiMessages] = useState<AiFlowMessageRecord[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const [aiRegenerating, setAiRegenerating] = useState(false);

  // 模型提供方
  const [aiProviderType, setAiProviderType] = useState<"STANDARD" | "CUSTOM">(
    "STANDARD"
  );
  const [aiProviderKey, setAiProviderKey] = useState<string>("openai");
  const [aiProviderId, setAiProviderId] = useState<string | undefined>(
    undefined
  );
  const [aiModel, setAiModel] = useState<string>("gpt-5.1");
  const [aiProvidersLoading, setAiProvidersLoading] = useState(false);
  const [aiStandardProviders, setAiStandardProviders] = useState<
    StandardProvider[]
  >([]);
  const [aiCustomProviders, setAiCustomProviders] = useState<CustomProvider[]>(
    []
  );

  /**
   * 打开 AI 抽屉
   */
  const handleOpenAiDrawer = useCallback(() => {
    if (!currentProjectId) {
      message.error(t("message.selectProject"));
      return;
    }
    setAiDrawerOpen(true);
  }, [currentProjectId, t]);

  /**
   * 发送消息
   */
  const handleAiSend = useCallback(async () => {
    if (!aiInput.trim()) return;
    if (!currentProjectId) {
      message.error(t("message.selectProject"));
      return;
    }
    if (aiProviderType === "STANDARD" && !aiProviderKey) {
      message.error(t("message.selectStandardProvider"));
      return;
    }
    if (aiProviderType === "CUSTOM" && !aiProviderId) {
      message.error(t("message.selectCustomProvider"));
      return;
    }
    setAiSending(true);

    const userMessage: AiFlowMessageRecord = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: aiInput.trim(),
      createdAt: new Date().toISOString(),
    };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput("");

    try {
      let session = aiSession;
      if (!session) {
        session = await aiFlowService.createSession({
          projectId: currentProjectId,
          flowId: currentFlowId ?? null,
          providerType: aiProviderType,
          providerKey: aiProviderType === "STANDARD" ? aiProviderKey : null,
          providerId: aiProviderType === "CUSTOM" ? aiProviderId : null,
          model: aiModel,
        });
        setAiSession(session);
        if (currentFlowId) {
          localStorage.setItem(
            `flowlet.aiSession.${currentFlowId}`,
            session.id
          );
        }
      }

      const response = await aiFlowService.sendMessage(session.id, {
        message: userMessage.content,
        currentDsl: graphToDsl(),
        providerType: aiProviderType,
        providerKey: aiProviderType === "STANDARD" ? aiProviderKey : null,
        providerId: aiProviderType === "CUSTOM" ? aiProviderId ?? null : null,
        model: aiModel,
      });

      const assistantMessage: AiFlowMessageRecord = {
        id: response.messageId,
        role: "assistant",
        content: response.content,
        patchJson: response.patchJson ?? undefined,
        createdAt: response.createdAt,
      };
      setAiMessages((prev) => [...prev, assistantMessage]);

      if (response.currentDsl) {
        applyDslToGraph(response.currentDsl);
      }
    } catch {
      message.error(t("message.aiGenerateFailed"));
    } finally {
      setAiSending(false);
    }
  }, [
    aiInput,
    aiModel,
    aiProviderId,
    aiProviderKey,
    aiProviderType,
    aiSession,
    applyDslToGraph,
    currentFlowId,
    currentProjectId,
    graphToDsl,
    t,
  ]);

  /**
   * 重新生成
   */
  const handleAiRegenerate = useCallback(async () => {
    if (!aiSession) {
      message.error(t("message.sendMessageFirst"));
      return;
    }
    const lastUser = [...aiMessages]
      .reverse()
      .find((item) => item.role === "user");
    if (!lastUser) {
      message.error(t("message.noUserMessage"));
      return;
    }
    if (aiProviderType === "STANDARD" && !aiProviderKey) {
      message.error(t("message.selectStandardProvider"));
      return;
    }
    if (aiProviderType === "CUSTOM" && !aiProviderId) {
      message.error(t("message.selectCustomProvider"));
      return;
    }

    setAiRegenerating(true);
    try {
      const response = await aiFlowService.regenerate(aiSession.id, {
        currentDsl: graphToDsl(),
        providerType: aiProviderType,
        providerKey: aiProviderType === "STANDARD" ? aiProviderKey : null,
        providerId: aiProviderType === "CUSTOM" ? aiProviderId ?? null : null,
        model: aiModel,
      });
      const assistantMessage: AiFlowMessageRecord = {
        id: response.messageId,
        role: "assistant",
        content: response.content,
        patchJson: response.patchJson ?? undefined,
        createdAt: response.createdAt,
      };
      setAiMessages((prev) => [...prev, assistantMessage]);
      if (response.currentDsl) {
        applyDslToGraph(response.currentDsl);
      }
    } catch {
      message.error(t("message.regenerateFailed"));
    } finally {
      setAiRegenerating(false);
    }
  }, [
    aiMessages,
    aiModel,
    aiProviderId,
    aiProviderKey,
    aiProviderType,
    aiSession,
    applyDslToGraph,
    graphToDsl,
    t,
  ]);

  /**
   * 新建会话
   */
  const handleAiNewSession = useCallback(async () => {
    if (!currentProjectId) {
      message.error(t("message.selectProject"));
      return;
    }
    if (aiProviderType === "STANDARD" && !aiProviderKey) {
      message.error(t("message.selectStandardProvider"));
      return;
    }
    if (aiProviderType === "CUSTOM" && !aiProviderId) {
      message.error(t("message.selectCustomProvider"));
      return;
    }
    try {
      const session = await aiFlowService.createSession({
        projectId: currentProjectId,
        flowId: currentFlowId ?? null,
        providerType: aiProviderType,
        providerKey: aiProviderType === "STANDARD" ? aiProviderKey : null,
        providerId: aiProviderType === "CUSTOM" ? aiProviderId ?? null : null,
        model: aiModel,
      });
      setAiSession(session);
      setAiMessages([]);
      if (currentFlowId) {
        localStorage.setItem(`flowlet.aiSession.${currentFlowId}`, session.id);
      }
    } catch {
      message.error(t("message.newSessionFailed"));
    }
  }, [
    aiModel,
    aiProviderId,
    aiProviderKey,
    aiProviderType,
    currentFlowId,
    currentProjectId,
    t,
  ]);

  // 加载模型提供方
  useEffect(() => {
    if (!aiDrawerOpen) return;
    let cancelled = false;
    const loadProviders = async () => {
      setAiProvidersLoading(true);
      try {
        const data = await modelHubService.list();
        if (cancelled) return;
        setAiStandardProviders(
          data.standardProviders.filter((p) => p.enabled && p.hasKey)
        );
        setAiCustomProviders(
          data.customProviders.filter((p) => p.enabled && p.hasKey)
        );
        if (!aiProviderKey && data.standardProviders.length > 0) {
          setAiProviderKey(data.standardProviders[0].providerKey);
        }
        if (!aiProviderId && data.customProviders.length > 0) {
          setAiProviderId(data.customProviders[0].id);
        }
      } catch {
        message.error(t("message.loadProvidersError"));
      } finally {
        if (!cancelled) {
          setAiProvidersLoading(false);
        }
      }
    };
    loadProviders();
    return () => {
      cancelled = true;
    };
  }, [aiDrawerOpen, aiProviderId, aiProviderKey, t]);

  // 恢复会话
  useEffect(() => {
    if (!currentFlowId || !currentProjectId) return;
    const storageKey = `flowlet.aiSession.${currentFlowId}`;
    const savedSessionId = localStorage.getItem(storageKey);
    if (!savedSessionId) return;
    let cancelled = false;
    const loadSession = async () => {
      try {
        const detail = await aiFlowService.getSession(savedSessionId);
        if (cancelled) return;
        setAiSession(detail.session);
        setAiMessages(detail.messages || []);
        if (detail.currentDsl) {
          applyDslToGraph(detail.currentDsl);
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    };
    loadSession();
    return () => {
      cancelled = true;
    };
  }, [applyDslToGraph, currentFlowId, currentProjectId]);

  // 流程变化时重置
  useEffect(() => {
    setAiSession(null);
    setAiMessages([]);
  }, [currentFlowId]);

  return {
    // Drawer 状态
    aiDrawerOpen,
    setAiDrawerOpen,
    // 会话状态
    aiSession,
    aiMessages,
    aiInput,
    setAiInput,
    aiSending,
    aiRegenerating,
    // 模型提供方
    aiProviderType,
    setAiProviderType,
    aiProviderKey,
    setAiProviderKey,
    aiProviderId,
    setAiProviderId,
    aiModel,
    setAiModel,
    aiProvidersLoading,
    aiStandardProviders,
    aiCustomProviders,
    // 操作
    handleOpenAiDrawer,
    handleAiSend,
    handleAiRegenerate,
    handleAiNewSession,
  };
}
