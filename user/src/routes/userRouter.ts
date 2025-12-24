import express from 'express';
import { getAllUsers, getSingleUser, loginUser, myProfile, updateUser, verifyUser } from '../controllers/userController.js';
import { isAuth } from '../middleware/isAuth.js';

const userRouter = express.Router();

userRouter.post('/login',loginUser);

userRouter.post('/verify',verifyUser);

userRouter.post('/update',isAuth,updateUser);

userRouter.get('/me',isAuth, myProfile);

userRouter.get('/all', getAllUsers);

userRouter.get('/single/:id',isAuth, getSingleUser);

export default userRouter;