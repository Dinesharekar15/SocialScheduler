import express from "express";
import { getActivity } from "../controllers/activityController.js";
import { protect } from "../middelwares/authMiddlewware.js";

const activityRouter = express.Router();

activityRouter.get('/', protect, getActivity)

export default activityRouter;