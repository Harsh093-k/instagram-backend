import express from "express";
import { editProfile, followOrUnfollow, getProfile, getSuggestedUsers, login, logout, myProfile,forgotPassword, register, sendOTP } from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";

import uploadFile from "../middlewares/multer.js";

const router = express.Router();

router.post('/register',register);
router.post('/login',login);
router.get('/logout',logout);
router.get('/following/data',isAuthenticated,myProfile);
router.put('/forgot-password',forgotPassword);
router.post('/send-otp',sendOTP);
router.get('/:id/profile',isAuthenticated, getProfile);
router.put('/profile/edit',isAuthenticated, uploadFile, editProfile);
router.get('/suggested',isAuthenticated, getSuggestedUsers);
router.post('/followorunfollow/:id',isAuthenticated, followOrUnfollow);

export default router;