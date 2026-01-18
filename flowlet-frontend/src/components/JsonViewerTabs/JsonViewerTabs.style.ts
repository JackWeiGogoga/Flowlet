import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  wrapper: css`
    position: relative;

    &:hover .json-toolbar {
      opacity: 1;
      transform: translateY(0);
    }
  `,

  toolbar: css`
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    pointer-events: none;
  `,

  toolbarContent: css`
    opacity: 0;
    transform: translateY(-2px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 6px;
  `,

  toolbarButton: css`
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #6b7280;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;

    &:hover {
      color: #1890ff;
      border-color: #1890ff;
    }
  `,


  codeBlock: css`
    display: flex;
    background: #f5f5f5;
    border-radius: 6px;
    font-size: 12px;
    overflow: hidden;
    border: 1px solid #e8e8e8;
  `,

  codeBlockTransparent: css`
    background: transparent;
    border-color: transparent;
  `,

  lineNumbers: css`
    display: flex;
    flex-direction: column;
    padding: 12px 8px;
    background: #ebebeb;
    color: #999;
    text-align: right;
    user-select: none;
    border-right: 1px solid #ddd;

    span {
      line-height: 1.5;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo,
        monospace;
    }
  `,

  lineNumbersTransparent: css`
    background: transparent;
    border-right-color: #e5e7eb;
  `,

  codeContent: css`
    margin: 0;
    padding: 12px;
    color: #333;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    line-height: 1.5;
    overflow-x: auto;
    flex: 1;
    background: transparent;
    white-space: pre-wrap;
    word-break: break-word;
  `,

  jsonViewer: css`
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    padding: 8px;
    background: #f5f5f5;
    font-size: 12px;
    overflow: auto;

    .react-json-view {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo,
        monospace;
    }
  `,

  jsonViewerTransparent: css`
    background: transparent;
    border-color: transparent;
    padding: 0;
  `,
}));
