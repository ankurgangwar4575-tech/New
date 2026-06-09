import User from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");
    if (!token) {
      throw new apiError(401, "Unauthorized request");
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(401, "Invalid Access Token");
    }
    req.user = user; // for logout
    next();
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid access token");
  }
});

export { verifyJWT };
