import React from "react";
import { Tag } from "antd";
import {
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineLoading,
  AiOutlineClockCircle,
  AiOutlineSync,
} from "react-icons/ai";
import { createStyles } from "antd-style";
import { ExecutionStatus } from "@/types";

const useStyles = createStyles(({ css }) => ({
  icon: css`
    vertical-align: middle;
    margin-right: 4px;
  `,
}));

interface StatusConfig {
  color: string;
  icon: React.ReactNode;
  label: string;
}

interface ExecutionStatusTagProps {
  status: ExecutionStatus;
}

/**
 * 执行状态标签组件
 */
export const ExecutionStatusTag: React.FC<ExecutionStatusTagProps> = ({
  status,
}) => {
  const { styles } = useStyles();

  const config: Record<ExecutionStatus, StatusConfig> = {
    [ExecutionStatus.PENDING]: {
      color: "default",
      icon: <AiOutlineClockCircle className={styles.icon} />,
      label: "等待中",
    },
    [ExecutionStatus.RUNNING]: {
      color: "processing",
      icon: <AiOutlineLoading className={`${styles.icon} anticon-spin`} />,
      label: "执行中",
    },
    [ExecutionStatus.COMPLETED]: {
      color: "success",
      icon: <AiOutlineCheckCircle className={styles.icon} />,
      label: "已完成",
    },
    [ExecutionStatus.FAILED]: {
      color: "error",
      icon: <AiOutlineCloseCircle className={styles.icon} />,
      label: "失败",
    },
    [ExecutionStatus.WAITING]: {
      color: "warning",
      icon: <AiOutlineSync className={`${styles.icon} anticon-spin`} />,
      label: "等待回调",
    },
    [ExecutionStatus.PAUSED]: {
      color: "orange",
      icon: <AiOutlineSync className={`${styles.icon} anticon-spin`} />,
      label: "已暂停",
    },
    [ExecutionStatus.WAITING_CALLBACK]: {
      color: "warning",
      icon: <AiOutlineSync className={`${styles.icon} anticon-spin`} />,
      label: "等待回调",
    },
  };

  const statusInfo = config[status] || {
    color: "default",
    icon: null,
    label: status,
  };

  return (
    <Tag icon={statusInfo.icon} color={statusInfo.color}>
      {statusInfo.label}
    </Tag>
  );
};

export default ExecutionStatusTag;
