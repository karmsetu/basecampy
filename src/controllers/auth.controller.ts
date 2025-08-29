import { asyncHandler } from "../utils/asyncHandler";
import {
  loginUserSchema,
  registerUserSchema,
  userChangeCurrentPasswordSchema,
  userForgotPasswordSchema,
  userResetForgotPasswordSchema,
} from "../validators/request.validator";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../utils/mail";
import { ApiResponse } from "../utils/ApiResponse";
import type { CookieOptions } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user?.generateAccessToken();
    const refreshToken = user?.generateRefreshToken();

    user!.refreshToken = refreshToken;
    await user?.save();
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "something went wrong while generating tokens");
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const validatedResult = await registerUserSchema.safeParseAsync(req.body);
  if (validatedResult.error)
    throw new ApiError(400, validatedResult.error.message, [
      validatedResult.error,
    ]);

  const { email, username, password, role } = validatedResult.data;
  // check if user exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser)
    throw new ApiError(409, "user with same email or username already", []);

  const user = await User.create({
    email,
    password,
    username,
    isEmailVerified: false,
  });

  const { hashedToken, tokenExpiry, unHashedToken } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry as unknown as Date;

  await user.save({ validateBeforeSave: false });

  sendEmail({
    email: user.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
    ),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  if (!createdUser)
    throw new ApiError(500, "something went wrong while registering user");

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "user registered successfully and verification email has been sent",
      ),
    );
});

export const login = asyncHandler(async (req, res) => {
  const validatedResult = await loginUserSchema.safeParseAsync(req.body);
  if (validatedResult.error)
    throw new ApiError(
      400,
      validatedResult.error.message,
      [validatedResult.error],
      validatedResult.error.stack,
    );

  const { email, password } = validatedResult.data;
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(400, "user doesn't exist");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(400, "Invalid Credentials");

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",
  );

  const options: CookieOptions = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("access-token", accessToken, options)
    .cookie("refresh-token", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully",
      ),
    );
});

export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: "",
      },
    },
    { new: true }, //once everything is done give me the newest object
  );

  const options: CookieOptions = { httpOnly: true, secure: true };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successfully"));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const verificationToken = req.params["verificationToken"];
  if (!verificationToken)
    throw new ApiError(400, "Invalid Verification Token OR Missing");

  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user)
    throw new ApiError(400, "Email Verification code is Invalid or Expired");

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email is Verified"));
});

export const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) throw new ApiError(404, "User Doesn't Exist");
  if (user.isEmailVerified) throw new ApiError(409, "User is Already Verified");

  const { hashedToken, tokenExpiry, unHashedToken } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry as unknown as Date;

  await user.save({ validateBeforeSave: false });

  sendEmail({
    email: user.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Mail has been sent to your Email ID"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) new ApiError(401, "Unauthorised");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET!,
    ) as jwt.JwtPayload;
    const user = await User.findById(decodedToken?._id);
    if (!user) throw new ApiError(401, "Invalid UserID");

    if (incomingRefreshToken !== user.refreshToken)
      throw new ApiError(401, "Invalid Refresh Token");

    const options: CookieOptions = { httpOnly: true, secure: true };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Redresh",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid Refresh Token", [error as Error]);
  }
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const validatedResult = await userForgotPasswordSchema.safeParseAsync(
    req.body,
  );
  if (validatedResult.error)
    throw new ApiError(400, validatedResult.error.message, [
      validatedResult.error,
    ]);

  const { email } = validatedResult.data;

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User with this Email not Found");

  const { hashedToken, tokenExpiry, unHashedToken } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry as unknown as Date;

  await user.save({ validateBeforeSave: false });

  sendEmail({
    email: user.email,
    subject: "Password Reset Request",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.FORGOT_PASSWORD_REDIRECT_URL!}/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password Reset Mail Has been Sent to your email ID",
      ),
    );
});

export const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const validatedResult = await userResetForgotPasswordSchema.safeParseAsync(
    req.body,
  );
  if (validatedResult.error)
    throw new ApiError(400, validatedResult.error.message, [
      validatedResult.error,
    ]);
  const { newPassword } = validatedResult.data;

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) throw new ApiError(489, "Token IS Invalid or Expired");

  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Reset Successfully"));
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const validatedResult = await userChangeCurrentPasswordSchema.safeParseAsync(
    req.body,
  );
  if (validatedResult.error)
    throw new ApiError(400, validatedResult.error.message, [
      validatedResult.error,
    ]);
  const { oldPassword, newPassword } = validatedResult.data;

  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User with this ID not found");

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) throw new ApiError(404, "Invalid Password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully"));
});
