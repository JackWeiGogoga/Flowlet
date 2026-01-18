import api from "@/services/api";
import type {
  ApiResponse,
  AiFlowSession,
  AiFlowSessionDetail,
  AiFlowMessageResponse,
} from "@/types";

export interface CreateAiFlowSessionPayload {
  projectId: string;
  flowId?: string | null;
  providerType?: "STANDARD" | "CUSTOM";
  providerKey?: string | null;
  providerId?: string | null;
  model?: string | null;
}

export interface SendAiFlowMessagePayload {
  message: string;
  currentDsl?: string;
  providerType?: "STANDARD" | "CUSTOM";
  providerKey?: string | null;
  providerId?: string | null;
  model?: string | null;
}

export const aiFlowService = {
  async createSession(payload: CreateAiFlowSessionPayload) {
    const { data } = await api.post<ApiResponse<AiFlowSession>>(
      "/ai/flows/sessions",
      payload
    );
    return data.data;
  },
  async getSession(sessionId: string) {
    const { data } = await api.get<ApiResponse<AiFlowSessionDetail>>(
      `/ai/flows/sessions/${sessionId}`
    );
    return data.data;
  },
  async sendMessage(sessionId: string, payload: SendAiFlowMessagePayload) {
    const { data } = await api.post<ApiResponse<AiFlowMessageResponse>>(
      `/ai/flows/sessions/${sessionId}/messages`,
      payload
    );
    return data.data;
  },
  async regenerate(
    sessionId: string,
    payload?: Omit<SendAiFlowMessagePayload, "message">
  ) {
    const { data } = await api.post<ApiResponse<AiFlowMessageResponse>>(
      `/ai/flows/sessions/${sessionId}/regenerate`,
      payload
    );
    return data.data;
  },
};
