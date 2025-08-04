import { RecallChatDemo } from "@/components/demo/recall-chat-demo";

export default function DemoPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">RecallKit Demo</h1>
        <p className="text-muted-foreground">
          Test your RecallKit API with this interactive chat demo. The AI will
          remember context from your conversations.
        </p>
      </div>
      <RecallChatDemo />
    </div>
  );
}
