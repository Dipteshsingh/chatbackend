import express from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db.js';
import {createClient} from 'redis';
import userRouter from './routes/userRouter.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import cors from 'cors'
dotenv.config();

connectDb();
connectRabbitMQ();
export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));

redisClient.connect()
  .then(() => console.log('✅ Connected to Redis'))
  .catch((error) => console.error('❌ Redis connection failed:', error));





const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://3.110.188.4:3001",
    ],
    credentials: true,
  })
);;

// routes --
app.use('/api/users', userRouter);

const port = process.env.PORT;

app.listen(port,()=>{
  console.log(`Server is running on port ${port}`);
  
})
