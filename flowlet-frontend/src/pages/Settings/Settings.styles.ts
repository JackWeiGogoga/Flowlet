import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css, token }) => ({
  pageHeader: css`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 16px;
    gap: 16px;
  `,
  headerTitle: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  headerMeta: css`
    color: ${token.colorTextSecondary};
    font-size: 13px;
  `,
  sectionTitle: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  sectionBlock: css`
    margin-bottom: 28px;
  `,
  sectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  sectionHeaderLeft: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
  `,
  providerBadge: css`
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 600;
    font-size: 14px;
  `,
  providerIconBadge: css`
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  `,
  providerIcon: css`
    width: 24px;
    height: 24px;
    color: ${token.colorText};
  `,
  providerRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  providerMeta: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    white-space: nowrap;
  `,
  providerName: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  providerHint: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  actionLink: css`
    color: ${token.colorPrimary};
  `,
  infoCard: css`
    border: 1px dashed ${token.colorBorderSecondary};
    background: ${token.colorBgLayout};
    margin-bottom: 24px;
  `,
  modelSection: css`
    margin-top: 8px;
  `,
  modelSectionHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  `,
  modelList: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 320px;
    overflow: auto;
    padding-right: 4px;
  `,
  modelGroup: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    padding: 8px 10px;
    background: ${token.colorBgContainer};
  `,
  modelGroupTitle: css`
    font-size: 12px;
    color: ${token.colorTextSecondary};
    margin-bottom: 6px;
  `,
  modelItem: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px dashed ${token.colorBorderSecondary};

    &:last-child {
      border-bottom: none;
    }
  `,
  modelItemMeta: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  modelItemName: css`
    font-family: monospace;
    font-size: 12px;
  `,
  modelHint: css`
    color: ${token.colorTextTertiary};
    font-size: 12px;
  `,
}));
