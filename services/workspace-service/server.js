import express from "express";
import "dotenv/config";
import cors from "cors";
import workspaceRoutes from "./routes/workspaceRoutes.js";

const app = express();
const PORT = process.env.WORKSPACE_PORT || 5001;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: "workspace-service", status: "healthy", port: PORT });
});

app.use("/", workspaceRoutes);
app.use("/api/workspaces", workspaceRoutes);

app.listen(PORT, () => {
  console.log(`[Workspace Service] Running on port ${PORT}`);
});

export default app;
