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

const allowedOrigins = [
  // "http://localhost:3000",
  "http://3.110.188.4:3000",
  "http://3.110.188.4:3001"
];

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

app.use(express.json());


// routes --
app.use('/api/users', userRouter);

const port = process.env.PORT;

app.listen(port,()=>{
  console.log(`Server is running on port ${port}`);
  
})
