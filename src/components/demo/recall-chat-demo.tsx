"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, User, Bot, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function RecallChatDemo() {
  const [apiKey, setApiKey] = useState("");
  const [userId, setUserId] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfigure = () => {
    if (apiKey.trim() && userId.trim()) {
      setIsConfigured(true);
    }
  };

  const handleReset = () => {
    setIsConfigured(false);
    setApiKey("");
    setUserId("");
    setMessages([]);
    setInput("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/demo/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          userId,
          apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;

        if (value) {
          const chunk = new TextDecoder().decode(value);
          // Since the backend uses toTextStreamResponse(), it's just plain text chunks
          // No need for complex parsing - just append the chunk directly
          if (chunk) {
            setMessages((prev) => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage && lastMessage.role === "assistant") {
                lastMessage.content += chunk;
              }
              return updated;
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Configure Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
              RecallKit API Key
            </label>
            <Input
              id="apiKey"
              type="text"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="userId" className="block text-sm font-medium mb-2">
              End-User ID
            </label>
            <Input
              id="userId"
              placeholder="e.g., user-alice-123"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This represents one of your app&apos;s end-users. Each user ID
              will have separate memories stored.
              <br />
              <strong>Note:</strong> Avoid special characters (•, ™, etc.) to
              prevent encoding issues.
            </p>
          </div>
          <Button
            onClick={handleConfigure}
            disabled={!apiKey.trim() || !userId.trim()}
            className="w-full"
          >
            Start Demo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>RecallKit Chat Demo</CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary">End-User: {userId}</Badge>
                <Badge variant="outline">
                  API Key: {apiKey.slice(0, 8)}...
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <div className="flex flex-col h-[600px]">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    Start a conversation to test RecallKit memory functionality!
                  </p>
                  <p className="text-sm mt-2">
                    Try talking about preferences, interests, or facts about
                    this user. Then refresh the page and use the same User ID to
                    see if the AI remembers!
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              )}
            </ScrollArea>

            {/* Error Display */}
            {error && (
              <div className="p-4 pt-0">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Input Form */}
            <div className="p-4 border-t">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Try different end-user IDs to see how memories are separated
                per user!
                <br />
                <strong>Tip:</strong> Avoid special characters (•, ™, etc.) in
                messages to prevent encoding issues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
