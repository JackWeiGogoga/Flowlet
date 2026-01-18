import React from "react";
import { Avatar, Dropdown, Typography } from "antd";
import { AiOutlineSwap, AiOutlineCheck } from "react-icons/ai";
import type { MenuProps } from "antd";
import { createStyles } from "antd-style";
import { useTenantStore, Tenant } from "@/store/tenantStore";

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    cursor: "pointer",
    borderRadius: token.borderRadius,
    transition: "background-color 0.2s",
    "&:hover": {
      backgroundColor: token.colorBgTextHover,
    },
  },
  containerCollapsed: {
    justifyContent: "center",
    padding: "12px 8px",
  },
  avatar: {
    backgroundColor: token.colorPrimary,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  name: {
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  org: {
    fontSize: 12,
    color: token.colorTextSecondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  switchIcon: {
    color: token.colorTextSecondary,
    fontSize: 16,
    flexShrink: 0,
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  checkIcon: {
    color: token.colorPrimary,
    marginLeft: "auto",
  },
}));

interface TenantSwitcherProps {
  collapsed?: boolean;
}

/**
 * 租户切换器组件
 * 显示当前租户，支持在多个租户之间切换
 */
export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({
  collapsed = false,
}) => {
  const { styles, cx } = useStyles();
  const { currentTenant, tenants, switchTenant } = useTenantStore();

  // 如果没有租户数据，不显示
  if (!currentTenant || tenants.length === 0) {
    return null;
  }

  // 获取头像文字
  const avatarText = currentTenant.displayName.charAt(0).toUpperCase();

  // 构建下拉菜单
  const menuItems: MenuProps["items"] = [
    {
      key: "header",
      type: "group",
      label: "切换租户",
    },
    ...tenants.map((tenant: Tenant) => ({
      key: tenant.id,
      label: (
        <div className={styles.menuItem}>
          <Avatar size="small" style={{ backgroundColor: "#1890ff" }}>
            {tenant.displayName.charAt(0).toUpperCase()}
          </Avatar>
          <span>{tenant.displayName}</span>
          {tenant.id === currentTenant.id && (
            <AiOutlineCheck className={styles.checkIcon} />
          )}
        </div>
      ),
      onClick: () => {
        if (tenant.id !== currentTenant.id) {
          switchTenant(tenant.id);
        }
      },
    })),
  ];

  // 折叠状态下只显示头像
  if (collapsed) {
    return (
      <Dropdown
        menu={{ items: menuItems }}
        trigger={["click"]}
        placement="bottomRight"
      >
        <div className={cx(styles.container, styles.containerCollapsed)}>
          <Avatar className={styles.avatar} size={32}>
            {avatarText}
          </Avatar>
        </div>
      </Dropdown>
    );
  }

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={["click"]}
      placement="bottomRight"
    >
      <div className={styles.container}>
        <Avatar className={styles.avatar} size={36}>
          {avatarText}
        </Avatar>
        <div className={styles.info}>
          <Typography.Text className={styles.name}>
            {currentTenant.displayName}
          </Typography.Text>
          <Typography.Text className={styles.org}>
            {currentTenant.name}
          </Typography.Text>
        </div>
        {tenants.length > 1 && <AiOutlineSwap className={styles.switchIcon} />}
      </div>
    </Dropdown>
  );
};

export default TenantSwitcher;
