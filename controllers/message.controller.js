import {Conversation} from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import {Message} from "../models/message.model.js"
// for chatting
export const sendMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const {textMessage:message} = req.body;
      
        let conversation = await Conversation.findOne({
            participants:{$all:[senderId, receiverId]}
        });
        // establish the conversation if not started yet.
        if(!conversation){
            conversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        };
        const newMessage = await Message.create({
            senderId,
            receiverId,
            message
        });
        if(newMessage) conversation.messages.push(newMessage._id);

        await Promise.all([conversation.save(),newMessage.save()])

        // implement socket io for real time data transfer
        const receiverSocketId = getReceiverSocketId(receiverId);
        if(receiverSocketId){
            io.to(receiverSocketId).emit('newMessage', newMessage);
        }

        return res.status(201).json({
            success:true,
            newMessage
        })
    } catch (error) {
        console.log(error);
    }
}
export const getMessage = async (req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const conversation = await Conversation.findOne({
            participants:{$all: [senderId, receiverId]}
        }).populate('messages');
        if(!conversation) return res.status(200).json({success:true, messages:[]});

        return res.status(200).json({success:true, messages:conversation?.messages});
        
    } catch (error) {
        console.log(error);
    }
}
export const deleteMessage = async (req, res) => {
    try {
      const userId = req.id;
      const messageId = req.params.id;
  
      const message = await Message.findById(messageId);
  
      if (!message) {
        return res.status(404).json({ success: false, message: "Message not found" });
      }
  
      if (message.senderId.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
  
     
      await Message.findByIdAndDelete(messageId);
  
     
      await Conversation.updateOne(
        { participants: { $all: [message.senderId, message.receiverId] } },
        { $pull: { messages: messageId } }
      );
  
     
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId });
      }
  
     
      res.status(200).json({
        success: true,
        message: "Message deleted successfully",
        messageId
      });
    } catch (error) {
      console.error("Delete message error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };