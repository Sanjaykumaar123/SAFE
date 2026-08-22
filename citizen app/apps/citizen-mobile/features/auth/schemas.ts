import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Enter your email or mobile number'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  phone: z.string().min(10, 'Enter a valid mobile number'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  city: z.string().min(2, 'Enter your city'),
  acceptedTerms: z.boolean().refine((value) => value === true, { message: 'You must accept the terms to continue' }),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, 'Enter your email or mobile number'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
