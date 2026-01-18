import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token, css }) => ({
  container: css`
    margin-top: 16px;
  `,

  header: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  `,

  headerTitle: css`
    font-size: 14px;
    font-weight: 500;
    color: ${token.colorTextHeading};
  `,

  assignmentList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,

  assignmentCard: css`
    background: ${token.colorFillQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusLG}px;
    padding: 12px;
    transition: all 0.2s;

    &:hover {
      border-color: ${token.colorPrimaryBorder};
      background: ${token.colorFillTertiary};
    }
  `,

  cardHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  `,

  variableInfo: css`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  `,

  dragHandle: css`
    color: #bfbfbf;
    cursor: grab;
    font-size: 14px;
  `,

  variableName: css`
    font-weight: 500;
    color: ${token.colorTextHeading};
    font-size: 13px;
  `,

  variableType: css`
    font-size: 11px;
    color: ${token.colorTextDescription};
    background: ${token.colorFillSecondary};
    padding: 2px 6px;
    border-radius: ${token.borderRadiusSM}px;
  `,

  operationTag: css`
    font-size: 11px;
  `,

  cardContent: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,

  formRow: css`
    display: flex;
    gap: 8px;
    align-items: flex-start;
  `,

  formLabel: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    min-width: 60px;
    line-height: 32px;
  `,

  formField: css`
    flex: 1;
  `,

  emptyState: css`
    padding: 24px;
    text-align: center;
    color: ${token.colorTextDescription};
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadiusLG}px;
    border: 1px dashed ${token.colorBorderSecondary};
  `,

  emptyIcon: css`
    font-size: 32px;
    color: ${token.colorTextQuaternary};
    margin-bottom: 8px;
  `,

  emptyText: css`
    font-size: 13px;
    margin-bottom: 12px;
  `,

  sourceSelector: css`
    .ant-select-selector {
      border-radius: ${token.borderRadiusSM}px !important;
    }
  `,

  valueInput: css`
    font-family: ${token.fontFamilyCode};
    font-size: 12px;
  `,

  valueInputRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  `,

  enumPicker: css`
    width: 140px;
    flex-shrink: 0;
  `,

  regexRow: css`
    display: flex;
    gap: 8px;
    flex: 1;
    align-items: center;
  `,

  regexField: css`
    flex: 1;
  `,

  regexFlags: css`
    width: 90px;
    flex-shrink: 0;
  `,

  arithmeticRow: css`
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
  `,

  arithmeticLabel: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    min-width: 60px;
  `,

  arithmeticOperator: css`
    width: 100px;
  `,

  arithmeticValue: css`
    flex: 1;
  `,

  arithmeticInputGroup: css`
    display: flex;
    gap: 8px;
    flex: 1;
    align-items: center;

    > button {
      flex-shrink: 0;
    }

    > .ant-input-number,
    > .ant-select {
      flex: 1;
    }
  `,

  // 变量选择器相关样式（复用自 ConditionNodeConfig）
  variableGroupHeader: css`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 600;
    color: #8c8c8c;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
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
    flex-shrink: 0;
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
    background: ${token.colorFillSecondary};
    padding: 1px 4px;
    border-radius: 2px;
    flex-shrink: 0;
  `,

  selectedVariableTag: css`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 1px 6px;
    background: linear-gradient(
      135deg,
      ${token.colorPrimaryBg} 0%,
      ${token.colorPrimaryBgHover} 100%
    );
    border: 1px solid ${token.colorPrimaryBorder};
    border-radius: 3px;
    font-size: 11px;
    color: ${token.colorPrimary};
    font-weight: 500;
    max-width: 100%;
    overflow: hidden;
    line-height: 1.4;
  `,

  tagIcon: css`
    font-size: 10px;
    flex-shrink: 0;
  `,

  tagPath: css`
    color: ${token.colorPrimary};
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 10px;
  `,

  tagVar: css`
    font-family: ${token.fontFamilyCode};
    color: ${token.colorPrimary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 10px;
  `,

  // 常量引用标签样式
  constantRefTag: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%);
    border: 1px solid #91caff;
    border-radius: 4px;
    font-size: 12px;
    color: #1677ff;
    font-weight: 500;
    min-width: 80px;
    max-width: 200px;
    flex: 1;
    height: 32px;
    box-sizing: border-box;
  `,

  constantRefIcon: css`
    font-size: 12px;
    flex-shrink: 0;
  `,

  constantRefName: css`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: ${token.fontFamilyCode};
  `,

  constantRefClear: css`
    flex-shrink: 0;
    padding: 0 !important;
    width: 16px !important;
    height: 16px !important;
    min-width: 16px !important;
    color: #8c8c8c !important;

    &:hover {
      color: #ff4d4f !important;
    }

    svg {
      font-size: 10px;
    }
  `,
}));
