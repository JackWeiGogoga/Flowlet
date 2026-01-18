import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 项目信息
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdBy?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
  /** 是否为默认项目 */
  isDefault?: boolean;
}

interface ProjectState {
  /** 当前选中的项目 */
  currentProject: Project | null;
  /** 可用的项目列表 */
  projects: Project[];
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否已从 localStorage 恢复状态 */
  hydrated: boolean;

  /** 初始化项目列表 */
  initialize: (projects: Project[]) => void;
  /** 切换当前项目 */
  setCurrentProject: (project: Project) => void;
  /** 通过 ID 切换项目 */
  setCurrentProjectById: (projectId: string) => void;
  /** 添加项目 */
  addProject: (project: Project) => void;
  /** 更新项目 */
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  /** 删除项目 */
  removeProject: (projectId: string) => void;
  /** 重置状态 */
  reset: () => void;
}

const initialState = {
  currentProject: null,
  projects: [],
  initialized: false,
  hydrated: false,
};

/**
 * 项目状态管理
 * 用于管理用户的项目列表和当前选中的项目
 */
export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...initialState,

      initialize: (projects: Project[]) => {
        const { currentProject } = get();

        // 如果已有选中的项目，检查是否仍在列表中
        const validCurrentProject = currentProject
          ? projects.find((p) => p.id === currentProject.id)
          : null;

        set({
          projects,
          currentProject: validCurrentProject || projects[0] || null,
          initialized: true,
        });
      },

      setCurrentProject: (project: Project) => {
        set({ currentProject: project });
      },

      setCurrentProjectById: (projectId: string) => {
        const { projects } = get();
        const project = projects.find((p) => p.id === projectId);
        if (project) {
          set({ currentProject: project });
        }
      },

      addProject: (project: Project) => {
        set((state) => ({
          projects: [...state.projects, project],
        }));
      },

      updateProject: (projectId: string, updates: Partial<Project>) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, ...updates } : p
          ),
          // 如果更新的是当前项目，也更新 currentProject
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        }));
      },

      removeProject: (projectId: string) => {
        set((state) => {
          const newProjects = state.projects.filter((p) => p.id !== projectId);
          const newCurrentProject =
            state.currentProject?.id === projectId
              ? newProjects[0] || null
              : state.currentProject;

          return {
            projects: newProjects,
            currentProject: newCurrentProject,
          };
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "flowlet-project-storage",
      partialize: (state) => ({
        currentProject: state.currentProject,
        // 不持久化 projects 列表，每次从服务器获取
      }),
      onRehydrateStorage: () => (state) => {
        // 从 localStorage 恢复状态完成后，标记为已 hydrated
        if (state) {
          state.hydrated = true;
        }
      },
    }
  )
);
