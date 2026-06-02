import dotenv from "dotenv";
import connectDB from "./src/db/db.js";

dotenv.config({
    path:"./env"
});

connectDB();