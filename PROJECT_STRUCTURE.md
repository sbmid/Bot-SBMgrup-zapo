# Project Structure Documentation

## Overview

Proyek ini adalah **Multi-Session WhatsApp Bot** dengan web dashboard dan webhook support menggunakan Zapo-JS. Arsitektur menggunakan modular design dengan separation of concerns.

## Directory Structure

```
BOT WA ZAPO/
├── src/                         # Source code
│   ├── index.js                 # ⚡ Main entry point - HTTP server
│   ├── routes/                  # 🛣️  Route definitions
│   │   ├── api.js              # REST API endpoints
│   │   └── web.js              # Web page routes
│   ├── controllers/             # 🎮 Request handlers
│   │   ├── sessionController.js # Session CRUD operations
│   │   ├── messageController.js # Send messages & receipts
│   │   ├── groupController.js   # Group management
│   │   ├── profileController.js # Profile operations
│   │   └── voipController.js    # Voice call operations
│   ├── services/                # 🔧 Business logic
│   │   └── SessionManager.js    # Multi-session handler & event forwarding
│   └── utils/                   # 🛠️  Helper functions
├── views/                       # 🎨 EJS templates (1 file = 1 page)
│   ├── index.ejs               # Dashboard home
│   ├── sessions.ejs            # Sessions list
│   ├── session-detail.ejs      # Session detail & QR
│   ├── send-message.ejs        # Message sender
│   ├── groups.ejs              # Group management
│   ├── webhooks.ejs            # Webhook configuration
│   └── voip.ejs                # VoIP call interface
├── public/                      # 📦 Static assets
│   ├── css/
│   │   └── style.css           # Global styles
│   └── js/
│       └── app.js              # Frontend JavaScript
├── sessions/                    # 💾 Session data (auto-generated)
│   └── [sessionId]/
│       └── state.sqlite        # Auth & message store per session
├── ZAPO_DOCUMENTATION.md        # 📚 Complete Zapo API docs
├── PROJECT_STRUCTURE.md         # 📋 This file
├── README.md                    # 🚀 Quick start guide
├── package.json
├── .env                         # 🔐 Environment config
├── .env.example
└── .gitignore
```

## Component Responsibilities

### 1. `src/index.js` - Application Entry Point

**Tugas:**
- Setup Express server
- Mount routes (`/api` dan `/`)
- Initialize SessionManager
- Handle graceful shutdown

**Exports:**
- `sessionManager` - Global session manager instance

### 2. `src/services/SessionManager.js` - Core Business Logic

**Tugas:**
- Manage multiple WhatsApp client instances
- Create/delete sessions
- Forward events to webhooks
- Handle connection lifecycle

**Key Methods:**

```javascript
createSession(sessionId)         // Buat session baru
getSession(sessionId)            // Ambil session by ID
listSessions()                   // List semua sessions
deleteSession(sessionId)         // Hapus session
shutdownAll()                    // Shutdown graceful semua sessions
```

**Event Forwarding:**
- Semua event WhatsApp diteruskan ke webhook (jika configured)
- Events: message, group, receipt, voip, presence, dll

### 3. `src/routes/` - Route Definitions

#### `api.js` - REST API Routes

Semua endpoint diawali `/api`:

```
Sessions:
POST   /api/sessions                          # Create
GET    /api/sessions                          # List all
GET    /api/sessions/:id                      # Get one
POST   /api/sessions/:id/connect              # Connect
POST   /api/sessions/:id/disconnect           # Disconnect
DELETE /api/sessions/:id                      # Delete
POST   /api/sessions/:id/webhook              # Set webhook
GET    /api/sessions/:id/qr                   # Get QR code

Messages:
POST   /api/sessions/:id/send-message         # Send text
POST   /api/sessions/:id/send-media           # Send media
POST   /api/sessions/:id/send-receipt         # Send receipt

Groups:
GET    /api/sessions/:id/groups               # List groups
GET    /api/sessions/:id/groups/:jid          # Get metadata
POST   /api/sessions/:id/groups               # Create group
POST   /api/sessions/:id/groups/:jid/participants  # Add
DELETE /api/sessions/:id/groups/:jid/participants  # Remove
POST   /api/sessions/:id/groups/:jid/promote      # Promote admin
POST   /api/sessions/:id/groups/:jid/demote       # Demote admin
PUT    /api/sessions/:id/groups/:jid/subject      # Update name
PUT    /api/sessions/:id/groups/:jid/description  # Update desc
POST   /api/sessions/:id/groups/:jid/leave        # Leave group

Profile:
GET    /api/sessions/:id/profile/:jid         # Get profile
PUT    /api/sessions/:id/profile/picture      # Set picture
PUT    /api/sessions/:id/profile/status       # Set status

VoIP:
POST   /api/sessions/:id/voip/call            # Make call
POST   /api/sessions/:id/voip/:callId/accept  # Accept call
POST   /api/sessions/:id/voip/:callId/reject  # Reject call
POST   /api/sessions/:id/voip/:callId/end     # End call
```

#### `web.js` - Web Page Routes

```
GET    /                                      # Dashboard
GET    /sessions                              # Sessions page
GET    /sessions/:id                          # Session detail
GET    /sessions/:id/send                     # Send message UI
GET    /sessions/:id/groups                   # Groups UI
GET    /sessions/:id/webhooks                 # Webhook config UI
GET    /sessions/:id/voip                     # VoIP UI
```

### 4. `src/controllers/` - Request Handlers

Setiap controller handle 1 domain:

#### `sessionController.js`
- Session CRUD operations
- QR code generation
- Webhook configuration

#### `messageController.js`
- Send text/media messages
- Send read receipts

#### `groupController.js`
- Group CRUD
- Participant management
- Group settings

#### `profileController.js`
- Get/set profile picture
- Get/set status

#### `voipController.js`
- Make/accept/reject/end calls

### 5. `views/` - EJS Templates

**Prinsip: 1 file = 1 halaman web**

Setiap file `.ejs` adalah complete page dengan:
- HTML structure
- Inline CSS (atau link ke `/css/style.css`)
- Inline JS (atau link ke `/js/app.js`)

**Template Variables:**
- `sessionId` - Dikirim dari route

**Example Usage:**

```ejs
<!-- views/session-detail.ejs -->
<h1>Session: <%= sessionId %></h1>
<div id="qr-code"></div>
<script>
    const sessionId = '<%= sessionId %>';
    // Fetch QR code via API
</script>
```

### 6. `public/` - Static Assets

#### `css/style.css`
Global styles untuk semua pages

#### `js/app.js`
Shared frontend JavaScript:
- API calls helper
- UI utilities
- Event handlers

## Data Flow

### 1. Web Request → API Response

```
Browser → Express Router → Controller → SessionManager → Zapo Client → WhatsApp
   ↓                                                                        ↓
Response ← JSON ←────────────────────────────────────────────────────────┘
```

### 2. WhatsApp Event → Webhook

```
WhatsApp → Zapo Client → SessionManager → Webhook URL
                              ↓
                         Event Emitter
                              ↓
                    Internal Event Handlers
```

## Session Storage

Setiap session punya folder terpisah:

```
sessions/
├── session1/
│   └── state.sqlite          # Auth credentials, Signal keys, messages
├── session2/
│   └── state.sqlite
└── session3/
    └── state.sqlite
```

**SQLite Tables (auto-generated by Zapo):**
- `auth` - Credentials & device info
- `signal_*` - Signal protocol keys
- `messages` - Message history
- `threads` - Chat list
- `contacts` - Contact info
- `app_state` - Archive/pin/mute state

## Environment Variables

```env
PORT=3000                      # HTTP server port
HOST=0.0.0.0                   # Bind address
BASE_URL=http://localhost:3000 # Public URL (for webhooks, QR)
LOG_LEVEL=info                 # trace|debug|info|warn|error
SESSIONS_PATH=./sessions       # Session storage path
WEBHOOK_SECRET=xxx             # Webhook signature secret
NODE_ENV=development           # development|production
```

## Error Handling

### API Errors

```javascript
// All controllers use try-catch with next(error)
export async function someAction(req, res, next) {
    try {
        // ... logic
    } catch (error) {
        next(error)  // Forwarded to global error handler
    }
}
```

### Global Error Handler (in `index.js`)

```javascript
app.use((err, req, res, next) => {
    console.error('Error:', err)
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    })
})
```

## Webhook Signature Validation

```javascript
// Server side (SessionManager.js)
_generateSignature(data, secret) {
    const crypto = require('crypto')
    return crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(data))
        .digest('hex')
}

// Client side (webhook receiver)
const receivedSignature = req.headers['x-webhook-signature']
const calculatedSignature = generateSignature(req.body, secret)
if (receivedSignature !== calculatedSignature) {
    throw new Error('Invalid signature')
}
```

## Multi-Session Architecture

```
┌─────────────────────────────────────────────┐
│           SessionManager                     │
│  ┌────────────────────────────────────────┐ │
│  │ Session 1                              │ │
│  │  - WaClient                            │ │
│  │  - Store (SQLite)                      │ │
│  │  - Event Handlers                      │ │
│  │  - Webhook Config                      │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ Session 2                              │ │
│  │  - WaClient                            │ │
│  │  - Store (SQLite)                      │ │
│  │  - Event Handlers                      │ │
│  │  - Webhook Config                      │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ Session N                              │ │
│  │  - WaClient                            │ │
│  │  - Store (SQLite)                      │ │
│  │  - Event Handlers                      │ │
│  │  - Webhook Config                      │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Adding New Features

### 1. Add New API Endpoint

**Step 1:** Create handler in controller

```javascript
// src/controllers/newController.js
export async function newAction(req, res, next) {
    try {
        const { sessionId } = req.params
        const session = sessionManager.getSession(sessionId)
        
        // ... your logic
        
        res.json({ success: true })
    } catch (error) {
        next(error)
    }
}
```

**Step 2:** Add route

```javascript
// src/routes/api.js
import * as newController from '../controllers/newController.js'
router.post('/sessions/:sessionId/new-action', newController.newAction)
```

### 2. Add New Web Page

**Step 1:** Create EJS template

```ejs
<!-- views/new-page.ejs -->
<!DOCTYPE html>
<html>
<head>
    <title>New Page</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <h1>New Page for <%= sessionId %></h1>
    <script src="/js/app.js"></script>
</body>
</html>
```

**Step 2:** Add web route

```javascript
// src/routes/web.js
router.get('/sessions/:sessionId/new-page', (req, res) => {
    res.render('new-page', { sessionId: req.params.sessionId })
})
```

### 3. Add Event Forwarding

```javascript
// src/services/SessionManager.js
_setupEventForwarding(session) {
    // ... existing events
    
    client.on('new_event', (event) => {
        session.lastActivity = new Date()
        this.emit('session_new_event', { sessionId: id, event })
        this._forwardWebhook(id, 'new_event', event)
    })
}
```

## Best Practices

### 1. Controller Pattern

```javascript
// ✅ GOOD: Async with error forwarding
export async function action(req, res, next) {
    try {
        const result = await doSomething()
        res.json({ success: true, result })
    } catch (error) {
        next(error)  // Let global handler deal with it
    }
}

// ❌ BAD: No error handling
export async function action(req, res) {
    const result = await doSomething()  // Uncaught errors!
    res.json({ success: true, result })
}
```

### 2. Session Validation

```javascript
// ✅ GOOD: Always check session exists
const session = sessionManager.getSession(sessionId)
if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' })
}

// ✅ GOOD: Check connection status for operations
if (session.status !== 'connected') {
    return res.status(400).json({ success: false, error: 'Session not connected' })
}
```

### 3. Webhook Configuration

```javascript
// ✅ GOOD: Filter events before sending
if (!session.webhookConfig) return
if (!session.webhookConfig.events.includes(event)) return

// ✅ GOOD: Use timeout for webhook calls
await axios.post(url, data, { timeout: 10000 })
```

### 4. File Naming

- **Controllers**: `nameController.js` (camelCase + Controller suffix)
- **Services**: `NameManager.js` (PascalCase + Manager suffix)
- **Views**: `kebab-case.ejs` (lowercase with dashes)
- **Routes**: `name.js` (lowercase, no suffix)

## Testing Endpoints

### Using cURL

```bash
# Create session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test1"}'

# Connect session
curl -X POST http://localhost:3000/api/sessions/test1/connect

# Get QR code
curl http://localhost:3000/api/sessions/test1/qr

# Send message
curl -X POST http://localhost:3000/api/sessions/test1/send-message \
  -H "Content-Type: application/json" \
  -d '{"to":"5511999999999@s.whatsapp.net","message":"Hello!"}'
```

### Using Postman

Import this collection:

```json
{
  "info": { "name": "Zapo Bot API" },
  "item": [
    {
      "name": "Create Session",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/sessions",
        "body": {
          "mode": "raw",
          "raw": "{\"sessionId\":\"test1\"}"
        }
      }
    }
  ],
  "variable": [
    { "key": "base_url", "value": "http://localhost:3000" }
  ]
}
```

## Performance Considerations

### 1. Session Limits

Default: No limit pada jumlah sessions, tapi perhatikan:
- RAM: ~50-100MB per session
- SQLite: 1 file per session
- Network: 1 WebSocket per session

**Recommendation**: Max 50 sessions per server dengan 4GB RAM

### 2. Webhook Optimization

- Use `timeout` pada axios calls
- Filter events sebelum kirim
- Consider message queue (Bull/BullMQ) untuk high volume

### 3. Database

- SQLite cocok untuk single-server deployment
- Untuk multi-server, gunakan PostgreSQL/MySQL
- Message history bisa jadi besar, pertimbangkan retention policy

## Security Checklist

- [ ] Change `WEBHOOK_SECRET` di production
- [ ] Use HTTPS untuk webhook URLs
- [ ] Validate webhook signatures
- [ ] Rate limit API endpoints
- [ ] Don't expose session folders via HTTP
- [ ] Use environment variables, tidak hardcode credentials
- [ ] Implement authentication untuk web dashboard (TODO)

## Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use process manager (PM2, systemd)
3. Setup reverse proxy (nginx)
4. Configure SSL/TLS
5. Setup monitoring
6. Configure log rotation
7. Backup session folders regularly

### PM2 Example

```bash
npm install -g pm2
pm2 start src/index.js --name zapo-bot
pm2 save
pm2 startup
```

---

**Last Updated**: 2026-08-19
