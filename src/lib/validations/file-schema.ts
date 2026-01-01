import { z } from "zod";

// Upload File Item Schema
export const uploadFileItemSchema = z.object({
  id: z.string(),
  file: z.instanceof(File),
  status: z.enum(["pending", "uploading", "completed", "error"]),
  progress: z.number(),
  error: z.string().optional(),
  url: z.string().optional(),
});

// Inferred type for UploadFileItem
export type UploadFileItem = z.infer<typeof uploadFileItemSchema>;
