export interface ApiKey {
  id: string;
  name: string;
  key: string; // The plain API key (masked for security)
  hashedKey: string; // The hashed version stored in Redis
  created: string;
  lastUsed: string | null;
  status: "active" | "inactive";
  namespace: string;
}
