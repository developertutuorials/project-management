import prisma from "@taskflow/database";

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("[UserService] getUserById error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

export const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("[UserService] getUserByEmail error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

// Webhook handler for Clerk user synchronization
export const handleClerkWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log(`[UserService] Clerk webhook received: ${type}`);

    if (type === "user.created" || type === "user.updated") {
      await prisma.user.upsert({
        where: { id: data.id },
        update: {
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim() || "User",
          image: data?.image_url || "",
        },
        create: {
          id: data.id,
          email: data.email_addresses?.[0]?.email_address || "",
          name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim() || "User",
          image: data?.image_url || "",
        },
      });
    } else if (type === "user.deleted") {
      await prisma.user.deleteMany({
        where: { id: data.id },
      });
    }

    res.json({ success: true, event: type });
  } catch (error) {
    console.error("[UserService] handleClerkWebhook error:", error);
    res.status(500).json({ message: error.message });
  }
};
