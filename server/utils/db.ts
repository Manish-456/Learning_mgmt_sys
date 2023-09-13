import dotenv from 'dotenv';
dotenv.config();
import mongoose from "mongoose";

const dbUrl = process.env.DB_URL as string;

const connectDB = async() => {
  try {
    const data = await mongoose.connect(dbUrl);
     console.log(`Database connected with ${data.connection.host}`)
  } catch (error: any) {
     console.error(error.message);
  }
}

export default connectDB;
