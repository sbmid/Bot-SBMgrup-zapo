# Zapo WhatsApp Bot - Complete Documentation

> Dokumentasi lengkap untuk Zapo-JS WhatsApp Multi-Device Bot  
> Generated from: https://zapo.to & https://context7.com/vinikjkkj/zapo/llms.txt

---

## Table of Contents

1. [Introduction](#introduction)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Core Concepts](#core-concepts)
5. [Authentication](#authentication)
6. [Storage / Store](#storage--store)
7. [Client API](#client-api)
8. [Messaging](#messaging)
9. [Media Handling](#media-handling)
10. [Group Management](#group-management)
11. [Profile Management](#profile-management)
12. [Privacy Settings](#privacy-settings)
13. [Chat Management](#chat-management)
14. [VoIP (Voice Calls)](#voip-voice-calls)
15. [Events](#events)
16. [Webhooks](#webhooks)
17. [Multi-Session Architecture](#multi-session-architecture)
18. [Best Practices](#best-practices)

---

## Introduction

**Zapo** (npm: `zapo-js`) adalah implementasi independen dari protokol WhatsApp Web yang ditulis dalam TypeScript. Bukan wrapper atau fork dari library WhatsApp yang sudah ada.

### Design Principles

- **Index-first**: Protocol behavior divalidasi terhadap WhatsApp Web sebelum diimplementasikan
- **Performance-first**: Optimasi untuk CPU rendah, RAM rendah, alokasi minimal
- **Async-first I/O**: Operasi I/O dan network bersifat asynchronous

### Key Features

✅ Multi-Device (MD) support  
✅ Pluggable storage backends (SQLite, PostgreSQL, MySQL, MongoDB, Redis)  
✅ Type-safe API dengan TypeScript  
✅ Efficient media handling dengan streaming  
✅ VoIP support (voice calls)  
✅ Zero mandatory runtime dependencies  
✅ Multi-session capable  

---

## Requirements

### System Requirements

- **Node.js**: >= 20.9.0
- **Package Manager**: npm, pnpm, atau yarn
- **FFmpeg**: Diperlukan untuk VoIP dan media processing (harus ada di PATH)

### Dependencies

```json
{
  "zapo-js": "^1.0.0",
  "@zapo-js/store-sqlite": "latest",
  "@zapo-js/store-postgres": "latest",
  "@zapo-js/voip": "latest",
  "@roamhq/wrtc": ">=0.10.0",
  "libmlow-wasm": "^0.1.1"
}
```

---

## Installation

### Basic Installation

```bash
npm install zapo-js @zapo-js/store-sqlite
```

### With VoIP Support

```bash
npm install zapo-js @zapo-js/store-sqlite @zapo-js/voip @roamhq/wrtc libmlow-wasm
```

### With PostgreSQL (Multi-Instance)

```bash
npm install zapo-js @zapo-js/store-postgres
```

### Install FFmpeg (Windows)

```powershell
# Using Chocolatey
choco install ffmpeg

# Or download from: https://ffmpeg.org/download.html
```

---

## Core Concepts

### Architecture Overview

```
WaClient (Main Client)
├── store (Persistence Layer)
│   ├── auth (Credentials)
│   ├── signal (Signal Protocol)
│   ├── messages (Message History)
│   ├── threads (Chat List)
│   └── contacts (Contact Info)
├── message (Message Coordinator)
├── group (Group Coordinator)
├── profile (Profile Coordinator)
├── privacy (Privacy Coordinator)
├── chat (Chat State Coordinator)
├── mediaTransfer (Media Upload/Download)
└── voip (VoIP Coordinator - via plugin)
```

### JID (Jabber ID) Format

- **User JID**: `5511999999999@s.whatsapp.net`
- **Group JID**: `123456789-1234567890@g.us`
- **Broadcast JID**: `status@broadcast`
- **Device JID**: `5511999999999:1@s.whatsapp.net`
- **LID (Privacy-preserving)**: `lid:xxxxx@lid`

**Note**: Zapo prefer LID untuk privacy. Selalu gunakan `event.key.remoteJid` saat reply.

### LID User Detection

When users have LID enabled (privacy mode), you need to get their actual phone number from alternate JID fields:

**In Group Chat:**
```javascript
// LID user in group
event.key.participant = "94300352282641@lid"
event.key.participantAlt = "6283809720392@s.whatsapp.net" // Real phone number
```

**In Private Chat:**
```javascript
// LID user in private chat
event.key.remoteJid = "94300352282641@lid"
event.key.remoteJidAlt = "6283809720392@s.whatsapp.net" // Real phone number
```

**Helper to Get Real JID:**
```javascript
function getRealJid(event) {
    // For group messages from LID users
    if (event.key.participantAlt) {
        return event.key.participantAlt
    }
    
    // For private chat from LID users
    if (event.key.remoteJidAlt) {
        return event.key.remoteJidAlt
    }
    
    // Fallback to original JID
    return event.key.participant || event.key.remoteJid
}
```

---

## Authentication

### Method 1: QR Code Authentication

```typescript
import { createPinoLogger, createStore, WaClient } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'

const logger = await createPinoLogger({
    level: 'info',
    pretty: true
})

const store = createStore({
    backends: {
        sqlite: createSqliteStore({
            path: '.auth/state.sqlite',
            driver: 'auto'
        })
    },
    providers: {
        auth: 'sqlite',
        signal: 'sqlite',
        preKey: 'sqlite',
        session: 'sqlite',
        identity: 'sqlite',
        senderKey: 'sqlite',
        appState: 'sqlite',
        messages: 'sqlite',
        threads: 'sqlite',
        contacts: 'sqlite',
        privacyToken: 'sqlite'
    }
})

const client = new WaClient(
    {
        store,
        sessionId: 'default',
        connectTimeoutMs: 15_000,
        nodeQueryTimeoutMs: 30_000,
        deviceBrowser: 'Chrome',
        deviceOsDisplayName: 'Windows',
        history: {
            enabled: true,
            requireFullSync: true
        }
    },
    logger
)

// Listen for QR code
client.on('auth_qr', ({ qr, ttlMs }) => {
    console.log('Scan QR:', qr)
    console.log('Expires in:', ttlMs, 'ms')
})

// Listen for successful pairing
client.on('auth_paired', ({ credentials }) => {
    console.log('Paired! JID:', credentials.meJid)
})

// Connect
await client.connect()
```

### Method 2: Pairing Code (Phone Number)

```typescript
await client.connect()

// Request pairing code
client.on('auth_pairing_code', ({ code }) => {
    console.log(`Enter this code on your phone: ${code}`)
})

// Phone number format: country code + number (no + or spaces)
const pairingCode = await client.requestPairingCode('15551234567')
console.log('Pairing code:', pairingCode)
```

### Connection Events

```typescript
client.on('connection', (event) => {
    if (event.status === 'open') {
        console.log('Connected to WhatsApp')
    } else if (event.status === 'close') {
        console.log('Disconnected:', event.reason)
        // Handle reconnection here
    }
})
```

---

## Storage / Store

### SQLite Backend (Single Instance)

```typescript
import { createStore } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'

const store = createStore({
    backends: {
        sqlite: createSqliteStore({
            path: './data/zapo.sqlite',
            driver: 'auto' // Uses better-sqlite3 if available
        })
    },
    providers: {
        auth: 'sqlite',
        signal: 'sqlite',
        preKey: 'sqlite',
        session: 'sqlite',
        identity: 'sqlite',
        senderKey: 'sqlite',
        appState: 'sqlite',
        messages: 'sqlite',
        threads: 'sqlite',
        contacts: 'sqlite',
        privacyToken: 'sqlite'
    }
})
```

### PostgreSQL Backend (Multi-Instance)

```typescript
import { createPostgresStore } from '@zapo-js/store-postgres'

const store = createStore({
    backends: {
        postgres: createPostgresStore({
            connectionString: 'postgres://user:pass@localhost:5432/zapo'
        })
    },
    providers: {
        auth: 'postgres',
        signal: 'postgres',
        preKey: 'postgres',
        session: 'postgres',
        identity: 'postgres',
        senderKey: 'postgres',
        appState: 'postgres',
        messages: 'postgres',
        threads: 'postgres',
        contacts: 'postgres',
        privacyToken: 'postgres'
    }
})
```

### Memory Backend (Testing Only)

```typescript
const store = createStore({
    backends: {},
    providers: {
        // auth: 'memory', // WILL THROW - auth needs persistent backend
        signal: 'memory',
        senderKey: 'memory',
        appState: 'memory',
        messages: 'memory',
        threads: 'memory',
        contacts: 'memory'
    },
    memory: {
        limits: {
            signalPreKeys: 100,
            signalSessions: 500,
            messages: 10000
        }
    }
})
```

---

## Client API

### Creating WaClient

```typescript
const client = new WaClient(
    {
        store,                      // Required: Store instance
        sessionId: 'my-session',    // Required: Unique session identifier
        connectTimeoutMs: 15_000,   // Connection timeout
        nodeQueryTimeoutMs: 30_000, // Query timeout
        deviceBrowser: 'Chrome',    // Browser name
        deviceOsDisplayName: 'Windows', // OS name
        history: {
            enabled: true,           // Enable history sync
            requireFullSync: true    // Require full sync before ready
        }
    },
    logger // Optional: Logger instance
)
```

### Client Methods

```typescript
// Connect to WhatsApp
await client.connect()

// Disconnect cleanly
await client.disconnect()

// Flush pending writes
const result = await client.flushWriteBehind(5000) // timeout in ms
console.log('Remaining writes:', result.remaining)

// Logout (remove credentials)
await client.logout()

// Sync app state
const syncResult = await client.syncAppState()
// Or specific collections:
await client.syncAppState({ collections: ['regular', 'regular_high'] })

// Export app state
const exportedState = await client.exportAppState()
```

---

## Messaging

### Send Text Message

```typescript
// Simple text
const result = await client.message.send(
    '5511999999999@s.whatsapp.net',
    'Hello, World!'
)
console.log('Message ID:', result.id)
```

### Send Extended Text (with link preview)

```typescript
await client.message.send(
    '5511999999999@s.whatsapp.net',
    {
        extendedTextMessage: {
            text: 'Check out this link!',
            matchedText: 'https://example.com',
            canonicalUrl: 'https://example.com',
            title: 'Example Site',
            description: 'An example website'
        }
    }
)
```

### Send Image

```typescript
import { readFileSync } from 'node:fs'

await client.message.send(
    '5511999999999@s.whatsapp.net',
    {
        type: 'image',
        media: readFileSync('./photo.jpg'),
        mimetype: 'image/jpeg',
        caption: 'Check out this photo!'
    }
)
```

### Send Document

```typescript
await client.message.send(
    '5511999999999@s.whatsapp.net',
    {
        type: 'document',
        media: readFileSync('./document.pdf'),
        mimetype: 'application/pdf',
        fileName: 'report.pdf'
    }
)
```

### Send Audio

```typescript
await client.message.send(
    '5511999999999@s.whatsapp.net',
    {
        type: 'audio',
        media: readFileSync('./audio.mp3'),
        mimetype: 'audio/mpeg'
    }
)
```

### Send Video

```typescript
await client.message.send(
    '5511999999999@s.whatsapp.net',
    {
        type: 'video',
        media: readFileSync('./video.mp4'),
        mimetype: 'video/mp4',
        caption: 'Check this out!'
    }
)
```

### Send Sticker

```typescript
await client.message.send(
    '5511999999999@s.whatsapp.net',
    {
        type: 'sticker',
        media: readFileSync('./sticker.webp'),
        mimetype: 'image/webp'
    }
)
```

### Send to Group

```typescript
await client.message.send(
    '123456789-1234567890@g.us',
    'Hello group!'
)
```

### Reply to Message

```typescript
await client.message.send(
    '5511999999999@s.whatsapp.net',
    'This is a reply',
    {
        quote: {
            key: event.key, // From received message event
            message: event.message
        }
    }
)
```

### Mention Users

```typescript
await client.message.send(
    '123456789-1234567890@g.us',
    'Hello @5511999999999!',
    {
        mentions: ['5511999999999@s.whatsapp.net']
    }
)
```

### Send Read Receipt

```typescript
// Read receipt
await client.sendReceipt({
    to: event.chatJid!,
    id: event.stanzaId!,
    type: 'read',
    participant: event.senderJid // Required for group messages
})

// Delivery receipt
await client.sendReceipt({
    to: event.chatJid!,
    id: event.stanzaId!,
    type: 'received'
})

// Multiple messages
await client.sendReceipt({
    to: '5511999999999@s.whatsapp.net',
    id: 'LAST_MESSAGE_ID',
    listIds: ['MESSAGE_ID_1', 'MESSAGE_ID_2']
})
```

---

## Media Handling

### Download Media from Message

```typescript
const imageMessage = event.message?.imageMessage
if (imageMessage?.directPath && imageMessage?.mediaKey) {
    const decrypted = await client.mediaTransfer.downloadAndDecrypt({
        mediaType: 'image',
        directPath: imageMessage.directPath,
        mediaKey: imageMessage.mediaKey,
        fileSha256: imageMessage.fileSha256,
        fileEncSha256: imageMessage.fileEncSha256
    })

    // Save to file
    import { writeFileSync } from 'node:fs'
    writeFileSync('./downloaded-image.jpg', decrypted)
}
```

### Stream Large Media

```typescript
const videoMessage = event.message?.videoMessage
if (videoMessage?.directPath && videoMessage?.mediaKey) {
    const stream = await client.mediaTransfer.downloadAndDecryptStream({
        mediaType: 'video',
        directPath: videoMessage.directPath,
        mediaKey: videoMessage.mediaKey
    })

    // Pipe to file
    import { createWriteStream } from 'node:fs'
    import { pipeline } from 'node:stream/promises'
    await pipeline(stream.plaintext, createWriteStream('./video.mp4'))
}
```

### Supported Media Types

- `image` - JPEG, PNG, WebP
- `video` - MP4, 3GP, AVI
- `audio` - MP3, OGG, M4A, Opus
- `document` - PDF, DOCX, XLSX, etc.
- `sticker` - WebP

---

## Group Management

### Query Group Metadata

```typescript
const metadata = await client.group.queryGroupMetadata('123456789-1234567890@g.us')
console.log('Group:', metadata.subject)
console.log('Participants:', metadata.participants.length)
console.log('Admins:', metadata.participants.filter(p => p.isAdmin).map(p => p.jid))
```

### List All Groups

```typescript
const allGroups = await client.group.queryAllGroups()
for (const group of allGroups) {
    console.log(`${group.subject} (${group.jid}): ${group.size} members`)
}
```

### Create Group

```typescript
const createResult = await client.group.createGroup(
    'My New Group',
    ['5511999999999@s.whatsapp.net', '5511888888888@s.whatsapp.net'],
    { description: 'A group for testing' }
)
console.log('Created group:', createResult.groupJid)
```

### Add Participants

```typescript
await client.group.addParticipants(
    '123456789-1234567890@g.us',
    ['5511777777777@s.whatsapp.net']
)
```

### Remove Participants

```typescript
await client.group.removeParticipants(
    '123456789-1234567890@g.us',
    ['5511777777777@s.whatsapp.net']
)
```

### Promote to Admin

```typescript
await client.group.promoteParticipants(
    '123456789-1234567890@g.us',
    ['5511999999999@s.whatsapp.net']
)
```

### Demote from Admin

```typescript
await client.group.demoteParticipants(
    '123456789-1234567890@g.us',
    ['5511999999999@s.whatsapp.net']
)
```

### Update Group Settings

```typescript
// Change group name
await client.group.setSubject('123456789-1234567890@g.us', 'New Group Name')

// Change description
await client.group.setDescription('123456789-1234567890@g.us', 'Updated description')

// Announcement mode (only admins can send)
await client.group.setSetting('123456789-1234567890@g.us', 'announcement', true)

// Restrict mode (only admins can edit group info)
await client.group.setSetting('123456789-1234567890@g.us', 'restrict', true)
```

### Leave Group

```typescript
await client.group.leaveGroup(['123456789-1234567890@g.us'])
```

### Join via Invite Code

```typescript
await client.group.joinGroupViaInvite('AbCdEfGhIjKlMnOp')
```

---

## Profile Management

### Get Profile Picture

```typescript
const picture = await client.profile.getProfilePicture('5511999999999@s.whatsapp.net')
if (picture.url) {
    console.log('Profile picture URL:', picture.url)
}
```

### Set Profile Picture

```typescript
import { readFileSync } from 'node:fs'
const imageBytes = readFileSync('./profile.jpg')
const pictureId = await client.profile.setProfilePicture(imageBytes)
console.log('Profile picture updated, ID:', pictureId)
```

### Delete Profile Picture

```typescript
await client.profile.deleteProfilePicture()
```

### Get User Status

```typescript
const status = await client.profile.getStatus('5511999999999@s.whatsapp.net')
console.log('Status:', status.status)
```

### Set Status

```typescript
await client.profile.setStatus('Available')
```

### Get Multiple Profiles (Batch)

```typescript
const profiles = await client.profile.getProfiles([
    '5511999999999@s.whatsapp.net',
    '5511888888888@s.whatsapp.net'
])
for (const profile of profiles) {
    console.log(`${profile.jid}: picture=${profile.pictureId}, status=${profile.status}`)
}
```

---

## Privacy Settings

### Get Privacy Settings

```typescript
const settings = await client.privacy.getPrivacySettings()
console.log('Last seen:', settings.lastSeen)
console.log('Profile photo:', settings.profilePhoto)
console.log('Status:', settings.status)
console.log('Read receipts:', settings.readReceipts)
```

### Update Privacy Settings

```typescript
// Values: 'all', 'contacts', 'contact_blacklist', 'none'
await client.privacy.setPrivacySetting('lastSeen', 'contacts')
await client.privacy.setPrivacySetting('profilePhoto', 'contacts')
await client.privacy.setPrivacySetting('status', 'all')
```

### Get Blocklist

```typescript
const blocklist = await client.privacy.getBlocklist()
console.log('Blocked users:', blocklist.jids)
```

### Block User

```typescript
await client.privacy.blockUser('5511999999999@s.whatsapp.net')
```

### Unblock User

```typescript
await client.privacy.unblockUser('5511999999999@s.whatsapp.net')
```

---

## Chat Management

### Archive Chat

```typescript
await client.chat.setChatArchive('5511999999999@s.whatsapp.net', true)  // Archive
await client.chat.setChatArchive('5511999999999@s.whatsapp.net', false) // Unarchive
```

### Pin Chat

```typescript
await client.chat.setChatPin('5511999999999@s.whatsapp.net', true)  // Pin
await client.chat.setChatPin('5511999999999@s.whatsapp.net', false) // Unpin
```

### Mute Chat

```typescript
// Mute for 8 hours
const muteUntil = Date.now() + 8 * 60 * 60 * 1000
await client.chat.setChatMute('5511999999999@s.whatsapp.net', true, muteUntil)

// Unmute
await client.chat.setChatMute('5511999999999@s.whatsapp.net', false)
```

### Mark as Read/Unread

```typescript
await client.chat.setChatRead('5511999999999@s.whatsapp.net', true)  // Read
await client.chat.setChatRead('5511999999999@s.whatsapp.net', false) // Unread
```

### Star Message

```typescript
await client.chat.setMessageStar({
    chatJid: '5511999999999@s.whatsapp.net',
    id: 'MESSAGE_ID_HERE',
    fromMe: false,
    participantJid: '5511888888888@s.whatsapp.net' // Required for group
}, true) // true = star, false = unstar
```

### Delete Message (For Me)

```typescript
await client.chat.deleteMessageForMe({
    chatJid: '5511999999999@s.whatsapp.net',
    id: 'MESSAGE_ID_HERE',
    fromMe: true
})
```

### Clear Chat

```typescript
await client.chat.clearChat('5511999999999@s.whatsapp.net', {
    deleteStarred: false,
    deleteMedia: true
})
```

### Delete Chat

```typescript
await client.chat.deleteChat('5511999999999@s.whatsapp.net', {
    deleteMedia: true
})
```

---

## VoIP (Voice Calls)

### Installation

```bash
npm install @zapo-js/voip @roamhq/wrtc libmlow-wasm
```

**Note**: FFmpeg harus tersedia di PATH untuk `loadAudio` dan `feedLiveAudio`.

### Setup VoIP Plugin

```typescript
import { voipPlugin } from '@zapo-js/voip'

const client = new WaClient(
    {
        store,
        sessionId: 'default',
        plugins: [voipPlugin({
            maxConcurrentCalls: 1,  // Max simultaneous calls
            logLevel: 'warn'         // VoIP log level
        })]
    },
    logger
)

// VoIP coordinator available at:
const voip = client.voip
```

### Place a Call

```typescript
const callId = await client.voip.startCall('5511999999999@s.whatsapp.net', {
    video: false, // Audio only (video not implemented)
    preloadedAudio: './greeting.mp3' // Optional: play audio when connected
})
console.log('Call started:', callId)
```

### Answer Call

```typescript
client.on('voip_call_incoming', async (callInfo) => {
    console.log('Incoming call from:', callInfo.peerJid)
    
    if (callInfo.canAccept) {
        await client.voip.acceptCall(callInfo.callId)
    }
})
```

### Reject Call

```typescript
await client.voip.rejectCall(callId, 'Declined')
```

### End Call

```typescript
await client.voip.endCall(callId, 'UserEnded')
```

### Preload Audio

```typescript
await client.voip.loadAudio(callId, './announcement.mp3')
```

### Mute/Unmute

```typescript
await client.voip.setMuted(callId, true)  // Mute
await client.voip.setMuted(callId, false) // Unmute
```

### External Audio (Live Streaming)

```typescript
// Enable external audio mode
await client.voip.setExternalAudioMode(callId, true)

// Feed live audio chunks (Float32Array, 16kHz mono)
const audioChunk = new Float32Array(1024)
const bufferedMs = await client.voip.feedLiveAudio(callId, audioChunk)
console.log('Buffered:', bufferedMs, 'ms')

// Get watermarks for backpressure
const watermarks = client.voip.getFeedWatermarksMs()
console.log('Pause at:', watermarks.pauseMs)
console.log('Resume at:', watermarks.resumeMs)

// Disable external mode (return to preloaded)
await client.voip.setExternalAudioMode(callId, false)
```

### Receive Inbound Audio

```typescript
client.on('voip_call_inbound_audio', ({ call, pcm }) => {
    // pcm is Float32Array, 16kHz mono
    console.log('Received audio:', pcm.length, 'samples')
    
    // Save to buffer or process
})
```

### VoIP Events

```typescript
// Call state changed
client.on('voip_call_state', (callInfo) => {
    console.log('Call state:', callInfo.stateData.state)
    // States: initiating, ringing, incoming_ringing, connecting, active, on_hold, ended
})

// Call ended
client.on('voip_call_ended', (callInfo) => {
    console.log('Call ended:', callInfo.stateData.endReason)
    console.log('Duration:', callInfo.stateData.durationSecs, 'seconds')
})

// Preloaded audio finished
client.on('voip_call_outbound_audio_finished', (callInfo) => {
    console.log('Audio finished playing')
    // Can load new audio or end call
})

// Call error
client.on('voip_call_error', (error) => {
    console.error('VoIP error:', error)
})
```

### Audio Format

- **Sample rate**: 16 kHz
- **Channels**: Mono
- **Format**: Float32Array in [-1.0, 1.0]
- **Codec**: WhatsApp Opus (via libmlow-wasm)

---

## Events

### Message Events

```typescript
// Incoming message
client.on('message', async (event) => {
    console.log('From:', event.senderJid)
    console.log('Chat:', event.chatJid)
    
    // Text content
    const text = event.message?.conversation || 
                 event.message?.extendedTextMessage?.text
    
    if (text) {
        console.log('Text:', text)
    }
    
    // Media
    if (event.message?.imageMessage) {
        console.log('Received image')
    }
    if (event.message?.videoMessage) {
        console.log('Received video')
    }
    if (event.message?.audioMessage) {
        console.log('Received audio')
    }
    if (event.message?.documentMessage) {
        console.log('Received document')
    }
})

// Message receipt (delivered, read)
client.on('message_receipt', (event) => {
    console.log('Receipt for:', event.stanzaId)
    console.log('Type:', event.stanzaType) // 'received', 'read', 'played'
})

// Message addon (reactions, edits, polls)
client.on('message_addon', (event) => {
    console.log('Message addon:', event)
})

// Message protocol (low-level protocol messages)
client.on('message_protocol', (event) => {
    console.log('Protocol message:', event)
})
```

### Group Events

```typescript
client.on('group', (event) => {
    console.log('Group:', event.groupJid)
    console.log('Action:', event.action)
    // Actions: 'participant_add', 'participant_remove', 
    //          'participant_promote', 'participant_demote',
    //          'subject_change', 'description_change', etc.
    
    if (event.participants) {
        console.log('Participants:', event.participants.map(p => p.jid))
    }
})
```

### Chat Events

```typescript
client.on('chat_event', (event) => {
    console.log('Chat:', event.chatJid)
    console.log('Action:', event.action)
    // Actions: 'archive', 'unarchive', 'pin', 'unpin', 
    //          'mute', 'unmute', 'delete', 'clear'
})
```

### Presence Events

```typescript
client.on('presence', (event) => {
    console.log('JID:', event.jid)
    console.log('Presence:', event.presence) // 'available', 'unavailable'
})

client.on('chatstate', (event) => {
    console.log('JID:', event.jid)
    console.log('State:', event.state) // 'composing', 'paused'
})
```

### History Sync

```typescript
client.on('history_sync_chunk', (event) => {
    console.log('Synced messages:', event.messagesCount)
    console.log('Synced conversations:', event.conversationsCount)
})
```

### Receipt Events

```typescript
client.on('receipt', (event) => {
    console.log('Receipt from:', event.from)
    console.log('Message ID:', event.id)
    console.log('Type:', event.type)
})
```

---

## Webhooks

### Webhook Architecture

Untuk multi-session bot dengan webhook, kita perlu:

1. **HTTP Server** untuk receive webhook events
2. **Event Emitter** untuk forward events ke webhook URL
3. **Session Manager** untuk manage multiple WhatsApp sessions

### Basic Webhook Setup

```typescript
import express from 'express'
import axios from 'axios'

const app = express()
app.use(express.json())

// Webhook configuration per session
interface WebhookConfig {
    url: string
    events: string[] // ['message', 'group', 'receipt', etc.]
    secret?: string  // For signature validation
}

// Send event to webhook
async function sendWebhook(sessionId: string, event: string, data: any) {
    const config = getWebhookConfig(sessionId)
    if (!config || !config.events.includes(event)) return
    
    try {
        await axios.post(config.url, {
            sessionId,
            event,
            timestamp: Date.now(),
            data
        }, {
            headers: {
                'X-Webhook-Signature': generateSignature(data, config.secret)
            }
        })
    } catch (error) {
        console.error('Webhook error:', error)
    }
}

// Setup client with webhook
client.on('message', async (event) => {
    await sendWebhook('session1', 'message', event)
})
```

### Webhook Event Types

```typescript
type WebhookEvent = 
    | 'message'           // Incoming message
    | 'message_receipt'   // Message read/delivered
    | 'group'             // Group events
    | 'chat'              // Chat state changes
    | 'presence'          // User online/offline
    | 'chatstate'         // Typing indicator
    | 'voip_call'         // VoIP call events
    | 'connection'        // Connection status
    | 'auth_qr'           // QR code for pairing
    | 'auth_paired'       // Successfully paired
```

---

## Multi-Session Architecture

### Session Manager Structure

```typescript
interface Session {
    id: string
    client: WaClient
    store: any
    status: 'connecting' | 'connected' | 'disconnected'
    qr?: string
    webhookConfig?: WebhookConfig
    createdAt: Date
    lastActivity: Date
}

class SessionManager {
    private sessions: Map<string, Session> = new Map()
    
    async createSession(sessionId: string): Promise<Session> {
        // Create store for session
        const store = createStore({
            backends: {
                sqlite: createSqliteStore({
                    path: `./sessions/${sessionId}/state.sqlite`,
                    driver: 'auto'
                })
            },
            providers: { /* ... */ }
        })
        
        // Create client
        const client = new WaClient(
            { store, sessionId },
            logger
        )
        
        // Setup event forwarding
        this.setupEventForwarding(sessionId, client)
        
        // Store session
        const session: Session = {
            id: sessionId,
            client,
            store,
            status: 'disconnected',
            createdAt: new Date(),
            lastActivity: new Date()
        }
        
        this.sessions.set(sessionId, session)
        return session
    }
    
    async getSession(sessionId: string): Promise<Session | undefined> {
        return this.sessions.get(sessionId)
    }
    
    async deleteSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId)
        if (session) {
            await session.client.disconnect()
            this.sessions.delete(sessionId)
        }
    }
    
    listSessions(): Session[] {
        return Array.from(this.sessions.values())
    }
    
    private setupEventForwarding(sessionId: string, client: WaClient) {
        client.on('message', (event) => {
            this.emit('session_message', { sessionId, event })
        })
        // ... forward other events
    }
}
```

### REST API for Session Management

```typescript
// Create session
app.post('/api/sessions', async (req, res) => {
    const { sessionId } = req.body
    const session = await sessionManager.createSession(sessionId)
    res.json({ success: true, session: { id: session.id, status: session.status } })
})

// Get session
app.get('/api/sessions/:sessionId', async (req, res) => {
    const session = await sessionManager.getSession(req.params.sessionId)
    if (!session) {
        return res.status(404).json({ error: 'Session not found' })
    }
    res.json({ session: { id: session.id, status: session.status, qr: session.qr } })
})

// Connect session
app.post('/api/sessions/:sessionId/connect', async (req, res) => {
    const session = await sessionManager.getSession(req.params.sessionId)
    if (!session) {
        return res.status(404).json({ error: 'Session not found' })
    }
    await session.client.connect()
    res.json({ success: true })
})

// Send message
app.post('/api/sessions/:sessionId/send', async (req, res) => {
    const session = await sessionManager.getSession(req.params.sessionId)
    if (!session) {
        return res.status(404).json({ error: 'Session not found' })
    }
    
    const { to, message } = req.body
    const result = await session.client.message.send(to, message)
    res.json({ success: true, messageId: result.id })
})

// Set webhook
app.post('/api/sessions/:sessionId/webhook', async (req, res) => {
    const session = await sessionManager.getSession(req.params.sessionId)
    if (!session) {
        return res.status(404).json({ error: 'Session not found' })
    }
    
    session.webhookConfig = req.body
    res.json({ success: true })
})
```

---

## Best Practices

### 1. Error Handling

```typescript
client.on('connection', async (event) => {
    if (event.status === 'close') {
        console.log('Disconnected:', event.reason)
        
        // Handle different disconnect reasons
        switch (event.reason) {
            case 'logged_out':
                // Credentials invalid, need to re-pair
                await client.logout()
                break
            case 'connection_lost':
                // Network issue, retry
                setTimeout(() => client.connect(), 5000)
                break
            case 'connection_closed':
                // Normal close
                break
        }
    }
})
```

### 2. Graceful Shutdown

```typescript
async function shutdown() {
    console.log('Shutting down...')
    
    // Flush pending writes
    const flushResult = await client.flushWriteBehind(5000)
    if (flushResult.remaining > 0) {
        console.warn(`${flushResult.remaining} writes still pending`)
    }
    
    // Disconnect
    await client.disconnect()
    console.log('Disconnected cleanly')
    
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
```

### 3. Rate Limiting

```typescript
// Simple rate limiter
class RateLimiter {
    private queue: Array<() => Promise<any>> = []
    private running = false
    
    async add<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await fn()
                    resolve(result)
                } catch (error) {
                    reject(error)
                }
            })
            this.process()
        })
    }
    
    private async process() {
        if (this.running || this.queue.length === 0) return
        
        this.running = true
        const fn = this.queue.shift()
        if (fn) {
            await fn()
            await new Promise(resolve => setTimeout(resolve, 1000)) // 1s delay
        }
        this.running = false
        this.process()
    }
}

const limiter = new RateLimiter()

// Use with sends
await limiter.add(() => client.message.send(jid, text))
```

### 4. Logging Configuration

```typescript
// Production: JSON output
const prodLogger = await createPinoLogger({
    level: 'info',
    name: 'zapo-prod',
    pretty: false
})

// Development: Pretty output
const devLogger = await createPinoLogger({
    level: 'debug',
    pretty: true,
    prettyOptions: {
        colorize: true,
        translateTime: 'HH:MM:ss'
    }
})

// Use environment-based
const logger = process.env.NODE_ENV === 'production' ? prodLogger : devLogger
```

### 5. Message Queue (for high volume)

```typescript
import Bull from 'bull'

const messageQueue = new Bull('messages', {
    redis: { port: 6379, host: 'localhost' }
})

messageQueue.process(async (job) => {
    const { sessionId, to, message } = job.data
    const session = await sessionManager.getSession(sessionId)
    
    if (session && session.status === 'connected') {
        await session.client.message.send(to, message)
    } else {
        throw new Error('Session not connected')
    }
})

// Add to queue
await messageQueue.add({
    sessionId: 'session1',
    to: '5511999999999@s.whatsapp.net',
    message: 'Hello!'
})
```

### 6. Database Schema for Multi-Session

```sql
-- Sessions table
CREATE TABLE sessions (
    id VARCHAR(50) PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    webhook_url TEXT,
    webhook_events JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages log (optional)
CREATE TABLE messages (
    id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    chat_jid VARCHAR(100) NOT NULL,
    sender_jid VARCHAR(100),
    message_type VARCHAR(20),
    content TEXT,
    timestamp BIGINT,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

---

## Additional Resources

- **Official Documentation**: https://zapo.to
- **GitHub Repository**: https://github.com/vinikjkkj/zapo
- **npm Package**: https://npmjs.com/package/zapo-js
- **LLM Context**: https://context7.com/vinikjkkj/zapo/llms.txt

---

## Credits

Zapo VoIP plugin was built by:
- @vinikjkkj
- @edgardmessias (Edgard Lorraine Messias)
- @w3nder (Wender Teixeira)

---

## Disclaimer

This project is an independent implementation for engineering and interoperability research. It is not affiliated with or endorsed by WhatsApp.

---

**Last Updated**: 2026-08-19


---

## Known Issues & Workarounds

### VoIP Call Feature - FIXED!

**Status**: ✅ **WORKING** - VoIP commands restored with correct API format

**Previous Issue**: Commands were using incorrect parameter format for `startCall()`

**Fix Applied**: Updated to use correct object parameter format:
```javascript
// ✅ CORRECT format
await client.voip.startCall({
  peerJid: '628xxx@s.whatsapp.net',
  isVideo: false,
  audioFile: './audio.mp3'  // optional, requires ffmpeg
})

// ❌ OLD WRONG format
await client.voip.startCall('628xxx@s.whatsapp.net', { video: false })
```

**Available Commands**:
- `.call <phone> <query>` - Call with audio search (no playback)
- `.callme` - Call yourself back
- `.callfile <phone> <path>` - Call with local audio file (requires ffmpeg)

**Requirements**:
- FFmpeg installed for audio playback (optional for basic calls)
- Valid phone number in international format (628xxx)

**Note**: Audio search works but SoundCloud doesn't provide direct download URLs, so `.call` command makes call without audio playback. Use `.callfile` with local MP3 for audio playback.

---
