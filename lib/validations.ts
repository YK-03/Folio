import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer');

export const SignupSchema = z.object({
  email,
  password,
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const SigninSchema = z.object({ email, password });
export type SigninInput = z.infer<typeof SigninSchema>;

export const CreateNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  content: z.string().optional().default(''),
  tagNames: z.array(z.string()).optional().default([]),
});
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = CreateNoteSchema.partial();
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

export const NoteQuerySchema = z.object({
  search: z.string().optional(),
  tag: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => {
      if (typeof val === 'string') return [val];
      return val;
    })
    .optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});
export type NoteQuery = z.infer<typeof NoteQuerySchema>;

export const CreateTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name cannot exceed 50 characters'),
});
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
