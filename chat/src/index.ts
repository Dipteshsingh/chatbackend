import express from 'express'
import dotenv from 'dotenv'
import connectDb from './config/db.js';
import chatRouter from './routes/chatRoutes.js';
import cors from 'cors'
import { app, server } from './config/socket.js';
dotenv.config();

connectDb();

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://3.110.188.4:3001",
    ],
    credentials: true,
  })
);
const port = process.env.PORT || 5001;

app.use('/api/chat', chatRouter);

server.listen(port,()=>{
  console.log(`Server is running on port ${port}`);
  
})
