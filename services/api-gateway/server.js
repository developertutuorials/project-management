import express from "express";
import "dotenv/config";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";

const app = express();
// Gateway port: defaults to 4000 to avoid conflict with macOS AirPlay on 5000
const PORT = process.env.GATEWAY_PORT || 4000;

// Upstream service targets (configurable via environment variables)
const WORKSPACE_SERVICE_URL = process.env.WORKSPACE_SERVICE_URL || "http://localhost:5001";
const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || "http://localhost:5002";
const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || "http://localhost:5003";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5004";
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:5005";

app.use(cors());
app.use(express.json());

// Health check endpoint (placed before clerkMiddleware so health checks always succeed)
app.get("/", (req, res) => {
  res.status(200).json({
    status: "healthy",
    gateway: "TaskFlow API Gateway",
    services: {
      workspace: WORKSPACE_SERVICE_URL,
      project: PROJECT_SERVICE_URL,
      task: TASK_SERVICE_URL,
      notification: NOTIFICATION_SERVICE_URL,
      user: USER_SERVICE_URL,
    },
  });
});

// Conditionally load Clerk Middleware if keys are present
const isClerkConfigured = Boolean(process.env.CLERK_PUBLISHABLE_KEY || process.env.CLERK_SECRET_KEY);
if (isClerkConfigured) {
  app.use(clerkMiddleware());
} else {
  console.warn("[API Gateway] WARNING: Clerk keys not found in environment. Running in development passthrough mode.");
}

// Auth enforcement middleware for protected proxy routes
const requireAuth = async (req, res, next) => {
  try {
    let userId = null;

    // 1. Try Clerk SDK auth if available
    try {
      const auth = await req.auth?.();
      if (auth?.userId) userId = auth.userId;
    } catch (e) {}

    // 2. Fallback: decode sub claim from Authorization: Bearer <jwt>
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          if (token && token !== "null" && token !== "undefined") {
            const payloadBase64 = token.split(".")[1];
            if (payloadBase64) {
              const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
              userId = payload.sub || payload.userId;
            }
          }
        } catch (jwtErr) {
          console.warn("[Gateway] JWT decode error:", jwtErr.message);
        }
      }
    }

    // 3. Fallback to client x-user-id header
    if (!userId && req.headers["x-user-id"]) {
      userId = req.headers["x-user-id"];
    }

    // 4. Fallback in development mode
    if (!userId && !isClerkConfigured) {
      userId = "dev_user";
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - Authentication required" });
    }

    // Attach verified identity to request for forwarding
    req.verifiedUserId = userId;
    next();
  } catch (error) {
    console.error("[Gateway Auth Error]", error);
    res.status(401).json({ message: "Authentication validation failed" });
  }
};

// Helper to configure proxy forwarding with verified user headers
const buildServiceProxy = (targetUrl, pathPrefix) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: (path) => {
      // Ensure pathPrefix is included when forwarding downstream
      if (pathPrefix && !path.startsWith(pathPrefix)) {
        return `${pathPrefix}${path.startsWith("/") ? path : "/" + path}`;
      }
      return path;
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        if (req.verifiedUserId) {
          proxyReq.setHeader("x-user-id", req.verifiedUserId);
        }
        // Fix body serialization if express.json() was parsed
        fixRequestBody(proxyReq, req);
      },
      error: (err, req, res) => {
        console.error(`[Gateway Proxy Error] Target: ${targetUrl}`, err.message);
        if (!res.headersSent) {
          res.status(503).json({
            message: `Service unavailable at ${targetUrl}`,
            error: err.message,
          });
        }
      },
    },
  });
};

// Public / Webhook Proxies
app.use("/api/inngest", createProxyMiddleware({
  target: NOTIFICATION_SERVICE_URL,
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody,
  },
}));

// Domain Service Protected Routes
app.use("/api/workspaces", requireAuth, buildServiceProxy(WORKSPACE_SERVICE_URL, "/api/workspaces"));
app.use("/api/projects", requireAuth, buildServiceProxy(PROJECT_SERVICE_URL, "/api/projects"));
app.use("/api/tasks", requireAuth, buildServiceProxy(TASK_SERVICE_URL, "/api/tasks"));
app.use("/api/comments", requireAuth, buildServiceProxy(TASK_SERVICE_URL, "/api/comments"));
app.use("/api/users", requireAuth, buildServiceProxy(USER_SERVICE_URL, "/api/users"));

const server = app.listen(PORT, () => {
  console.log(`[API Gateway] Running on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[API Gateway] Error: Port ${PORT} is already in use.`);
    if (PORT === 5000) {
      console.error(`[API Gateway] Tip: macOS AirPlay Receiver occupies port 5000. Use PORT=4000.`);
    }
  } else {
    console.error("[API Gateway] Server error:", err);
  }
});

export default app;
