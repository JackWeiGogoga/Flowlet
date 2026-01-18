import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  flowEditor: css`
    height: 100vh;
  `,
  editorHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    padding: 0 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    z-index: 10;
  `,
  headerLeft: css`
    display: flex;
    align-items: center;
    gap: 16px;
  `,
  flowNameInput: css`
    width: 300px;

    &:hover,
    &:focus {
      background: #f5f5f5;
      border-radius: 4px;
    }
  `,
  headerRight: css`
    display: flex;
    align-items: center;
  `,
  editorContent: css`
    height: calc(100vh - 64px);
    overflow: hidden;
    position: relative;
  `,
  loadingContainer: css`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
  `,
  executeModalContent: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  reusableSwitch: css`
    display: flex;
    align-items: center;
    padding: 4px 12px;
    background: #f5f5f5;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #e8e8e8;
    }
  `,
  dslModalBody: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  dslEditor: css`
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 12px;
  `,
  dslHelp: css`
    color: #666;
  `,
  dslPreview: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #fafafa;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #f0f0f0;
  `,
  dslFooter: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  `,
  aiDrawerBody: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 12px;
  `,
  aiChatList: css`
    flex: 1;
    overflow: auto;
    padding: 4px;
  `,
  aiMessageBubble: css`
    padding: 8px 12px;
    border-radius: 10px;
    background: #f5f5f5;
    white-space: pre-wrap;
  `,
  aiMessageBubbleUser: css`
    background: #e6f7ff;
  `,
  aiInputArea: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  aiConfigRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  autoSaveStatus: css`
    font-size: 12px;
    color: #8c8c8c;
    display: flex;
    align-items: center;
    gap: 4px;

    &::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #8c8c8c;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 0.4;
      }
      50% {
        opacity: 1;
      }
    }
  `,
  autoSaveStatusSaved: css`
    font-size: 12px;
    color: #52c41a;
    display: flex;
    align-items: center;
    gap: 4px;

    &::before {
      content: "✓";
      font-size: 10px;
    }
  `,
  autoSaveStatusError: css`
    font-size: 12px;
    color: #ff4d4f;
    display: flex;
    align-items: center;
    gap: 4px;

    &::before {
      content: "✗";
      font-size: 10px;
    }
  `,
}));
