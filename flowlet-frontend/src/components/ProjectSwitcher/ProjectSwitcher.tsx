import React, { useState, useEffect, useRef } from "react";
import {
  Dropdown,
  Button,
  Typography,
  Modal,
  Form,
  Input,
  Popconfirm,
} from "antd";
import type { MenuProps } from "antd";
import {
  AiOutlineProject,
  AiOutlineDown,
  AiOutlinePlus,
  AiOutlineLoading3Quarters,
  AiOutlineEdit,
  AiOutlineDelete,
  AiOutlineMore,
} from "react-icons/ai";
import { createStyles } from "antd-style";
import { useTranslation } from "react-i18next";
import { useProjectStore, Project } from "@/store/projectStore";
import { projectService } from "@/services/projectService";
import { useAuth } from "@/auth";
import { message } from "@/components/AppMessageContext/staticMethods";

const { Text } = Typography;
const { TextArea } = Input;

const useStyles = createStyles(({ token }) => ({
  container: {
    padding: "0px 4px 12px 2px",
  },
  containerCollapsed: {
    padding: "0px 4px 12px 2px",
    display: "flex",
    justifyContent: "center",
  },
  button: {
    width: "100%",
    height: "auto",
    padding: "4px 12px",
    textAlign: "left",
    borderRadius: token.borderRadius,
    background: token.colorBgContainer,
    "&:hover": {
      background: token.colorBgTextHover,
      borderColor: token.colorPrimary,
    },
  },
  buttonCollapsed: {
    width: 40,
    height: 33,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  projectInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  projectIcon: {
    fontSize: 16,
    color: token.colorPrimary,
    flexShrink: 0,
  },
  projectName: {
    fontSize: 14,
    // fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dropdownIcon: {
    fontSize: 12,
    color: token.colorTextSecondary,
    flexShrink: 0,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 180,
  },
  menuItemInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  divider: {
    margin: "4px 0",
  },
  loadingIcon: {
    animation: "spin 1s linear infinite",
    "@keyframes spin": {
      from: { transform: "rotate(0deg)" },
      to: { transform: "rotate(360deg)" },
    },
  },
  emptyText: {
    color: token.colorTextSecondary,
    fontSize: 13,
    padding: "8px 12px",
  },
  subMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  deleteItem: {
    color: token.colorError,
  },
  defaultTag: {
    fontSize: 12,
    padding: "0 6px",
    borderRadius: 4,
    background: token.colorFillSecondary,
    color: token.colorTextSecondary,
    marginLeft: 8,
  },
  moreButton: {
    padding: "2px 4px",
    marginLeft: 8,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: token.colorTextSecondary,
    "&:hover": {
      background: token.colorBgTextHover,
      color: token.colorText,
    },
  },
}));

interface ProjectSwitcherProps {
  /** 是否折叠模式 */
  collapsed?: boolean;
  /** 项目切换回调 */
  onProjectChange?: (project: Project) => void;
}

interface CreateProjectFormValues {
  name: string;
  description?: string;
}

interface EditProjectFormValues {
  name: string;
  description?: string;
}

/**
 * 项目切换器组件
 * 用于在侧边栏显示当前项目并提供切换功能
 */
export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  collapsed = false,
  onProjectChange,
}) => {
  const { styles } = useStyles();
  const { t } = useTranslation("common");
  const {
    currentProject,
    projects,
    setCurrentProject,
    initialize,
    addProject,
    updateProject,
    removeProject,
    hydrated,
  } = useProjectStore();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<CreateProjectFormValues>();

  // 编辑项目相关状态
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm] = Form.useForm<EditProjectFormValues>();

  // 防止重复加载
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  // 加载项目列表
  const loadProjects = async () => {
    // 防止并发加载
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);

    try {
      const projectList = await projectService.listProjects();
      initialize(projectList);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error("[ProjectSwitcher] Failed to load projects:", error);
      // 加载失败，不标记为已加载，允许重试
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // 当认证状态变化时加载项目列表
  // 确保 user 对象存在且有 access_token 才加载
  useEffect(() => {
    // 只加载一次
    if (hasLoadedRef.current) {
      return;
    }

    if (isAuthenticated && !authLoading && user?.access_token) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, user?.access_token]);

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project);
    onProjectChange?.(project);
  };

  // 打开创建项目弹窗
  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
  };

  // 关闭创建项目弹窗
  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    form.resetFields();
  };

  // 创建项目
  const handleCreateProject = async (values: CreateProjectFormValues) => {
    setCreating(true);
    try {
      const newProject = await projectService.createProject({
        name: values.name,
        description: values.description,
      });
      addProject(newProject);
      setCurrentProject(newProject);
      message.success(t("project.createSuccess", { name: newProject.name }));
      handleCloseCreateModal();
    } catch (error) {
      console.error("Failed to create project:", error);
      message.error(t("project.createFailed"));
    } finally {
      setCreating(false);
    }
  };

  // 打开编辑项目弹窗
  const handleOpenEditModal = (project: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProject(project);
    editForm.setFieldsValue({
      name: project.name,
      description: project.description,
    });
    setEditModalOpen(true);
  };

  // 关闭编辑项目弹窗
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingProject(null);
    editForm.resetFields();
  };

  // 更新项目
  const handleUpdateProject = async (values: EditProjectFormValues) => {
    if (!editingProject) return;

    setEditing(true);
    try {
      const updatedProject = await projectService.updateProject(
        editingProject.id,
        {
          name: values.name,
          description: values.description,
        }
      );
      updateProject(editingProject.id, updatedProject);
      message.success(t("project.updateSuccess", { name: updatedProject.name }));
      handleCloseEditModal();
    } catch (error) {
      console.error("Failed to update project:", error);
      message.error(t("project.updateFailed"));
    } finally {
      setEditing(false);
    }
  };

  // 删除项目
  const handleDeleteProject = async (
    project: Project,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    try {
      await projectService.deleteProject(project.id);
      removeProject(project.id);
      message.success(t("project.deleteSuccess", { name: project.name }));

      // 如果删除的是当前项目，切换到其他项目
      if (currentProject?.id === project.id) {
        const remainingProjects = projects.filter((p) => p.id !== project.id);
        if (remainingProjects.length > 0) {
          setCurrentProject(remainingProjects[0]);
        } else {
          setCurrentProject(null as unknown as Project);
        }
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      message.error(t("project.deleteFailed"));
    }
  };

  // 构建项目操作菜单
  const getProjectActionMenuItems = (project: Project): MenuProps["items"] => [
    {
      key: `${project.id}-edit`,
      icon: <AiOutlineEdit />,
      label: t("project.editInfo"),
      onClick: () => handleOpenEditModal(project),
    },
    // 默认项目不显示删除选项
    ...(project.isDefault
      ? []
      : [
          {
            key: `${project.id}-delete`,
            label: (
              <Popconfirm
                title={t("project.deleteConfirmTitle")}
                description={t("project.deleteConfirmDesc", { name: project.name })}
                onConfirm={(e) => handleDeleteProject(project, e)}
                onCancel={(e) => e?.stopPropagation()}
                okText={t("project.delete")}
                cancelText={t("action.cancel")}
                okButtonProps={{ danger: true }}
              >
                <div
                  className={styles.deleteItem}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    margin: "-5px -12px",
                    padding: "5px 12px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <AiOutlineDelete />
                  <span>{t("project.delete")}</span>
                </div>
              </Popconfirm>
            ),
          },
        ]),
  ];

  // 排序项目列表：默认项目排在第一位
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });

  // 构建下拉菜单项
  const menuItems: MenuProps["items"] = loading
    ? [
        {
          key: "loading",
          label: (
            <div className={styles.menuItem}>
              <AiOutlineLoading3Quarters className={styles.loadingIcon} />
              <span style={{ marginLeft: 8 }}>{t("project.loading")}</span>
            </div>
          ),
          disabled: true,
        },
      ]
    : [
        // 项目列表
        ...(sortedProjects.length > 0
          ? sortedProjects.map((project) => {
              return {
                key: project.id,
                label: (
                  <div className={`${styles.menuItem}`}>
                    <div
                      className={styles.menuItemInfo}
                      style={{ flex: 1 }}
                      onClick={() => handleProjectSelect(project)}
                    >
                      <AiOutlineProject />
                      <span>{project.name}</span>
                    </div>
                    {project.isDefault ? (
                      <span className={styles.defaultTag}>{t("project.default")}</span>
                    ) : (
                      <Dropdown
                        menu={{ items: getProjectActionMenuItems(project) }}
                        trigger={["click"]}
                        placement="bottomRight"
                      >
                        <div
                          className={styles.moreButton}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AiOutlineMore />
                        </div>
                      </Dropdown>
                    )}
                  </div>
                ),
                onClick: () => handleProjectSelect(project),
              };
            })
          : [
              {
                key: "empty",
                label: (
                  <div className={styles.emptyText}>{t("project.empty")}</div>
                ),
                disabled: true,
              },
            ]),
        // 分隔线
        {
          type: "divider" as const,
        },
        // 新建项目
        {
          key: "create",
          icon: <AiOutlinePlus />,
          label: t("project.create"),
          onClick: handleOpenCreateModal,
        },
      ];

  // 创建项目弹窗内容
  const createProjectModal = (
    <Modal
      title={t("project.create")}
      open={createModalOpen}
      onCancel={handleCloseCreateModal}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCreateProject}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label={t("project.name")}
          rules={[
            { required: true, message: t("project.nameRequired") },
            { max: 50, message: t("project.nameMax") },
          ]}
        >
          <Input placeholder={t("project.namePlaceholder")} autoFocus />
        </Form.Item>
        <Form.Item
          name="description"
          label={t("project.description")}
          rules={[{ max: 500, message: t("project.descriptionMax") }]}
        >
          <TextArea
            placeholder={t("project.descriptionPlaceholder")}
            rows={3}
            showCount
            maxLength={500}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={handleCloseCreateModal} style={{ marginRight: 8 }}>
            {t("action.cancel")}
          </Button>
          <Button type="primary" htmlType="submit" loading={creating}>
            {t("action.create")}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );

  // 编辑项目弹窗内容
  const editProjectModal = (
    <Modal
      title={t("project.edit")}
      open={editModalOpen}
      onCancel={handleCloseEditModal}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={editForm}
        layout="vertical"
        onFinish={handleUpdateProject}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label={t("project.name")}
          rules={[
            { required: true, message: t("project.nameRequired") },
            { max: 50, message: t("project.nameMax") },
          ]}
        >
          <Input placeholder={t("project.namePlaceholder")} autoFocus />
        </Form.Item>
        <Form.Item
          name="description"
          label={t("project.description")}
          rules={[{ max: 500, message: t("project.descriptionMax") }]}
        >
          <TextArea
            placeholder={t("project.descriptionPlaceholder")}
            rows={3}
            showCount
            maxLength={500}
          />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Button onClick={handleCloseEditModal} style={{ marginRight: 8 }}>
            {t("action.cancel")}
          </Button>
          <Button type="primary" htmlType="submit" loading={editing}>
            {t("action.save")}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );

  // 折叠模式
  if (collapsed) {
    return (
      <>
        <div className={styles.containerCollapsed}>
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            placement="bottomLeft"
          >
            <Button
              type="text"
              className={styles.buttonCollapsed}
              icon={<AiOutlineProject className={styles.projectIcon} />}
            />
          </Dropdown>
        </div>
        {createProjectModal}
        {editProjectModal}
      </>
    );
  }

  // 展开模式
  return (
    <>
      <div className={styles.container}>
        <Dropdown
          menu={{ items: menuItems }}
          trigger={["click"]}
          placement="bottomLeft"
        >
          <Button type="text" className={styles.button}>
            <div className={styles.buttonContent}>
              <div className={styles.projectInfo}>
                <AiOutlineProject className={styles.projectIcon} />
                <Text className={styles.projectName}>
                  {loading || !hydrated
                    ? t("project.loading")
                    : currentProject?.name || t("project.select")}
                </Text>
              </div>
              <AiOutlineDown className={styles.dropdownIcon} />
            </div>
          </Button>
        </Dropdown>
      </div>
      {createProjectModal}
      {editProjectModal}
    </>
  );
};

export default ProjectSwitcher;
