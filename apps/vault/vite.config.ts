import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import unpluginIcons from "unplugin-icons/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  base: "./",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    sourcemap: true,
  },
  plugins: [
    TanStackRouterVite({
      addExtensions: true,
      autoCodeSplitting: true,
      routesDirectory: "./routes",
      generatedRouteTree: "./routeTree.gen.ts",
      target: "react",
    }),
    viteReact(),
    tailwindcss(),
    unpluginIcons({ compiler: "jsx", jsx: "react" }) as never,
  ],
  resolve: {
    alias: {
      "~": resolve(__dirname, "client"),
      "@": resolve(__dirname, "server"),
    },
  },
});
