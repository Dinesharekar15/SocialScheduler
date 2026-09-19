import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddlewware.js"
import { GoogleGenAI } from "@google/genai";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";
import { Account } from "../models/Account.js";
import { cloudinary } from "../config/cloudinary.js";



// Helper to poll Leonardo.ai
// const pollLeonardoJob = async (generationId: string, apiKey: string) : Promise<string>=>{
//     const maxRetries = 20;
//     const delay = 5000;

//     for(let i = 0; i < maxRetries; i++){
//         try {
//            const response = await axios.get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {headers: {
//             accept: "application/json", authorization: `Bearer ${apiKey}`
//            }}) 

//            const generation = response.data.generations_by_pk;
//            if(generation.status === "COMPLETE"){
//             if(generation.generated_images && generation.generated_images.length > 0){
//                 return generation.generated_images[0].url;
//             }
//             throw new Error("Generation complete but no images found.")
//            }
//            if(generation.status === "FAILED"){
//             throw new Error("Leonardo.ai generation failed.")
//            }
//         } catch (err: any) {
//             console.error("Polling error:", err?.response?.data || err.message);
//         }

//         await new Promise((resolve)=> setTimeout(resolve, delay));
//     }
//     throw new Error("Leonardo.ai generation timed out.")
// }

// Generate post
// POST /api/posts/generate


export const generatePost = async (req: AuthRequest, res: Response,): Promise<void> => {
    try {
        const { prompt, tone, generateImage } = req.body;

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            res.status(400).json({ message: "Gemini API Key is missing. Please add it to your server/.env file." });
            return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const candidateModels = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash-exp",
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-3.6-flash"
        ];
        let textResponse: any = null;

        const promptContent = `Generate a social media post based on this prompt: "${prompt}". 
Tone: ${tone}. 
Include relevant hashtags.
Format the response as JSON with "content" and "imagePrompt" fields. 
The "imagePrompt" should be a highly descriptive prompt for an image generator that complements the post.`;

        for (const modelName of candidateModels) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: promptContent,
                });
                if (response && response.text) {
                    textResponse = response;
                    console.log(`Successfully generated content using model: ${modelName}`);
                    break;
                }
            } catch (err: any) {
                console.warn(`Gemini model ${modelName} unavailable/busy:`, err?.message || err);
            }
        }

        let content = "";
        let imagePrompt = prompt;

        if (textResponse && textResponse.text) {
            try {
                let rawText = textResponse.text || "";
                rawText = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: rawText, imagePrompt: prompt };
                content = data.content || rawText;
                imagePrompt = data.imagePrompt || prompt;
            } catch (e) {
                content = textResponse.text || "";
            }
        } else {
            console.warn("All Gemini models busy. Using fallback post generator.");
            content = `🚀 ${prompt}\n\nExcited to share our latest updates regarding "${prompt}". Stay tuned for more insights!\n\n#${tone.toLowerCase()} #updates #trending #social`;
            imagePrompt = prompt;
        }

        let mediaUrl = "";

        if (generateImage) {
            try {
                // Pollinations.ai provides free AI image generation without API keys
                const encodedPrompt = encodeURIComponent(imagePrompt || prompt);
                const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

                try {
                    const uploadResult = await cloudinary.uploader.upload(pollinationsUrl, {
                        folder: "ai-generations",
                    });
                    mediaUrl = uploadResult.secure_url;
                } catch (cloudinaryErr: any) {
                    console.warn("Cloudinary upload failed, falling back to direct Pollinations URL:", cloudinaryErr?.message || cloudinaryErr);
                    mediaUrl = pollinationsUrl;
                }
            } catch (err: any) {
                console.error("Image generation failed:", err);
            }
        }

        // Save generation to DB
        const generation = await Generation.create({
            user: req.user._id,
            prompt,
            content,
            mediaUrl,
            mediaType: mediaUrl ? "image" : undefined,
            tone
        })

        res.json(generation)

    } catch (error: any) {
        console.error("generatePost error:", error);
        const errorMsg = error?.message || (typeof error === "string" ? error : "Failed to generate post with Gemini AI");
        res.status(500).json({ message: errorMsg });
    }
}


// Get generations
// GET /api/posts/generations
export const getGenerations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const generations = await Generation.find({ user: req.user._id }).sort({ createdAt: -1 })
        res.json(generations)
    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
}



// Get posts
// GET /api/posts
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const posts = await Post.find({ user: req.user._id })
        res.json(posts)
    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
}


// Schedule post
// POST /api/posts
export const schedulePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { content, platforms, scheduledFor, status } = req.body;

        // Parse platforms if it comes as a stringified array from FormData
        let parsedPlatforms = platforms;
        if (typeof platforms === "string") {
            try {
                parsedPlatforms = JSON.parse(platforms)
            } catch (e) {
                parsedPlatforms = platforms.split(",");
            }
        }

        if (!parsedPlatforms || !Array.isArray(parsedPlatforms) || parsedPlatforms.length === 0) {
            res.status(400).json({ message: "Select at least one platform" });
            return;
        }

        // Validate connected accounts for target user & platforms
        const connectedAccounts = await Account.find({ user: req.user._id, status: "connected" });
        const connectedPlatforms = connectedAccounts.map(a => a.platform);

        const missingPlatforms = parsedPlatforms.filter((p: string) => {
            return !connectedPlatforms.some(cp => cp === p || cp.includes(p) || p.includes(cp));
        });

        if (missingPlatforms.length > 0) {
            const formattedNames = missingPlatforms.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ");
            res.status(400).json({
                message: `No connected account found for ${formattedNames}. Please connect your account first.`
            });
            return;
        }

        let mediaUrl: string | undefined = req.body.mediaUrl;
        let mediaType: "image" | "video" | undefined = req.body.mediaType;

        if (req.file) {
            try {
                const result = await new Promise<any>((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream({ resource_type: "auto", folder: "social-scheduler" }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result)
                    });
                    stream.end(req.file!.buffer);
                });
                mediaUrl = result.secure_url;
                mediaType = result.resource_type === "video" ? "video" : "image";
            } catch (uploadError: any) {
                console.error("Cloudinary upload failed:", uploadError);
                res.status(400).json({
                    message: `Image/Video upload failed (Cloudinary error): ${uploadError?.message || "Invalid API credentials"}`
                });
                return;
            }
        }

        const post = await Post.create({
            user: req.user._id,
            content,
            platforms: parsedPlatforms,
            mediaUrl,
            mediaType,
            scheduledFor,
            status,
        })
        res.status(201).json(post)

    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
}