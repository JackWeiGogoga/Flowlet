import api from "./api";
import { Project } from "@/store/projectStore";
import type { ApiResponse } from "@/types";

/**
 * 项目成员角色
 */
export type ProjectRole = "owner" | "admin" | "editor" | "viewer";

/**
 * 项目成员信息
 */
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 创建项目请求
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

/**
 * 更新项目请求
 */
export interface UpdateProjectRequest {
  name: string;
  description?: string;
}

/**
 * 添加成员请求
 */
export interface AddMemberRequest {
  userId: string;
  role: ProjectRole;
}

/**
 * 用户权限信息
 */
export interface ProjectPermissions {
  role: ProjectRole | null;
  canEdit: boolean;
  canManage: boolean;
  isOwner: boolean;
}

/**
 * 项目管理服务
 */
export const projectService = {
  /**
   * 获取当前用户可访问的项目列表
   */
  async listProjects(): Promise<Project[]> {
    const response = await api.get<ApiResponse<Project[]>>("/projects");
    return response.data.data;
  },

  /**
   * 获取项目详情
   */
  async getProject(projectId: string): Promise<Project> {
    const response = await api.get<ApiResponse<Project>>(
      `/projects/${projectId}`
    );
    return response.data.data;
  },

  /**
   * 创建项目
   */
  async createProject(request: CreateProjectRequest): Promise<Project> {
    const response = await api.post<ApiResponse<Project>>("/projects", request);
    return response.data.data;
  },

  /**
   * 更新项目
   */
  async updateProject(
    projectId: string,
    request: UpdateProjectRequest
  ): Promise<Project> {
    const response = await api.put<ApiResponse<Project>>(
      `/projects/${projectId}`,
      request
    );
    return response.data.data;
  },

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    await api.delete<ApiResponse<void>>(`/projects/${projectId}`);
  },

  /**
   * 获取项目成员列表
   */
  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await api.get<ApiResponse<ProjectMember[]>>(
      `/projects/${projectId}/members`
    );
    return response.data.data;
  },

  /**
   * 添加项目成员
   */
  async addMember(
    projectId: string,
    request: AddMemberRequest
  ): Promise<ProjectMember> {
    const response = await api.post<ApiResponse<ProjectMember>>(
      `/projects/${projectId}/members`,
      request
    );
    return response.data.data;
  },

  /**
   * 更新成员角色
   */
  async updateMemberRole(
    projectId: string,
    userId: string,
    role: ProjectRole
  ): Promise<ProjectMember> {
    const response = await api.put<ApiResponse<ProjectMember>>(
      `/projects/${projectId}/members/${userId}`,
      { role }
    );
    return response.data.data;
  },

  /**
   * 移除项目成员
   */
  async removeMember(projectId: string, userId: string): Promise<void> {
    await api.delete<ApiResponse<void>>(
      `/projects/${projectId}/members/${userId}`
    );
  },

  /**
   * 获取当前用户在项目中的权限
   */
  async getMyPermissions(projectId: string): Promise<ProjectPermissions> {
    const response = await api.get<ApiResponse<ProjectPermissions>>(
      `/projects/${projectId}/permissions`
    );
    return response.data.data;
  },
};

export default projectService;
