import { defineConfig, loadEnv } from "vite";

// Em desenvolvimento, as chamadas para /api vão para o servidor PHP embutido
// (npm run api). Assim o navegador vê a API na mesma origem do jogo e os
// cookies de sessão funcionam sem CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const alvo = env.API_PROXY_TARGET || process.env.API_PROXY_TARGET || "http://localhost:8080";
  return {
    base: "./",
    server: {
      port: 5173,
      proxy: {
        "/api": { target: alvo, changeOrigin: false },
      },
    },
    build: {
      outDir: "dist",
      assetsInlineLimit: 0,
      sourcemap: true,
    },
  };
});
