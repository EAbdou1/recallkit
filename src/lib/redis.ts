import { createClient } from "redis";

const client = createClient({
  username: process.env.REDIS_USERNAME || "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379, // Redis port (default: 6379)
  },
});

client.on("error", (err) => {
  console.error("Redis Client Error", err);
});

if (!client.isOpen) {
  client.connect();
}

export { client };
