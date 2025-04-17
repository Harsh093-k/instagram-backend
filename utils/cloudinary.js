import cloudinary from "cloudinary";
import dotenv from "dotenv";
dotenv.config({});


console.log("API_KEY",process.env.API_KEY);
console.log("CLOUD_",process.env.CLOUD_NAME);
console.log("API_SECRET",process.env.API_SECRET);

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,  // Your Cloudinary cloud name
  api_key:process.env.API_KEY,        // Your Cloudinary API key
  api_secret: process.env.API_SECRET  // Your Cloudinary API secret
});

export default cloudinary;