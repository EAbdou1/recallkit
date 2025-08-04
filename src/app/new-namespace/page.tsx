import CreateNamespace from "@/components/namespace/CreateNamespace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewNamespacePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to RecallKit</CardTitle>
          <CardDescription>
            Let&apos;s get started by creating your first namespace. This will
            help organize your API keys and data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <CreateNamespace />
        </CardContent>
      </Card>
    </div>
  );
}
