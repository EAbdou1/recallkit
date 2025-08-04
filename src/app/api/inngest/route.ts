import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { processMemory } from "@/lib/recall";

// All Inngest functions for the RecallKit system
const functions = [processMemory];

// The serve handler runs your functions and handles all communication with Inngest.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  //   signingKey:
  //     process.env.INNGEST_SIGNING_KEY! ||
  //     process.env.INNGEST_SIGNING_KEY_FALLBACK!,
});
