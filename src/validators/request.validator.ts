import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.email().nonempty(),
  username: z.string().nonempty().trim(),
  password: z.string().trim().nonempty().min(3),
  role: z.string().optional(),
});

export const loginUserSchema = z.object({
  email: z.email().nonempty(),
  password: z.string().trim().nonempty().min(3),
});

export const userChangeCurrentPasswordSchema = z.object({
  oldPassword: z.string().min(3).nonempty("Old password is required"),
  newPassword: z.string().min(3).nonempty("New password is required"),
});

export const userForgotPasswordSchema = z.object({
  email: z.email().nonempty("Email is required"),
});

export const userResetForgotPasswordSchema = z.object({
  newPassword: z.string().min(3).nonempty("new password is required"),
});
