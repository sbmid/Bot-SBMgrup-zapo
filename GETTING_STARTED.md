# Getting Started - SBMgrup

Quick start guide untuk menjalankan SBMgrup WhatsApp Multi-Session Bot.

## Prerequisites

1. **Node.js** >= 20.9.0
   - Download: https://nodejs.org/

2. **FFmpeg** (untuk VoIP dan media processing)
   ```powershell
   # Using Chocolatey
   choco install ffmpeg
   
   # Or download from: https://ffmpeg.org/download.html
   ```

## Installation Steps

### 1. Install Dependencies

```bash
cd "C:\Users\HP\Downloads\PROJEK\BOT WA ZAPO"
npm install
```

### 2. Configure Environment

File `.env` sudah dibuat dengan default values. Edit jika perlu:

```env
PORT=3000
HOST=0.0.0.0
BASE_URL=http://localhost:3000
LOG_LEVEL=info
SESSIONS_PATH=./sessions
WEBHOOK_SECRET=zapo-webhook-secret-change-this
NODE_ENV=development
```

### 3. Start Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### 4. Open Dashboard

Buka browser dan akses:
```
http://localhost:3000
```

## Quick Usage Guide

### Create Session

1. Go to Dashboard (`http://localhost:3000`)
2. Click **"Create Session"**
3. Enter session ID (e.g., `session1`)
4. Click **Create**

### Connect WhatsApp

1. Go to **Sessions** page
2. Click **View** on your session
3. Click **Connect** button
4. **Scan QR code** with WhatsApp:
   - WhatsApp → Settings → Linked Devices → Link a Device
5. Wait for "connected" status

### Send Message

1. From session detail, click **"Send Message"**
2. Enter recipient JID or use phone number helper
3. Type message
4. Click **Send**

### Configure Webhook

1. From session detail, click **"Configure Webhook"**
2. Enter your webhook URL (must be HTTPS)
3. Select events to forward
4. Optional: Add secret key for signature validation
5. Click **Save**

## Features Overview

### ✅ Multi-Session
- Manage multiple WhatsApp accounts
- Each session has isolated storage
- Independent connection status

### ✅ Messaging
- Send text messages
- Send media (images, videos, documents)
- Extended text with link preview
- Read receipts

### ✅ Groups
- List all groups
- View group details
- Create new groups
- Add/remove participants
- Promote/demote admins
- Leave groups

### ✅ Webhooks
- Forward events to your server
- Signature validation support
- Configurable event filters
- Real-time event forwarding

### ✅ VoIP (Voice Calls)
- Make outgoing calls
- Accept/reject incoming calls
- End active calls
- (Requires FFmpeg)

### ✅ Web Dashboard
- Mobile-first responsive design
- Simple white/black theme
- No unnecessary elements
- Icon-based UI (no emoji)

## API Endpoints

Complete API documentation available in `README.md`.

Quick reference:

```http
# Create session
POST /api/sessions
Body: { "sessionId": "session1" }

# Connect session
POST /api/sessions/session1/connect

# Get QR code
GET /api/sessions/session1/qr

# Send message
POST /api/sessions/session1/send-message
Body: { "to": "628xxx@s.whatsapp.net", "message": "Hello!" }

# List groups
GET /api/sessions/session1/groups

# Configure webhook
POST /api/sessions/session1/webhook
Body: { "url": "https://...", "events": ["message"], "secret": "..." }
```

## Mobile Usage

Dashboard dirancang **mobile-first** untuk kemudahan penggunaan di HP:

- ✅ Responsive layout
- ✅ Touch-friendly buttons
- ✅ Clean interface
- ✅ Fast loading
- ✅ Minimal data usage

## Troubleshooting

### Session won't connect

```bash
# Delete session folder and re-pair
Remove-Item -Recurse -Force .\sessions\session1
```

Then create new session and scan QR again.

### Port already in use

Change port in `.env`:
```env
PORT=3001
```

### FFmpeg not found

```bash
# Check if FFmpeg is installed
ffmpeg -version

# If not found, install it
choco install ffmpeg
```

### Webhook not working

1. Check webhook URL is accessible
2. Verify events are selected
3. Check server logs for errors
4. Test with tools like webhook.site

## Project Structure

```
BOT WA ZAPO/
├── src/
│   ├── index.js                 # Main server
│   ├── routes/                  # API & web routes
│   ├── controllers/             # Request handlers
│   └── services/                # Business logic
├── views/                       # EJS templates
│   ├── index.ejs               # Dashboard
│   ├── sessions.ejs            # Sessions list
│   ├── session-detail.ejs      # Session detail + QR
│   ├── send-message.ejs        # Send message UI
│   ├── groups.ejs              # Groups management
│   ├── webhooks.ejs            # Webhook config
│   └── voip.ejs                # VoIP interface
├── public/
│   ├── css/style.css           # Global styles
│   └── js/app.js               # Frontend utilities
├── sessions/                    # Session data (auto-created)
├── ZAPO_DOCUMENTATION.md        # Complete API docs
├── PROJECT_STRUCTURE.md         # Architecture docs
├── README.md                    # Full documentation
└── package.json
```

## Next Steps

1. ✅ **Create your first session**
2. ✅ **Connect WhatsApp**
3. ✅ **Send test message**
4. ✅ **Configure webhook** (optional)
5. ✅ **Explore group management**
6. ✅ **Try VoIP features** (if FFmpeg installed)

## Documentation

- **Quick Start**: This file (`GETTING_STARTED.md`)
- **Full Documentation**: `README.md`
- **API Reference**: `ZAPO_DOCUMENTATION.md`
- **Architecture**: `PROJECT_STRUCTURE.md`

## Support

Untuk pertanyaan atau issue:
1. Check documentation files
2. Review error messages in terminal
3. Check browser console for frontend errors

## Production Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start src/index.js --name sbmgrup
pm2 save
pm2 startup
```

### Environment

Update `.env` for production:
```env
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com
LOG_LEVEL=warn
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Security Notes

- ✅ Change `WEBHOOK_SECRET` in production
- ✅ Use HTTPS for webhook URLs
- ✅ Validate webhook signatures
- ✅ Don't expose session folders publicly
- ✅ Use strong session IDs
- ✅ Keep dependencies updated

## Credits

- **Zapo-JS**: https://zapo.to
- **Authors**: vinikjkkj, edgardmessias, w3nder
- **Bot Name**: SBMgrup

---

**Ready to go! 🚀**

Start with: `npm install && npm run dev`
