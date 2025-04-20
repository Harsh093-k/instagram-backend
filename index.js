import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import cloudinary from "cloudinary";
import messageRoute from "./routes/message.route.js";
import { app, server } from "./socket/socket.js";
import path from "path";
 
dotenv.config();


const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,  // Your Cloudinary cloud name
  api_key:process.env.API_KEY,        // Your Cloudinary API key
  api_secret: process.env.API_SECRET  // Your Cloudinary API secret
});
app.use(express.json());
app.use(cookieParser());
app.use(urlencoded({ extended: true }));
const corsOptions = {
    // origin:'https://instagram-frontend-rp7y.vercel.app',
    origin:' http://localhost:5173',
    credentials: true
}
app.use(cors(corsOptions));



// yha pr apni api ayengi
app.use("/api/v1/user", userRoute);
app.use("/api/v1/post", postRoute);
app.use("/api/v1/message", messageRoute);





server.listen(PORT, () => {
    connectDB();
    console.log(`Server listen at port ${PORT}`);
});