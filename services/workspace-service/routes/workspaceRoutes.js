import express from "express";
import {
  addMember,
  getUserWorkspaces,
  createWorkspace,
} from "../controllers/workspaceControllers.js";

const router = express.Router();

router.get("/", getUserWorkspaces);
router.post("/", createWorkspace);
router.post("/add-member", addMember);

export default router;
