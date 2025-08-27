import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.email().nonempty(),
  username: z.string().nonempty().trim(),
  password: z.string().trim().nonempty().min(3),
  role: z.string().optional(),
});
