import { asyncHandler } from "../utils/asyncHandler";
import { registerUserSchema } from "../validators/request.validator";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model";
import { emailVerificationMailgenContent, sendEmail } from "../utils/mail";
import { ApiResponse } from "../utils/ApiResponse";

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
