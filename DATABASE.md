# Database Structure - Bot SBMgrup

## 📊 Database Overview

Bot menggunakan **2 jenis database**:

### 1. Session Database (Per Session)
- **Location**: `./sessions/<sessionId>/state.sqlite`
- **Purpose**: WhatsApp authentication & state
- **Scope**: Per session (isolated)
- **Content**:
  - Auth credentials
  - Signal protocol keys
  - Message history
  - Contacts
  - App state (archive, pin, mute)

**Note**: Setiap session punya database sendiri untuk isolasi.

### 2. Auto-Response Database (Shared)
- **Location**: `./data/responses.db`
- **Purpose**: Auto-response data untuk semua groups
- **Scope**: **Shared across ALL sessions**
- **Content**:
  - Group JID
  - Response key
  - Response text
  - Usage counter
  - Timestamps

## 🗄️ Auto-Response Database Schema

### Table: `responses`

```sql
CREATE TABLE responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_jid TEXT NOT NULL,           -- Group WhatsApp ID
    key TEXT NOT NULL,                 -- Trigger keyword (lowercase)
    text TEXT NOT NULL,                -- Response text
    created_at TEXT NOT NULL,          -- ISO timestamp
    updated_at TEXT NOT NULL,          -- ISO timestamp
    count INTEGER DEFAULT 0,           -- Usage counter
    UNIQUE(group_jid, key)            -- One key per group
)

CREATE INDEX idx_group_key ON responses(group_jid, key)
```

### Example Data:

| id | group_jid | key | text | count |
|----|-----------|-----|------|-------|
| 1 | 120363...@g.us | baju | Stok: 10 pcs | 25 |
| 2 | 120363...@g.us | harga | Harga: Rp 50.000 | 15 |
| 3 | 120364...@g.us | info | Hub: 08123456789 | 8 |

## 💾 Database Location

```
BOT WA ZAPO/
├── data/
│   └── responses.db          ← 1 database untuk semua session
├── sessions/
│   ├── session1/
│   │   └── state.sqlite      ← Database session 1
│   ├── session2/
│   │   └── state.sqlite      ← Database session 2
│   └── session3/
│       └── state.sqlite      ← Database session 3
```

## 🔄 How It Works

### Adding Response:

```
Admin: .addres baju@Stok: 10 pcs
```

**Database Operation:**
```sql
INSERT OR REPLACE INTO responses 
(group_jid, key, text, created_at, updated_at, count)
VALUES ('120363...@g.us', 'baju', 'Stok: 10 pcs', '2026-08-19...', '2026-08-19...', 0)
```

### Triggering Response:

```
Member: baju
```

**Database Operation:**
```sql
-- 1. Get response
SELECT text FROM responses 
WHERE group_jid = '120363...@g.us' AND key = 'baju'

-- 2. Increment counter
UPDATE responses 
SET count = count + 1 
WHERE group_jid = '120363...@g.us' AND key = 'baju'
```

**Bot Response:**
```
Stok: 10 pcs
```

## 📈 Database Stats

### View Statistics:
```
.dbstats
```

**Output:**
- Total responses across all groups
- Total groups using auto-response
- Top 10 most used responses

## 🔒 Database Backup

### Manual Backup:

```bash
# Backup auto-response database
cp ./data/responses.db ./backup/responses_$(date +%Y%m%d).db

# Backup all session databases
cp -r ./sessions ./backup/sessions_$(date +%Y%m%d)
```

### Automated Backup (Cron):

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/bot && cp ./data/responses.db ./backup/responses_$(date +\%Y\%m\%d).db
```

## 🔧 Database Maintenance

### Check Database Size:

```bash
# Windows
dir data\responses.db

# Linux/Mac
du -h data/responses.db
```

### Vacuum Database (Optimize):

```bash
sqlite3 data/responses.db "VACUUM;"
```

### View Database Content:

```bash
sqlite3 data/responses.db

# In SQLite shell:
.tables
.schema responses
SELECT * FROM responses LIMIT 10;
.quit
```

## 🚨 Important Notes

### 1. Database is Shared
**1 database** `responses.db` digunakan oleh **SEMUA session**:
- Session A bisa akses responses dari Session B
- Session B bisa akses responses dari Session A
- Data grouped by `group_jid`

### 2. Protected from Updates
Database file **NEVER overwritten** by git pull:
- Listed in `.gitignore`
- Listed in `.gitattributes` with `merge=ours`

### 3. Thread-Safe
SQLite handles concurrent access:
- Multiple sessions can read simultaneously
- Writes are serialized automatically
- No locking issues

### 4. Performance
Database is optimized:
- Index on `(group_jid, key)` for fast lookups
- Synchronous operations (no async overhead)
- Cached in memory by SQLite

## 🛠️ Troubleshooting

### Database Locked Error:

```bash
# Close all bot instances
pkill -f "node src/index.js"

# Remove lock files
rm data/responses.db-wal
rm data/responses.db-shm

# Restart
npm run dev
```

### Corrupted Database:

```bash
# Check integrity
sqlite3 data/responses.db "PRAGMA integrity_check;"

# Restore from backup
cp ./backup/responses_20260819.db ./data/responses.db
```

### Migration from JSON to SQLite:

If you have old JSON files in `data/responses/`:

```bash
# Run migration script (create if needed)
node scripts/migrate-json-to-sqlite.js
```

## 📊 Query Examples

### Get all responses for a group:

```sql
SELECT key, text, count 
FROM responses 
WHERE group_jid = '120363410136151421@g.us'
ORDER BY count DESC;
```

### Find most popular keywords:

```sql
SELECT key, COUNT(*) as groups, SUM(count) as total_uses
FROM responses
GROUP BY key
ORDER BY total_uses DESC
LIMIT 20;
```

### Export to CSV:

```bash
sqlite3 -header -csv data/responses.db "SELECT * FROM responses;" > responses.csv
```

## 🔐 Security

- Database file is **NOT committed** to repo
- Backup regularly
- Restrict file permissions:
  ```bash
  chmod 600 data/responses.db
  ```

---

**Questions?** Check code in `src/utils/responseStore.js`
