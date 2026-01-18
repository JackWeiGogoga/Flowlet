import api from "./api";

interface EnumValueDefinition {
  value: string;
  label?: string;
  description?: string;
}

export interface EnumDefinition {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  values: EnumValueDefinition[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EnumRequest {
  name: string;
  description?: string;
  values: EnumValueDefinition[];
}

interface Result<T> {
  code: number;
  message: string;
  data: T;
}

const enumService = {
  async list(projectId: string): Promise<EnumDefinition[]> {
    const response = await api.get<Result<EnumDefinition[]>>(
      `/projects/${projectId}/enums`
    );
    return response.data.data;
  },

  async create(projectId: string, request: EnumRequest): Promise<EnumDefinition> {
    const response = await api.post<Result<EnumDefinition>>(
      `/projects/${projectId}/enums`,
      request
    );
    return response.data.data;
  },

  async update(
    projectId: string,
    id: string,
    request: EnumRequest
  ): Promise<EnumDefinition> {
    const response = await api.put<Result<EnumDefinition>>(
      `/projects/${projectId}/enums/${id}`,
      request
    );
    return response.data.data;
  },

  async remove(projectId: string, id: string): Promise<void> {
    await api.delete(`/projects/${projectId}/enums/${id}`);
  },
};

export default enumService;
export type { EnumValueDefinition };
