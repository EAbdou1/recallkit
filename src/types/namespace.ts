import { z } from "zod";

export const CreateNamespaceSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long." })
    .max(50, { message: "Name must be 50 characters or less." }),
});

export interface Namespace {
  name: string;
  apiKey: string; // The hashed API key
  createdAt: string;
}

// Define the structure for the user's data stored in Redis
export interface UserData {
  namespaces: Namespace[];
  currentNamespace?: string; // The name of the currently selected namespace
}

// Define the return type for the create action
export interface CreateState {
  error?: string;
  errors?: {
    name?: string[];
  };
  newApiKey?: string;
  namespace?: string;
  message?: string;
}
