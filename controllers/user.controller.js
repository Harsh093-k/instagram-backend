import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "cloudinary";
import { Post } from "../models/post.model.js";
import nodemailer from "nodemailer";


export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "Try a different email",
                success: false,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
        });


        await sendConfirmationEmail(username, email);

        return res.status(201).json({
            message: "Account created successfully. Check your email!",
            success: true,
        });

    } catch (error) {
        console.error("Error in registration:", error);
        res.status(500).json({
            message: "Server error. Please try again later.",
            success: false,
        });
    }
};


const sendConfirmationEmail = async (username, email) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "xs332000@gmail.com",
                pass: "ohej afzp plna vhlu",
            },
        });

        const mailOptions = {
            from: 'xs332000@gmail.com',
            to: email,
            subject: "Welcome to Instapic – Your Social Space ✨",
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #fafafa; padding: 30px;">
                <div style="max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <h2 style="color: #262626; text-align: center;">👋 Welcome to <span style="color:#E1306C;">Instapic</span>, ${username}!</h2>
                  <p style="color: #555; font-size: 16px; line-height: 1.5; text-align: center;">
                    Thank you for joining our community! Your account has been created successfully.
                  </p>
                  <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
                  <p style="color: #555; font-size: 15px; text-align: center;">
                    Start exploring, sharing moments, and connecting with others just like you.
                  </p>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://your-app-url.com" style="background-color: #E1306C; color: white; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: bold;">Go to your feed</a>
                  </div>
                  <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
                    This is an automated message. Please do not reply to this email.
                  </p>
                </div>
              </div>
            `,
          };
          

        await transporter.sendMail(mailOptions);
        console.log("Confirmation email sent to:", email);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, please check!",
                success: false,
            });
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        };

        const token = await jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1d' });

        const populatedPosts = await Promise.all(
            user.posts.map(async (postId) => {
                const post = await Post.findById(postId);
                if (post.author.equals(user._id)) {
                    return post;
                }
                return null;
            })
        )
        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts
        }
        return res.cookie('token', token, {
            httpOnly: true, secure: true,
            sameSite: 'none', maxAge: 1 * 24 * 60 * 60 * 1000
        }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user,
            token
        });

    } catch (error) {
        console.log(error);
    }
};
export const logout = async (_, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: 'Logged out successfully.',
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};
export const myProfile = async (req, res) => {
    try {
        const userId = req.id;


        let user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }


        let followingUsers = await User.find({ _id: { $in: user.following } })
            .select("_id username profilePicture");


        return res.status(200).json({
            success: true,

            following: followingUsers,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
};




export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).populate({ path: 'posts', createdAt: -1 }).populate('bookmarks');
        return res.status(200).json({
            user,
            success: true
        });
    } catch (error) {
        console.log(error);
    }
};

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const file = req.file;
        let cloudResponse;
        if (file) {

            const fileUri = getDataUri(file);
            cloudResponse = await cloudinary.uploader.upload(fileUri.content);
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
                success: false
            });
        }


        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (file) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: 'Profile updated.',
            success: true,
            user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Server error.',
            success: false
        });
    }
};




export const getSuggestedUsers = async (req, res) => {
    try {
        const currentUser = await User.findById(req.id);
        if (!currentUser) {
            return res.status(400).json({ message: "User not found" });
        }


        const suggestedUsers = await User.find({
            _id: { $nin: [...currentUser.following, req.id] },
        }).select("-password");

        if (suggestedUsers.length === 0) {
            return res.status(400).json({ message: "No new users to suggest" });
        }

        return res.status(200).json({
            success: true,
            users: suggestedUsers
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const followOrUnfollow = async (req, res) => {
    try {
        const followKrneWala = req.id;
        const jiskoFollowKrunga = req.params.id;
        if (followKrneWala === jiskoFollowKrunga) {
            return res.status(400).json({
                message: 'You cannot follow/unfollow yourself',
                success: false
            });
        }

        const user = await User.findById(followKrneWala);
        const targetUser = await User.findById(jiskoFollowKrunga);

        if (!user || !targetUser) {
            return res.status(400).json({
                message: 'User not found',
                success: false
            });
        }

        const isFollowing = user.following.includes(jiskoFollowKrunga);
        if (isFollowing) {

            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $pull: { following: jiskoFollowKrunga } }),
                User.updateOne({ _id: jiskoFollowKrunga }, { $pull: { followers: followKrneWala } }),
            ])
            return res.status(200).json({ message: 'Unfollowed successfully', success: true });
        } else {

            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $push: { following: jiskoFollowKrunga } }),
                User.updateOne({ _id: jiskoFollowKrunga }, { $push: { followers: followKrneWala } }),
            ])
            return res.status(200).json({ message: 'followed successfully', success: true });
        }
    } catch (error) {
        console.log(error);
    }
}


export const sendOTP = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        user.resetOTP = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: "xs332000@gmail.com",
                pass: "ohej afzp plna vhlu",
            }
        });

        const mailOptions = {
            from: "xs332000@gmail.com",
            to: user.email,
            subject: "🔒 Password Reset OTP",
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
                <div style="max-width: 600px; margin: auto; background: #fff; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                  <h2 style="color: #E1306C; text-align: center;">Reset Your Password</h2>
                  <p style="font-size: 16px; color: #333;">Hi ${user.username || "there"},</p>
                  <p style="font-size: 15px; color: #555;">
                    We received a request to reset your password. Use the OTP below to proceed:
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <span style="display: inline-block; background-color: #E1306C; color: white; font-size: 24px; padding: 12px 25px; border-radius: 6px; letter-spacing: 4px; font-weight: bold;">
                      ${otp}
                    </span>
                  </div>
                  <p style="font-size: 14px; color: #777;">
                    If you didn't request a password reset, you can safely ignore this email.
                  </p>
                  <p style="font-size: 12px; color: #aaa; text-align: center; margin-top: 40px;">
                    © ${new Date().getFullYear()} Instapic by Harsh. All rights reserved.
                  </p>
                </div>
              </div>
            `,
          };
          

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: "OTP sent to your email" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


export const forgotPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user || user.resetOTP !== otp || user.otpExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOTP = null;
        user.otpExpiry = null;

        await user.save();

        res.status(200).json({ success: true, message: "Password reset successful" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
