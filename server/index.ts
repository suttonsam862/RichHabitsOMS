import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { supabase } from "./supabase"; // Import Supabase client
import { initializeDatabase } from "./supabase-init"; // Use Supabase initialization
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Verify Supabase connection
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.warn("Supabase connection check:", error.message);
      console.log("Will continue and retry connection as needed");
    } else {
      console.log("Supabase connection verified successfully");
    }
    
    // Initialize database safely (won't wipe existing data)
    await initializeDatabase();
    
    // Register API routes first
    const server = await registerRoutes(app);

    // Error handling middleware for API routes
    app.use("/api", (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    });

    // Static file serving and client-side routing should come after API routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    app.use(express.static(path.resolve(__dirname, "../client/dist")));
    
    // Catch-all route should be last
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
    });

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start application:", error);
    process.exit(1);
  }
})();
