import React from "react";
import { Breadcrumb } from "antd";
import { Link } from "react-router-dom";
import { AiOutlineHome } from "react-icons/ai";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token, css }) => ({
  breadcrumb: css`
    margin-bottom: 16px;
  `,
  homeIcon: css`
    font-size: 14px;
    color: ${token.colorTextSecondary};
  `,
}));

export interface BreadcrumbItem {
  /** 显示的标题 */
  title: string;
  /** 跳转路径，如果不提供则为当前页（不可点击） */
  path?: string;
}

interface PageBreadcrumbProps {
  /** 面包屑项目列表 */
  items: BreadcrumbItem[];
  /** 是否显示首页图标，默认 true */
  showHome?: boolean;
}

/**
 * 统一的页面面包屑组件
 */
export const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({
  items,
  showHome = true,
}) => {
  const { styles } = useStyles();

  const breadcrumbItems = [
    // 首页
    ...(showHome
      ? [
          {
            key: "home",
            title: (
              <Link to="/flows">
                <AiOutlineHome className={styles.homeIcon} />
              </Link>
            ),
          },
        ]
      : []),
    // 其他项目
    ...items.map((item, index) => ({
      key: `item-${index}`,
      title: item.path ? <Link to={item.path}>{item.title}</Link> : item.title,
    })),
  ];

  return <Breadcrumb className={styles.breadcrumb} items={breadcrumbItems} />;
};

export default PageBreadcrumb;
