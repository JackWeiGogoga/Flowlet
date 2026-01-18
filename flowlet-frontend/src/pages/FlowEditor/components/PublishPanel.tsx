import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dropdown,
  Space,
  Typography,
  Divider,
} from "antd";
import {
  AiOutlineSend,
  AiOutlinePlayCircle,
  AiOutlineHistory,
  AiOutlineDown,
} from "react-icons/ai";
import { createStyles } from "antd-style";
import { FlowDefinitionVersion, FlowStatus } from "@/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { MdArrowOutward } from "react-icons/md";

dayjs.extend(relativeTime);

const { Text } = Typography;

const useStyles = createStyles(({ token, css }) => ({
  panelContent: css`
    padding: 16px;
    min-width: 280px;
    background: ${token.colorBgElevated};
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: ${token.boxShadowSecondary};
  `,
  publishInfo: css`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  `,
  publishInfoLeft: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  publishLabel: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  publishTime: css`
    font-size: 14px;
    color: ${token.colorText};
    font-weight: 500;
  `,
  notPublished: css`
    font-size: 14px;
    color: ${token.colorTextTertiary};
  `,
  restoreBtn: css`
    flex-shrink: 0;
  `,
  updateBtn: css`
    width: 100%;
  `,
  menuItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    margin: 0 -8px;
    cursor: pointer;
    border-radius: ${token.borderRadius}px;
    transition: background-color 0.2s;

    &:hover {
      background-color: ${token.colorBgTextHover};
    }
  `,
  menuItemDisabled: css`
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      background-color: transparent;
    }
  `,
  menuItemLeft: css`
    display: flex;
    align-items: center;
    gap: 10px;
  `,
  menuItemIcon: css`
    font-size: 18px;
    color: ${token.colorTextSecondary};
  `,
  menuItemText: css`
    font-size: 14px;
    color: ${token.colorText};
  `,
  menuItemArrow: css`
    font-size: 12px;
    color: ${token.colorTextTertiary};
  `,
  divider: css`
    margin: 12px 0;
  `,
}));

interface PublishPanelProps {
  /** 当前流程状态 */
  flowStatus?: FlowStatus;
  /** 当前版本号 */
  currentVersion: number;
  /** 版本列表 */
  versions: FlowDefinitionVersion[];
  /** 版本列表加载中 */
  versionsLoading: boolean;
  /** 是否有未发布的草稿改动 */
  isDraftModified: boolean;
  /** 发布/更新 */
  onPublish: () => void;
  /** 发布中 */
  publishing?: boolean;
  /** 执行 */
  onExecute: () => void;
  /** 执行历史 */
  onExecutionHistory: () => void;
  /** 打开版本管理弹窗 */
  onOpenVersionModal: () => void;
  /** 流程 ID */
  flowId?: string;
}

export const PublishPanel: React.FC<PublishPanelProps> = ({
  flowStatus,
  currentVersion,
  versions,
  isDraftModified,
  onPublish,
  publishing,
  onExecute,
  onExecutionHistory,
  onOpenVersionModal,
  flowId,
}) => {
  const { styles, cx } = useStyles();
  const { t, i18n } = useTranslation("flow");

  // 获取最新发布版本
  const latestVersion = useMemo(() => {
    if (versions.length === 0) return null;
    return versions[0]; // versions 按版本号倒序排列
  }, [versions]);

  // 格式化发布时间
  const publishedTimeAgo = useMemo(() => {
    if (!latestVersion) return null;
    dayjs.locale(i18n.language === "zh-CN" ? "zh-cn" : "en");
    return dayjs(latestVersion.createdAt).fromNow();
  }, [latestVersion, i18n.language]);

  // 是否可以执行
  const canExecute = flowId && currentVersion > 0;

  // 是否已发布过 (status === PUBLISHED 或版本号 > 0)
  const hasPublished = flowStatus === FlowStatus.PUBLISHED || currentVersion > 0;

  // 发布按钮文案 - 如果有未发布的改动则提示更新
  const publishBtnText = useMemo(() => {
    if (!hasPublished) {
      return t("publishPanel.publish");
    }
    // 已发布状态下显示"更新"
    return t("publishPanel.update");
  }, [hasPublished, t]);

  // 按钮显示文案 - 有改动时显示提示
  const buttonDisplayText = useMemo(() => {
    if (isDraftModified) {
      return t("publishPanel.update");
    }
    return t("publishPanel.publish");
  }, [isDraftModified, t]);

  const dropdownContent = (
    <div className={styles.panelContent}>
      {/* 发布信息区域 */}
      <div className={styles.publishInfo}>
        <div className={styles.publishInfoLeft}>
          <Text className={styles.publishLabel}>
            {t("publishPanel.latestPublish")}
          </Text>
          {latestVersion ? (
            <Text className={styles.publishTime}>
              {t("publishPanel.publishedAgo", { time: publishedTimeAgo })}
            </Text>
          ) : (
            <Text className={styles.notPublished}>
              {t("publishPanel.neverPublished")}
            </Text>
          )}
        </div>
        {hasPublished && (
          <Button
            size="small"
            className={styles.restoreBtn}
            onClick={onOpenVersionModal}
          >
            {t("publishPanel.restore")}
          </Button>
        )}
      </div>

      {/* 发布/更新按钮 */}
      <Button
        type="primary"
        className={styles.updateBtn}
        icon={<AiOutlineSend />}
        onClick={onPublish}
        loading={publishing}
      >
        {publishBtnText}
      </Button>

      <Divider className={styles.divider} />

      {/* 操作菜单 */}
      <div>
        {/* 执行 */}
        <div
          className={cx(styles.menuItem, !canExecute && styles.menuItemDisabled)}
          onClick={canExecute ? onExecute : undefined}
        >
          <div className={styles.menuItemLeft}>
            <AiOutlinePlayCircle className={styles.menuItemIcon} />
            <span className={styles.menuItemText}>
              {t("publishPanel.execute")}
            </span>
          </div>
        </div>

        {/* 执行历史 */}
        <div
          className={cx(styles.menuItem, !flowId && styles.menuItemDisabled)}
          onClick={flowId ? onExecutionHistory : undefined}
        >
          <div className={styles.menuItemLeft}>
            <AiOutlineHistory className={styles.menuItemIcon} />
            <span className={styles.menuItemText}>
              {t("publishPanel.executionHistory")}
            </span>
          </div>
          <MdArrowOutward className={styles.menuItemArrow} />
        </div>
      </div>
    </div>
  );

  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => dropdownContent}
    >
      <Button type="primary">
        <Space>
          {buttonDisplayText}
          <AiOutlineDown />
        </Space>
      </Button>
    </Dropdown>
  );
};
