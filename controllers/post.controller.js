import sharp from "sharp";
import ffmpeg from 'fluent-ffmpeg';
import cloudinary from "cloudinary";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import getDataUri from "../utils/datauri.js";




export const addNewPost = async (req, res) => {
    try {

        const { caption } = req.body;

        const authorId = req.id;

        const file = req.file;
        const fileUrl = getDataUri(file);

        let option;

        const type = req.query.type;
        if (type === "reel") {
            option = {
                resource_type: "video",
            };
        } else {
            option = {
                resource_type: "image",
            };
        }

        const myCloud = await cloudinary.v2.uploader.upload(fileUrl.content, option);

        const post = await Post.create({
            caption,
            post: {
                id: myCloud.public_id,
                url: myCloud.secure_url,
            },
            author: authorId,
            type,
        });

        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({ path: 'author', select: '-password' });

        return res.status(201).json({
            message: 'New post added',
            post,
            success: true,
        });
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Server error", error: error.message })
    }
}
export const commentDelete = async (req, res) => {
    try {
        const { postId, commentId } = req.body;
        const userId = req.id; 
      
        const post = await Post.findById(postId);
        if(!post){
            return res.status(403).json({
                message: 'Post not found',
                success: false
            });
        }
        
       
      
        const comment = await Comment.findById(commentId);
        if(!comment){
            return res.status(403).json({
                message: 'Comment not found',
                success: false
            });
        }
     
       
        if (comment.author.toString() !== userId) {
            return res.status(403).json({
                message: 'You can only delete your own comments',
                success: false
            });
        }

        
        await Comment.findByIdAndDelete(commentId);

       
        post.comments = post.comments.filter(comment => comment.toString() !== commentId);
        await post.save();

        return res.status(200).json({
            message: 'Comment deleted successfully',
            success: true
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};


export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comments',
                sort: { createdAt: -1 },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
};
export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1 }).populate({
            path: 'author',
            select: 'username, profilePicture'
        }).populate({
            path: 'comments',
            sort: { createdAt: -1 },
            populate: {
                path: 'author',
                select: 'username, profilePicture'
            }
        });
        return res.status(200).json({
            posts,
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}
export const likePost = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        // like logic started
        await post.updateOne({ $addToSet: { likes: likeKrneWalaUserKiId } });
        await post.save();

       
        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');

        const postOwnerId = post.author.toString();
        if (postOwnerId !== likeKrneWalaUserKiId) {
            
            const notification = {
                type: 'like',
                userId: likeKrneWalaUserKiId,
                userDetails: user,
                postId,
                message: 'Your post was liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification', notification);
        }

        return res.status(200).json({ message: 'Post liked', success: true });
    } catch (error) {

    }
}
export const dislikePost = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

      
        await post.updateOne({ $pull: { likes: likeKrneWalaUserKiId } });
        await post.save();

       
        const user = await User.findById(likeKrneWalaUserKiId).select('username profilePicture');
        const postOwnerId = post.author.toString();
        if (postOwnerId !== likeKrneWalaUserKiId) {
            // emit a notification event
            const notification = {
                type: 'dislike',
                userId: likeKrneWalaUserKiId,
                userDetails: user,
                postId,
                message: 'Your post was liked'
            }
            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            io.to(postOwnerSocketId).emit('notification', notification);
        }



        return res.status(200).json({ message: 'Post disliked', success: true });
    } catch (error) {

    }
}
export const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const commentKrneWalaUserKiId = req.id;

        const { text } = req.body;

        const post = await Post.findById(postId);

        if (!text) return res.status(400).json({ message: 'text is required', success: false });

        const comment = await Comment.create({
            text,
            author: commentKrneWalaUserKiId,
            post: postId

        })

        await comment.populate({
            path: 'author',
            select: "username profilePicture"
        });

        post.comments.push(comment._id);
        await post.save();

        return res.status(201).json({
            message: 'Comment Added',
            comment,
            success: true
        })

    } catch (error) {
        console.log(error);
    }
};
export const getCommentsOfPost = async (req, res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({ post: postId }).populate('author', 'username profilePicture');

        if (!comments) return res.status(404).json({ message: 'No comments found for this post', success: false });

        return res.status(200).json({ success: true, comments });

    } catch (error) {
        console.log(error);
    }
}
export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });


        if (post.author.toString() !== authorId) return res.status(403).json({ message: 'Unauthorized' });


        await Post.findByIdAndDelete(postId);


        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() !== postId);
        await user.save();


        await Comment.deleteMany({ post: postId });

        return res.status(200).json({
            success: true,
            message: 'Post deleted'
        })

    } catch (error) {
        console.log(error);
    }
}
export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found', success: false });

        const user = await User.findById(authorId);
        if (user.bookmarks.includes(post._id)) {
            // already bookmarked -> remove from the bookmark
            await user.updateOne({ $pull: { bookmarks: post._id } });
            await user.save();
            return res.status(200).json({ type: 'unsaved', message: 'Post removed from bookmark', success: true });

        } else {
            // bookmark krna pdega
            await user.updateOne({ $addToSet: { bookmarks: post._id } });
            await user.save();
            return res.status(200).json({ type: 'saved', message: 'Post bookmarked', success: true });
        }

    } catch (error) {
        console.log(error);
    }
}