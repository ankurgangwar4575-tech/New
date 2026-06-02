import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

async function connectDB(){
try{
  const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
   console.log(`MongoDB connected !! DB:Host ${connectionInstance.connection.host}`);
}
   catch (e){
    console.log("Error connecting to database",e);
    process.exit(1);
   }
}
export default connectDB;