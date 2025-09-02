# 🚀 Quick Start Guide

## Environment Setup Complete! ✅

Your `.env` file has been created with all the necessary configuration variables.

## Next Steps:

### 1. **Initialize the Database**
```bash
# Quick fix - run the database test script
./scripts/test-database.sh

# OR manually:
npx prisma generate
npx prisma db push --force-reset
```

**If you get "Unable to open database file" error:**
```bash
# Use absolute path in .env
DATABASE_URL="file:/workspaces/RemoteVulscan/db/custom.db"
```

### 2. **Configure Turnstile (Optional but Recommended)**
1. Visit [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/)
2. Create a new site and get your keys
3. Update your `.env` file:
   ```env
   TURNSTILE_SITE_KEY="your-actual-site-key"
   TURNSTILE_SECRET_KEY="your-actual-secret-key"
   ```

### 3. **Start the Development Server**
```bash
pnpm dev
# or
npm run dev
```

### 4. **Access Your Application**
- Open [http://localhost:3000](http://localhost:3000)
- The application should now load without database errors

## Environment Variables Explained:

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | SQLite database path | ✅ Yes |
| `TURNSTILE_SITE_KEY` | Cloudflare CAPTCHA public key | ⚠️ Recommended |
| `TURNSTILE_SECRET_KEY` | Cloudflare CAPTCHA private key | ⚠️ Recommended |
| `NEXT_PUBLIC_ENABLE_SOCKET` | Enable real-time updates | ⚠️ Optional |
| `NODE_ENV` | Application environment | ⚠️ Optional |

## Troubleshooting:

### Database Issues:
```bash
# If you get database errors, try:
rm -rf db/custom.db
pnpm prisma db push
```

### Environment Not Loading:
```bash
# Restart your development server after editing .env
```

### Need Help?
- Check the `CLEANUP_SUMMARY.md` for detailed changes made
- Review the `.env.example` file for reference values
- Ensure all file permissions are correct with: `chmod +x scripts/*.sh`
