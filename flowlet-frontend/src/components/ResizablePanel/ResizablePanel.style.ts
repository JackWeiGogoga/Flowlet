import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  panel: css`
    position: relative;
    height: 100%;
    display: flex;
    flex-shrink: 0;
    transition: width 0.2s ease;
    overflow: hidden;

    &.collapsed {
      width: 0 !important;
    }

    &.left {
      border-right: 1px solid #f0f0f0;
    }

    &.right {
      border-left: 1px solid #f0f0f0;
    }
  `,

  panelContent: css`
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #fff;
    overflow: hidden;
    transition: width 0.2s ease;
  `,

  panelHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    flex-shrink: 0;
  `,

  panelTitle: css`
    font-weight: 600;
    font-size: 14px;
    color: #1f1f1f;
  `,

  panelHeaderActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,

  collapseBtn: css`
    color: #8c8c8c;

    &:hover {
      color: #1890ff;
    }
  `,

  panelBody: css`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  `,

  // 拖拽手柄
  resizeHandle: css`
    position: absolute;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: ew-resize;
    background: transparent;
    transition: background-color 0.2s;
    z-index: 10;

    &.left {
      right: 0;
      border-right: 1px solid #f0f0f0;
    }

    &.right {
      left: 0;
      border-left: 1px solid #f0f0f0;
    }

    &:hover,
    &.active {
      background: #e6f4ff;
    }

    &.active {
      background: #1890ff;
    }
  `,

  // 展开触发器
  expandTrigger: css`
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    z-index: 100;

    &.left {
      left: 4px;
    }

    &.right {
      right: 4px;
    }
  `,

  expandBtn: css`
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid #e8e8e8;
    color: #bfbfbf;
    transition: all 0.2s ease;

    &:hover {
      background: #1890ff;
      border-color: #1890ff;
      color: #fff;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.35);
    }
  `,
}));
