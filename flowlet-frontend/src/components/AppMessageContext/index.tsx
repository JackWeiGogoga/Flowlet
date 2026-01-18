import { App } from "antd";
import { useEffect } from "react";
import { setStaticMethods } from "./staticMethods";

const AntdAppContextComponent = () => {
  const staticFunction = App.useApp();

  useEffect(() => {
    setStaticMethods(
      staticFunction.message,
      staticFunction.notification,
      staticFunction.modal
    );
  }, [staticFunction]);

  return null;
};

export default AntdAppContextComponent;
