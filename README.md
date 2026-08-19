# Bot-SBMgrup-zapo

Multi-session WhatsApp bot with web dashboard, VoIP calls, and AI integration powered by Zapo-JS.

## Features

✅ **Multi-Session Management** - Handle multiple WhatsApp accounts  
✅ **Web Dashboard** - Mobile-first responsive interface  
✅ **Command System** - Auto-loader with flexible prefix support  
✅ **VoIP Calls** - Voice calling with audio playback  
✅ **AI Integration** - ChatGPT-style responses & image generation  
✅ **Rich Messages** - Link previews, quotes, mentions  
✅ **Group Management** - Full admin features  
✅ **Owner Verification** - LID support with participantAlt  

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

```bash
cp .env.example .env
```

Edit `.env` and set your owner numbers:
```env
OWNER_NUMBERS=628123456789,628987654321
```

### 3. Run

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### 4. Access Dashboard

Open: http://localhost:3000

## Commands

### General
- `.menu` - Show all commands
- `.ping` - Check bot latency
- `.info` - Bot information
- `.test` - Test message types (text, link, quote, mention)

### AI Features
- `.ai <question>` - Ask AI anything
- `.imagine <prompt>` - Generate AI images

### VoIP (Voice Calls)
- `.callme` - Bot calls you back
- `.call <phone> <audio>` - Call with audio search
- `.callfile <phone> <path>` - Call with local audio
- `.listcalls` - List active calls
- `.endcall` - End all calls

### Group Management
- `.groupinfo` - Show group details

### Owner Only
- `.broadcast <message>` - Broadcast to all groups
- `.checkjid` - Check JID information
- `.update` - Auto-update bot from GitHub
- `.restart` - Restart bot
- `.version` - Check bot version & updates

## Requirements

- **Node.js** >= 20.9.0
- **FFmpeg** (optional, for VoIP audio playback)

### Install FFmpeg (Windows)

```powershell
choco install ffmpeg
```

Or download from: https://ffmpeg.org/download.html

## Project Structure

```
BOT WA ZAPO/
├── src/
│   ├── commands/          # Command modules (auto-loaded)
│   │   ├── general/       # General commands
│   │   ├── group/         # Group commands
│   │   ├── menu/          # Menu command
│   │   └── owner/         # Owner-only commands
│   ├── services/
│   │   ├── SessionManager.js  # Multi-session handler
│   │   └── CommandHandler.js  # Command processor
│   ├── routes/
│   │   ├── api.js         # REST API endpoints
│   │   └── web.js         # Web routes
│   └── utils/
│       └── helpers.js     # Helper functions
├── views/                 # EJS templates
├── public/                # Static assets
├── sessions/              # Session data (gitignored)
└── temp/                  # Temporary files (gitignored)
```

## API Endpoints

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions` - List all sessions
- `POST /api/sessions/:id/connect` - Connect session

### Messages
- `POST /api/sessions/:id/send-message` - Send text
- `POST /api/sessions/:id/send-media` - Send media

### Groups
- `GET /api/sessions/:id/groups` - List groups
- `POST /api/sessions/:id/groups` - Create group

Full API documentation: See `ZAPO_DOCUMENTATION.md`

## Development

### Add New Command

Create file in `src/commands/{category}/{name}.js`:

```js
export default {
    name: 'mycommand',
    category: 'general',
    
    async execute(ctx) {
        const { send, args } = ctx
        await send('Hello from my command!')
    }
}
```

Commands auto-load on restart.

### Push to GitHub

**First time setup:**
```batch
# Double-click: init-git.bat
# Then run: git push -u origin main
```

**Regular updates:**
```batch
# Just double-click: push.bat
```

## Technologies

- **Backend**: Node.js + Express
- **Frontend**: EJS + Vanilla JS
- **WhatsApp**: Zapo-JS
- **Storage**: SQLite (per session)
- **VoIP**: @zapo-js/voip
- **AI**: Multiple API integrations

## Documentation

- `ZAPO_DOCUMENTATION.md` - Complete Zapo API reference
- `PROJECT_STRUCTURE.md` - Architecture details
- `STATUS.md` - Feature status & roadmap
- `GETTING_STARTED.md` - Quick start guide

## Known Issues

- SoundCloud API doesn't provide direct download (using workaround)
- VoIP requires FFmpeg for audio playback
- LID users require participantAlt/remoteJidAlt detection

## Credits

**Project**: SBMgrup  
**Framework**: [Zapo-JS](https://zapo.to)  
**Authors**: vinikjkkj, edgardmessias, w3nder  
**Design**: Mobile-first, minimal, functional  

## License

MIT

## Support

For issues or questions, open an issue on GitHub.

---

**Made with ❤️ for WhatsApp automation**
