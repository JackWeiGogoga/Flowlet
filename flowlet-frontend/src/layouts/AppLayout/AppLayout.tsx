import React, { useState } from "react";
import { Layout, Menu, Button, Drawer, Breadcrumb } from "antd";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AiOutlineAppstore,
  AiOutlineDatabase,
  AiOutlineHistory,
  AiOutlineSetting,
  AiOutlineMenu,
  AiOutlineTags,
} from "react-icons/ai";
import { PiSidebarLight } from "react-icons/pi";
import type { MenuProps } from "antd";
import { createStyles } from "antd-style";
import { useLocalStorage, useMediaQuery } from "usehooks-ts";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { UserMenu } from "@/components/UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/auth";
import { featureFlags } from "@/config";
import { BreadcrumbProvider } from "@/contexts/BreadcrumbContext.tsx";
import { useBreadcrumbContext } from "@/contexts/useBreadcrumbContext.ts";
import { useProjectStore } from "@/store/projectStore";

const { Sider, Content } = Layout;

const useStyles = createStyles(({ token }) => ({
  layout: {
    minHeight: "100vh",
  },
  sider: {
    background: `${token.colorBgContainer} !important`,
    borderRight: `1px solid ${token.colorBorderSecondary}`,
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    "& .ant-layout-sider-children": {
      display: "flex",
      flexDirection: "column",
      height: "100%",
    },
  },
  siderContent: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  logo: {
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
  },
  logoText: {
    fontSize: 20,
    fontWeight: 700,
    color: token.colorPrimary,
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  logoIcon: {
    fontSize: 24,
    color: token.colorPrimary,
  },
  tenantSection: {
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  menu: {
    flex: 1,
    borderRight: "none !important",
    overflow: "auto",
    marginTop: 16,
  },
  mobileHeader: {
    background: token.colorBgContainer,
    padding: "12px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  mobileMenuBtn: {
    fontSize: 20,
  },
  content: {
    background: token.colorBgLayout,
    minHeight: "calc(100vh - 64px)",
    overflow: "auto",
  },
  breadcrumbWrapper: {
    padding: "12px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  breadcrumbLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  breadcrumbRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  collapseBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 4,
    cursor: "pointer",
    color: token.colorTextSecondary,
    transition: "all 0.2s",
    "&:hover": {
      background: token.colorFillSecondary,
      color: token.colorText,
    },
  },
  collapseBtnIcon: {
    fontSize: 16,
  },
  collapseBtnIconRotated: {
    transform: "rotate(180deg)",
  },
  breadcrumbIcon: {
    fontSize: 14,
    color: token.colorTextSecondary,
  },
  contentInner: {
    padding: "24px",
  },
  mainLayout: {
    marginLeft: 240,
    transition: "margin-left 0.2s",
  },
  mainLayoutCollapsed: {
    marginLeft: 80,
  },
  mainLayoutMobile: {
    marginLeft: 0,
  },
  drawer: {
    "& .ant-drawer-body": {
      padding: 0,
      display: "flex",
      flexDirection: "column",
    },
  },
}));

type MenuItem = Required<MenuProps>["items"][number];

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * 面包屑组件
 */
const AppBreadcrumb: React.FC = () => {
  const { t } = useTranslation("common");
  const { items } = useBreadcrumbContext();
  const { currentProject } = useProjectStore();

  const breadcrumbItems = [
    // 项目名称作为首项
    {
      key: "project",
      title: <Link to="/flows">{currentProject?.name || t("app.project")}</Link>,
    },
    // 动态面包屑项
    ...items.map((item, index) => ({
      key: `item-${index}`,
      title: item.path ? <Link to={item.path}>{item.title}</Link> : item.title,
    })),
  ];

  return <Breadcrumb items={breadcrumbItems} />;
};

/**
 * 布局内部组件
 */
const AppLayoutInner: React.FC<AppLayoutProps> = ({ children }) => {
  const { styles, cx } = useStyles();
  const { t } = useTranslation("menu");
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  // 响应式检测
  const isMobile = useMediaQuery("(max-width: 768px)");

  // 侧边栏折叠状态（持久化）
  const [collapsed, setCollapsed] = useLocalStorage(
    "flowlet-sidebar-collapsed",
    false
  );

  // 移动端抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 抽屉实际可见性：仅在移动端且用户打开时才显示
  // 当切换到桌面端时，drawerVisible 自动变为 false
  const drawerVisible = isMobile && drawerOpen;

  // 打开抽屉
  const openDrawer = () => setDrawerOpen(true);

  // 关闭抽屉
  const closeDrawer = () => setDrawerOpen(false);

  // 处理菜单点击
  const handleMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
  };

  // 获取当前选中的菜单项
  const selectedKeys = [location.pathname];

  /**
   * 菜单配置
   */
  const menuItems: MenuItem[] = [
    {
      key: "/flows",
      icon: <AiOutlineAppstore />,
      label: t("flowManagement"),
    },
    {
      key: "/executions",
      icon: <AiOutlineHistory />,
      label: t("executionHistory"),
    },
    {
      key: "/dictionary",
      icon: <AiOutlineDatabase />,
      label: t("dataDictionary"),
    },
    {
      key: "/keywords",
      icon: <AiOutlineTags />,
      label: t("keywordManagement"),
    },
    {
      key: "/settings",
      icon: <AiOutlineSetting />,
      label: t("settings"),
    },
  ];

  // 根据 featureFlags 过滤菜单项
  const filteredMenuItems = featureFlags.showSettings
    ? menuItems
    : menuItems.filter((item) => item?.key !== "/settings");
  const roleFilteredMenuItems = isAdmin
    ? filteredMenuItems
    : filteredMenuItems.filter((item) => item?.key !== "/settings");

  // 侧边栏内容（桌面端和移动端共用）
  const siderContent = (
    <div className={styles.siderContent}>
      {/* 用户信息 */}
      <div className={styles.logo}>
        <UserMenu collapsed={collapsed && !isMobile} />
      </div>

      {/* 租户切换器 - 仅在多租户模式下显示 */}
      {isAuthenticated && featureFlags.multiTenant && (
        <div className={styles.tenantSection}>
          <TenantSwitcher collapsed={collapsed && !isMobile} />
        </div>
      )}

      {/* 项目切换器 - 仅在多项目模式下显示 */}
      {isAuthenticated && featureFlags.multiProject && (
        <div className={styles.tenantSection}>
          <ProjectSwitcher collapsed={collapsed && !isMobile} />
        </div>
      )}

      {/* 导航菜单 */}
      <Menu
        className={styles.menu}
        mode="inline"
        selectedKeys={selectedKeys}
        items={roleFilteredMenuItems}
        onClick={handleMenuClick}
        inlineCollapsed={collapsed && !isMobile}
        inlineIndent={12}
      />
    </div>
  );

  return (
    <Layout className={styles.layout}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          className={styles.sider}
          width={240}
          collapsedWidth={80}
          collapsed={collapsed}
          trigger={null}
        >
          {siderContent}
        </Sider>
      )}

      {/* 移动端抽屉 */}
      {isMobile && (
        <Drawer
          className={styles.drawer}
          placement="left"
          open={drawerVisible}
          onClose={closeDrawer}
          size={280}
          closable={false}
        >
          {siderContent}
        </Drawer>
      )}

      {/* 主内容区域 */}
      <Layout
        className={cx(
          styles.mainLayout,
          collapsed && !isMobile && styles.mainLayoutCollapsed,
          isMobile && styles.mainLayoutMobile
        )}
      >
        {/* 移动端菜单按钮 */}
        {isMobile && (
          <div className={styles.mobileHeader}>
            <Button
              type="text"
              icon={<AiOutlineMenu className={styles.mobileMenuBtn} />}
              onClick={openDrawer}
            />
          </div>
        )}

        {/* 内容区域 */}
        <Content className={styles.content}>
          {/* 面包屑 */}
          <div className={styles.breadcrumbWrapper}>
            <div className={styles.breadcrumbLeft}>
              {/* 侧边栏折叠按钮（仅桌面端） */}
              {!isMobile && (
                <div
                  className={styles.collapseBtn}
                  onClick={() => setCollapsed(!collapsed)}
                >
                  <PiSidebarLight
                    className={cx(
                      styles.collapseBtnIcon,
                      collapsed && styles.collapseBtnIconRotated
                    )}
                  />
                </div>
              )}
              <AppBreadcrumb />
            </div>
            {/* 右侧工具栏 - 语言切换器 */}
            <div className={styles.breadcrumbRight}>
              <LanguageSwitcher />
            </div>
          </div>
          {/* 页面内容 */}
          <div className={styles.contentInner}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
};

/**
 * 应用主布局
 * 包含可折叠侧边栏、面包屑和内容区域
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <BreadcrumbProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </BreadcrumbProvider>
  );
};

export default AppLayout;
