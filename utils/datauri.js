
import DataUriParser from "datauri/parser.js";
import path from "path";

const parser = new DataUriParser();

const getDataUri = (file) => {
  const extName = path.extname(file.originalname).toLowerCase(); 
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif','.mp4'];

  if (!validExtensions.includes(extName)) {
    throw new Error(`Unsupported file type: ${extName}`);
  }

  return parser.format(extName, file.buffer); 
};

export default getDataUri;
