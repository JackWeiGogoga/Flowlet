import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  tableWrapper: {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 8,
    padding: 12,
  },
  valueTag: {
    marginBottom: 6,
  },
}));
