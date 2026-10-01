# 🌐 Dual Port Web Server Setup

Bot ini sekarang menjalankan **2 web server** secara bersamaan:

## 📋 **SERVER PORTS:**

### **Port 3000 - Main Server**
- **Purpose:** Bot dashboard, session management, API endpoints
- **URL:** `http://localhost:3000`
- **Routes:**
  - `/` - Dashboard utama
  - `/sessions` - Session management
  - `/api/*` - Bot API endpoints

### **Port 3001 - Secondary Server (Features)**
- **Purpose:** Custom features, tools, analytics
- **URL:** `http://localhost:3001`
- **Routes:**
  - `/` - Features homepage
  - `/health` - Health check
  - `/features` - List of available features

---

## ⚙️ **CONFIGURATION:**

### **.env File:**
```env
# Main server
PORT=3000
BASE_URL=http://localhost:3000

# Secondary server
PORT2=3001
BASE_URL2=http://localhost:3001
```

### **Custom Port:**
Mau ganti port? Edit `.env`:
```env
PORT=5000     # Main server jadi port 5000
PORT2=5001    # Secondary server jadi port 5001
```

---

## 🔧 **ADDING NEW FEATURES TO PORT 3001:**

Edit `src/routes/secondary.js`:

```javascript
// Example: Add new route
router.get('/myfeature', (req, res) => {
    res.json({
        success: true,
        message: 'My custom feature'
    })
})

// Example: Add HTML page
router.get('/dashboard', (req, res) => {
    res.render('dashboard') // Uses views/dashboard.ejs
})
```

---

## 📝 **USAGE EXAMPLES:**

### **Main Server (Port 3000):**
- Bot Dashboard: `http://localhost:3000`
- Create Session: `http://localhost:3000/sessions`
- API Health: `http://localhost:3000/api/health`

### **Secondary Server (Port 3001):**
- Features Page: `http://localhost:3001`
- Health Check: `http://localhost:3001/health`
- Feature List: `http://localhost:3001/features`

---

## 🚀 **START BOTH SERVERS:**

```bash
npm start
```

Output:
```
🚀 Main Server running on http://0.0.0.0:3000
📱 SBMgrup - WhatsApp Multi-Session Bot Ready
🎯 Secondary Server running on http://0.0.0.0:3001
✨ Feature Server Ready
```

---

## 🛠️ **USE CASES:**

### **Why 2 Ports?**

1. **Separation of Concerns:**
   - Port 3000: Bot operations (dashboard, sessions, commands)
   - Port 3001: Custom features (tools, analytics, integrations)

2. **Security:**
   - Main server (3000) bisa di-protect dengan auth
   - Feature server (3001) bisa public atau punya auth sendiri

3. **Performance:**
   - Heavy features di port 3001 gak ganggu bot operations di port 3000

4. **Scalability:**
   - Bisa deploy 2 server ke different domains:
     - `bot.domain.com` → Port 3000
     - `features.domain.com` → Port 3001

---

## 🔒 **PRODUCTION DEPLOYMENT:**

### **Nginx Reverse Proxy:**

```nginx
# Main server
server {
    listen 80;
    server_name bot.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Secondary server
server {
    listen 80;
    server_name features.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 **MONITORING:**

Check if both servers are running:

```bash
# Check port 3000
curl http://localhost:3000

# Check port 3001
curl http://localhost:3001/health
```

---

## ❓ **FAQ:**

**Q: Bisa pakai port lain selain 3000 & 3001?**
A: Bisa! Edit `.env` dan ganti `PORT` & `PORT2`

**Q: Bisa jalanin cuma 1 server aja?**
A: Bisa, tapi harus edit `src/index.js` dan comment server yang gak dipake

**Q: Bisa tambah port 3002, 3003, dst?**
A: Bisa! Copy pattern di `src/index.js` dan bikin `app3`, `app4`, dst

**Q: Secondary server bisa akses sessionManager?**
A: Bisa! Sudah di-inject via `app2.locals.sessionManager`

---

## 🎯 **NEXT STEPS:**

1. Tambah fitur di `src/routes/secondary.js`
2. Bikin view baru di `views/` kalau butuh HTML pages
3. Deploy dengan reverse proxy (Nginx/Caddy)
4. Monitor kedua port di production

---

**Created by:** Azrial Galih P. (19 tahun)
**Version:** 1.0.0
**Last Updated:** August 2026
