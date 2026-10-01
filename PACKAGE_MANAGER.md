# 📦 Package Manager Commands

Bot commands untuk manage npm packages langsung dari WhatsApp (Owner only).

## Commands

### 1. `.install` - Install Package
Install npm packages secara remote.

**Usage:**
```
.install <package[@version]> [...packages]
```

**Aliases:** `.npm`, `.pkg`

**Examples:**
```
.install axios
.install express@4.18.0
.install lodash moment cheerio
```

**Features:**
- ✅ Multiple packages at once
- ✅ Version pinning support (`package@version`)
- ✅ Blacklist untuk package berbahaya
- ✅ Package name validation
- ✅ Auto-update package.json
- ✅ 2 minute timeout protection
- ⚠️ Owner only

**Blacklisted Packages:**
- `rm-rf`, `rimraf` - Dangerous file deletion
- `shelljs` - Direct shell access
- `child-process-promise`, `exec-async` - Process execution

**Common Packages Suggestion:**
1. axios - HTTP client
2. lodash - Utility functions
3. moment - Date/time handling
4. cheerio - HTML parsing
5. puppeteer - Browser automation
6. jimp - Image processing
7. canvas - Canvas graphics
8. fluent-ffmpeg - Video/audio processing
9. form-data - Multipart forms
10. node-fetch - Fetch API
11. ws - WebSocket
12. socket.io - Real-time communication

---

### 2. `.uninstall` - Remove Package
Uninstall npm packages.

**Usage:**
```
.uninstall <package> [...packages]
```

**Aliases:** `.remove`, `.rm`

**Examples:**
```
.uninstall axios
.uninstall lodash moment
```

**Features:**
- ✅ Multiple packages removal
- ✅ Verification before removal
- ✅ Auto-update package.json
- ⚠️ Owner only

---

### 3. `.packages` - List Packages
List installed packages with versions.

**Usage:**
```
.packages [search]
```

**Aliases:** `.pkg-list`, `.deps`

**Examples:**
```
.packages              # List all
.packages axios        # Filter by name
.packages @zapo        # Filter scoped packages
```

**Output:**
- 📦 Dependencies (production)
- 🔧 Dev Dependencies
- Package count
- Version info

---

### 4. `.npmsearch` - Search NPM Registry
Search packages di npm registry.

**Usage:**
```
.npmsearch <query>
```

**Aliases:** `.searchnpm`, `.pkgsearch`

**Examples:**
```
.npmsearch axios
.npmsearch image processing
.npmsearch @types/node
```

**Output:**
- Package name & version
- Description
- Popularity score
- Top 10 results

---

## Security Features

### 1. Blacklist System
Package berbahaya otomatis diblock:
```javascript
const BLACKLIST = [
    'rm-rf',      // Mass file deletion
    'rimraf',     // Recursive removal
    'shelljs',    // Shell commands
    // etc...
]
```

### 2. Package Name Validation
Format yang diizinkan:
- ✅ `package-name`
- ✅ `@scope/package-name`
- ✅ `package@1.0.0`
- ❌ `../../../etc/passwd`
- ❌ `package; rm -rf /`

### 3. Timeout Protection
- Install: 2 minutes max
- Uninstall: 1 minute max
- Search: 10 seconds max

### 4. Buffer Limit
- Install: 10MB max output
- Uninstall: 5MB max output

### 5. Owner Only
Semua commands hanya bisa dijalankan oleh bot owner.

---

## Use Cases

### Quick Library Addition
```
User: .npmsearch cheerio
Bot: [Shows cheerio package info]
User: .install cheerio
Bot: ✅ cheerio@1.0.0 installed
```

### Check Dependencies
```
User: .packages
Bot: 📦 Dependencies:
     • axios@1.6.0
     • dotenv@16.4.0
     • zapo-js@1.0.0
     Total: 15 packages
```

### Clean Up
```
User: .packages lodash
Bot: • lodash@4.17.21
User: .uninstall lodash
Bot: ✅ lodash removed
```

---

## Error Handling

### Common Errors & Solutions

**1. Package Not Found (404)**
```
Error: Package not found on npm registry
Solution: Check package name spelling
```

**2. Permission Denied (EACCES)**
```
Error: Permission denied
Solution: Check file permissions or run with proper user
```

**3. No Space (ENOSPC)**
```
Error: No space left on device
Solution: Free up disk space
```

**4. Timeout**
```
Error: Installation timeout (>2 minutes)
Solution: Package too large or network slow, try again
```

**5. Already Installed**
```
Warning: Package already in dependencies
Solution: Uninstall first, then reinstall
```

---

## Technical Details

### File Structure
```
src/commands/owner/
├── install.js       # Install packages
├── uninstall.js     # Remove packages
├── packages.js      # List packages
└── npmsearch.js     # Search npm
```

### Dependencies
- `child_process` - Execute npm commands
- `fs` - Read/write package.json
- `axios` - npm registry API

### How It Works

**Install Flow:**
1. Validate package names
2. Check blacklist
3. Execute `npm install <packages> --save`
4. Read updated package.json
5. Report installed versions

**Uninstall Flow:**
1. Check package.json
2. Verify packages exist
3. Execute `npm uninstall <packages>`
4. Report removed packages

**Search Flow:**
1. Query npm registry API
2. Parse results (top 10)
3. Format output with details

---

## Safety Notes

⚠️ **IMPORTANT:**

1. **Owner Only** - Commands terbatas untuk bot owner
2. **No Direct Shell** - Hanya npm commands, bukan shell arbitrary
3. **Blacklist** - Package berbahaya sudah di-blacklist
4. **Validation** - Package names divalidasi format
5. **Timeout** - Auto-abort kalau terlalu lama
6. **Buffer Limit** - Output di-limit untuk prevent memory issues

**Recommended:**
- Test di development environment dulu
- Backup package.json sebelum major changes
- Review package before install
- Restart bot setelah install package baru (kalau perlu)

---

## Examples

### Install AI Libraries
```
.install openai
.install @google/generative-ai
.install anthropic-ai
```

### Install Image Processing
```
.install jimp sharp canvas
```

### Install Scraping Tools
```
.install cheerio axios
.install puppeteer
```

### Search & Install
```
.npmsearch youtube download
.install ytdl-core
```

---

## Future Improvements

Possible additions:
- [ ] `.update` - Update specific packages
- [ ] `.outdated` - Check outdated packages
- [ ] `.audit` - Security audit
- [ ] `.info` - Detailed package info
- [ ] Whitelist system (only allow specific packages)
- [ ] Install confirmation prompt
- [ ] Package size check before install

---

**⚠️ Use with caution! Only install packages you trust.**
