import express from "express";
import "dotenv/config";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest, functions, sendTaskAssignmentEmail } from "./inngest/index.js";
import sendEmail from "./configs/nodemailer.js";
import prisma from "@taskflow/database";

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 5004;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ service: "notification-service", status: "healthy", port: PORT });
});

// Inngest server endpoint
app.use("/api/inngest", serve({ client: inngest, functions }));

// Event receiver endpoint for async event bus dispatches
app.post("/events", async (req, res) => {
  try {
    const { event, data } = req.body;
    console.log(`[NotificationService] Received event: ${event}`, data);

    if (event === "app/task.assigned") {
      // Send event to Inngest or process directly
      try {
        await inngest.send({ name: event, data });
      } catch (inngestErr) {
        // Fallback to direct email sending if Inngest Dev Server isn't running
        console.warn("[NotificationService] Inngest dispatch failed, sending direct email:", inngestErr.message);
        if (data?.taskId) {
          const task = await prisma.task.findUnique({
            where: { id: data.taskId },
            include: { assignee: true, project: true },
          });
          if (task && task.assignee?.email) {
            await sendEmail({
              to: task.assignee.email,
              subject: `New task Assignment in ${task.project?.name || "Project"}`,
              body: `Hi ${task.assignee.name}, you have been assigned: ${task.title}. <a href="${data.origin || "#"}">View Task</a>`,
            });
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[NotificationService] Event processing error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Notification Service] Running on port ${PORT}`);
});

export default app;
