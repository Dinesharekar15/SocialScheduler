import "dotenv/config";
import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRouter.js";
import socialAuthRouter from "./routes/socialAuthRoutes.js";
import accountRouter from "./routes/accountRoutes.js";
import postRouter from "./routes/postRoutes.js";
import activityRouter from "./routes/activityRoutes.js";
import { initScheduler } from "./services/SchedulerService.js";

const app = express();

await connectDB();

// Middleware
app.use(cors())
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (_req: Request, res: Response) => {
    res.send('Server is Live!');
});

//Api Routes
app.use("/api/auth", authRouter)
app.use("/api/oauth", socialAuthRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/posts", postRouter)
app.use("/api/activity", activityRouter)


// Initialize Scheduler
initScheduler()

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Global Error:", err);
    const status = err?.status || err?.statusCode || 500;
    const message = err?.response?.data?.message || err?.message || "Internal Server Error";
    res.status(status).json({ message });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});