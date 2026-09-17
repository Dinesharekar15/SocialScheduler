import "dotenv/config";
import express, { NextFunction, Request, Response } from 'express';
import cors from "cors";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRouter.js";
import socialAuthRouter from "./routes/socialAuthRoutes.js";

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

app.use((err:any ,_req: Request , res: Response , _next: NextFunction)=>{
    console.log(err);
    res.status(500).send(err?.res?.data?.message || err?.message)
})

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});