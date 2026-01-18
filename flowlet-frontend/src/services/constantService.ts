import api from "./api";

export type ConstantValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array";

export type ConstantScope = "project" | "flow";

export interface ConstantDefinitionResponse {
  id: string;
  projectId: string;
  flowId?: string;
  flowName?: string;
  name: string;
  description?: string;
  valueType: ConstantValueType;
  value: unknown;
  scope: ConstantScope;
  isProjectLevel?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConstantDefinitionRequest {
  flowId?: string;
  name: string;
  description?: string;
  valueType: ConstantValueType;
  value: unknown;
}

interface Result<T> {
  code: number;
  message: string;
  data: T;
}

const normalizeResponseFromBackend = (
  response: ConstantDefinitionResponse
): ConstantDefinitionResponse => ({
  ...response,
  scope: response.flowId ? "flow" : "project",
});

const constantService = {
  async create(
    projectId: string,
    request: ConstantDefinitionRequest
  ): Promise<ConstantDefinitionResponse> {
    const response = await api.post<Result<ConstantDefinitionResponse>>(
      `/projects/${projectId}/constants`,
      request
    );
    return normalizeResponseFromBackend(response.data.data);
  },

  async update(
    projectId: string,
    id: string,
    request: ConstantDefinitionRequest
  ): Promise<ConstantDefinitionResponse> {
    const response = await api.put<Result<ConstantDefinitionResponse>>(
      `/projects/${projectId}/constants/${id}`,
      request
    );
    return normalizeResponseFromBackend(response.data.data);
  },

  async delete(projectId: string, id: string): Promise<void> {
    await api.delete(`/projects/${projectId}/constants/${id}`);
  },

  async getById(
    projectId: string,
    id: string
  ): Promise<ConstantDefinitionResponse> {
    const response = await api.get<Result<ConstantDefinitionResponse>>(
      `/projects/${projectId}/constants/${id}`
    );
    return normalizeResponseFromBackend(response.data.data);
  },

  async getProjectLevel(projectId: string): Promise<ConstantDefinitionResponse[]> {
    const response = await api.get<Result<ConstantDefinitionResponse[]>>(
      `/projects/${projectId}/constants/project-level`
    );
    return response.data.data.map(normalizeResponseFromBackend);
  },

  async getFlowLevel(
    projectId: string,
    flowId: string
  ): Promise<ConstantDefinitionResponse[]> {
    const response = await api.get<Result<ConstantDefinitionResponse[]>>(
      `/projects/${projectId}/constants/flow-level/${flowId}`
    );
    return response.data.data.map(normalizeResponseFromBackend);
  },

  async getAllGrouped(
    projectId: string
  ): Promise<Record<string, ConstantDefinitionResponse[]>> {
    const response = await api.get<
      Result<Record<string, ConstantDefinitionResponse[]>>
    >(`/projects/${projectId}/constants/grouped`);
    const result: Record<string, ConstantDefinitionResponse[]> = {};
    for (const [key, list] of Object.entries(response.data.data)) {
      result[key] = list.map(normalizeResponseFromBackend);
    }
    return result;
  },

  async getAvailable(
    projectId: string,
    flowId?: string
  ): Promise<ConstantDefinitionResponse[]> {
    const params = flowId ? { flowId } : {};
    const response = await api.get<Result<ConstantDefinitionResponse[]>>(
      `/projects/${projectId}/constants/available`,
      { params }
    );
    return response.data.data.map(normalizeResponseFromBackend);
  },
};

export default constantService;
