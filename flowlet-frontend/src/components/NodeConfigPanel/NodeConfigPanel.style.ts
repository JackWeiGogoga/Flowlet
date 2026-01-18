import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  configPanel: css`
    width: 380px;
    height: 100%;
    overflow-y: auto;

    .ant-card-body {
      padding: 0;
    }
  `,

  configPanelContent: css`
    padding: 12px;

    .ant-form-item-label {
      padding-bottom: 4px;
    }

    .ant-form-item-label > label {
      font-size: 12px;
    }

    .ant-divider {
      margin: 16px 0 12px;
      font-size: 12px;
    }
  `,

  configPanelEmpty: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
  `,

  configPanelActions: css`
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  `,

  /* 变量列表样式 */
  variableList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  `,

  variableItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    transition: all 0.2s;
    outline: none;

    &:hover {
      background: #f0f0f0;
      border-color: #d9d9d9;
    }

    &:focus,
    &:focus-visible {
      outline: none;
    }
  `,

  variableInfo: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;

    /* 去除拖拽手柄的聚焦边框 */
    svg[data-dndkit-disabled] {
      outline: none;
    }

    svg:focus {
      outline: none;
    }
  `,

  variableIcon: css`
    color: #1890ff;
    font-size: 14px;
  `,

  variableName: css`
    font-family: monospace;
    font-size: 12px;
    color: #722ed1;
    white-space: nowrap;
  `,

  variableLabel: css`
    font-size: 12px;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,

  variableRequired: css`
    margin-left: 4px;
    padding: 0 4px;
    font-size: 10px;
    color: #ff4d4f;
    background: #fff1f0;
    border-radius: 2px;
  `,

  variableActions: css`
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  `,

  emptyVariables: css`
    text-align: center;
    padding: 16px;
    color: #999;
    background: #fafafa;
    border-radius: 6px;
    margin-bottom: 12px;

    p {
      margin: 0;
    }
  `,

  addVariableBtn: css`
    margin-top: 8px;
  `,

  /* 输出变量列表样式（简洁版） */
  outputVariableListSimple: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  `,

  outputVariableItemSimple: css`
    padding: 10px 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      background: #f5f5f5;
      border-color: #d9d9d9;
    }
  `,

  outputVariableHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,

  outputVariableNameTag: css`
    font-family: "SF Mono", "Monaco", "Menlo", monospace;
    font-size: 12px;
    font-weight: 500;
  `,

  outputVariableTypeBadge: css`
    font-size: 10px;
    color: #8c8c8c;
    background: #f0f0f0;
    padding: 1px 6px;
    border-radius: 4px;
  `,

  outputVariableInfo: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
  `,

  outputVariableLabel: css`
    color: #595959;
  `,

  outputVariableDesc: css`
    color: #8c8c8c;
  `,

  outputVariableTip: css`
    font-size: 11px;
    color: #8c8c8c;
    text-align: center;
    padding: 8px 0;
    margin-top: 4px;
    background: #fafafa;
    border-radius: 4px;

    code {
      background: #e8e8e8;
      padding: 1px 4px;
      border-radius: 2px;
      font-family: monospace;
    }
  `,

  /* ===================== 测试执行面板样式 ===================== */
  executionPanel: css`
    margin-top: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  `,

  executionPanelHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%);
    }
  `,

  executionPanelTitle: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    font-size: 13px;
    color: #166534;
  `,

  executionPanelIcon: css`
    font-size: 16px;
    color: #22c55e;
  `,

  executionPanelActions: css`
    color: #6b7280;
    font-size: 14px;
  `,

  executionPanelContent: css`
    padding: 12px;
    background: #fafafa;
  `,

  /* 执行区块 */
  execSection: css`
    margin-bottom: 12px;
  `,

  execSectionTitle: css`
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  `,

  execInputForm: css`
    .ant-form-item {
      margin-bottom: 8px;
    }

    .ant-form-item-label {
      padding-bottom: 2px;
    }

    .ant-form-item-label > label {
      font-size: 11px;
      color: #6b7280;
    }
  `,

  execActions: css`
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `,

  execActionRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  `,

  execLoading: css`
    text-align: center;
    padding: 20px;
  `,

  /* 执行结果 */
  execResult: css`
    margin-top: 12px;
  `,

  execOverview: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    margin-bottom: 12px;
  `,

  execStatus: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
  `,

  execStatusIcon: css`
    font-size: 16px;
  `,

  execStatusIconSuccess: css`
    font-size: 16px;
    color: #22c55e;
  `,

  execStatusIconFailed: css`
    font-size: 16px;
    color: #ef4444;
  `,

  execDuration: css`
    font-size: 12px;
    color: #6b7280;
  `,

  /* 执行详情区块 */
  execDetailSection: css`
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  `,

  execSectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  `,

  execSectionHeaderTitle: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 0;
    font-size: 12px;
    color: #374151;
  `,

  execSectionIcon: css`
    font-size: 12px;
    color: #9ca3af;
  `,

  execSectionContent: css`
    padding: 0;
    max-height: 300px;
    overflow: auto;
  `,

  /* 代码块样式 */
  execCodeBlock: css`
    display: flex;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 1.6;
  `,

  execLineNumbers: css`
    display: flex;
    flex-direction: column;
    padding: 8px;
    background: #f3f4f6;
    color: #9ca3af;
    text-align: right;
    user-select: none;
    border-right: 1px solid #e5e7eb;
    min-width: 32px;

    span {
      display: block;
    }
  `,

  execCodeContent: css`
    flex: 1;
    margin: 0;
    padding: 8px 12px;
    background: #fff;
    color: #1f2937;
    overflow-x: auto;
    white-space: pre;
  `,

  execCodeContentPlain: css`
    flex: 1;
    margin: 0;
    padding: 12px;
    background: #fff;
    color: #1f2937;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  `,
}));
