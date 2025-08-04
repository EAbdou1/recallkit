import { createClient } from "redis";

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || "11717"),
  },
  password: process.env.REDIS_PASSWORD || "",
  username: process.env.REDIS_USERNAME || "default",
});

client.on("error", (err) => console.log("Redis Client Error", err));

if (!client.isOpen) {
  client.connect();
}

export { client };
