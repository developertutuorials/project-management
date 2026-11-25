import express from "express";
import {
  getUserById,
  getUserByEmail,
  handleClerkWebhook,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/:id", getUserById);
router.get("/by-email/:email", getUserByEmail);
router.post("/webhook", handleClerkWebhook);

export default router;
