import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from "antd";
import { useTranslation } from "react-i18next";
import zhCN from "antd/locale/zh_CN";
import enUS from "antd/locale/en_US";
import FlowList from "@/pages/FlowList/FlowList";
import FlowEditor from "@/pages/FlowEditor/FlowEditor";
import ExecutionHistory from "@/pages/ExecutionHistory/ExecutionHistory";
import ExecutionDetail from "@/pages/ExecutionDetail/ExecutionDetail";
import CallbackPage from "@/pages/Callback/CallbackPage";
import Settings from "@/pages/Settings/Settings";
import DataDictionary from "@/pages/DataDictionary/DataDictionary";
import KeywordManagement from "@/pages/KeywordManagement/KeywordManagement";
import AntdAppContextComponent from "@/components/AppMessageContext";
import { AuthProvider, PrivateRoute, ROLES } from "@/auth";
import { AppLayout } from "@/layouts/AppLayout";
import "./App.css";
import antdTokenLight from "@/styles/tokens/antd-themeConfig-light.json";

// Ant Design locale 映射
const antdLocaleMap: Record<string, typeof zhCN> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

const App: React.FC = () => {
  const { i18n } = useTranslation();
  const antdLocale = antdLocaleMap[i18n.language] || enUS;

  return (
    <ConfigProvider
      locale={antdLocale}
      theme={{
        token: {
          ...antdTokenLight.token,
        },
        components: {
          ...antdTokenLight.components,
        },
      }}
    >
      <AntdApp>
        <AntdAppContextComponent />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* 公开路由 - OIDC 回调 */}
              <Route path="/callback" element={<CallbackPage />} />

              {/* 受保护路由 - 使用布局 */}
              <Route path="/" element={<Navigate to="/flows" replace />} />
              <Route
                path="/flows"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <FlowList />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/flows/:id"
                element={
                  <PrivateRoute>
                    <FlowEditor />
                  </PrivateRoute>
                }
              />
              <Route
                path="/executions"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <ExecutionHistory />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/dictionary"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <DataDictionary />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/keywords"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <KeywordManagement />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/keywords/:libraryId"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <KeywordManagement />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/executions/:id"
                element={
                  <PrivateRoute>
                    <AppLayout>
                      <ExecutionDetail />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute roles={[ROLES.ADMIN]}>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
