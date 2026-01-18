import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  // 主容器
  apiNodeConfig: css`
    margin-top: 16px;
  `,

  // API 区域
  apiSection: css`
    margin-bottom: 16px;
  `,

  apiSectionHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  `,

  sectionTitle: css`
    font-size: 13px;
    font-weight: 600;
    color: #1f1f1f;
  `,

  authBtn: css`
    font-size: 12px;
    color: #666;
    padding: 2px 8px;
    height: auto;

    &:hover {
      color: #1890ff;
      background: #e6f4ff;
    }
  `,

  apiUrlRow: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
  `,

  methodSelect: css`
    width: 110px;
    flex-shrink: 0;
    height: 32px;

    .ant-select-selector {
      height: 32px !important;
      border-radius: 6px !important;
      background: #f5f5f5 !important;
      border-color: #e8e8e8 !important;
    }

    .ant-select-selection-item {
      font-weight: 500;
      font-size: 13px;
    }

    &:hover .ant-select-selector {
      border-color: #1890ff !important;
    }

    &.ant-select-focused .ant-select-selector {
      border-color: #1890ff !important;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1) !important;
    }
  `,

  urlInput: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;

    .variable-editor {
      min-height: 32px;
      padding: 4px 11px;
      font-size: 13px;
      white-space: nowrap;
      overflow-x: auto;
      overflow-y: hidden;

      /* 隐藏滚动条但保持可滚动 */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE/Edge */
      &::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
      }
    }
  `,

  // 配置区块
  configSection: css`
    margin-bottom: 16px;
  `,

  sectionLabel: css`
    font-size: 12px;
    font-weight: 600;
    color: #1f1f1f;
    margin-bottom: 8px;
    text-transform: uppercase;
  `,

  // Body 类型选择
  bodyTypeGroup: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;

    .ant-radio-wrapper {
      font-size: 12px;
      margin-right: 0;
    }

    .ant-radio-wrapper span:last-child {
      padding-left: 4px;
      padding-right: 0;
    }
  `,

  bodyTextarea: css`
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    font-size: 12px;
    margin-top: 8px;

    .ant-input,
    textarea {
      font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
      font-size: 12px;
    }

    /* Body 编辑器浅色背景样式 - 参考 DebugPanel 代码块风格 */
    &.variable-input-wrapper {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }

    .variable-editor {
      background: #fafafa;
      border: none;
      border-radius: 0;
      min-height: 120px;
      padding: 12px;
      font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #1f2937;
    }

    .variable-editor:hover {
      border: none;
      background: #f5f5f5;
    }

    .variable-editor:focus {
      border: none;
      box-shadow: none;
      background: #fff;
    }
  `,

  // Body 区域容器样式
  bodyEditorContainer: css`
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    margin-top: 8px;

    .variable-input-wrapper {
      background: transparent;
      border: none;
      border-radius: 0;
    }

    .variable-editor {
      background: #fff;
      border: none;
      border-radius: 0;
      min-height: 120px;
      padding: 12px;
      font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #1f2937;
    }

    .variable-editor:hover {
      border: none;
    }

    .variable-editor:focus {
      border: none;
      box-shadow: none;
    }
  `,

  bodyEditorHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #fafafa;
    border-bottom: 1px solid #e5e7eb;
    font-size: 12px;
    color: #6b7280;
  `,

  bodyEditorContent: css`
    padding: 0;
  `,

  // 超时设置 - 紧凑布局
  timeoutSettings: css`
    padding: 0;

    .ant-form-item {
      margin-bottom: 8px;
    }

    .ant-form-item:last-child {
      margin-bottom: 0;
    }

    .ant-form-item-label {
      padding-bottom: 2px;
    }

    .ant-form-item-label > label {
      font-size: 12px;
      height: 20px;
    }

    .ant-form-item-extra {
      font-size: 11px;
      margin-top: 1px;
      min-height: auto;
      line-height: 1.4;
    }

    .ant-input-number {
      height: 28px;
      border-radius: 6px 0 0 6px;
    }

    .ant-input-number-input {
      height: 26px;
      padding: 0 8px;
    }
  `,

  // 超时单位样式
  timeoutUnit: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 11px;
    height: 28px;
    background: #fafafa;
    border: 1px solid #d9d9d9;
    border-left: none;
    border-radius: 0 6px 6px 0;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
    white-space: nowrap;
  `,

  // 可折叠面板
  configCollapse: css`
    margin-top: 8px;

    .ant-collapse-header {
      padding: 12px 0 !important;
      font-size: 13px;
      font-weight: 500;
      color: #1f1f1f;
    }

    .ant-collapse-content-box {
      padding: 0 0 12px 0 !important;
    }

    .ant-collapse-item {
      border-bottom: 1px solid #f0f0f0;
    }

    .ant-collapse-item:last-child {
      border-bottom: none;
    }
  `,

  // 响应式调整
  responsive: css`
    @media (max-width: 400px) {
      .body-type-group {
        flex-direction: column;
      }

      .api-url-row {
        flex-direction: column;
      }

      .method-select {
        width: 100%;
      }

      .method-select .ant-select-selector {
        border-right: none !important;
        border-bottom: 1px solid #d9d9d9 !important;
      }
    }
  `,
}));
