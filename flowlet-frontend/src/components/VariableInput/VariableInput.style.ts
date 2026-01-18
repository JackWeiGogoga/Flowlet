import { createStyles } from "antd-style";

// VariableInput 组件样式
export const useStyles = createStyles(({ css }) => ({
  // 容器
  wrapper: css`
    position: relative;

    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* 内嵌变量标签 - 使用全局类名以支持动态插入的 HTML */
    .variable-tag-inline {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
      margin: 0 2px;
      height: 22px;
      background: linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%);
      border: 1px solid #91caff;
      border-radius: 4px;
      font-size: 12px;
      line-height: 20px;
      color: #1677ff;
      font-weight: 500;
      white-space: nowrap;
      vertical-align: middle;
      user-select: none;
      cursor: default;

      &:hover {
        background: linear-gradient(135deg, #d6e4ff 0%, #e6f0ff 100%);
        border-color: #69b1ff;
      }

      /* 选中状态 */
      &.selected {
        background: linear-gradient(135deg, #bae0ff 0%, #d6e4ff 100%);
        border-color: #1677ff;
        box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.2);
        outline: none;
      }
    }
  `,

  container: css`
    position: relative;
  `,

  enumRow: css`
    margin-top: 6px;
    display: flex;
    justify-content: flex-end;
  `,

  enumPicker: css`
    width: 140px;
  `,

  // contentEditable 编辑器样式
  editor: css`
    min-height: 32px;
    padding: 4px 11px;
    background: #fff;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    font-size: 14px;
    line-height: 22px;
    color: #333;
    outline: none;
    cursor: text;
    transition: border-color 0.2s, box-shadow 0.2s;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: pre-wrap;

    &:hover {
      border-color: #4096ff;
    }

    &:focus {
      border-color: #1677ff;
      box-shadow: 0 0 0 2px rgba(5, 145, 255, 0.1);
    }

    &.multiline {
      min-height: 88px;
    }

    /* placeholder 样式 */
    &:empty::before {
      content: attr(data-placeholder);
      color: #bfbfbf;
      pointer-events: none;
    }

    &.disabled {
      background: #f5f5f5;
      border-color: #d9d9d9;
      cursor: not-allowed;

      &:hover {
        border-color: #d9d9d9;
      }
    }
  `,

  // 变量预览标签区域
  tagsPreview: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    padding: 8px 10px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  `,

  // 变量标签预览样式
  tagPreview: css`
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    background: linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%);
    border: 1px solid #91caff;
    border-radius: 4px;
    font-size: 12px;
    line-height: 20px;
    white-space: nowrap;
  `,

  tagIcon: css`
    display: inline-flex;
    align-items: center;
    color: #1677ff;
    font-size: 12px;
  `,

  tagGroup: css`
    color: #1677ff;
    font-weight: 500;
    font-size: 12px;
  `,

  tagSeparator: css`
    color: #91caff;
    margin: 0 2px;
  `,

  tagName: css`
    color: #1677ff;
    font-family: "SF Mono", "Monaco", "Menlo", monospace;
    font-size: 12px;
  `,

  // 下拉菜单样式
  dropdown: css`
    min-width: 300px;
    max-width: 400px;
  `,

  dropdownContent: css`
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;

    /* 滚动条样式 */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }
  `,

  dropdownEmpty: css`
    padding: 24px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08);
  `,

  // 变量分组
  group: css`
    padding: 0;

    &:not(:last-child) {
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 8px;
      padding-bottom: 8px;
    }
  `,

  groupTitle: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #8c8c8c;
    text-transform: uppercase;
  `,

  groupIcon: css`
    display: flex;
    align-items: center;
    color: #1890ff;
  `,

  groupItems: css`
    padding: 0;
  `,

  // 下拉菜单中的变量项
  dropdownItem: css`
    padding: 8px 12px 8px 24px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #f5f5f5;
    }
  `,

  itemMain: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,

  itemName: css`
    font-weight: 500;
    color: #1890ff;
    font-family: "SF Mono", "Monaco", "Menlo", monospace;
    font-size: 13px;
  `,

  itemType: css`
    font-size: 11px;
    color: #8c8c8c;
    background: #f0f0f0;
    padding: 1px 6px;
    border-radius: 4px;
  `,

  itemLabel: css`
    font-size: 12px;
    color: #595959;
    margin-top: 2px;
  `,
}));
