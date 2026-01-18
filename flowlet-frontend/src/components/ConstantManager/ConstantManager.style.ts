import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token, css }) => ({
  container: css`
    height: 100%;
    display: flex;
    flex-direction: column;
  `,

  header: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${token.marginMD}px;
  `,

  title: css`
    font-size: ${token.fontSizeLG}px;
    font-weight: ${token.fontWeightStrong};
    color: ${token.colorText};
    margin: 0;
  `,

  searchRow: css`
    display: flex;
    gap: ${token.marginSM}px;
    margin-bottom: ${token.marginMD}px;
  `,

  listContainer: css`
    flex: 1;
    overflow-y: auto;
  `,

  scopeGroup: css`
    margin-bottom: ${token.marginLG}px;
  `,

  scopeTitle: css`
    display: flex;
    align-items: center;
    gap: ${token.marginXS}px;
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
    margin-bottom: ${token.marginSM}px;
    padding: ${token.paddingXS}px 0;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,

  constantCard: css`
    padding: ${token.paddingSM}px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
    margin-bottom: ${token.marginXS}px;
    transition: all 0.2s;

    &:hover {
      border-color: ${token.colorPrimary};
      background: ${token.colorBgTextHover};
    }
  `,

  cardHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${token.marginXS}px;
  `,

  cardName: css`
    font-weight: ${token.fontWeightStrong};
    color: ${token.colorText};
  `,

  cardActions: css`
    display: flex;
    gap: ${token.marginXS}px;
  `,

  cardDesc: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextSecondary};
    margin-bottom: ${token.marginXS}px;
  `,

  cardValue: css`
    font-size: ${token.fontSizeSM}px;
    color: ${token.colorTextDescription};
    word-break: break-all;
  `,

  badge: css`
    display: inline-flex;
    align-items: center;
    padding: 0 ${token.paddingXS}px;
    background: ${token.colorPrimaryBg};
    color: ${token.colorPrimary};
    border-radius: ${token.borderRadiusSM}px;
    font-size: ${token.fontSizeSM}px;
  `,

  drawerFooter: css`
    display: flex;
    justify-content: flex-end;
    gap: ${token.marginSM}px;
    padding-top: ${token.paddingMD}px;
    border-top: 1px solid ${token.colorBorder};
  `,
}));
