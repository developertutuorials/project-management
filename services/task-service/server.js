import express from "express";
import "dotenv/config";
import cors from "cors";
import taskRoutes from "./routes/taskRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";

const app = express();
const PORT = process.env.TASK_PORT || 5003;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: "task-service", status: "healthy", port: PORT });
});

app.use("/api/tasks", taskRoutes);
app.use("/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/comments", commentRoutes);

app.listen(PORT, () => {
  console.log(`[Task Service] Running on port ${PORT}`);
});

export default app;
