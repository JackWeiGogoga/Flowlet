import { createStyles } from "antd-style";

export const useStyles = createStyles(() => ({
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    margin: 0,
  },
  tabPane: {
    paddingTop: 8,
  },
}));
