import express from 'express'
import dotenv from 'dotenv'
import connectDb from './config/db.js';
import chatRouter from './routes/chatRoutes.js';
import cors from 'cors'
import { app, server } from './config/socket.js';
dotenv.config();

connectDb();
const allowedOrigins = ["http://localhost:3000", "http://52.66.68.225:3000", "http://52.66.68.225:3002"];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());
const port = process.env.PORT || 5001;

app.use('/api/chat', chatRouter);

server.listen(port,()=>{
  console.log(`Server is running on port ${port}`);
  
})
