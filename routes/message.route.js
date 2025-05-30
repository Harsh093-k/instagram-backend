import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";

import { deleteMessage, getMessage, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.post('/send/:id',isAuthenticated, sendMessage);
router.delete('/delete/:id',isAuthenticated, deleteMessage);
router.get('/all/:id',isAuthenticated, getMessage);

 
export default router;