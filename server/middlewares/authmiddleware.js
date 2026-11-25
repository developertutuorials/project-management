export const protect = async (req, res, next) => {
  try {
    const { userId } = await req.auth();
    console.log("protect userId:", userId);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return next();
  } catch (error) {
    console.log("protect error:", error);
    res.status(401).json({ message: error.code || error.message });
  }
};
