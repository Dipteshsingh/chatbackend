import express from 'express'
import { createNewChat, getAllChats, getMessageByChat, sendMessage } from '../controller/chatController.js';
import isAuth from '../middlewares/isAuth.js';
import { upload } from '../middlewares/multer.js';

const chatRouter = express.Router();

chatRouter.post('/newchat',isAuth, createNewChat);
chatRouter.get('/chat',isAuth, getAllChats);
chatRouter.post('/message',isAuth, upload.single('image'), sendMessage);
chatRouter.get('/message/:chatId',isAuth, getMessageByChat);

export default chatRouter;