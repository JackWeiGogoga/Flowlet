import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  pageHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  `,

  loadingContainer: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
  `,

  errorMessage: css`
    margin-top: 16px;
    padding: 12px;
    background: #fff2f0;
    border-radius: 4px;
  `,

  dataCard: css`
    height: 300px;
  `,

  dataCardContent: css`
    max-height: 220px;
    overflow: auto;
  `,

  /* Trace 容器样式 */
  traceCard: css`
    .ant-card-body {
      padding: 0;
    }
  `,

  traceTabs: css`
    .ant-tabs-nav {
      margin: 0;
      padding: 0 16px;
    }

    .ant-tabs-content {
      padding: 0;
    }
  `,

  traceContainer: css`
    display: flex;
    height: 500px;
    border-top: 1px solid #f0f0f0;
  `,

  /* 左侧节点树 */
  traceTree: css`
    width: 280px;
    border-right: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    background: #fafafa;
  `,

  treeHeader: css`
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fff;
  `,

  treeNodes: css`
    flex: 1;
    overflow-y: auto;
  `,

  treeNode: css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    transition: all 0.2s;

    &:hover {
      background: #e6f7ff;
    }
  `,

  treeNodeSelected: css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 16px 12px 13px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    transition: all 0.2s;
    background: #e6f7ff;
    border-left: 3px solid #1890ff;
  `,

  treeNodeMain: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  `,

  treeNodeIcon: css`
    font-size: 16px;
    flex-shrink: 0;
  `,

  treeNodeName: css`
    font-size: 13px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,

  treeNodeMeta: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    padding-left: 24px;
  `,

  treeNodeDuration: css`
    font-size: 12px;
    color: #999;
  `,

  /* 状态图标 */
  statusIcon: css`
    font-size: 14px;
  `,

  statusIconSuccess: css`
    font-size: 14px;
    color: #52c41a;
  `,

  statusIconFailed: css`
    font-size: 14px;
    color: #ff4d4f;
  `,

  statusIconRunning: css`
    font-size: 14px;
    color: #1890ff;
  `,

  statusIconPending: css`
    font-size: 14px;
    color: #d9d9d9;
  `,

  /* 节点类型图标 */
  nodeTypeIcon: css`
    font-size: 16px;
  `,

  nodeTypeIconStart: css`
    font-size: 16px;
    color: #52c41a;
  `,

  nodeTypeIconEnd: css`
    font-size: 16px;
    color: #ff4d4f;
  `,

  nodeTypeIconApi: css`
    font-size: 16px;
    color: #1890ff;
  `,

  nodeTypeIconKafka: css`
    font-size: 16px;
    color: #722ed1;
  `,

  nodeTypeIconTransform: css`
    font-size: 16px;
    color: #fa8c16;
  `,

  nodeTypeIconCondition: css`
    font-size: 16px;
    color: #13c2c2;
  `,

  /* 右侧详情面板 */
  traceDetail: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fff;
  `,

  flowContainer: css`
    display: flex;
    height: 560px;
    border-top: 1px solid #f0f0f0;
  `,

  flowCanvas: css`
    flex: 1;
    background: #f5f5f5;
  `,

  flowDetail: css`
    background: #fff;
    display: flex;
  `,

  flowSplitter: css`
    width: 6px;
    cursor: ew-resize;
    background: transparent;
    position: relative;


    &:hover {
      background: #e6f4ff;
    }
  `,

  flowSplitterActive: css`
    background: #1890ff;
  `,

  reactFlowReadonly: css`
    .react-flow__pane {
      cursor: default;
    }

    .react-flow__edge-path {
      stroke-width: 2;
    }

    .react-flow__controls {
      display: none;
    }
  `,

  flowControlPanel: css`
    display: flex;
    align-items: center;
    padding: 6px 12px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    gap: 4px;

    .control-group {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .control-divider {
      height: 20px;
      margin: 0 4px;
      border-color: #e8e8e8;
    }

    .zoom-level {
      min-width: 40px;
      text-align: center;
      font-size: 12px;
      color: #666;
      font-weight: 500;
      user-select: none;
    }

    .zoom-level-clickable {
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background: #f0f5ff;
        color: #1890ff;
      }
    }

    .ant-btn {
      color: #666;
      padding: 4px 8px;
      height: 28px;
      width: 28px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover:not(:disabled) {
        color: #1890ff;
        background: #f0f5ff;
      }

      &:disabled {
        color: #bfbfbf;
      }
    }
  `,

  detailHeader: css`
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
  `,

  detailTitle: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,

  detailIcon: css`
    font-size: 18px;
  `,

  detailName: css`
    font-size: 16px;
    font-weight: 500;
    color: #333;
  `,

  detailMeta: css`
    display: flex;
    align-items: center;
  `,

  detailBody: css`
    flex: 1;
    overflow: auto;
  `,

  /* 详情区块 */
  detailSection: css`
    border-bottom: 1px solid #f0f0f0;
  `,

  detailCardWrap: css`
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
  `,

  detailCard: css`
    .ant-card-body {
      padding: 0;
    }
  `,

  detailCardContent: css`
    padding: 12px 16px;
  `,

  sectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #fafafa;
    cursor: pointer;
  `,

  sectionTitle: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #666;
  `,

  sectionTitleError: css`
    color: #ff4d4f;
  `,

  sectionTitleExecutionData: css`
    color: #1890ff;
  `,

  sectionIcon: css`
    font-size: 12px;
    transition: transform 0.2s;
  `,

  sectionActions: css`
    display: flex;
    gap: 4px;
  `,

  sectionContent: css`
    padding: 12px 16px;
  `,

  sectionContentOutput: css`
    /* output 样式扩展 */
  `,

  sectionContentExecutionData: css`
    /* execution data 样式扩展 */
  `,

  codeBlockOutput: css`
    display: flex;
    background: #f6ffed;
    border-radius: 6px;
    font-size: 12px;
    overflow: hidden;
    border: 1px solid #e8e8e8;
  `,

  codeContentOutput: css`
    margin: 0;
    padding: 12px;
    color: #389e0d;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    line-height: 1.5;
    overflow-x: auto;
    flex: 1;
    background: transparent;
  `,

  errorContent: css`
    color: #ff4d4f;
    font-size: 13px;
    background: #fff2f0;
    padding: 12px;
    border-radius: 4px;
  `,

  detailEmpty: css`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  `,

  flowNode: css`
    background: #fff;
    border: 2px solid transparent;
    border-radius: 8px;
    min-width: 150px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `,

  flowNodeFailed: css`
    border-color: #ff4d4f;
  `,

  flowNodeSelected: css`
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  `,

  flowNodeHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px 6px 0 0;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
  `,

  flowNodeIcon: css`
    width: 16px;
    height: 16px;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,

  flowNodeType: css`
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,

  flowNodeBody: css`
    padding: 10px 12px;
  `,

  flowNodeLabel: css`
    font-size: 13px;
    color: #333;
    word-break: break-word;
  `,

  flowNodeDescription: css`
    font-size: 11px;
    color: #888;
    margin-top: 4px;
    word-break: break-word;
  `,

  flowNodeMeta: css`
    margin-top: 6px;
    font-size: 11px;
    color: #555;
    display: flex;
    align-items: center;
    gap: 6px;
  `,

  flowNodeMetaDot: css`
    width: 8px;
    height: 8px;
    border-radius: 999px;
  `,

  flowHandle: css`
    width: 12px;
    height: 12px;
    border: 2px solid #fff;
  `,

  emptyNodes: css`
    padding: 40px;
    text-align: center;
  `,

  /* 旋转动画 */
  spin: css`
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
}));
