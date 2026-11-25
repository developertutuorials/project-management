import express from "express";
import "dotenv/config";
import cors from "cors";
import projectRoutes from "./routes/projectRoutes.js";

const app = express();
const PORT = process.env.PROJECT_PORT || 5002;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: "project-service", status: "healthy", port: PORT });
});

app.use("/", projectRoutes);
app.use("/api/projects", projectRoutes);

app.listen(PORT, () => {
  console.log(`[Project Service] Running on port ${PORT}`);
});

export default app;
