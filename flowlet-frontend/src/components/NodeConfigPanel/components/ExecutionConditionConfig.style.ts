import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css, token }) => ({
  container: css`
    margin-top: 16px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    overflow: hidden;
  `,

  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: ${token.colorFillQuaternary};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,

  headerLeft: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,

  headerIcon: css`
    color: ${token.colorPrimary};
    font-size: 16px;
  `,

  headerTitle: css`
    font-weight: 500;
    font-size: 13px;
    color: ${token.colorText};
  `,

  headerRight: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,

  expandIcon: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,

  content: css`
    padding: 12px;
    background: ${token.colorBgContainer};
  `,

  enableRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px dashed ${token.colorBorderSecondary};
  `,

  enableLabel: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: ${token.colorText};
  `,

  conditionsWrapper: css`
    position: relative;
  `,

  logicOperatorWrapper: css`
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    z-index: 2;
  `,

  logicOperatorToggle: css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 20px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    gap: 2px;
    padding: 0 6px;

    &.and {
      background: ${token.colorPrimaryBg};
      color: ${token.colorPrimary};
      border: 1px solid ${token.colorPrimaryBorder};
    }

    &.or {
      background: #fff7e6;
      color: #fa8c16;
      border: 1px solid #ffd591;
    }

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    }

    svg {
      font-size: 8px;
      width: 8px;
      height: 8px;
    }
  `,

  conditionsList: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 44px;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      left: -20px;
      top: 12px;
      bottom: 12px;
      width: 1px;
      background: ${token.colorBorderSecondary};
      border-radius: 1px;
    }
  `,

  conditionItem: css`
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 6px 8px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 4px;
    position: relative;
    transition: all 0.2s;

    &:hover {
      border-color: ${token.colorBorder};
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    &::before {
      content: "";
      position: absolute;
      left: -13px;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 1px;
      background: ${token.colorBorderSecondary};
    }

    &::after {
      content: "";
      position: absolute;
      left: -13px;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 4px;
      height: 4px;
      background: ${token.colorBgContainer};
      border: 1px solid ${token.colorBorder};
      border-radius: 50%;
    }
  `,

  conditionContent: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,

  conditionRow: css`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  `,

  variableSelector: css`
    flex: 1;
    min-width: 100px;

    .ant-select {
      width: 100%;
    }

    .ant-select-selector {
      font-size: 12px !important;
      min-height: 24px !important;
      height: auto !important;
      padding: 0 8px !important;
    }
  `,

  variableSelectorOption: css`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
  `,

  variableOptionIcon: css`
    font-size: 12px;
    color: ${token.colorPrimary};
  `,

  variableOptionContent: css`
    flex: 1;
    min-width: 0;
  `,

  variableOptionPath: css`
    font-size: 10px;
    color: ${token.colorTextSecondary};
    line-height: 1.2;
  `,

  variableOptionName: css`
    font-size: 11px;
    color: ${token.colorText};
    font-weight: 500;
  `,

  variableOptionType: css`
    font-size: 9px;
    color: ${token.colorTextSecondary};
    background: ${token.colorFillTertiary};
    padding: 1px 4px;
    border-radius: 2px;
  `,

  operatorSelector: css`
    width: 80px;
    flex-shrink: 0;

    .ant-select-selector {
      font-size: 12px !important;
      min-height: 24px !important;
      height: 24px !important;
      padding: 0 6px !important;
    }
  `,

  valueInput: css`
    flex: 1 1 220px;
    min-width: 180px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .ant-input {
      flex: 1;
      min-width: 140px;
    }

    .ant-input {
      font-size: 12px;
      height: 24px;
      padding: 2px 6px;
    }
  `,

  enumPicker: css`
    width: 120px;
    flex: 0 0 120px;
    min-width: 100px;
  `,

  deleteBtn: css`
    flex-shrink: 0;
    padding: 2px !important;
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;

    svg {
      font-size: 12px;
    }
  `,

  addConditionBtn: css`
    margin-left: 44px;
    margin-top: 8px;
    font-size: 11px;
    height: 24px;
    padding: 0 10px;
  `,

  selectedVariableTag: css`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 1px 6px;
    background: linear-gradient(
      135deg,
      ${token.colorPrimaryBg} 0%,
      ${token.colorBgLayout} 100%
    );
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: 3px;
    font-size: 11px;
    color: ${token.colorPrimary};
    font-weight: 500;
    max-width: 100%;
    overflow: hidden;
    line-height: 1.4;

    .tag-icon {
      font-size: 10px;
      flex-shrink: 0;
    }

    .tag-path {
      color: ${token.colorPrimary};
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 10px;
    }

    .tag-var {
      font-family: "SF Mono", Monaco, Menlo, monospace;
      color: ${token.colorPrimary};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 10px;
    }
  `,

  variableGroupHeader: css`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 600;
    color: ${token.colorTextSecondary};
    background: ${token.colorFillQuaternary};
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,

  disabledHint: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
    padding: 8px 0;
    text-align: center;
  `,
}));
