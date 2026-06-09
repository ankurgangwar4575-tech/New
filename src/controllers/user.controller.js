import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import User from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

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

  const existsUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existsUser) {
    throw new apiError(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover image is required");
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

const loginUser = asyncHandler(async (req, res) => {
  // get data from body
  // check data (username,email)
  // find the user
  // password check
  // access and refresh token
  // send cookies
  const { email, userName, password } = req.body;
  if (!email && !userName) {
    throw new apiError(400, "Username or email is required");
  }
  const findUser = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (!findUser) {
    throw new apiError(404, "User does not exist");
  }
  const isPasswordValid = await findUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apiError(401, "Password is invalid");
  }
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshTokens(findUser._id);
  const loggedInUser = await User.findById(findUser._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const id = req.user._id;
  // two ways
  // const user = await User.findById(id);
  // user.refreshToken = null;
  await User.findByIdAndUpdate(
    id,
    {
      $set: { refreshToken: null },
    },
    {
      new: true,
    }
  );
  const options = { httpOnly: true, secure: true };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "Session expired, please login again");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new apiError(401, "Invalid RefreshToken");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apiError(401, "Invalid Refresh Token");
    }
    const options = { httpOnly: true, secure: true };
    const { newAccessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
          "AccessTokens refreshed successfully"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid RefreshToken");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
