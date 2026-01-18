import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const keyPath = path.resolve(__dirname, "ssl/dev.key");
  const certPath = path.resolve(__dirname, "ssl/dev.crt");
  const disableHttps = env.VITE_HTTPS === "false";
  const httpsOptions =
    !disableHttps && fs.existsSync(keyPath) && fs.existsSync(certPath)
      ? {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      : undefined;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      https: httpsOptions,
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    preview: {
      https: httpsOptions,
      host: "0.0.0.0",
      port: 5173,
    },
  };
});
