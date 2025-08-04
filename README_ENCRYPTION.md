# Encryption Setup

## Environment Variable

Add this to your `.env.local` file:

```bash
ENCRYPTION_KEY=your-secret-key-32-chars-long!!
```

## Important Notes

- The encryption key must be exactly 32 characters long
- In production, use a strong, randomly generated key
- Keep this key secure and never commit it to version control
- The same key must be used consistently to decrypt existing data

## Generate a Secure Key

You can generate a secure 32-character key using:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 16
```

## How It Works

- API keys are encrypted using AES-256-CBC before being stored in Redis
- Each encryption uses a unique initialization vector (IV) for security
- The encrypted data is stored permanently in Redis (no expiration)
- Real-time monitoring uses Redis Pub/Sub for instant updates
