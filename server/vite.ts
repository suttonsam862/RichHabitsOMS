import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
const viteLogger = createLogger();
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    host: true,
  };
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });
  app.use(vite.middlewares);

  // Only serve React app for non-API routes - this prevents conflicts
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;
    // Skip API routes and uploads - let them be handled by Express routes
    if (url.startsWith("/api") || url.startsWith("/uploads")) {
      return next();
    }
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );
      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }
  app.use(express.static(distPath));

  // Catch-all handler for client-side routing - must come after all API routes
  app.get("*", (req, res) => {
    // Skip API routes - they should have been handled already
    if (req.path.startsWith("/api")) {
      return res
        .status(404)
        .json({ success: false, message: `Route ${req.path} not found` });
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
