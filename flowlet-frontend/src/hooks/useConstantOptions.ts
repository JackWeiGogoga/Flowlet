import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "@/components/AppMessageContext/staticMethods";
import constantService, {
  type ConstantDefinitionResponse,
} from "@/services/constantService";

const constantCache = new Map<string, ConstantDefinitionResponse[]>();
const constantInFlight = new Map<
  string,
  Promise<ConstantDefinitionResponse[]>
>();

/** 常量引用格式前缀（使用点号分隔，与后端 ExpressionResolver 兼容） */
export const CONSTANT_REF_PREFIX = "{{constant.";
/** 常量引用格式后缀 */
export const CONSTANT_REF_SUFFIX = "}}";

/** 生成常量引用字符串，如 {{constant.MAX_RETRY}} */
export const formatConstantRef = (constantName: string): string => {
  return `${CONSTANT_REF_PREFIX}${constantName}${CONSTANT_REF_SUFFIX}`;
};

/** 解析常量引用，返回常量名称；如果不是常量引用则返回 null */
export const parseConstantRef = (value: string): string | null => {
  if (!value) return null;
  
  // 支持 {{constant.xxx}} 格式
  if (
    value.startsWith(CONSTANT_REF_PREFIX) &&
    value.endsWith(CONSTANT_REF_SUFFIX)
  ) {
    return value.slice(
      CONSTANT_REF_PREFIX.length,
      -CONSTANT_REF_SUFFIX.length
    );
  }
  
  // 兼容 {{const.xxx}} 格式
  const constPrefix = "{{const.";
  if (value.startsWith(constPrefix) && value.endsWith(CONSTANT_REF_SUFFIX)) {
    return value.slice(constPrefix.length, -CONSTANT_REF_SUFFIX.length);
  }
  
  return null;
};

/** 检查是否是常量引用 */
export const isConstantRef = (value: string): boolean => {
  if (!value) return false;
  return (
    (value.startsWith(CONSTANT_REF_PREFIX) ||
      value.startsWith("{{const.")) &&
    value.endsWith(CONSTANT_REF_SUFFIX)
  );
};

/** 常量选项数据 */
export interface ConstantOptionData {
  searchText: string;
  type: "constant";
  constantId: string;
  constantName: string;
  /** 常量引用字符串，如 {{constant:MAX_RETRY}} */
  refValue: string;
  /** 常量的实际值（用于显示） */
  rawValue: string;
  valueType: string;
}

/** 单个常量选项 */
export interface ConstantOption {
  key: string;
  /** 选中时返回的值：常量引用格式 */
  value: string;
  label: React.ReactNode;
  data: ConstantOptionData;
}

/** 常量选项组 */
export interface ConstantOptionGroup {
  label: string;
  options: ConstantOption[];
}

/** 常量选项类型（分组形式） */
export type ConstantOptions = ConstantOptionGroup[];

/** 获取常量值的显示字符串 */
const formatConstantValue = (constant: ConstantDefinitionResponse): string => {
  const { value, valueType } = constant;
  if (valueType === "string") {
    return String(value);
  }
  if (valueType === "number" || valueType === "boolean") {
    return String(value);
  }
  if (valueType === "object" || valueType === "array") {
    return JSON.stringify(value);
  }
  return String(value);
};

/** 构建单个常量的选项 */
const buildConstantOption = (constant: ConstantDefinitionResponse): ConstantOption => {
  const displayValue = formatConstantValue(constant);
  const refValue = formatConstantRef(constant.name);
  return {
    key: `constant__${constant.id}`,
    // 选中时返回常量引用格式，而非实际值
    value: refValue,
    // 使用纯字符串 label，避免 JSX 依赖
    label: `${constant.name} = ${displayValue}`,
    data: {
      searchText: `${constant.name} ${constant.description || ""} ${displayValue}`,
      type: "constant" as const,
      constantId: constant.id,
      constantName: constant.name,
      refValue: refValue,
      rawValue: displayValue,
      valueType: constant.valueType,
    },
  };
};

/** 构建常量选项 */
const buildConstantOptions = (
  constants: ConstantDefinitionResponse[]
): ConstantOptions => {
  // 按 scope 分组：项目级和流程级
  const projectConstants = constants.filter((c) => c.scope === "project");
  const flowConstants = constants.filter((c) => c.scope === "flow");

  const groups: ConstantOptions = [];

  if (projectConstants.length > 0) {
    groups.push({
      label: "📦 项目常量",
      options: projectConstants.map(buildConstantOption),
    });
  }

  if (flowConstants.length > 0) {
    groups.push({
      label: "📄 流程常量",
      options: flowConstants.map(buildConstantOption),
    });
  }

  return groups;
};

// 请求状态类型
type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ConstantDefinitionResponse[] }
  | { status: "error"; error: unknown };

/** 生成缓存 key */
const getCacheKey = (projectId: string, flowId?: string): string => {
  return flowId ? `${projectId}__${flowId}` : projectId;
};

export const useConstantOptions = (projectId?: string, flowId?: string) => {
  const [requestState, setRequestState] = useState<RequestState>({
    status: "idle",
  });
  const [refreshIndex, setRefreshIndex] = useState(0);

  const cacheKey = projectId ? getCacheKey(projectId, flowId) : undefined;

  const refresh = useCallback(() => {
    if (!cacheKey) {
      return;
    }
    constantCache.delete(cacheKey);
    setRefreshIndex((value) => value + 1);
  }, [cacheKey]);

  // 从缓存获取常量
  const cachedConstants = cacheKey ? constantCache.get(cacheKey) : undefined;

  // 判断是否需要加载
  const needsLoading = Boolean(projectId && !cachedConstants);

  // 发起请求的函数
  const fetchConstants = useCallback(
    (id: string, currentFlowId?: string) => {
      const key = getCacheKey(id, currentFlowId);
      const existing = constantInFlight.get(key);
      if (existing) {
        return existing;
      }

      const request = constantService
        .getAvailable(id, currentFlowId)
        .then((data) => {
          constantCache.set(key, data);
          return data;
        })
        .finally(() => {
          constantInFlight.delete(key);
        });

      constantInFlight.set(key, request);
      return request;
    },
    []
  );

  useEffect(() => {
    // 没有 projectId 或已有缓存时不需要加载
    if (!projectId || !cacheKey || constantCache.has(cacheKey)) {
      return;
    }

    let active = true;

    // 使用微任务延迟设置 loading 状态，避免同步 setState
    queueMicrotask(() => {
      if (active) {
        setRequestState({ status: "loading" });
      }
    });

    fetchConstants(projectId, flowId)
      .then((data) => {
        if (active) {
          setRequestState({ status: "success", data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setRequestState({ status: "error", error });
          message.error("加载常量失败");
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, flowId, cacheKey, refreshIndex, fetchConstants]);

  // 计算当前常量
  const currentConstants = useMemo(() => {
    if (!projectId) return [];
    // 优先使用缓存
    if (cachedConstants) return cachedConstants;
    // 其次使用请求成功的数据
    if (requestState.status === "success") return requestState.data;
    return [];
  }, [projectId, cachedConstants, requestState]);

  // 计算 loading 状态
  const loading = needsLoading && requestState.status === "loading";

  const options = useMemo<ConstantOptions>(
    () => buildConstantOptions(currentConstants),
    [currentConstants]
  );

  return { constants: currentConstants, options, loading, refresh };
};
