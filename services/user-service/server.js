import express from "express";
import "dotenv/config";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const PORT = process.env.USER_PORT || 5005;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: "user-service", status: "healthy", port: PORT });
});

app.use("/", userRoutes);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
  console.log(`[User Service] Running on port ${PORT}`);
});

export default app;
