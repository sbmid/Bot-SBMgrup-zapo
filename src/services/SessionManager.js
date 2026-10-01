import { WaClient, createStore, ConsoleLogger } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'
import { voipPlugin } from '@zapo-js/voip'
import { wamPlugin } from '@zapo-js/wam'
import { createMediaProcessor } from '@zapo-js/media-utils'
import { createHmac } from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import EventEmitter from 'events'
import axios from 'axios'
import { CommandHandler } from './CommandHandler.js'
import { handleGameMessage } from './GameHandler.js'
import { getGroupSettings } from '../database/groupSettings.js'
import { getActiveSession, getSessionRole, incrementMessageCount, logMessage, endSession } from '../database/confess.js'
import { getUser, addCoins } from '../database/game.js'
import { getPhoneNumberFromLid } from '../database/contacts.js'

export class SessionManager extends EventEmitter {
    constructor() {
        super()
        this.sessions = new Map()
        this.sessionsPath = process.env.SESSIONS_PATH || './sessions'
        this.commandHandler = new CommandHandler()
    }

    async initialize() {
        // Load commands once for all sessions
        await this.commandHandler.loadCommands()
        this.commandHandler.startAutoReload()
        console.log('Command handler initialized')

        // Restore existing sessions from disk
        await this.restoreSessions()
    }

    async restoreSessions() {
        try {
            const dirs = await fs.readdir(this.sessionsPath)
            
            for (const sessionId of dirs) {
                const sessionPath = path.join(this.sessionsPath, sessionId)
                const stat = await fs.stat(sessionPath)
                
                if (stat.isDirectory()) {
                    try {
                        console.log(`Restoring session: ${sessionId}`)
                        await this.createSession(sessionId)
                        
                        // Auto-connect restored session
                        const session = this.sessions.get(sessionId)
                        if (session) {
                            try {
                                await session.client.connect()
                                console.log(`✓ Session ${sessionId} restored & connected`)
                            } catch (error) {
                                console.log(`✓ Session ${sessionId} restored (connect failed: ${error.message})`)
                            }
                        }
                    } catch (error) {
                        if (error.message.includes('already exists')) {
                            // Session already loaded, skip
                        } else {
                            console.error(`✗ Failed to restore ${sessionId}:`, error.message)
                        }
                    }
                }
            }
            
            console.log(`Restored ${this.sessions.size} sessions`)
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No existing sessions to restore')
            } else {
                console.error('Error restoring sessions:', error)
            }
        }
    }

    async createSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} already exists`)
        }

        // Create session directory
        const sessionPath = path.join(this.sessionsPath, sessionId)
        await fs.mkdir(sessionPath, { recursive: true })

        // Create simple console logger (no pino dependency needed)
        const logger = new ConsoleLogger(process.env.LOG_LEVEL || 'info')

        // Create store
        const store = createStore({
            backends: {
                sqlite: createSqliteStore({
                    path: path.join(sessionPath, 'state.sqlite'),
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

        // Create client with VoIP plugin and media processor
        const client = new WaClient(
            {
                store,
                sessionId,
                connectTimeoutMs: 15_000,
                nodeQueryTimeoutMs: 30_000,
                deviceBrowser: 'Chrome',
                deviceOsDisplayName: 'Windows',
                history: {
                    enabled: true,
                    requireFullSync: false
                },
                media: {
                    processor: createMediaProcessor(),
                    generateThumbnail: true,
                    generateWaveform: true,
                    normalizeVoiceNote: true
                },
                plugins: [
                    voipPlugin({
                        maxConcurrentCalls: 10,
                        logLevel: 'warn'
                    }),
                    wamPlugin({
                        syntheticUi: false, // Disable synthetic UI for command bot
                        logLevel: 'debug' // Enable debug logs to see WAM activity
                    })
                ]
            },
            logger
        )

        // Session object
        const session = {
            id: sessionId,
            client,
            store,
            logger,
            status: 'disconnected',
            qr: null,
            webhookConfig: null,
            createdAt: new Date(),
            lastActivity: new Date(),
            commandHandler: this.commandHandler
        }

        // Setup event forwarding
        this._setupEventForwarding(session)

        this.sessions.set(sessionId, session)
        return session
    }

    _setupEventForwarding(session) {
        const { id, client } = session

        console.log(`Setting up event forwarding for session: ${id}`)

        // Connection events
        client.on('connection', (event) => {
            session.status = event.status === 'open' ? 'connected' : 'disconnected'
            session.lastActivity = new Date()
            console.log(`[${id}] Connection status: ${session.status}`)
            this.emit('session_connection', { sessionId: id, event })
            this._forwardWebhook(id, 'connection', event)
        })

        // QR code
        client.on('auth_qr', (event) => {
            session.qr = event.qr
            session.lastActivity = new Date()
            this.emit('session_qr', { sessionId: id, qr: event.qr })
            this._forwardWebhook(id, 'auth_qr', event)
        })

        // Paired
        client.on('auth_paired', (event) => {
            session.qr = null
            session.lastActivity = new Date()
            this.emit('session_paired', { sessionId: id, event })
            this._forwardWebhook(id, 'auth_paired', event)
        })

        // Messages
        client.on('message', async (event) => {
            session.lastActivity = new Date()
            
            // Log incoming message for debugging
            const text = event.message?.conversation || 
                        event.message?.extendedTextMessage?.text || ''
            
            console.log(`[${id}] Message received:`, text.substring(0, 50))
            
            // Get chat/sender info
            const chatJid = event.key.remoteJid
            const senderJid = event.key.participant || event.key.remoteJid
            
            // Check antilink (before command handling)
            if (chatJid?.endsWith('@g.us')) {
                try {
                    await this._handleAntilink(session, event, chatJid, senderJid)
                } catch (err) {
                    console.error('[SessionManager] Antilink error:', err)
                }
            }
            
            // Handle confess session (before everything else, in private chat only)
            if (!chatJid?.endsWith('@g.us')) {
                try {
                    console.log('[SessionManager] Checking confess session for:', senderJid, 'Text:', text)
                    const confessHandled = await this._handleConfessSession(session, event, senderJid, text)
                    if (confessHandled) {
                        console.log('[SessionManager] Message handled by confess')
                        return // Stop further processing
                    }
                } catch (err) {
                    console.error('[SessionManager] Confess error:', err)
                }
            }
            
            // Handle game messages first (non-command answers)
            let gameHandled = false
            try {
                gameHandled = await handleGameMessage(event, session, chatJid, senderJid)
            } catch (err) {
                console.error('[SessionManager] GameHandler error:', err)
            }
            
            // Handle commands (if not handled by game)
            if (!gameHandled) {
                this.commandHandler.handleMessage(session, event)
            }
            
            // Emit event for webhook
            this.emit('session_message', { sessionId: id, event })
            this._forwardWebhook(id, 'message', event)
        })
        
        // Bot chunk events (Meta AI streaming responses)
        client.on('message_bot_chunk', (event) => {
            session.lastActivity = new Date()
            
            const text = event.message?.conversation ?? ''
            const editType = event.editType // 'first', 'inner', 'last', 'full'
            
            console.log(`[${id}] Bot chunk (${editType}):`, text.substring(0, 50))
            
            // Emit for potential webhook/logging
            this.emit('session_bot_chunk', { sessionId: id, event })
            this._forwardWebhook(id, 'bot_chunk', event)
        })

        // Message receipts
        client.on('message_receipt', (event) => {
            this.emit('session_message_receipt', { sessionId: id, event })
            this._forwardWebhook(id, 'message_receipt', event)
        })

        // Group events
        client.on('group', async (event) => {
            session.lastActivity = new Date()
            
            // Handle welcome message for new members
            if (event.action === 'add' && event.groupJid && event.participants?.length) {
                try {
                    await this._handleWelcome(session, event)
                } catch (err) {
                    console.error('[SessionManager] Welcome error:', err)
                }
            }
            
            this.emit('session_group', { sessionId: id, event })
            this._forwardWebhook(id, 'group', event)
        })

        // Chat events
        client.on('chat_event', (event) => {
            this.emit('session_chat', { sessionId: id, event })
            this._forwardWebhook(id, 'chat', event)
        })

        // Presence
        client.on('presence', (event) => {
            this.emit('session_presence', { sessionId: id, event })
            this._forwardWebhook(id, 'presence', event)
        })

        // Chat state (typing)
        client.on('chatstate', (event) => {
            this.emit('session_chatstate', { sessionId: id, event })
            this._forwardWebhook(id, 'chatstate', event)
        })

        // VoIP events
        if (client.voip) {
            // Store call timers for 30-minute auto-disconnect
            const callTimers = new Map()
            
            client.on('voip_call_state', (event) => {
                console.log(`[${id}] VoIP call state:`, event.stateData.state, 'CallID:', event.callId)
                
                // Start 30-minute timer when call becomes active
                if (event.stateData.state === 'active' && !callTimers.has(event.callId)) {
                    console.log(`[${id}] Starting 30-minute timer for call ${event.callId}`)
                    
                    const timer = setTimeout(async () => {
                        try {
                            console.log(`[${id}] 30-minute limit reached for call ${event.callId}, ending...`)
                            await client.voip.endCall(event.callId)
                            callTimers.delete(event.callId)
                        } catch (err) {
                            console.error(`[${id}] Failed to auto-end call:`, err.message)
                        }
                    }, 30 * 60 * 1000) // 30 minutes
                    
                    callTimers.set(event.callId, timer)
                }
                
                // Clear timer when call ends
                if (event.stateData.state === 'ended' && callTimers.has(event.callId)) {
                    clearTimeout(callTimers.get(event.callId))
                    callTimers.delete(event.callId)
                    console.log(`[${id}] Cleared timer for ended call ${event.callId}`)
                }
                
                this.emit('session_voip_call', { sessionId: id, event })
                this._forwardWebhook(id, 'voip_call', event)
            })

            client.on('voip_call_incoming', async (event) => {
                console.log(`[${id}] VoIP incoming call from:`, event.peerJid)
                
                // Check if call limit reached (10 max)
                const currentCalls = client.voip.getCalls().filter(c => !c.isEnded)
                const MAX_CONCURRENT_CALLS = 10
                
                if (currentCalls.length >= MAX_CONCURRENT_CALLS) {
                    console.log(`[${id}] Call limit reached (${MAX_CONCURRENT_CALLS}), rejecting call`)
                    try {
                        await client.voip.rejectCall(event.callId)
                    } catch (err) {
                        console.error(`[${id}] Failed to reject call:`, err.message)
                    }
                    return
                }
                
                // Auto-accept all incoming calls (public access)
                if (event.canAccept && !event.isAcceptBlocked) {
                    try {
                        await client.voip.acceptCall(event.callId)
                        console.log(`[${id}] Auto-accepted call from ${event.peerJid}`)
                    } catch (err) {
                        console.error(`[${id}] Failed to accept call:`, err.message)
                    }
                } else {
                    console.log(`[${id}] Cannot accept call - canAccept:`, event.canAccept, 'blocked:', event.isAcceptBlocked)
                }
                
                this.emit('session_voip_incoming', { sessionId: id, event })
                this._forwardWebhook(id, 'voip_incoming', event)
            })
            
            client.on('voip_call_ended', (event) => {
                console.log(`[${id}] VoIP call ended:`, event.stateData.endReason, 'Duration:', event.stateData.durationSecs, 's')
            })
            
            client.on('voip_call_outbound_audio_finished', (event) => {
                console.log(`[${id}] VoIP audio finished playing for call:`, event.callId)
            })
            
            client.on('voip_call_error', (error) => {
                console.error(`[${id}] VoIP error:`, error.message)
            })
        }
    }

    async _forwardWebhook(sessionId, event, data) {
        const session = this.sessions.get(sessionId)
        if (!session?.webhookConfig) return

        const { url, events, secret } = session.webhookConfig
        if (!events.includes(event)) return

        try {
            const axios = (await import('axios')).default
            await axios.post(url, {
                sessionId,
                event,
                timestamp: Date.now(),
                data
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': this._generateSignature(data, secret)
                },
                timeout: 10000
            })
        } catch (error) {
            console.error(`Webhook error for session ${sessionId}:`, error.message)
        }
    }

    _generateSignature(data, secret) {
        if (!secret) return ''
        try {
            return createHmac('sha256', secret)
                .update(JSON.stringify(data))
                .digest('hex')
        } catch (error) {
            console.error('Error generating signature:', error)
            return ''
        }
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId)
    }

    listSessions() {
        return Array.from(this.sessions.values()).map(s => ({
            id: s.id,
            status: s.status,
            hasQr: !!s.qr,
            hasWebhook: !!s.webhookConfig,
            createdAt: s.createdAt,
            lastActivity: s.lastActivity
        }))
    }

    async deleteSession(sessionId) {
        const session = this.sessions.get(sessionId)
        if (!session) return false

        try {
            await session.client.disconnect()
        } catch (error) {
            console.error('Error disconnecting session:', error)
        }

        this.sessions.delete(sessionId)
        return true
    }

    async shutdownAll() {
        console.log('Shutting down all sessions...')
        for (const [id, session] of this.sessions) {
            try {
                await session.client.flushWriteBehind(5000)
                await session.client.disconnect()
                console.log(`✓ Session ${id} disconnected`)
            } catch (error) {
                console.error(`✗ Error shutting down session ${id}:`, error.message)
            }
        }
    }

    // Antilink handler - delete messages with group links
    async _handleAntilink(session, event, chatJid, senderJid) {
        const settings = getGroupSettings(chatJid)
        if (!settings.antilink) return
        
        // Get message text
        const text = event.message?.conversation || 
                    event.message?.extendedTextMessage?.text || ''
        
        // Check if message contains group link
        const groupLinkRegex = /chat\.whatsapp\.com\/[a-zA-Z0-9]+/gi
        if (!groupLinkRegex.test(text)) return
        
        // Get bot's JID
        const botJid = session.client.getCredentials()?.meJid
        if (!botJid) return
        
        // Check if sender is admin
        try {
            const metadata = await session.client.group.queryGroupMetadata(chatJid)
            const senderParticipant = metadata.participants.find(p => p.jid === senderJid)
            
            // Don't delete if sender is admin
            if (senderParticipant?.isAdmin || senderParticipant?.isSuperAdmin) return
            
            // Check if bot is admin
            const botParticipant = metadata.participants.find(p => p.jid === botJid)
            if (!botParticipant?.isAdmin && !botParticipant?.isSuperAdmin) {
                console.log('[Antilink] Bot is not admin, cannot delete message')
                return
            }
            
            // Delete message (revoke for everyone)
            console.log('[Antilink] Deleting group link message from', senderJid.split('@')[0])
            await session.client.message.send(chatJid, {
                type: 'revoke',
                target: event
            })
        } catch (error) {
            console.error('[Antilink] Error:', error.message)
        }
    }
    
    // Welcome handler - send welcome image for new members
    async _handleWelcome(session, event) {
        const settings = getGroupSettings(event.groupJid)
        if (!settings.welcome) return
        
        try {
            // Get group metadata
            const metadata = await session.client.group.queryGroupMetadata(event.groupJid)
            
            // Process each new member
            for (const participant of event.participants) {
                if (!participant.jid) continue
                
                const memberJid = participant.jid
                const username = memberJid.split('@')[0]
                
                // Get profile picture or use fallback
                let avatarUrl = 'https://i.pinimg.com/736x/af/cb/45/afcb4549a64c6b3a38d5d7209588b158.jpg'
                try {
                    const profilePic = await session.client.profile.getProfilePicture(memberJid, 'preview')
                    if (profilePic?.url) {
                        avatarUrl = profilePic.url
                    }
                } catch (err) {
                    // Use fallback avatar
                }
                
                // Build welcome image URL
                const welcomeUrl = `https://api.siputzx.my.id/api/canvas/welcomev2?` +
                    `username=${encodeURIComponent(username)}&` +
                    `guildName=${encodeURIComponent(metadata.subject)}&` +
                    `memberCount=${metadata.participants.length}&` +
                    `avatar=${encodeURIComponent(avatarUrl)}&` +
                    `background=${encodeURIComponent('https://i.pinimg.com/1200x/cc/cb/41/cccb4142357fc6cd3fc22196c95b319d.jpg')}`
                
                // Download welcome image
                const response = await axios.get(welcomeUrl, {
                    responseType: 'arraybuffer',
                    timeout: 15000
                })
                
                if (response.data) {
                    // Send welcome image
                    await session.client.message.send(event.groupJid, {
                        type: 'image',
                        media: Buffer.from(response.data),
                        caption: `Welcome @${username} to ${metadata.subject}!`
                    }, {
                        mentions: [memberJid]
                    })
                    
                    console.log('[Welcome] Sent welcome image for', username)
                }
            }
        } catch (error) {
            console.error('[Welcome] Error:', error.message)
        }
    }

    // Confess session handler - forward messages between anonymous users
    async _handleConfessSession(session, event, userJid, text) {
        console.log('[Confess Handler] Called with JID:', userJid, 'Text:', text)
        
        // Skip if message is a command (starts with .)
        if (text.startsWith('.')) {
            console.log('[Confess Handler] Skipped - is command')
            return false
        }
        
        // Check active session
        const activeSession = getActiveSession(userJid)
        console.log('[Confess Handler] Active session:', activeSession ? activeSession.confess_id : 'none')
        
        if (!activeSession) return false
        
        // Skip stickers
        if (event.message?.stickerMessage) {
            await session.client.message.send(userJid, {
                type: 'text',
                text: '❌ Sticker tidak didukung dalam confess'
            })
            return true // Handled (blocked)
        }
        
        // Get role
        const role = getSessionRole(userJid, activeSession.confess_id)
        if (!role) return false
        
        const targetJid = role === 'sender' ? activeSession.receiver_jid : activeSession.sender_jid
        
        // Extract message info for logging
        const messageText = text || '[media]'
        const mediaType = event.message?.imageMessage ? 'image' :
                         event.message?.videoMessage ? 'video' :
                         event.message?.audioMessage ? 'audio' :
                         event.message?.documentMessage ? 'document' :
                         event.message?.extendedTextMessage ? 'text' : 'text'
        
        // SENDER: Check coins and deduct
        if (role === 'sender') {
            // Get phone number (prioritize remoteJidAlt for LID)
            const actualJid = event.key.remoteJidAlt || userJid
            let phoneNumber = actualJid.split('@')[0]
            
            // If still LID format, try database mapping
            if (actualJid.includes('@lid')) {
                const mappedPhone = await getPhoneNumberFromLid(actualJid)
                if (mappedPhone) {
                    phoneNumber = mappedPhone
                }
            }
            
            console.log('[Confess] Sender JID:', userJid)
            console.log('[Confess] Actual JID:', actualJid)
            console.log('[Confess] Sender phone:', phoneNumber)
            const user = getUser(phoneNumber)
            console.log('[Confess] Sender coins:', user.coins)
            
            if (user.coins < 20) {
                await session.client.message.send(userJid, {
                    type: 'text',
                    text: 
                        `❌ *Koin tidak cukup!*\n\n` +
                        `Dibutuhkan: 20 coins\n` +
                        `Koin kamu: ${user.coins} coins\n\n` +
                        `💡 Ketik .end untuk mengakhiri session`
                })
                return true // Handled (blocked)
            }
            
            // Deduct coins
            addCoins(phoneNumber, -20, 'confess', 'Send confess message')
            const newCoins = user.coins - 20
            
            // Re-send message to target (extract content from event.message)
            const messageContent = await this._extractMessageContent(session, event.message)
            if (messageContent) {
                await session.client.message.send(targetJid, messageContent)
            }
            
            // Confirm to sender
            await session.client.message.send(userJid, {
                type: 'text',
                text: `✅ Pesan terkirim (20 coins)\n💵 Sisa: ${newCoins} coins`
            })
            
            // Log & increment
            incrementMessageCount(activeSession.confess_id, 'sender')
            logMessage(activeSession.confess_id, 'sender', messageText, mediaType)
            
            console.log(`[Confess] Sender sent message in #${activeSession.confess_id}`)
            return true
        }
        
        // RECEIVER: Forward FREE
        if (role === 'receiver') {
            // Notify sender first
            await session.client.message.send(targetJid, {
                type: 'text',
                text: `💬 Balasan dari confess #${activeSession.confess_id}:`
            })
            
            // Re-send message to sender
            const messageContent = await this._extractMessageContent(session, event.message)
            if (messageContent) {
                await session.client.message.send(targetJid, messageContent)
            }
            
            // Log & increment
            incrementMessageCount(activeSession.confess_id, 'receiver')
            logMessage(activeSession.confess_id, 'receiver', messageText, mediaType)
            
            console.log(`[Confess] Receiver replied in #${activeSession.confess_id}`)
            return true
        }
        
        return false
    }

    // Extract message content for re-sending
    async _extractMessageContent(session, message) {
        // Text message
        if (message.conversation) {
            return { type: 'text', text: message.conversation }
        }
        
        // Extended text (with links, etc)
        if (message.extendedTextMessage) {
            return { type: 'text', text: message.extendedTextMessage.text }
        }
        
        // Image
        if (message.imageMessage) {
            const buffer = await session.client.message.downloadMedia(message.imageMessage)
            return {
                type: 'image',
                media: buffer,
                caption: message.imageMessage.caption || '',
                mimetype: message.imageMessage.mimetype || 'image/jpeg'
            }
        }
        
        // Video
        if (message.videoMessage) {
            const buffer = await session.client.message.downloadMedia(message.videoMessage)
            return {
                type: 'video',
                media: buffer,
                caption: message.videoMessage.caption || '',
                mimetype: message.videoMessage.mimetype || 'video/mp4'
            }
        }
        
        // Audio
        if (message.audioMessage) {
            const buffer = await session.client.message.downloadMedia(message.audioMessage)
            return {
                type: 'audio',
                media: buffer,
                mimetype: message.audioMessage.mimetype || 'audio/ogg; codecs=opus'
            }
        }
        
        // Document
        if (message.documentMessage) {
            const buffer = await session.client.message.downloadMedia(message.documentMessage)
            return {
                type: 'document',
                media: buffer,
                fileName: message.documentMessage.fileName || 'file',
                mimetype: message.documentMessage.mimetype || 'application/octet-stream'
            }
        }
        
        return null
    }
}
