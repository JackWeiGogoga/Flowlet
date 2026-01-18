import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 租户信息
 */
export interface Tenant {
  id: string;
  name: string;
  displayName: string;
  logo?: string;
}

/**
 * 租户状态
 */
interface TenantState {
  /** 当前选中的租户 */
  currentTenant: Tenant | null;
  /** 用户可访问的租户列表 */
  tenants: Tenant[];
  /** 是否正在加载 */
  isLoading: boolean;

  /** 设置当前租户 */
  setCurrentTenant: (tenant: Tenant) => void;
  /** 设置租户列表 */
  setTenants: (tenants: Tenant[]) => void;
  /** 切换租户 */
  switchTenant: (tenantId: string) => Promise<void>;
  /** 初始化租户 */
  initialize: (tenants: Tenant[], defaultTenantId?: string) => void;
  /** 清空租户信息 */
  clear: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      currentTenant: null,
      tenants: [],
      isLoading: false,

      setCurrentTenant: (tenant) => {
        set({ currentTenant: tenant });
      },

      setTenants: (tenants) => {
        set({ tenants });
      },

      switchTenant: async (tenantId) => {
        const { tenants } = get();
        const tenant = tenants.find((t) => t.id === tenantId);

        if (!tenant) {
          console.error(`Tenant ${tenantId} not found`);
          return;
        }

        set({ isLoading: true });

        try {
          // 切换租户后，可能需要重新加载数据
          // 这里可以添加 API 调用来通知后端切换租户上下文
          set({ currentTenant: tenant, isLoading: false });

          // 刷新页面数据（触发重新加载）
          window.dispatchEvent(
            new CustomEvent("tenant-changed", { detail: tenant })
          );
        } catch (error) {
          console.error("Failed to switch tenant:", error);
          set({ isLoading: false });
        }
      },

      initialize: (tenants, defaultTenantId) => {
        const { currentTenant } = get();

        set({ tenants });

        // 如果当前没有选中租户，或当前租户不在列表中
        if (!currentTenant || !tenants.find((t) => t.id === currentTenant.id)) {
          // 优先使用指定的默认租户，否则使用第一个
          const defaultTenant = defaultTenantId
            ? tenants.find((t) => t.id === defaultTenantId)
            : tenants[0];

          if (defaultTenant) {
            set({ currentTenant: defaultTenant });
          }
        }
      },

      clear: () => {
        set({ currentTenant: null, tenants: [], isLoading: false });
      },
    }),
    {
      name: "flowlet-tenant",
      partialize: (state) => ({
        currentTenant: state.currentTenant,
      }),
    }
  )
);

/**
 * Hook: 获取当前租户ID
 */
export const useCurrentTenantId = () => {
  return useTenantStore((state) => state.currentTenant?.id);
};
