import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const options = {
  httpOnly: true,
  secure: true,
};
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username,email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res
  const { username, fullName, email, password } = req.body;
  if (
    [username, fullName, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  console.log(req.body);
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  console.log("Existing user: ", existedUser);
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  console.log("req.files looks like: ", req.files);
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage.path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  console.log(avatarLocalPath);
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  //   if (coverImageLocalPath) {
  //   }
  if (!avatar) {
    throw new ApiError(400, "Avatar upload error");
  }
  console.log("avatar object from cloudinary :", avatar);
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });
  console.log("user from mongodb: ", user);
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }
  console.log("CreatedUser : ", createdUser);

  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req.body -> data
  // validate
  //find user and check password
  // access and refresh tokens
  // cookies

  const { email, username, password } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Email or Username is required");
  }
  if (!password) throw new ApiError(400, "Password is required");
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (!user) throw new ApiError(404, "User does not exist");
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-refreshToken -password"
  );
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User logout successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  // try {
  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken._id);
  if (!user) {
    throw new ApiError(401, "Refresh Token Invalid");
  }
  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh Token mismatch");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken,
        },
        "Access Token Refreshed"
      )
    );
  // } catch (error) {
  //   console.log(error);
  //   throw new ApiError(401, error?.message || "Code phat Gaya");
  // }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };

// this is my thinking of register logic, before watching the video
/* get user data
validate user data
get user files
check if user is registered before
save file temporarily on server
upload them on cloudinary
get cloudinary url
create a user in db and save it
return a response */

/* logic for login (my logic)
  get user details (email,password), validate
  check if user exists, and match password
  generate access token, refresh token 
  return response 
*/
