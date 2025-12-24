import e from "express";
import { publishToQueue } from "../config/rabbitmq.js";
import { redisClient } from "../index.js";
import TryCatch from "../tryCatch.js"
import { User } from "../model/user.js";
import { generateToken } from "../config/token.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";


// Login User 
export const loginUser = TryCatch(async (req,res)=>{
  const {email} = req.body;

  const rateLimitKey = `otp:ratelimit:${email}`;
  const ratelimit = await redisClient.get(rateLimitKey)

  if (ratelimit) {
    res.status(429).json({
      message:"Too many requests, please wait before requesting new otp"
    });
    return;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpKey = `otp:${email}`
  await redisClient.set(otpKey, otp, {
    EX:300,
  });

  await redisClient.set(rateLimitKey, "true", {
    EX:60,
  });

  const message = {
    to:email,
    subject:"Your otp code",
    body:`Your OTP is ${otp}. It is valid for 5 minutes.`

  };

  await publishToQueue("send-otp", message);
  res.status(200).json({
    message:"OTP sent to your mail"
  });
});

// Verify User 

export const verifyUser = TryCatch(async (req,res)=>{
  const {email, otp: enteredOtp} = req.body;
  if (!email || !enteredOtp) {
    res.status(400).json({
      message:"Email and OTP required"
    });
    return;
  }

  const otpKey = `otp:${email}`;
  const storedOtp = await redisClient.get(otpKey);

  if (!storedOtp || storedOtp !== enteredOtp) {
    res.status(400).json({
      message:"Invalid or Expired OTP"
    });
    return;
  }

  await redisClient.del(otpKey);

  let user = await User.findOne({email})

  if (!user) {
    const name = email.slice(0,8);
    user = await User.create({name, email});
  }

  const token = generateToken(user);

  res.json({
    message: "User verified",
    user,
    token
  });

});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res)=>{
  const user = req.user;
  res.json(user);
});

export const updateUser = TryCatch(async (req: AuthenticatedRequest, res)=>{
  const user = await User.findById(req.user?._id);

  if (!user) {
    res.status(404).json({
      message:"Please login",
    });
    return;
  }

  user.name = req.body.name;
  await user.save();

  const token = generateToken(user);
  res.json({
    message:"User updated",
    user,
    token
  })
});

export const getAllUsers = TryCatch(async (req: AuthenticatedRequest, res)=>{
  const users = await User.find({}, "-password");

  res.json(users);
});

export const getSingleUser = TryCatch(async (req, res)=>{
  const user =  await User.findById(req.params.id).select("-password");

  res.json(user);
});
