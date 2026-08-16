import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional(),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export type User = z.infer<typeof UserSchema>;
