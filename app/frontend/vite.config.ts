/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// API de desarrollo: por defecto uvicorn local en :8000 (sin el prefijo /api, como Caddy).
// GOMAD_API puede venir del entorno o de app/frontend/.env (solo para desarrollo).

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const remoteApi = loadEnv(mode, process.cwd(), "GOMAD_").GOMAD_API;
    return ({
    plugins: [react()],
    server: {
        proxy: {
            "/api": remoteApi
                ? { target: remoteApi, changeOrigin: true, secure: true }
                : {
                      target: "http://localhost:8000",
                      rewrite: (path) => path.replace(/^\/api/, ""),
                  },
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./src/setupTests.ts"],
    },
    });
});
