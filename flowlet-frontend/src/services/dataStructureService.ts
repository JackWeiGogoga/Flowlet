import api from "./api";

/**
 * 字段定义
 */
export interface FieldDefinition {
  name: string;
  type:
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "list"
    | string; // 支持泛型参数如 "T"
  description?: string;
  required?: boolean;
  defaultValue?: string;
  itemType?: string; // 列表元素类型，可以是泛型参数如 "T"
  refStructure?: string; // 引用的结构体名称 (前端使用)
  refType?: string; // 引用的结构体名称 (后端使用)
  children?: FieldDefinition[]; // 嵌套字段 (前端使用)
  nestedFields?: FieldDefinition[]; // 嵌套字段 (后端 object 类型使用)
  itemFields?: FieldDefinition[]; // 数组元素字段定义 (后端 array 类型使用)
  example?: unknown; // 示例值
}

/**
 * 泛型参数定义
 */
export interface TypeParameter {
  name: string; // 参数名称，如 "T", "E"
  constraint?: string; // 约束类型，如 "object", "string"
  description?: string; // 参数描述
  defaultType?: string; // 默认类型
}

const normalizeFieldTypeFromBackend = (type: string): string => {
  if (type === "array") {
    return "list";
  }
  return type;
};

const normalizeFieldTypeToBackend = (type: string): string => {
  if (type === "list") {
    return "array";
  }
  return type;
};

/**
 * 转换后端字段格式到前端格式
 */
function normalizeFieldsFromBackend(
  fields: FieldDefinition[]
): FieldDefinition[] {
  return fields.map((field) => {
    const normalized: FieldDefinition = {
      ...field,
      type: normalizeFieldTypeFromBackend(field.type),
      itemType: field.itemType
        ? normalizeFieldTypeFromBackend(field.itemType)
        : undefined,
    };

    // 合并 nestedFields 和 itemFields 到 children
    if (field.nestedFields && field.nestedFields.length > 0) {
      normalized.children = normalizeFieldsFromBackend(field.nestedFields);
    } else if (field.itemFields && field.itemFields.length > 0) {
      normalized.children = normalizeFieldsFromBackend(field.itemFields);
    }

    // 合并 refType 到 refStructure
    if (field.refType) {
      normalized.refStructure = field.refType;
    }

    return normalized;
  });
}

/**
 * 转换前端字段格式到后端格式
 */
function normalizeFieldsToBackend(
  fields: FieldDefinition[]
): FieldDefinition[] {
  return fields.map((field) => {
    const normalized: FieldDefinition = {
      ...field,
      type: normalizeFieldTypeToBackend(field.type),
      itemType: field.itemType
        ? normalizeFieldTypeToBackend(field.itemType)
        : undefined,
    };

    // 根据类型将 children 转换为 nestedFields 或 itemFields
    if (field.children && field.children.length > 0) {
      if (normalized.type === "object") {
        normalized.nestedFields = normalizeFieldsToBackend(field.children);
      } else if (normalized.type === "array") {
        normalized.itemFields = normalizeFieldsToBackend(field.children);
      }
    }

    // 转换 refStructure 到 refType
    if (field.refStructure) {
      normalized.refType = field.refStructure;
    }

    // 清除前端专用字段
    delete normalized.children;
    delete normalized.refStructure;

    return normalized;
  });
}

/**
 * 转换后端响应到前端格式
 */
function normalizeResponseFromBackend(
  response: DataStructureResponse
): DataStructureResponse {
  return {
    ...response,
    fields: normalizeFieldsFromBackend(response.fields || []),
    scope: response.flowId ? "flow" : "project",
  };
}

/**
 * 数据结构作用域
 */
export type DataStructureScope = "project" | "flow";

/**
 * 数据结构响应
 */
export interface DataStructureResponse {
  id: string;
  projectId: string;
  flowId?: string;
  flowName?: string;
  name: string;
  fullName: string; // global.xxx 或 flow_alias.xxx，泛型结构会包含参数如 global.Result<T>
  description?: string;
  scope: DataStructureScope;
  fields: FieldDefinition[];
  typeParameters?: TypeParameter[]; // 泛型参数列表
  isGeneric?: boolean; // 是否为泛型结构
  usageCount: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 创建/更新数据结构请求
 */
export interface DataStructureRequest {
  flowId?: string;
  name: string;
  description?: string;
  fields: FieldDefinition[];
  typeParameters?: TypeParameter[]; // 泛型参数列表
}

/**
 * 从 JSON 生成数据结构请求
 */
export interface GenerateFromJsonRequest {
  flowId?: string;
  structureName: string;
  description?: string;
  jsonSample: string;
}

/**
 * 分组后的数据结构
 */
export interface GroupedDataStructures {
  projectLevel: DataStructureResponse[];
  [flowId: string]: DataStructureResponse[];
}

/**
 * 数据结构服务
 */
/**
 * 后端 Result 包装类型
 */
interface Result<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 数据结构服务
 */
const dataStructureService = {
  /**
   * 创建数据结构
   */
  async create(
    projectId: string,
    request: DataStructureRequest
  ): Promise<DataStructureResponse> {
    const backendRequest = {
      ...request,
      fields: normalizeFieldsToBackend(request.fields),
    };
    const response = await api.post<Result<DataStructureResponse>>(
      `/projects/${projectId}/data-structures`,
      backendRequest
    );
    return normalizeResponseFromBackend(response.data.data);
  },

  /**
   * 更新数据结构
   */
  async update(
    projectId: string,
    id: string,
    request: DataStructureRequest
  ): Promise<DataStructureResponse> {
    const backendRequest = {
      ...request,
      fields: normalizeFieldsToBackend(request.fields),
    };
    const response = await api.put<Result<DataStructureResponse>>(
      `/projects/${projectId}/data-structures/${id}`,
      backendRequest
    );
    return normalizeResponseFromBackend(response.data.data);
  },

  /**
   * 删除数据结构
   */
  async delete(projectId: string, id: string): Promise<void> {
    await api.delete(`/projects/${projectId}/data-structures/${id}`);
  },

  /**
   * 获取单个数据结构
   */
  async getById(projectId: string, id: string): Promise<DataStructureResponse> {
    const response = await api.get<Result<DataStructureResponse>>(
      `/projects/${projectId}/data-structures/${id}`
    );
    return normalizeResponseFromBackend(response.data.data);
  },

  /**
   * 获取项目级数据结构列表
   */
  async getProjectLevelStructures(
    projectId: string
  ): Promise<DataStructureResponse[]> {
    const response = await api.get<Result<DataStructureResponse[]>>(
      `/projects/${projectId}/data-structures/project-level`
    );
    return response.data.data.map(normalizeResponseFromBackend);
  },

  /**
   * 获取流程级数据结构列表
   */
  async getFlowLevelStructures(
    projectId: string,
    flowId: string
  ): Promise<DataStructureResponse[]> {
    const response = await api.get<Result<DataStructureResponse[]>>(
      `/projects/${projectId}/data-structures/flow-level/${flowId}`
    );
    return response.data.data.map(normalizeResponseFromBackend);
  },

  /**
   * 获取按作用域分组的所有数据结构
   */
  async getAllGrouped(
    projectId: string
  ): Promise<Record<string, DataStructureResponse[]>> {
    const response = await api.get<
      Result<Record<string, DataStructureResponse[]>>
    >(`/projects/${projectId}/data-structures/grouped`);
    const result: Record<string, DataStructureResponse[]> = {};
    for (const [key, structures] of Object.entries(response.data.data)) {
      result[key] = structures.map(normalizeResponseFromBackend);
    }
    return result;
  },

  /**
   * 获取可用的数据结构列表（用于选择器）
   */
  async getAvailable(
    projectId: string,
    flowId?: string
  ): Promise<DataStructureResponse[]> {
    const params = flowId ? { flowId } : {};
    const response = await api.get<Result<DataStructureResponse[]>>(
      `/projects/${projectId}/data-structures/available`,
      { params }
    );
    return response.data.data.map(normalizeResponseFromBackend);
  },

  /**
   * 从 JSON 样本生成数据结构
   */
  async generateFromJson(
    projectId: string,
    request: GenerateFromJsonRequest
  ): Promise<DataStructureResponse> {
    const response = await api.post<Result<DataStructureResponse>>(
      `/projects/${projectId}/data-structures/generate-from-json`,
      request
    );
    return normalizeResponseFromBackend(response.data.data);
  },

  /**
   * 预览从 JSON 生成的字段定义（不保存）
   */
  async previewGenerate(
    projectId: string,
    jsonSample: string
  ): Promise<FieldDefinition[]> {
    const response = await api.post<Result<FieldDefinition[]>>(
      `/projects/${projectId}/data-structures/preview-generate`,
      { jsonSample }
    );
    return normalizeFieldsFromBackend(response.data.data);
  },

  /**
   * 复制数据结构到另一个作用域
   */
  async copyTo(
    projectId: string,
    id: string,
    targetFlowId: string | null,
    newName?: string
  ): Promise<DataStructureResponse> {
    const response = await api.post<Result<DataStructureResponse>>(
      `/projects/${projectId}/data-structures/${id}/copy`,
      { targetFlowId, newName }
    );
    return normalizeResponseFromBackend(response.data.data);
  },

  /**
   * 将流程级结构提升为项目级
   */
  async promoteToProjectLevel(
    projectId: string,
    id: string
  ): Promise<DataStructureResponse> {
    const response = await api.post<Result<DataStructureResponse>>(
      `/projects/${projectId}/data-structures/${id}/promote`
    );
    return normalizeResponseFromBackend(response.data.data);
  },
};

export default dataStructureService;
