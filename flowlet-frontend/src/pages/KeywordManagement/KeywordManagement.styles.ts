import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css, token }) => ({
  pageHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  `,
  title: css`
    margin: 0;
  `,
  layout: css`
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 16px;
  `,
  sidebarCard: css`
    height: fit-content;
  `,
  libraryList: css`
    max-height: 520px;
    overflow: auto;
  `,
  libraryItem: css`
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: background 0.2s ease;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  libraryItemActive: css`
    background: ${token.colorFillSecondary};
  `,
  libraryMeta: css`
    color: ${token.colorTextSecondary};
    font-size: 12px;
  `,
  contentCard: css`
    min-height: 320px;
  `,
  toolbar: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  `,
  searchInput: css`
    max-width: 260px;
  `,
  listToolbar: css`
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;

    .ant-input-search {
      max-width: 320px;
    }
  `,
  clickableRow: css`
    cursor: pointer;
  `,
}));
