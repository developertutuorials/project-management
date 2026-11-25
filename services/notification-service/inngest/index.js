import { Inngest } from "inngest";
import prisma from "@taskflow/database";
import sendEmail from "../configs/nodemailer.js";

export const inngest = new Inngest({ id: "taskflow-notifications" });

export const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-mail",
    triggers: [{ event: "app/task.assigned" }],
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true },
    });

    if (!task || !task.assignee) {
      console.warn(`[NotificationService] Task or assignee not found for taskId: ${taskId}`);
      return;
    }

    await sendEmail({
      to: task.assignee.email,
      subject: `New task Assignment in ${task.project?.name || "Project"}`,
      body: `Hi ${task.assignee.name}, you have been assigned a new task: ${task.title}, due on ${task.due_date ? new Date(task.due_date).toLocaleDateString() : "no date"}. <a href="${origin || "#"}">View Task</a>`,
    });

    if (
      task.due_date &&
      new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()
    ) {
      await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));
      await step.run("check-if-task-is-completed", async () => {
        const updatedTask = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true },
        });
        if (!updatedTask) return;
        if (updatedTask.status !== "DONE") {
          await sendEmail({
            to: updatedTask.assignee.email,
            subject: `Reminder for ${updatedTask.project?.name || "Project"}`,
            body: `Hi ${updatedTask.assignee.name}, your task: ${updatedTask.title} is due on ${new Date(updatedTask.due_date).toLocaleDateString()}. <a href="${origin || "#"}">View Task</a>`,
          });
        }
      });
    }
  },
);

export const functions = [sendTaskAssignmentEmail];
