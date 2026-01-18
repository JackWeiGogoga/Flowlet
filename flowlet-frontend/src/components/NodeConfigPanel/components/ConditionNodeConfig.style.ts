import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  config: css`
    padding: 0;

    .ant-select-selection-item {
      line-height: 22px !important;
    }

    .ant-divider {
      margin: 8px 0;
      font-size: 12px;
    }
  `,

  branches: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,

  branch: css`
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
    overflow: hidden;
  `,

  branchHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: #fff;
    border-bottom: 1px solid #f0f0f0;
  `,

  branchHeaderLeft: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,

  branchLabel: css`
    font-weight: 600;
    color: #1677ff;
    font-size: 12px;
  `,

  branchAliasInput: css`
    width: 160px;
    max-width: 40vw;
  `,

  branchActions: css`
    display: flex;
    align-items: center;
    gap: 4px;
  `,

  conditionsContainer: css`
    padding: 8px;
    position: relative;
  `,

  conditionsListWrapper: css`
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
      background: #e6f4ff;
      color: #1677ff;
      border: 1px solid #91caff;
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
      background: #e8e8e8;
      border-radius: 1px;
    }
  `,

  conditionItem: css`
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 6px 8px;
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    position: relative;
    transition: all 0.2s;

    &:hover {
      border-color: #d9d9d9;
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
      background: #e8e8e8;
    }

    &::after {
      content: "";
      position: absolute;
      left: -13px;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 4px;
      height: 4px;
      background: #fff;
      border: 1px solid #d9d9d9;
      border-radius: 50%;
    }

    &.dragging {
      opacity: 0.5;
      border-color: #1677ff;
    }

    &.error {
      border-color: #ff4d4f;
      background: #fff2f0;

      &::after {
        border-color: #ff4d4f;
      }
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
    align-items: flex-start;
    gap: 4px;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      flex-wrap: wrap;
    }
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

    @media (max-width: 768px) {
      width: 100%;
      min-width: unset;
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
    color: #1677ff;
  `,

  variableOptionContent: css`
    flex: 1;
    min-width: 0;
  `,

  variableOptionPath: css`
    font-size: 10px;
    color: #8c8c8c;
    line-height: 1.2;
  `,

  variableOptionName: css`
    font-size: 11px;
    color: #262626;
    font-weight: 500;
  `,

  variableOptionType: css`
    font-size: 9px;
    color: #8c8c8c;
    background: #f5f5f5;
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

    .ant-select-dropdown {
      min-width: 90px !important;
    }

    .ant-select-item {
      font-size: 12px;
      padding: 4px 8px;
      min-height: 28px;
    }

    @media (max-width: 768px) {
      width: 100%;
      min-width: unset;
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

    @media (max-width: 768px) {
      width: 100%;
      min-width: unset;
    }
  `,

  enumPicker: css`
    width: 120px;
    flex: 0 0 120px;
    min-width: 100px;
  `,

  valuePicker: css`
    width: 120px;
    flex: 0 0 120px;
    min-width: 100px;
  `,

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
    height: 24px;
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
    font-family: "SF Mono", Monaco, Menlo, monospace;
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

  conditionDeleteBtn: css`
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
    margin-top: 4px;
    font-size: 11px;
    height: 22px;
    padding: 0 8px;
  `,

  addBranchContainer: css`
    margin-top: 4px;
  `,

  addBranchBtn: css`
    width: 100%;
    height: 28px;
    border-style: dashed;
    font-size: 12px;
  `,

  elseBranch: css`
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    padding: 8px 10px;
  `,

  elseHeader: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,

  elseLabel: css`
    font-weight: 600;
    color: #595959;
    font-size: 12px;
  `,

  elseDescription: css`
    color: #8c8c8c;
    font-size: 11px;
    margin-top: 4px;
  `,

  selectedVariableTag: css`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 1px 6px;
    background: linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%);
    border: 1px solid #91caff;
    border-radius: 3px;
    font-size: 11px;
    color: #1677ff;
    font-weight: 500;
    max-width: 100%;
    overflow: hidden;
    line-height: 1.4;

    .tag-icon {
      font-size: 10px;
      flex-shrink: 0;
    }

    .tag-path {
      color: #1677ff;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 10px;
    }

    .tag-var {
      font-family: "SF Mono", Monaco, Menlo, monospace;
      color: #1677ff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 10px;
    }
  `,

  emptyConditions: css`
    padding: 12px;
    text-align: center;
    color: #8c8c8c;
    font-size: 12px;
  `,

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
}));
