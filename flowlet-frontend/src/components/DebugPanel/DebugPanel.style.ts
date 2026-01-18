import { createStyles } from "antd-style";

// DebugPanel 组件样式
export const useStyles = createStyles(({ css }) => ({
  // 调试区块
  debugSection: css`
    margin-bottom: 16px;
  `,
  debugSectionTitle: css`
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 12px;
  `,
  debugForm: css`
    .ant-form-item {
      margin-bottom: 16px;
    }
  `,
  debugLoading: css`
    display: flex;
    justify-content: center;
    padding: 24px;
  `,

  // Trace 容器
  traceContainer: css`
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  `,

  // Trace 头部
  traceHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e5e7eb;
  `,
  traceInfo: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  traceLabel: css`
    font-weight: 600;
    color: #1f2937;
    font-size: 13px;
  `,
  traceId: css`
    font-size: 12px;
    color: #6b7280;
    font-family: "SF Mono", Monaco, monospace;
  `,

  // 左右分栏布局
  traceContent: css`
    display: flex;
    min-height: 320px;
    max-height: calc(100vh - 300px);
  `,

  // 左侧节点树
  traceTree: css`
    width: 200px;
    min-width: 200px;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    background: #fff;
  `,
  treeHeader: css`
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 12px;
    color: #6b7280;
  `,
  treeNodes: css`
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  `,
  treeNode: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: all 0.15s ease;

    &:hover {
      background: #f5f5f5;
    }

    &.selected {
      background: #e6f4ff;
      border-left-color: #1677ff;
    }
  `,
  treeNodeMain: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  `,
  treeNodeIcon: css`
    font-size: 14px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  `,
  treeNodeName: css`
    font-size: 13px;
    font-weight: 500;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  treeNodeMeta: css`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  `,
  treeNodeDuration: css`
    font-size: 11px;
    color: #9ca3af;
    font-family: "SF Mono", Monaco, monospace;
  `,
  treeLoading: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px;
    font-size: 12px;
    color: #6b7280;
    border-top: 1px solid #f0f0f0;
  `,

  // 状态图标
  statusIcon: css`
    font-size: 12px;

    &.success {
      color: #22c55e;
    }

    &.failed {
      color: #ef4444;
    }

    &.running {
      color: #3b82f6;
    }

    &.pending {
      color: #9ca3af;
    }

    &.skipped {
      color: #f59e0b;
    }
  `,

  // 节点类型图标
  nodeTypeIcon: css`
    color: #6b7280;

    &.start {
      color: #22c55e;
    }

    &.end {
      color: #ef4444;
    }

    &.api {
      color: #3b82f6;
    }

    &.kafka {
      color: #8b5cf6;
    }

    &.transform {
      color: #f59e0b;
    }

    &.condition {
      color: #06b6d4;
    }
  `,

  // 右侧详情面板
  traceDetail: css`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: block;
    padding-bottom: 12px;
  `,
  detailHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
  `,
  detailTitle: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  detailIcon: css`
    font-size: 16px;
    display: flex;
  `,
  detailName: css`
    font-weight: 600;
    font-size: 14px;
    color: #1f2937;
  `,
  detailTime: css`
    font-size: 11px;
    color: #9ca3af;
  `,

  // 详情区块
  detailSection: css`
    margin: 12px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  `,
  sectionHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #fafafa;
    border-bottom: 1px solid #e5e7eb;
  `,
  sectionTitle: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #4b5563;

    &.error {
      color: #dc2626;
    }
  `,
  sectionIcon: css`
    font-size: 10px;
    color: #9ca3af;
  `,
  sectionActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,
  sectionContent: css`
    padding: 12px 16px;
    overflow: visible;

    &.errorContent {
      padding: 12px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 13px;
    }

    &.skippedContent {
      padding: 12px;
      background: #fffbeb;
      color: #92400e;
      font-size: 13px;
    }
  `,

  // 空状态
  detailEmpty: css`
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: #9ca3af;
  `,
  emptyState: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
  `,
  emptyIcon: css`
    font-size: 48px;
    color: #d1d5db;
    margin-bottom: 12px;
  `,

  // 加载动画
  anticonSpin: css`
    animation: dbg-spin 1s linear infinite;
    display: inline-block;

    @keyframes dbg-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `,
}));
