# Production Deployment Guide

Guide untuk deploy bot di production server tanpa nodemon.

## 🚨 Problem dengan Nodemon di Production

**Issue:**
- Nodemon auto-restart saat file change
- Ketika bot crash → nodemon stop → bot mati
- User tidak bisa kirim command karena bot offline
- Harus manual restart via terminal

**Solution:**
- Pakai **PM2** untuk production
- PM2 auto-restart on crash
- PM2 keep bot alive 24/7
- PM2 monitor memory & CPU

---

## 📦 Install PM2

### Di Server:

```bash
npm install -g pm2
```

Atau kalau tidak punya akses global:

```bash
npm install --save pm2
```

---

## 🚀 Start Bot dengan PM2

### **Method 1: NPM Script** (Recommended)

```bash
npm run pm2
```

### **Method 2: Direct PM2**

```bash
pm2 start ecosystem.config.js
```

### **Method 3: Simple**

```bash
pm2 start src/index.js --name sbmgrup-bot
```

---

## 🎛️ PM2 Commands

### **Status & Monitoring:**

```bash
# Check status
npm run pm2:status
# or
pm2 status

# View logs (real-time)
npm run pm2:logs
# or
pm2 logs sbmgrup-bot

# Monitor CPU & Memory
pm2 monit
```

### **Control:**

```bash
# Restart bot
npm run pm2:restart
# or
pm2 restart sbmgrup-bot

# Stop bot
npm run pm2:stop
# or
pm2 stop sbmgrup-bot

# Delete from PM2
npm run pm2:delete
# or
pm2 delete sbmgrup-bot
```

### **Advanced:**

```bash
# View details
pm2 show sbmgrup-bot

# Save PM2 list (auto-start on reboot)
pm2 save

# Setup auto-start on server reboot
pm2 startup
```

---

## ⚙️ PM2 Configuration

File: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'sbmgrup-bot',
    script: 'src/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,           // Auto-restart on crash
    watch: false,                 // Don't watch file changes
    max_memory_restart: '500M',   // Restart if > 500MB
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
}
```

### **Key Settings:**

| Setting | Value | Purpose |
|---------|-------|---------|
| `autorestart` | `true` | Auto-restart on crash |
| `watch` | `false` | No auto-restart on file change |
| `max_memory_restart` | `500M` | Restart if memory > 500MB |
| `instances` | `1` | Single instance (multi-session in code) |

---

## 🔄 Update Workflow (Production)

### **Before (Nodemon):**
```
.update → bot auto-restart → files updated
```

**Problem:** Crash = bot mati sampai manual restart

### **After (PM2):**
```
.update → files updated → manual restart via command
```

**Benefit:** Crash = PM2 auto-restart dalam 1-2 detik

---

## 📝 Update Command Flow

**Option 1: Auto-restart after update**

Update `src/commands/owner/update.js`:

```javascript
// After successful pull
await send('Update complete! Restarting bot...')

// Restart via PM2
await execAsync('pm2 restart sbmgrup-bot')
```

**Option 2: Manual restart** (Current)

```
User: .update
Bot: Update complete! Run: .restart

User: .restart
Bot: Restarting... (PM2 handles it)
```

---

## 🛠️ Restart Command (PM2 Compatible)

Update `src/commands/owner/restart.js`:

```javascript
export default {
    name: 'restart',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        await send('*[+] Restarting Bot*\n\nBot will be back online in 3-5 seconds...')
        
        // Check if running under PM2
        if (process.env.PM2_HOME) {
            // PM2 restart
            exec('pm2 restart sbmgrup-bot', (error) => {
                if (error) {
                    console.error('PM2 restart error:', error)
                }
            })
        } else {
            // Normal process exit (for nodemon/dev)
            setTimeout(() => {
                process.exit(0)
            }, 1000)
        }
    }
}
```

---

## 🔍 Logs

PM2 otomatis save logs ke:

```
./logs/error.log  - Error logs
./logs/out.log    - Console logs
```

### **View Logs:**

```bash
# Real-time logs
pm2 logs sbmgrup-bot

# Last 100 lines
pm2 logs sbmgrup-bot --lines 100

# Error logs only
pm2 logs sbmgrup-bot --err

# Clear logs
pm2 flush
```

---

## 🚀 Auto-Start on Server Reboot

### **Setup:**

```bash
# Generate startup script
pm2 startup

# Copy-paste the command it gives you (with sudo)
# Example: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# Start bot
pm2 start ecosystem.config.js

# Save PM2 list
pm2 save
```

Now PM2 will auto-start bot on server reboot!

---

## 📊 Monitoring

### **CPU & Memory:**

```bash
pm2 monit
```

**Output:**
```
┌─────────────────────────┐
│ sbmgrup-bot             │
├─────────────────────────┤
│ status    : online      │
│ cpu       : 2%          │
│ memory    : 180 MB      │
│ uptime    : 2h 15m      │
│ restarts  : 0           │
└─────────────────────────┘
```

### **Web Dashboard:**

```bash
pm2 plus
```

Register for free web monitoring at https://app.pm2.io

---

## 🆚 Nodemon vs PM2

| Feature | Nodemon | PM2 |
|---------|---------|-----|
| Auto-restart on file change | ✅ Yes | ❌ No (configurable) |
| Auto-restart on crash | ❌ No | ✅ Yes |
| Keep alive 24/7 | ❌ No | ✅ Yes |
| Production ready | ❌ Dev only | ✅ Yes |
| Memory monitoring | ❌ No | ✅ Yes |
| Log management | ❌ Basic | ✅ Advanced |
| Cluster mode | ❌ No | ✅ Yes |
| Web dashboard | ❌ No | ✅ Yes |

---

## 🎯 Migration Steps

### **1. Install PM2:**
```bash
npm install -g pm2
```

### **2. Start bot:**
```bash
pm2 start ecosystem.config.js
```

### **3. Save config:**
```bash
pm2 save
```

### **4. Setup auto-start:**
```bash
pm2 startup
# Run the command it gives you
```

### **5. Update restart command:**
Edit `src/commands/owner/restart.js` to support PM2.

### **6. Test:**
```
.restart  → Bot should restart via PM2
.update   → Files update, then .restart
```

### **7. Monitor:**
```bash
pm2 status
pm2 logs
```

---

## 🐛 Troubleshooting

### **Bot won't start:**

```bash
# Check PM2 logs
pm2 logs sbmgrup-bot --lines 50

# Check status
pm2 status

# Delete and restart
pm2 delete sbmgrup-bot
pm2 start ecosystem.config.js
```

### **High memory usage:**

```bash
# Check current memory
pm2 status

# Restart to free memory
pm2 restart sbmgrup-bot
```

### **Too many restarts:**

```bash
# Check error logs
pm2 logs sbmgrup-bot --err

# Fix code error first
# Then restart
pm2 restart sbmgrup-bot
```

---

## 📈 Best Practices

1. ✅ **Use PM2 in production**
2. ✅ **Set `watch: false`** - no auto-restart on file change
3. ✅ **Set `autorestart: true`** - auto-restart on crash
4. ✅ **Set `max_memory_restart`** - prevent memory leaks
5. ✅ **Save PM2 list** - `pm2 save`
6. ✅ **Setup auto-start** - `pm2 startup`
7. ✅ **Monitor logs** - `pm2 logs`
8. ✅ **Regular restarts** - schedule weekly restart

---

## 🔄 Update Workflow (Final)

### **Development (Local):**
```bash
npm run dev  # Uses nodemon
```

### **Production (Server):**
```bash
# First time
pm2 start ecosystem.config.js

# Update bot
.update  # Via WhatsApp

# Restart
.restart  # Via WhatsApp (triggers pm2 restart)

# Or manual
pm2 restart sbmgrup-bot
```

---

## 📞 PM2 Quick Reference

```bash
# Start
pm2 start ecosystem.config.js

# Stop
pm2 stop sbmgrup-bot

# Restart
pm2 restart sbmgrup-bot

# Delete
pm2 delete sbmgrup-bot

# Status
pm2 status

# Logs
pm2 logs sbmgrup-bot

# Monitor
pm2 monit

# Save
pm2 save

# List all
pm2 list

# Flush logs
pm2 flush
```

---

**Ready for production! 🚀**

Bot akan tetap online bahkan saat crash, dan restart otomatis dalam 1-2 detik.
