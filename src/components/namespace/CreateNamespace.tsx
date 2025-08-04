"use client";

import { useActionState, useOptimistic } from "react";
import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createNamespace } from "@/actions/namespace";
import { CreateState, Namespace } from "@/types/namespace";
import ApiKeyDisplay from "@/components/namespace/ApiKeyDisplay";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

const initialState: CreateState = {
  message: "",
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating..." : "Create Namespace"}
    </Button>
  );
}

export default function CreateNamespace() {
  const [state, formAction] = useActionState(createNamespace, initialState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  // Optimistic update for namespaces
  const [, addOptimisticNamespace] = useOptimistic<Namespace[], Namespace>(
    [],
    (state: Namespace[], newNamespace: Namespace) => [...state, newNamespace]
  );

  useEffect(() => {
    // If successful, reset the form and keep the dialog open briefly to show the key
    if (state.newApiKey) {
      formRef.current?.reset();
      const timer = setTimeout(() => {
        setOpen(false);
        // Redirect to dashboard after successful creation
        router.push("/dashboard");
      }, 5000);
      return () => clearTimeout(timer);
    }
    // If there are errors, make sure the dialog is open to display them
    if (state.error || state.errors?.name) {
      setOpen(true);
    }
  }, [state, router]);

  const handleSubmit = (formData: FormData) => {
    const name = formData.get("name") as string;
    if (name) {
      // Add optimistic namespace
      const optimisticNamespace: Namespace = {
        name: name.toLowerCase().replace(/\s+/g, "-"),
        apiKey: "optimistic-key",
        createdAt: new Date().toISOString(),
      };
      addOptimisticNamespace(optimisticNamespace);
    }
    formAction(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          title="Create Namespace"
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Namespace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {state.newApiKey ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-green-600">
                  API Key Generated!
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Save this key. You won&apos;t see it again.
                </p>
              </div>
              <ApiKeyDisplay apiKey={state.newApiKey} />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Namespace:{" "}
                  <span className="font-medium">{state.namespace}</span>
                </p>
              </div>
            </div>
          ) : (
            <form ref={formRef} action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Namespace Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="my-awesome-project"
                  aria-describedby="name-error"
                />
                <div id="name-error" aria-live="polite" aria-atomic="true">
                  {state.errors?.name &&
                    state.errors.name.map((error: string) => (
                      <p className="text-sm text-red-500" key={error}>
                        {error}
                      </p>
                    ))}
                  {state.error && !state.errors?.name && (
                    <p className="text-sm text-red-500">{state.error}</p>
                  )}
                </div>
              </div>
              <SubmitButton />
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
