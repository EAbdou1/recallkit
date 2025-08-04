"use server";

import { setCurrentNamespace } from "./namespace";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function switchNamespace(namespaceName: string) {
  const success = await setCurrentNamespace(namespaceName);

  if (success) {
    revalidatePath("/dashboard");
    redirect("/dashboard");
  } else {
    throw new Error("Failed to switch namespace");
  }
}
