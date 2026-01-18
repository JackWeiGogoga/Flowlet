import React from "react";
import { Tooltip } from "antd";
import { useAuth } from "./useAuth";

/**
 * 权限按钮 HOC
 * 无权限时禁用按钮并显示提示
 */
export const withRoleCheck = <P extends object>(
  Component: React.ComponentType<P>,
  roles: string[],
  disabledProps?: Partial<P>
) => {
  const WrappedComponent: React.FC<P> = (props) => {
    const { hasAnyRole, isAuthenticated } = useAuth();

    const hasPermission = isAuthenticated && hasAnyRole(roles);

    if (!hasPermission) {
      return (
        <Tooltip title="您没有权限执行此操作">
          <span>
            <Component {...props} {...disabledProps} disabled />
          </span>
        </Tooltip>
      );
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withRoleCheck(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
};
