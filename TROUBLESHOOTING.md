# 🔧 Troubleshooting Guide

## Error: `free(): invalid size` - Bot Crash on Sticker Command

### Symptom
```
Command: s, From: xxx, Chat: xxx
free(): invalid size
[nodemon] app crashed - waiting for file changes before starting...
```

### Root Cause
Native modules (`sharp` dan `wa-sticker-formatter`) tidak compatible dengan:
- OS version (Alpine Linux, musl libc)
- Node.js version mismatch
- Architecture (ARM vs x64)
- Missing system libraries

### Solution 1: Uninstall Native Modules (Recommended untuk Server Crash)

```bash
npm uninstall sharp wa-sticker-formatter
```

**Effect:**
- ✅ Bot tidak crash lagi
- ⚠️ Sticker akan transparan lagi (seperti sebelumnya)
- ✅ Semua command tetap jalan normal

### Solution 2: Install System Dependencies

**For Alpine Linux (common di Docker):**
```bash
apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev
npm rebuild sharp
npm rebuild wa-sticker-formatter
```

**For Ubuntu/Debian:**
```bash
apt-get update
apt-get install -y python3 build-essential libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev
npm rebuild sharp
npm rebuild wa-sticker-formatter
```

### Solution 3: Use Docker with Proper Base Image

**Dockerfile:**
```dockerfile
FROM node:22-bullseye  # Use bullseye instead of alpine

RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["npm", "start"]
```

### Solution 4: Check Node.js Version

```bash
node -v  # Should be v18+ for best compatibility

# If too old, upgrade:
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
```

---

## Current Fallback Behavior

File `src/utils/stickerHelper.js` sudah di-update dengan **safe fallback**:

```javascript
// If native modules fail to load:
1. Log warning
2. Return original buffer
3. Let Zapo handle processing (transparent sticker)
4. Bot continues running (NO CRASH)
```

**Test Native Modules:**
```bash
# Test if sharp works
node -e "import('sharp').then(() => console.log('sharp OK')).catch(e => console.log('sharp FAIL:', e.message))"

# Test if wa-sticker-formatter works
node -e "import('wa-sticker-formatter').then(() => console.log('wsf OK')).catch(e => console.log('wsf FAIL:', e.message))"
```

---

## Other Common Issues

### Issue: Bot keeps restarting
**Cause:** Nodemon watching too many files
**Fix:**
```json
// package.json
"nodemonConfig": {
  "ignore": ["sessions/*", "*.sqlite", "*.log"]
}
```

### Issue: Session keeps disconnecting
**Cause:** Multiple bot instances running
**Fix:**
```bash
# Kill all node processes
pkill -f node

# Or use PM2
pm2 delete all
pm2 start src/index.js --name bot
```

### Issue: High memory usage
**Cause:** Memory leak in command handlers
**Fix:**
- Add `--max-old-space-size=512` to node command
- Restart bot periodically (cron job)

---

## Recommended Server Setup

**For Production (No Native Modules):**
```bash
# Uninstall problematic packages
npm uninstall sharp wa-sticker-formatter

# Use Zapo native processing
# Sticker will be transparent but stable
```

**For Development (With Native Modules):**
```bash
# Install system dependencies first
# Then install npm packages
npm install

# If crash, run:
npm rebuild
```

---

## Files Modified for Safety

1. ✅ `src/utils/stickerHelper.js` - Lazy load + fallback
2. ✅ All sticker commands - Graceful degradation

**Safe Mode:**
- Native modules load on-demand
- If fail → fallback to Zapo
- No crash, just log warning
