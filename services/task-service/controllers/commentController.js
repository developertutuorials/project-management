import prisma from "@taskflow/database";

const getUserId = (req) => req.headers["x-user-id"];

// Add comment
export const addComment = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { content, taskId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user identity" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
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
    }

    const member = project.members.find((member) => member.userId === userId);

    if (!member) {
      return res
        .status(403)
        .json({ message: "You are not member of this project" });
    }

    const comment = await prisma.comment.create({
      data: { taskId, content, userId },
      include: { user: true },
    });

    res.json({ comment });
  } catch (error) {
    console.error("[TaskService] addComment error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Get comments for task
export const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { user: true },
    });
    res.json({ comments });
  } catch (error) {
    console.error("[TaskService] getTaskComments error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};
