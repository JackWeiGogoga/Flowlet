import { useCallback, useEffect, useMemo, useState } from "react";
import type { SelectProps } from "antd";
import { message } from "@/components/AppMessageContext/staticMethods";
import enumService, { type EnumDefinition } from "@/services/enumService";

const enumCache = new Map<string, EnumDefinition[]>();
const enumInFlight = new Map<string, Promise<EnumDefinition[]>>();

type EnumOptions = NonNullable<SelectProps["options"]>;

const buildEnumOptions = (enums: EnumDefinition[]): EnumOptions => {
  return enums
    .map((enumeration) => {
      const options = (enumeration.values || []).map((item, index) => {
        const label = item.label
          ? `${item.label} (${item.value})`
          : item.value;
        // 使用枚举名 + 索引 + 值组合作为唯一 key，避免不同枚举中相同值导致的 key 冲突
        const uniqueKey = `${enumeration.name}__${index}__${item.value}`;
        return {
          key: uniqueKey,
          value: item.value,
          label,
          data: {
            searchText: `${enumeration.name} ${item.value} ${item.label || ""}`,
            enumKey: enumeration.name,
            rawValue: item.value,
            displayLabel: item.label || item.value,
          },
        };
      });
      return {
        label: enumeration.name,
        options,
      };
    })
    .filter((group) => group.options.length > 0);
};

// 请求状态类型
type RequestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: EnumDefinition[] }
  | { status: "error"; error: unknown };

export const useEnumOptions = (projectId?: string) => {
  const [requestState, setRequestState] = useState<RequestState>({
    status: "idle",
  });
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => {
    if (!projectId) {
      return;
    }
    enumCache.delete(projectId);
    setRefreshIndex((value) => value + 1);
  }, [projectId]);

  // 从缓存获取枚举值
  const cachedEnums = projectId ? enumCache.get(projectId) : undefined;

  // 判断是否需要加载
  const needsLoading = Boolean(projectId && !cachedEnums);

  // 发起请求的函数
  const fetchEnums = useCallback((id: string) => {
    const existing = enumInFlight.get(id);
    if (existing) {
      return existing;
    }

    const request = enumService
      .list(id)
      .then((data) => {
        enumCache.set(id, data);
        return data;
      })
      .finally(() => {
        enumInFlight.delete(id);
      });

    enumInFlight.set(id, request);
    return request;
  }, []);

  useEffect(() => {
    // 没有 projectId 或已有缓存时不需要加载
    if (!projectId || enumCache.has(projectId)) {
      return;
    }

    let active = true;

    // 使用微任务延迟设置 loading 状态，避免同步 setState
    // active 变量会在 cleanup 时设为 false，确保不会在组件卸载后更新状态
    queueMicrotask(() => {
      if (active) {
        setRequestState({ status: "loading" });
      }
    });

    fetchEnums(projectId)
      .then((data) => {
        if (active) {
          setRequestState({ status: "success", data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setRequestState({ status: "error", error });
          message.error("加载枚举失败");
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, refreshIndex, fetchEnums]);

  // 计算当前枚举值
  const currentEnums = useMemo(() => {
    if (!projectId) return [];
    // 优先使用缓存
    if (cachedEnums) return cachedEnums;
    // 其次使用请求成功的数据
    if (requestState.status === "success") return requestState.data;
    return [];
  }, [projectId, cachedEnums, requestState]);

  // 计算 loading 状态
  const loading = needsLoading && requestState.status === "loading";

  const options = useMemo<EnumOptions>(
    () => buildEnumOptions(currentEnums),
    [currentEnums]
  );

  return { enums: currentEnums, options, loading, refresh };
};
