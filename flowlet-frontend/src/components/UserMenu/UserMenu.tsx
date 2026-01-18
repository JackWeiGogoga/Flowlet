import React from "react";
import { Avatar, Dropdown, Space, Tag, Typography } from "antd";
import {
  AiOutlineUser,
  AiOutlineLogout,
  AiOutlineLogin,
  AiOutlineSetting,
  AiOutlineSafetyCertificate,
} from "react-icons/ai";
import type { MenuProps } from "antd";
import { useAuth } from "@/auth/useAuth";
import { createStyles } from "antd-style";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const useStyles = createStyles(({ token }) => ({
  container: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 8px",
    borderRadius: token.borderRadius,
    transition: "background-color 0.2s",
    width: "100%",
    "&:hover": {
      backgroundColor: token.colorBgTextHover,
    },
  },
  avatar: {
    backgroundColor: token.colorPrimary,
    flexShrink: 0,
  },

  username: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  arrowIcon: {
    opacity: 0,
    transition: "opacity 0.2s",
    color: token.colorTextSecondary,
    fontSize: 12,
    flexShrink: 0,
    marginLeft: 4,
  },
  roleTag: {
    marginLeft: 4,
  },
  loginBtn: {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: token.borderRadius,
    color: token.colorPrimary,
    width: "100%",
    "&:hover": {
      backgroundColor: token.colorPrimaryBg,
    },
  },
  // 折叠状态样式
  containerCollapsed: {
    justifyContent: "center",
    padding: "4px",
  },
}));

interface UserMenuProps {
  collapsed?: boolean;
}

/**
 * 用户菜单组件
 * 显示用户头像、名称，提供登录/登出功能
 */
export const UserMenu: React.FC<UserMenuProps> = ({ collapsed = false }) => {
  const { styles } = useStyles();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const {
    isAuthenticated,
    isLoading,
    userInfo,
    isAdmin,
    isEditor,
    login,
    logout,
  } = useAuth();

  // 加载中
  if (isLoading) {
    return (
      <Space>
        <Avatar icon={<AiOutlineUser />} />
      </Space>
    );
  }

  // 未登录
  if (!isAuthenticated || !userInfo) {
    return (
      <div className={styles.loginBtn} onClick={() => login()}>
        <AiOutlineLogin />
        {!collapsed && <span>{t("user.login")}</span>}
      </div>
    );
  }

  // 获取显示名称
  const displayName =
    userInfo.name || userInfo.username || userInfo.email || t("user.defaultName");
  const avatarText = displayName.charAt(0).toUpperCase();

  // 获取角色标签
  const getRoleTag = () => {
    if (isAdmin) {
      return (
        <Tag color="red" className={styles.roleTag}>
          {t("user.roles.admin")}
        </Tag>
      );
    }
    if (isEditor) {
      return (
        <Tag color="blue" className={styles.roleTag}>
          {t("user.roles.editor")}
        </Tag>
      );
    }
    return (
      <Tag color="default" className={styles.roleTag}>
        {t("user.roles.viewer")}
      </Tag>
    );
  };

  // 下拉菜单项
  const menuItems: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{displayName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {userInfo.email}
          </Typography.Text>
        </Space>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "roles",
      icon: <AiOutlineSafetyCertificate />,
      label: (
        <Space>
          <span>{t("user.role")}</span>
          {getRoleTag()}
        </Space>
      ),
      disabled: true,
    },
    ...(isAdmin
      ? [
          {
            key: "settings",
            icon: <AiOutlineSetting />,
            label: t("user.systemSettings"),
            onClick: () => {
              navigate("/settings");
            },
          },
        ]
      : []),
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <AiOutlineLogout />,
      label: t("user.logout"),
      danger: true,
      onClick: () => logout(),
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="bottomRight"
    >
      <div
        className={`${styles.container} ${
          collapsed ? styles.containerCollapsed : ""
        }`}
      >
        <Avatar className={styles.avatar} shape="square">
          {avatarText}
        </Avatar>
        {!collapsed && <span className={styles.username}>{displayName}</span>}
      </div>
    </Dropdown>
  );
};

export default UserMenu;
