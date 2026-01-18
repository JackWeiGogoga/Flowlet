import api from "./api";
import type {
  ApiResponse,
  KeywordLibrary,
  KeywordTerm,
  KeywordGroup,
  KeywordMatchMode,
} from "@/types";

export interface KeywordLibraryRequest {
  name: string;
  description?: string;
  enabled?: boolean;
}

export interface KeywordTermRequest {
  term: string;
  matchMode: KeywordMatchMode;
  enabled?: boolean;
  groupIds?: string[];
}

export interface KeywordGroupRequest {
  name: string;
  description?: string;
  enabled?: boolean;
  actionLevel:
    | "DELETE"
    | "REVIEW_BEFORE_PUBLISH"
    | "PUBLISH_BEFORE_REVIEW"
    | "TAG_ONLY";
  priority?: number;
  termIds?: string[];
}

const keywordService = {
  async listLibraries(params: {
    projectId: string;
    keyword?: string;
  }): Promise<KeywordLibrary[]> {
    const response = await api.get<ApiResponse<KeywordLibrary[]>>(
      `/projects/${params.projectId}/keyword-libraries`,
      { params: params.keyword ? { keyword: params.keyword } : {} }
    );
    return response.data.data || [];
  },

  async createLibrary(
    projectId: string,
    request: KeywordLibraryRequest
  ): Promise<KeywordLibrary> {
    const response = await api.post<ApiResponse<KeywordLibrary>>(
      `/projects/${projectId}/keyword-libraries`,
      request
    );
    return response.data.data;
  },

  async updateLibrary(
    projectId: string,
    id: string,
    request: KeywordLibraryRequest
  ): Promise<KeywordLibrary> {
    const response = await api.put<ApiResponse<KeywordLibrary>>(
      `/projects/${projectId}/keyword-libraries/${id}`,
      request
    );
    return response.data.data;
  },

  async deleteLibrary(projectId: string, id: string): Promise<void> {
    await api.delete(`/projects/${projectId}/keyword-libraries/${id}`);
  },

  async listTerms(params: {
    projectId: string;
    libraryId: string;
    keyword?: string;
  }): Promise<KeywordTerm[]> {
    const response = await api.get<ApiResponse<KeywordTerm[]>>(
      `/projects/${params.projectId}/keyword-libraries/${params.libraryId}/terms`,
      { params: params.keyword ? { keyword: params.keyword } : {} }
    );
    return response.data.data || [];
  },

  async createTerm(
    projectId: string,
    libraryId: string,
    request: KeywordTermRequest
  ): Promise<KeywordTerm> {
    const response = await api.post<ApiResponse<KeywordTerm>>(
      `/projects/${projectId}/keyword-libraries/${libraryId}/terms`,
      request
    );
    return response.data.data;
  },

  async updateTerm(
    projectId: string,
    libraryId: string,
    id: string,
    request: KeywordTermRequest
  ): Promise<KeywordTerm> {
    const response = await api.put<ApiResponse<KeywordTerm>>(
      `/projects/${projectId}/keyword-libraries/${libraryId}/terms/${id}`,
      request
    );
    return response.data.data;
  },

  async deleteTerm(
    projectId: string,
    libraryId: string,
    id: string
  ): Promise<void> {
    await api.delete(
      `/projects/${projectId}/keyword-libraries/${libraryId}/terms/${id}`
    );
  },

  async listGroups(params: {
    projectId: string;
    libraryId: string;
    keyword?: string;
  }): Promise<KeywordGroup[]> {
    const response = await api.get<ApiResponse<KeywordGroup[]>>(
      `/projects/${params.projectId}/keyword-libraries/${params.libraryId}/groups`,
      { params: params.keyword ? { keyword: params.keyword } : {} }
    );
    return response.data.data || [];
  },

  async createGroup(
    projectId: string,
    libraryId: string,
    request: KeywordGroupRequest
  ): Promise<KeywordGroup> {
    const response = await api.post<ApiResponse<KeywordGroup>>(
      `/projects/${projectId}/keyword-libraries/${libraryId}/groups`,
      request
    );
    return response.data.data;
  },

  async updateGroup(
    projectId: string,
    libraryId: string,
    id: string,
    request: KeywordGroupRequest
  ): Promise<KeywordGroup> {
    const response = await api.put<ApiResponse<KeywordGroup>>(
      `/projects/${projectId}/keyword-libraries/${libraryId}/groups/${id}`,
      request
    );
    return response.data.data;
  },

  async deleteGroup(
    projectId: string,
    libraryId: string,
    id: string
  ): Promise<void> {
    await api.delete(
      `/projects/${projectId}/keyword-libraries/${libraryId}/groups/${id}`
    );
  },
};

export default keywordService;
