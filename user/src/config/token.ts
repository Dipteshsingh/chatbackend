import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config();

const jwtSecretKey = process.env.JWT_SECRET_KEY as string;

export const generateToken = (user: any) =>{
  return jwt.sign({user}, jwtSecretKey, {expiresIn:"15d"})
}