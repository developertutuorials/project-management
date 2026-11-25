import prisma from "@taskflow/database";
import eventBus from "@taskflow/event-bus";

const getUserId = (req) => req.headers["x-user-id"];

// Create Task
export const createTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      projectId,
      title,
      description,
      type,
      status,
      priority,
      assigneeId,
      due_date,
    } = req.body;
    const origin = req.get("origin");

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user identity" });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({ message: "You do not have admin privileges for this project" });
    } else if (
      assigneeId &&
      !project.members.find((member) => member.user.id === assigneeId)
    ) {
      return res
        .status(403)
        .json({ message: "Assignee is not member of the project/workspace" });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        type: type || "TASK",
        status: status || "TODO",
        due_date: due_date ? new Date(due_date) : null,
        project: {
          connect: { id: projectId },
        },
        ...(assigneeId && {
          assignee: {
            connect: { id: assigneeId },
          },
        }),
      },
      include: { assignee: true },
    });

    // Asynchronous event publication (non-blocking)
    if (assigneeId) {
      eventBus.publish("app/task.assigned", {
        taskId: task.id,
        origin,
      }).catch((err) => console.error("[TaskService] Event publish failed:", err.message));
    }

    res.json({ task, message: "Task created successfully" });
  } catch (error) {
    console.error("[TaskService] createTask error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Update Task
export const updateTask = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user identity" });
    }

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({ message: "You do not have admin privileges for this project" });
    }

    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: req.body,
      include: { assignee: true },
    });

    res.json({ task: updatedTask, message: "Task updated successfully" });
  } catch (error) {
    console.error("[TaskService] updateTask error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Delete Task
export const deleteTask = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { tasksIds } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user identity" });
    }

    if (!tasksIds || tasksIds.length === 0) {
      return res.status(400).json({ message: "No task IDs provided" });
    }

    const tasks = await prisma.task.findMany({
      where: { id: { in: tasksIds } },
    });

    if (tasks.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = await prisma.project.findUnique({
      where: { id: tasks[0].projectId },
      include: { members: { include: { user: true } } },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    } else if (project.team_lead !== userId) {
      return res
        .status(403)
        .json({ message: "You do not have admin privileges for this project" });
    }

    await prisma.task.deleteMany({
      where: { id: { in: tasksIds } },
    });

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("[TaskService] deleteTask error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};
