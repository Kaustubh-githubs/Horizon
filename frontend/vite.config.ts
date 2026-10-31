import { fileURLToPath, URL } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@/components/...` instead of long `../../` paths (shadcn expects this alias).
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    // In development, send API calls to Rails so the browser sees one origin,
    // like production (ADR 0001). No CORS setup needed. `xfwd` passes the page's own host on
    // (X-Forwarded-Host), so Rails knows the app's origin and its check that writes come from
    // it (ADR 0009) accepts them.
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true, xfwd: true },
    },
  },
})
