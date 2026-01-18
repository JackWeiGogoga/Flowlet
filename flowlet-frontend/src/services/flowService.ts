import api from "./api";
import type {
  FlowDefinition,
  FlowDefinitionRequest,
  FlowExecution,
  NodeExecution,
  ApiResponse,
  PageResponse,
  ProcessRequest,
  NodeDebugRequest,
  NodeDebugResult,
  FlowDependency,
  FlowDefinitionVersion,
} from "@/types";

/**
 * 流程定义 API
 */
export const flowApi = {
  /**
   * 获取流程列表
   * @param projectId 项目ID（必需，用于隔离不同项目的流程）
   * @param page 页码
   * @param size 每页大小
   * @param status 状态筛选
   * @param keyword 关键词搜索（名称、描述、创建者）
   * @param createdByName 创建者用户名精确筛选
   */
  list: (
    projectId: string,
    page = 1,
    size = 10,
    status?: string,
    keyword?: string,
    createdByName?: string
  ) =>
    api.get<ApiResponse<PageResponse<FlowDefinition>>>("/flows", {
      params: { projectId, page, size, status, keyword, createdByName },
    }),

  /**
   * 获取流程详情
   */
  get: (id: string) => api.get<ApiResponse<FlowDefinition>>(`/flows/${id}`),

  /**
   * 创建流程
   * @param projectId 项目ID
   * @param data 流程定义数据
   */
  create: (projectId: string, data: FlowDefinitionRequest) =>
    api.post<ApiResponse<FlowDefinition>>("/flows", data, {
      params: { projectId },
    }),

  /**
   * 更新流程
   */
  update: (id: string, data: FlowDefinitionRequest) =>
    api.put<ApiResponse<FlowDefinition>>(`/flows/${id}`, data),

  /**
   * 删除流程
   */
  delete: (id: string) => api.delete<ApiResponse<void>>(`/flows/${id}`),

  /**
   * 发布流程
   */
  publish: (id: string) =>
    api.post<ApiResponse<FlowDefinition>>(`/flows/${id}/publish`),

  /**
   * 禁用流程
   */
  disable: (id: string) =>
    api.post<ApiResponse<FlowDefinition>>(`/flows/${id}/disable`),

  /**
   * 复制流程
   */
  copy: (id: string) =>
    api.post<ApiResponse<FlowDefinition>>(`/flows/${id}/copy`),

  /**
   * 获取流程版本列表
   */
  listVersions: (id: string) =>
    api.get<ApiResponse<FlowDefinitionVersion[]>>(`/flows/${id}/versions`),

  /**
   * 获取指定版本详情
   */
  getVersion: (id: string, version: number) =>
    api.get<ApiResponse<FlowDefinitionVersion>>(`/flows/${id}/versions/${version}`),

  /**
   * 回退草稿到指定版本
   */
  rollbackVersion: (id: string, version: number) =>
    api.post<ApiResponse<FlowDefinition>>(`/flows/${id}/versions/${version}/rollback`),

  // ==================== 子流程相关 API ====================

  /**
   * 获取可复用的流程列表（用于子流程选择）
   * @param page 页码
   * @param size 每页大小
   * @param excludeFlowId 排除的流程ID（避免自引用）
   */
  listReusable: (page = 1, size = 20, excludeFlowId?: string) =>
    api.get<ApiResponse<PageResponse<FlowDefinition>>>("/flows/reusable", {
      params: { page, size, excludeFlowId },
    }),

  /**
   * 设置流程的可复用状态
   * @param id 流程ID
   * @param isReusable 是否可复用
   */
  setReusable: (id: string, isReusable: boolean) =>
    api.post<ApiResponse<FlowDefinition>>(`/flows/${id}/reusable`, null, {
      params: { isReusable },
    }),

  /**
   * 获取流程的依赖关系（该流程调用了哪些子流程）
   * @param id 流程ID
   */
  getDependencies: (id: string) =>
    api.get<ApiResponse<FlowDependency[]>>(`/flows/${id}/dependencies`),

  /**
   * 获取依赖该流程的其他流程（哪些流程调用了此流程）
   * @param id 流程ID
   */
  getDependents: (id: string) =>
    api.get<ApiResponse<FlowDefinition[]>>(`/flows/${id}/dependents`),

  /**
   * 检查是否会造成循环依赖
   * @param flowId 当前流程ID
   * @param targetFlowId 要引用的目标流程ID
   */
  checkCircularDependency: (flowId: string, targetFlowId: string) =>
    api.get<ApiResponse<{ wouldCauseCircular: boolean; message: string }>>(
      `/flows/${flowId}/check-circular`,
      { params: { targetFlowId } }
    ),

  /**
   * 获取整体依赖图
   */
  getDependencyGraph: () =>
    api.get<ApiResponse<Record<string, string[]>>>("/flows/dependency-graph"),
};

/**
 * 执行记录查询参数
 */
interface ExecutionListParams {
  page?: number;
  size?: number;
  projectId?: string;
  flowId?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * 流程执行 API
 */
export const executionApi = {
  /**
   * 执行流程
   */
  execute: (data: ProcessRequest) =>
    api.post<ApiResponse<FlowExecution>>("/executions", data),

  /**
   * 获取执行记录列表
   */
  list: (params: ExecutionListParams = {}) =>
    api.get<ApiResponse<PageResponse<FlowExecution>>>("/executions", {
      params: {
        page: params.page || 1,
        size: params.size || 10,
        projectId: params.projectId,
        flowId: params.flowId,
        status: params.status,
        startTime: params.startTime,
        endTime: params.endTime,
      },
    }),

  /**
   * 获取执行详情
   */
  get: (id: string) => api.get<ApiResponse<FlowExecution>>(`/executions/${id}`),

  /**
   * 获取节点执行记录
   */
  getNodes: (executionId: string) =>
    api.get<ApiResponse<NodeExecution[]>>(`/executions/${executionId}/nodes`),

  /**
   * 异步回调
   */
  callback: (callbackId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<void>>(`/executions/callback/${callbackId}`, data),

  /**
   * 调试执行单个节点
   */
  debugNode: (request: NodeDebugRequest) =>
    api.post<ApiResponse<NodeDebugResult>>("/executions/debug-node", request),
};
