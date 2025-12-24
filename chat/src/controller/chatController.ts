import TryCatch from "../tryCatch.js";

import type{ AuthenticatedRequest } from "../middlewares/isAuth.js";
import { Chat } from "../models/chat.js";
import { Messages } from "../models/messages.js";
import axios from "axios";
import dotenv from 'dotenv'
import { getRecieverSocketId, io } from "../config/socket.js";

dotenv.config()

// New chat -

export const createNewChat = TryCatch(async(req:AuthenticatedRequest, res)=>{
  const userId = req.user?._id;
  const {otherUserId} = req.body;

  if (!otherUserId) {
    res.status(400).json({
      message: "Other userId is required",
    });
    return;
  }

  const existingChat = await Chat.findOne({
    users: {$all: [userId, otherUserId], $size: 2},
  });
  if (existingChat) {
    res.json({
      message: "Chat already exists",
      chatId : existingChat._id,
    })
    return;
  }
  const newChat = Chat.create({
    users: [userId, otherUserId],
  });
  res.status(201).json({
    message:"New chat is created",
    chatId: (await newChat)._id,
  })
})

// All chat -

export const getAllChats = TryCatch(async (req: AuthenticatedRequest, res) =>{
  const userId = req.user?._id;
  if (!userId) {
    res.status(400).json({
      message: "User Id missing",
    });
    return;
  }

  const chats = await Chat.find({ users: userId }).sort({updatedAt: -1});
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization missing" });
  }

  const chatWithUserData = await Promise.all(
    chats.map(async (chat)=>{
      
     const otherUserId = chat.users.find(
     (id) => id.toString() !== userId.toString()
      );


      const unseenCount = await Messages.countDocuments({
        chatId: chat._id,
        sender: {$ne: userId},
        seen: false,
      });

    try {
      const { data } = await axios.get(
     `${process.env.USER_SERVICE}/api/users/single/${otherUserId}`, {
            headers: { Authorization: authHeader },
          }
    );
        return {
          user:data,
          chat: {
            ...chat.toObject(),
            latestMessage: chat.latestMessage || null,
            unseenCount,
          },
        };
      } catch (error:any) {
         console.error(
          "USER SERVICE ERROR:",
          error.response?.status,
          error.response?.data || error.message
        );
        return {
          user:{_id: otherUserId, name: "Unknown user"},
          chat: {
            ...chat.toObject(),
            latestMessage: chat.latestMessage || null,
            unseenCount,
          },
        }
      }
    })
  );

  res.json({
    chats:chatWithUserData,
  })
})

// Send text -
export const sendMessage = TryCatch(async (req: AuthenticatedRequest, res) =>{
  const senderId = req.user?._id;
  const { chatId, text } = req.body;
  const imageFile = req.file;

  if (!senderId) {
    res.status(401).json({
      message: "unauthorized"
    });
    return;
  }

  if (!chatId) {
    res.status(400).json({
      message: "chatId Required"
    });
    return;
  }

  if (!text && !imageFile) {
    res.status(400).json({
      message: "Either text or image is required"
    });
    return;
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    res.status(404).json({
      message: "Chat not found"
    });
    return;
  }

  const isUserInChat = chat.users.some(
    (userId)=>userId.toString() === senderId.toString()
  );
  if (!isUserInChat) {
    res.status(403).json({
      message: "You are not a part of this chat"
    });
    return;
  }

  const otherUserId = chat.users.find(
    (id) => id.toString() !== senderId.toString()
  );
  if (!otherUserId) {
    res.status(401).json({
      message: "No other user"
    });
    return;
  }
  // Socket set-up -
  const receiverSocketId = getRecieverSocketId(otherUserId.toString());
    let isReceiverInChatRoom = false;
  
    if (receiverSocketId) {
      const receiverSocket = io.sockets.sockets.get(receiverSocketId);
      if (receiverSocket && receiverSocket.rooms.has(chatId)) {
        isReceiverInChatRoom = true;
      }
    }

  let messageData: any = {
    chatId: chatId,
    sender: senderId,
    seen: isReceiverInChatRoom,
    seenAt: isReceiverInChatRoom? new Date(): undefined,
  };

  if (imageFile) {
    messageData.image = {
      url: imageFile.path,
      publicId: imageFile.filename,
    };
    messageData.messageType = "image";
    messageData.text = text || "";

  }
  else{
    messageData.text = text;
    messageData.messageType = "text"
  }

  const message = new Messages(messageData);

  const savedMessage = await message.save();

  const latestMessageText = imageFile ? "📷 Image" : text;

  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: {
      text: latestMessageText,
      sender: senderId,
    },
    updatedAt: new Date(),
  },{new:true});

  // emit to socket -
  io.to(chatId).emit("newMessage", savedMessage);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", savedMessage);
  }

  const senderSocketId = getRecieverSocketId(senderId.toString());
  if (senderSocketId) {
    io.to(senderSocketId).emit("newMessage", savedMessage);
  }

  if (isReceiverInChatRoom && senderSocketId) {
    io.to(senderSocketId).emit("messagesSeen", {
      chatId: chatId,
      seenBy: otherUserId,
      messageIds: [savedMessage._id],
    });
  }
  res.status(201).json({
    message:savedMessage,
    sender: senderId,
  })
});

// Get message by chat -
export const getMessageByChat = TryCatch(async (
  req: AuthenticatedRequest,
  res
) => {
  const userId = req.user?._id;
  const { chatId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!chatId) {
    return res.status(400).json({ message: "chatId required" });
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    return res.status(404).json({ message: "Chat not found" });
  }

  const isUserInChat = chat.users.some(
    (id) => id.toString() === userId.toString()
  );

  if (!isUserInChat) {
    return res.status(403).json({ message: "Not part of this chat" });
  }

  // Mark messages as seen

  const messagesToMarkSeen = await Messages.find({
        chatId: chatId,
        sender: { $ne: userId },
        seen: false,
      });
  await Messages.updateMany(
    {
      chatId,
      sender: { $ne: userId },
      seen: false,
    },
    {
      seen: true,
      seenAt: new Date(),
    }
  );

  const messages = await Messages.find({ chatId }).sort({ createdAt: 1 });

  const otherUserId = chat.users.find(
    (id) => id.toString() !== userId.toString()
  );

  if (!otherUserId) {
    return res.status(400).json({ message: "No other user" });
  }

  if (!process.env.USER_SERVICE) {
    throw new Error("USER_SERVICE not configured");
  }
  const authHeader = req.headers.authorization;

if (!authHeader) {
  return res.status(401).json({ message: "Authorization missing" });
}

  try {
    const { data } = await axios.get(
      `${process.env.USER_SERVICE}/api/users/single/${otherUserId}`, {
    headers: {
      authorization: authHeader,
    },
  }
    );
    if (!otherUserId) {
        res.status(400).json({
          message: "No other user",
        });
        return;
      }

      if (messagesToMarkSeen.length > 0) {
        const otherUserSocketId = getRecieverSocketId(otherUserId.toString());
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("messagesSeen", {
            chatId: chatId,
            seenBy: userId,
            messageIds: messagesToMarkSeen.map((msg) => msg._id),
          });
        }
      }


    res.json({ messages, user: data });
  } catch (error) {
    console.log(error);
    res.json({
      messages,
      user: { _id: otherUserId, name: "Unknown user" },
    });
  }
});
