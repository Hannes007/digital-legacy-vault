import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .email("That email address doesn't look right — check it and try again");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name"),
  lastName: z.string().trim().min(1, "Enter your last name"),
  email: emailSchema,
  password: z
    .string()
    .min(12, "Use at least 12 characters — a short phrase works well")
    .max(128, "Use at most 128 characters"),
});

export const totpCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9-]{6,32}$/,
      "Enter the 6-digit code from your authenticator app, or a recovery code",
    ),
});

export const totpEnableSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;

/**
 * Runs a zod schema and returns a flat `field → first message` map,
 * suitable for inline form errors.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  values: unknown,
): { data: T; fieldErrors: null } | { data: null; fieldErrors: Record<string, string> } {
  const result = schema.safeParse(values);
  if (result.success) {
    return { data: result.data, fieldErrors: null };
  }
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return { data: null, fieldErrors };
}
