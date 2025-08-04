import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";

// Import all your Inngest functions here.
// We will create the first one in a later step.
// e.g. import { processMemory } from "@/lib/recall/manager";

const functions = [
  // processMemory, // We'll add this later
];

// The serve handler runs your functions and handles all communication with Inngest.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  signingKey:
    process.env.INNGEST_SIGNING_KEY! ||
    process.env.INNGEST_SIGNING_KEY_FALLBACK!,
});
