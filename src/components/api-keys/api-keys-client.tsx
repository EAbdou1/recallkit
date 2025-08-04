"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Key,
  RotateCw,
} from "lucide-react";
import { ApiKey } from "@/types";
import { deleteApiKey, regenerateApiKey } from "@/actions/api-keys";
import { useRouter } from "next/navigation";

interface ApiKeyCardProps {
  apiKey: ApiKey;
  onDelete: (id: string) => void;
  onRegenerate: (namespace: string, newKey: string) => void;
}

function ApiKeyCard({ apiKey, onDelete, onRegenerate }: ApiKeyCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const copyToClipboard = async () => {
    try {
      const textToCopy = isRevealed ? apiKey.key : maskApiKey(apiKey.key);
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const toggleReveal = () => {
    setIsRevealed((prev) => !prev);
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 12) return "••••••••••••••••••••••••••••••••";
    const prefix = key.substring(0, 8);
    const suffix = key.substring(key.length - 4);
    return `${prefix}${"•".repeat(24)}${suffix}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = async () => {
    const result = await deleteApiKey(apiKey.id);
    if (result.success) {
      onDelete(apiKey.id);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const result = await regenerateApiKey(apiKey.namespace);
      if (result.success && result.apiKey) {
        onRegenerate(apiKey.namespace, result.apiKey);
        setIsRevealed(true); // Automatically reveal the new key
      }
    } catch (error) {
      console.error("Failed to regenerate API key:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              {apiKey.name}
            </CardTitle>
            <CardDescription>
              Created {formatDate(apiKey.created)}
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
              <Badge
                variant={apiKey.status === "active" ? "default" : "secondary"}
              >
                {apiKey.status}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="text-blue-600 hover:text-blue-700"
                title="Regenerate API Key"
              >
                <RotateCw
                  className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive/90"
                title="Delete Namespace & API Key"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">API Key</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleReveal}
              className="h-auto p-1 text-xs"
            >
              {isRevealed ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Reveal
                </>
              )}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={isRevealed ? apiKey.key : maskApiKey(apiKey.key)}
              readOnly={true}
              disabled={false}
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {copied && (
            <p className="text-xs text-green-600">Copied to clipboard!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ApiKeysClientProps {
  apiKeys: ApiKey[];
}

export function ApiKeysClient({ apiKeys }: ApiKeysClientProps) {
  const router = useRouter();
  const [localApiKeys, setLocalApiKeys] = useState<ApiKey[]>(apiKeys);

  const handleDeleteApiKey = (id: string) => {
    setLocalApiKeys(localApiKeys.filter((key) => key.id !== id));
  };

  const handleRegenerateApiKey = (namespace: string, newKey: string) => {
    setLocalApiKeys(
      localApiKeys.map((key) =>
        key.namespace === namespace ? { ...key, key: newKey } : key
      )
    );
  };

  const handleCreateApiKey = () => {
    // Redirect to create namespace page since API keys are created with namespaces
    router.push("/new-namespace");
  };

  return (
    <div className="space-y-6 container mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for accessing RecallKit services
          </p>
        </div>
        <Button onClick={handleCreateApiKey}>
          <Plus className="h-4 w-4 mr-2" />
          Create Namespace
        </Button>
      </div>

      <div className="grid gap-4">
        {localApiKeys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
              <p className="text-muted-foreground text-center mb-4">
                You have not created any namespaces yet. Create your first
                namespace to get an API key and get started.
              </p>
              <Button onClick={handleCreateApiKey}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Namespace
              </Button>
            </CardContent>
          </Card>
        ) : (
          localApiKeys.map((apiKey) => (
            <ApiKeyCard
              key={apiKey.id}
              apiKey={apiKey}
              onDelete={handleDeleteApiKey}
              onRegenerate={handleRegenerateApiKey}
            />
          ))
        )}
      </div>

      <Card className=" shadow-none">
        <CardHeader>
          <CardTitle>API Key Guidelines</CardTitle>
          <CardDescription>
            Best practices for managing your API keys securely
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Keep your API keys secure and never share them publicly
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Use different API keys for different environments (development,
              staging, production)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Regularly rotate your API keys for enhanced security
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Monitor API key usage and deactivate unused keys
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
