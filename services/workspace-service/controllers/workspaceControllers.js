import prisma from "@taskflow/database";

const getUserId = (req) => req.headers["x-user-id"];

// Get all workspaces for user
export const getUserWorkspaces = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user identity" });
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: { some: { userId: userId } },
      },
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            tasks: {
              include: {
                assignee: true,
                comments: { include: { user: true } },
              },
            },
            members: { include: { user: true } },
          },
        },
        owner: true,
      },
    });

    res.json({ workspaces });
  } catch (error) {
    console.error("[WorkspaceService] getUserWorkspaces error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Create workspace
export const createWorkspace = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, id: customId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user identity" });
    }

    if (!name) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    // Ensure User exists in DB to prevent foreign key constraint failure
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@taskflow.dev`,
        name: "User",
      },
    });

    // Generate slug and ID (using customId from Clerk organization if provided)
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now().toString(36);
    const workspaceId = customId || ("ws_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 7));

    const workspace = await prisma.workspace.upsert({
      where: { id: workspaceId },
      update: {
        name,
        slug,
      },
      create: {
        id: workspaceId,
        name,
        slug,
        ownerId: userId,
        members: {
          create: {
            userId: userId,
            role: "ADMIN",
          },
        },
      },
      include: {
        members: { include: { user: true } },
        projects: {
          include: {
            tasks: {
              include: {
                assignee: true,
                comments: { include: { user: true } },
              },
            },
            members: { include: { user: true } },
          },
        },
        owner: true,
      },
    });

    res.status(201).json({ workspace });
  } catch (error) {
    console.error("[WorkspaceService] createWorkspace error:", error);
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        message: "Database connection failed: DATABASE_URL is missing in .env file.",
      });
    }
    res.status(500).json({ message: error.code || error.message });
  }
};

// Add member to workspace
export const addMember = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { email, role, workspaceId, message } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Missing user identity" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!workspaceId || !email || !role) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    if (!["ADMIN", "MEMBER"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true },
    });

    if (!workspace) {
      return res.status(400).json({ message: "workspace not found" });
    }

    if (
      !workspace.members.find(
        (member) => member.userId === userId && member.role === "ADMIN",
      )
    ) {
      return res
        .status(401)
        .json({ message: "you do not have admin privileges" });
    }

    const existingMember = workspace.members.find(
      (member) => member.userId === user.id,
    );

    if (existingMember) {
      return res.status(400).json({ message: "User is already a member" });
    }

    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role,
        message: message || "",
      },
    });

    res.status(201).json({ member, message: "Member added successfully" });
  } catch (error) {
    console.error("[WorkspaceService] addMember error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};
