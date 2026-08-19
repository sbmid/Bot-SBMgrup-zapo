import { WaClient, createStore, ConsoleLogger } from 'zapo-js'
import { createSqliteStore } from '@zapo-js/store-sqlite'
import { voipPlugin } from '@zapo-js/voip'
import { createHmac } from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import EventEmitter from 'events'
import { CommandHandler } from './CommandHandler.js'

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

        // Create client with VoIP plugin
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
                plugins: [voipPlugin({
                    maxConcurrentCalls: 1,
                    logLevel: 'warn'
                })]
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
        client.on('message', (event) => {
            session.lastActivity = new Date()
            
            // Log incoming message for debugging
            const text = event.message?.conversation || 
                        event.message?.extendedTextMessage?.text || ''
            console.log(`[${id}] Message received:`, text.substring(0, 50))
            
            // Handle commands
            this.commandHandler.handleMessage(session, event)
            
            // Emit event for webhook
            this.emit('session_message', { sessionId: id, event })
            this._forwardWebhook(id, 'message', event)
        })

        // Message receipts
        client.on('message_receipt', (event) => {
            this.emit('session_message_receipt', { sessionId: id, event })
            this._forwardWebhook(id, 'message_receipt', event)
        })

        // Group events
        client.on('group', (event) => {
            session.lastActivity = new Date()
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
            client.on('voip_call_state', (event) => {
                this.emit('session_voip_call', { sessionId: id, event })
                this._forwardWebhook(id, 'voip_call', event)
            })

            client.on('voip_call_incoming', (event) => {
                this.emit('session_voip_incoming', { sessionId: id, event })
                this._forwardWebhook(id, 'voip_incoming', event)
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
}
