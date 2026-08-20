# Update Guide - Bot SBMgrup

## 🔒 Protected Files

Files berikut **TIDAK AKAN PERNAH** di-overwrite oleh update:

- ✅ `.env` - Configuration
- ✅ `sessions/` - WhatsApp auth data
- ✅ `data/responses/` - Auto-response data
- ✅ `temp/` - Temporary files

## 📦 First Time Setup (Server)

### 1. Clone Repository
```bash
git clone https://github.com/sbmid/Bot-SBMgrup-zapo.git
cd Bot-SBMgrup-zapo
```

### 2. Setup Git Protection
```bash
# Windows
setup-git-protect.bat

# Linux/Mac
chmod +x setup-git-protect.sh
./setup-git-protect.sh
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure
```bash
cp .env.example .env
# Edit .env dengan editor
```

### 5. Run
```bash
# Development
npm run dev

# Production with PM2
pm2 start ecosystem.config.js
```

## 🔄 Update Via WhatsApp

### Commands:

**Check Version:**
```
.version
```
Shows: current commit, available updates

**Update Bot:**
```
.update
```
Pulls latest changes from GitHub

**Restart Bot:**
```
.restart
```
Restarts to apply changes

### Update Flow:

1. **Check updates:**
   ```
   .version
   ```
   Bot replies dengan info commit & status

2. **Apply update:**
   ```
   .update
   ```
   Bot akan:
   - Fetch dari GitHub
   - Check file yang berubah
   - Verify tidak ada protected files
   - Backup local changes
   - Pull changes
   - Restore local changes
   - Install dependencies (if needed)

3. **Restart (optional):**
   ```
   .restart
   ```
   Atau tunggu auto-restart (nodemon/PM2)

## ⚠️ Update Safety

### What Gets Updated:
- ✅ Source code (`src/`)
- ✅ Commands (`src/commands/`)
- ✅ Views (`views/`)
- ✅ Public assets (`public/`)
- ✅ Documentation
- ✅ Package dependencies

### What NEVER Changes:
- ❌ `.env` (your config)
- ❌ `sessions/` (WhatsApp auth)
- ❌ `data/responses/` (auto-responses)
- ❌ `temp/` (temporary files)

### Merge Strategy:

File yang di-`.gitignore` **tidak akan pernah** masuk repo, jadi aman.

File yang di-`.gitattributes` dengan `merge=ours` akan **selalu keep versi local** saat conflict.

## 🐛 Troubleshooting

### Update Failed: "not a git repository"
```bash
git init
git remote add origin https://github.com/sbmid/Bot-SBMgrup-zapo.git
git fetch origin main
git reset --hard origin/main
```

### Update Failed: "merge conflict"
```bash
# Check conflict
git status

# Abort merge
git merge --abort

# Force update (CAREFUL - loses local changes)
git reset --hard origin/main
```

### Update Failed: "uncommitted changes"
```bash
# Stash changes
git stash

# Update
.update

# Restore changes
git stash pop
```

### Dependencies Not Installing
```bash
# Manual install
npm install

# Clear cache
rm -rf node_modules package-lock.json
npm install
```

## 📝 Manual Update (Terminal)

If WhatsApp command fails, use terminal:

```bash
# Check status
git status

# Fetch updates
git fetch origin main

# Check differences
git diff HEAD origin/main

# Pull updates
git pull origin main

# Install dependencies
npm install

# Restart
pm2 restart all
# or
npm run dev
```

## 🚀 Production Tips

### Use PM2 for Auto-Restart:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

PM2 will auto-restart bot after update.

### Setup Auto-Update Cron:
```bash
# Check updates every hour
0 * * * * cd /path/to/bot && git fetch origin main
```

Then use `.update` via WhatsApp when ready.

## 📊 Update History

View git log:
```bash
git log --oneline -10
```

View specific commit:
```bash
git show <commit-hash>
```

Rollback to previous version:
```bash
git reset --hard <commit-hash>
npm install
pm2 restart all
```

## 🔐 Security

- Never commit `.env` to repo
- Never share `.env` contents
- Keep `OWNER_NUMBERS` up to date
- Review changes before update (`.version` first)

## 💡 Best Practices

1. **Always check version first:**
   ```
   .version
   ```

2. **Read update summary**
   - Check file count
   - Verify no protected files

3. **Test after update**
   - Send `.menu`
   - Try a command

4. **Keep backup**
   - Backup `.env` manually
   - Backup `sessions/` folder

5. **Update regularly**
   - Check weekly for updates
   - Apply security patches ASAP

---

**Questions?** Open issue on GitHub: https://github.com/sbmid/Bot-SBMgrup-zapo/issues
