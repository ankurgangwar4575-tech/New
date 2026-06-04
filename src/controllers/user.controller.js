import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend(postman)
  // validation - not empty
  // check if user already exists : username,email
  // check for images,avatar
  // upload them to cloudinary,avatar
  // create user object and enter it in db
  // remove password nd refresh token field from response
  // check for user creation
  // return res

  const { userName, fullName, email, password } = req.body;
  if (
    [userName, fullName, email, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new apiError(400, "All fields are required");
  }

  const existsUser = User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existsUser) {
    throw new apiError(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });
  // this will take care when user is selected its password and refresh token are not selected
  const foundUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!foundUser) {
    throw new apiError(500, "Something went wrong while registering user");
  }
  return res
    .status(201)
    .json(new apiResponse(200, foundUser, "User registered successfully"));
});

export default registerUser;
