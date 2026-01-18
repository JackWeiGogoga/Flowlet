import { createStyles } from "antd-style";

// 使用 antd-style 创建样式
export const useStyles = createStyles(({ css }) => ({
  customNode: css`
    background: #fff;
    border: 2px solid transparent;
    border-radius: 8px;
    min-width: 150px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &.selected {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &.has-variables {
      min-width: 180px;
    }
  `,
  nodeHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px 6px 0 0;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
  `,
  nodeIcon: css`
    width: 16px;
    height: 16px;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
  nodeProviderIcon: css`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
  `,
  nodeType: css`
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `,
  nodeBody: css`
    padding: 10px 12px;
  `,
  nodeLabel: css`
    font-size: 13px;
    color: #333;
    word-break: break-word;
  `,
  nodeDescription: css`
    font-size: 11px;
    color: #888;
    margin-top: 4px;
    word-break: break-word;
  `,
  nodeMeta: css`
    margin-top: 6px;
    font-size: 11px;
    color: #555;
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  nodeMetaItem: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  nodeMetaIcon: css`
    width: 14px;
    height: 14px;
  `,
  nodeMetaLabel: css`
    color: #999;
    min-width: 42px;
  `,
  nodeMetaValue: css`
    font-family: monospace;
  `,
  customHandle: css`
    width: 12px;
    height: 12px;
    border: 2px solid #fff;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;

    &:hover {
      box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.3);
      border-color: #1890ff;
    }
  `,
  nodeVariables: css`
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed #e8e8e8;
  `,
  nodeOutputVariables: css`
    .node-variable-item {
      background: #fff2f0;
    }
    .node-variable-name {
      color: #ff4d4f;
    }
  `,
  nodeVariableItem: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    margin-bottom: 4px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 11px;

    &:last-child {
      margin-bottom: 0;
    }
  `,
  nodeVariableIcon: css`
    color: #1677ff;
    font-size: 12px;
  `,
  nodeVariableName: css`
    font-family: monospace;
    color: #1677ff;
  `,
  nodeVariableRequired: css`
    margin-left: auto;
    color: #ff4d4f;
    font-size: 10px;
  `,
  nodeVariableTypeTag: css`
    padding: 1px 4px;
    border-radius: 3px;
    background: #fff2f0;
    color: #ff4d4f;
    font-size: 9px;
    font-weight: 500;
  `,
  handleWrapper: css`
    position: absolute;
    right: -6px;
    width: 16px;
    height: 16px;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;

    .custom-handle {
      position: relative;
      top: auto;
      right: auto;
      transform: none;
    }

    &.hovered .handle-add-button {
      opacity: 1;
      visibility: visible;
    }

    &.hovered .custom-handle {
      opacity: 0;
    }
  `,
  handleAddButton: css`
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #1890ff;
    border: 2px solid #fff;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    pointer-events: none;
    z-index: 1;

    &:hover {
      background: #40a9ff;
      transform: translate(-50%, -50%) scale(1.1);
    }
  `,
  conditionLabelsVertical: css`
    position: absolute;
    left: calc(100% + 10px);
    top: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 10px;
    align-items: flex-start;
  `,
  conditionLabel: css`
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
    white-space: nowrap;
  `,
  conditionLabelBranch: css`
    background: #f6ffed;
    color: #52c41a;
  `,
  conditionLabelElse: css`
    background: #fff2f0;
    color: #ff4d4f;
  `,
}));
