import express from 'express'
import dotenv from 'dotenv'
import { startSendOtpConsumer } from './consumer.js';

dotenv.config();

const app = express();
app.use(express.json());

startSendOtpConsumer();
const port = process.env.PORT || 5000

app.listen(port,()=>{
  console.log(`Server is running on port ${port}`);
  
})