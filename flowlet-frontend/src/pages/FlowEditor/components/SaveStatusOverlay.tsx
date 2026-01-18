import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createStyles } from "antd-style";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import type { AutoSaveStatus } from "../hooks";
import type { FlowDefinitionVersion } from "@/types";

dayjs.extend(relativeTime);

const useStyles = createStyles(({ token, css }) => ({
  overlay: css`
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
    user-select: none;
    pointer-events: none;
  `,
  separator: css`
    color: ${token.colorTextQuaternary};
  `,
  savingIcon: css`
    animation: spin 1s linear infinite;
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,
  errorText: css`
    color: ${token.colorError};
  `,
}));

interface SaveStatusOverlayProps {
  /** 自动保存状态 */
  autoSaveStatus: AutoSaveStatus;
  /** 最后保存时间 */
  lastSavedAt?: string | Date;
  /** 版本列表（用于获取最近发布时间） */
  versions: FlowDefinitionVersion[];
  /** 是否已创建流程 */
  hasFlowId: boolean;
}

export const SaveStatusOverlay: React.FC<SaveStatusOverlayProps> = ({
  autoSaveStatus,
  lastSavedAt,
  versions,
  hasFlowId,
}) => {
  const { styles } = useStyles();
  const { t, i18n } = useTranslation("flow");

  // 格式化保存时间（仅时分秒）
  const savedTimeText = useMemo(() => {
    if (!lastSavedAt) return null;
    return dayjs(lastSavedAt).format("HH:mm:ss");
  }, [lastSavedAt]);

  // 格式化发布时间（相对时间）
  const publishedTimeText = useMemo(() => {
    if (versions.length === 0) return null;
    const latestVersion = versions[0];
    dayjs.locale(i18n.language === "zh-CN" ? "zh-cn" : "en");
    return dayjs(latestVersion.createdAt).fromNow();
  }, [versions, i18n.language]);

  // 如果没有流程 ID，不显示
  if (!hasFlowId) return null;

  // 渲染保存状态
  const renderSaveStatus = () => {
    switch (autoSaveStatus) {
      case "saving":
        return (
          <>
            <AiOutlineLoading3Quarters className={styles.savingIcon} />
            <span>{t("editor.autoSaving")}</span>
          </>
        );
      case "saved":
        return (
          <span>
            {t("saveStatusOverlay.autoSaved")} {savedTimeText}
          </span>
        );
      case "error":
        return (
          <span className={styles.errorText}>
            {t("editor.autoSaveError")}
          </span>
        );
      case "pending":
      case "idle":
      default:
        // idle/pending 状态显示上次保存时间
        if (savedTimeText) {
          return (
            <span>
              {t("saveStatusOverlay.autoSaved")} {savedTimeText}
            </span>
          );
        }
        return null;
    }
  };

  const saveStatusContent = renderSaveStatus();

  // 如果没有任何内容可显示，不渲染
  if (!saveStatusContent && !publishedTimeText) return null;

  return (
    <div className={styles.overlay}>
      {saveStatusContent}
      {saveStatusContent && publishedTimeText && (
        <span className={styles.separator}>·</span>
      )}
      {publishedTimeText && (
        <span>
          {t("saveStatusOverlay.publishedAgo", { time: publishedTimeText })}
        </span>
      )}
    </div>
  );
};
