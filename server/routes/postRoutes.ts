import express from "express";
import { generatePost, getGenerations, getPosts, schedulePost } from "../controllers/postController.js";
import { upload } from "../config/multer.js";
import { protect } from "../middelwares/authMiddlewware.js";

const postRouter = express.Router();

postRouter.get('/', protect, getPosts);
postRouter.get('/generations', protect, getGenerations);
postRouter.post('/', protect, upload.single("media"), schedulePost);
postRouter.post('/generate', protect, generatePost);

export default postRouter;