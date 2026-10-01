import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { getResponse } from '../utils/responseStore.js'
import { saveOrUpdateContact, getContactByJid } from '../database/contacts.js'
import { extractIdentityPair, extractMessageText, lazy } from '../utils/messageUtils.js'
import { isLocked } from '../utils/lockState.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TYPING_REFRESH = 8_000 // Refresh typing indicator every 8 seconds

// Import stealth decoder
let stealthDecoder = null

export class CommandHandler {
    constructor() {
        this.commands = new Map()
        this.categories = new Map()
        this.prefix = process.env.BOT_PREFIX || '.'
        // Regex untuk detect command: simbol/emoji diikuti optional spasi, lalu command
        this.commandPattern = /^[\W_]+\s*(\w+)/
        this.isWatching = false
    }

    async loadCommands() {
        // Clear maps before loading to allow clean reload
        this.commands.clear()
        this.categories.clear()

        const commandsDir = path.join(__dirname, '../commands')
        const categories = await fs.readdir(commandsDir)

        for (const category of categories) {
            const categoryPath = path.join(commandsDir, category)
            const stat = await fs.stat(categoryPath)

            if (!stat.isDirectory()) continue

            const files = await fs.readdir(categoryPath)
            const categoryCommands = []

            for (const file of files) {
                if (!file.endsWith('.js')) continue

                const filePath = path.join(categoryPath, file)
                const fileUrl = pathToFileURL(filePath).href + `?v=${Date.now()}`
                const command = await import(fileUrl)
                const cmdName = file.replace('.js', '')

                if (command.default) {
                    const cmd = {
                        ...command.default,
                        category
                    }

                    // Register main command name
                    this.commands.set(cmdName, cmd)
                    categoryCommands.push(cmdName)

                    // Register aliases
                    if (cmd.aliases && Array.isArray(cmd.aliases)) {
                        for (const alias of cmd.aliases) {
                            this.commands.set(alias.toLowerCase(), cmd)
                        }
                    }
                }
            }

            if (categoryCommands.length > 0) {
                this.categories.set(category, categoryCommands)
            }
        }

        console.log(`Loaded ${this.commands.size} commands in ${this.categories.size} categories`)
        return { totalCommands: this.commands.size, totalCategories: this.categories.size }
    }

    startAutoReload() {
        if (this.isWatching) return
        this.isWatching = true

        const commandsDir = path.join(__dirname, '../commands')
        let debounceTimer = null

        try {
            import('fs').then(({ watch }) => {
                watch(commandsDir, { recursive: true }, (eventType, filename) => {
                    if (filename && filename.endsWith('.js')) {
                        clearTimeout(debounceTimer)
                        debounceTimer = setTimeout(async () => {
                            console.log(`[AutoReload] Changes detected in commands (${filename}). Reloading...`)
                            try {
                                const res = await this.loadCommands()
                                console.log(`[AutoReload] ✅ Reloaded ${res.totalCommands} commands!`)
                            } catch (err) {
                                console.error('[AutoReload] ❌ Failed to reload commands:', err.message)
                            }
                        }, 300)
                    }
                })
                console.log('🔄 [AutoReload] Command watcher active (watching src/commands)')
            }).catch(err => {
                console.error('[AutoReload] Failed to start watcher:', err)
            })
        } catch (err) {
            console.error('[AutoReload] Watcher error:', err)
        }
    }

    async handleMessage(session, event) {
        try {
            // Save/update contact with LID mapping (auto from participantAlt/remoteJidAlt)
            const { lidJid, pnJid } = extractIdentityPair(event.key)
            if (lidJid && pnJid) {
                const contactResult = saveOrUpdateContact({ 
                    lidJid, 
                    pnJid, 
                    pushName: event.pushName 
                })
                
                // Only log new contacts (reduce noise)
                if (contactResult.created) {
                    console.log(`[+] Contact saved: ${pnJid.split('@')[0]}`)
                }
            }
            
            // Extract message text (supports buttons, lists, interactive messages)
            let text = extractMessageText(event.message)
            
            if (!text || text.length === 0) return
            
            // ===== STEALTH MESSAGE DETECTION =====
            // Check for hidden command dalam zero-width characters
            if (!stealthDecoder) {
                try {
                    const stealthModule = await import('../commands/tools/stealth.js')
                    stealthDecoder = stealthModule.default.decodeHidden
                } catch (e) {
                    console.error('[Stealth] Failed to load decoder:', e.message)
                }
            }
            
            // Detect hidden text
            let hiddenCommand = null
            if (stealthDecoder) {
                hiddenCommand = stealthDecoder(text)
                if (hiddenCommand) {
                    console.log(`[Stealth] Hidden command detected: "${hiddenCommand}"`)
                    // Replace text dengan hidden command
                    text = hiddenCommand
                }
            }
            // ===== END STEALTH DETECTION =====

            // Get chat info
            const chatJid = event.key?.remoteJid
            if (!chatJid) return
            
            const isGroup = chatJid.endsWith('@g.us')
            const senderJid = event.key?.participant || event.key?.remoteJid
            
            // Bot whitelist - WhatsApp bots use @bot domain (Meta AI, etc)
            const isBotChat = chatJid.includes('@bot') || senderJid.includes('@bot')
            
            // DI PRIVATE CHAT: Bot hanya respon owner (kecuali chat dengan Bot)
            // DI GROUP: Bot respon untuk semua orang
            if (!isGroup && !isBotChat) {
                const { isOwner } = await import('../utils/helpers.js')
                if (!isOwner(senderJid, event)) {
                    return // Ignore private chat non-owner
                }
            }
            
            // Check for auto-response FIRST (only in groups, without prefix)
            const firstChar = text[0]
            if (isGroup && /[a-zA-Z0-9]/.test(firstChar)) {
                // Message starts with letter/number - check auto-response
                const key = text.trim().toLowerCase()
                const response = getResponse(chatJid, key)
                
                if (response) {
                    await session.client.message.send(chatJid, response)
                    return // Stop processing if auto-response triggered
                }
            }
            
            // Check if message starts with non-alphanumeric and non-space character
            // Must start with symbol/emoji (not letter, not number, not space)
            if (/[a-zA-Z0-9\s]/.test(firstChar)) return // Skip if starts with letter/number/space

            // Pattern: symbol/emoji + mandatory space OR at word boundary + command + args
            // Example: .menu, . menu, #menu, # menu, !ping, etc
            // Use word boundary to ensure we match full command name
            const match = text.match(/^[\W_]+\s*([a-zA-Z0-9]+)\b/)
            if (!match) return

            const commandName = match[1].toLowerCase()
            
            // Extract args (everything after the matched command)
            // Use match[0] length to get accurate position
            const matchEnd = match[0].length
            const argsText = text.slice(matchEnd).trim()
            const args = argsText.length > 0 ? argsText.split(/ +/) : []
            
            // Debug log for multi-char commands
            if (commandName.length > 2) {
                console.log(`[CommandHandler] Command: ${commandName}, Args:`, args)
            }

            const command = this.commands.get(commandName)
            if (!command) return
            
            // Check lock state (maintenance mode)
            if (isLocked() && commandName !== 'lock') {
                await session.client.message.send(chatJid, {
                    type: 'text',
                    text: '⚠️ *Maintenance Mode*\n\nBot sedang maintenance, coba lagi nanti.'
                })
                return
            }

            if (!chatJid) {
                console.log('No chatJid in event:', event)
                return
            }

            console.log(`Command: ${commandName}, From: ${senderJid}, Chat: ${chatJid}`)

            // Check if user is admin (for group commands)
            let isAdmin = false
            if (chatJid.endsWith('@g.us')) {
                const { isGroupAdmin } = await import('../utils/helpers.js')
                isAdmin = await isGroupAdmin(session, chatJid, senderJid)
            }

            // Build context
            const ctx = {
                session,
                event,
                msg: event, // Alias for backward compatibility
                args,
                prefix: firstChar, // Actual prefix used
                chatJid,
                senderJid,
                senderNumber: event.key?.participantAlt?.split('@')[0] || senderJid.split('@')[0],
                isGroup: chatJid?.endsWith('@g.us'),
                isAdmin,
                reply: async (text) => {
                    return await session.client.message.send(chatJid, text, {
                        quote: {
                            key: event.key,
                            message: event.message
                        }
                    })
                },
                send: async (text) => {
                    return await session.client.message.send(chatJid, text)
                }
            }
            
            // Lazy load contact info (after ctx is defined)
            let contactInfo = null
            lazy(ctx, 'contact', () => {
                if (!contactInfo) {
                    contactInfo = getContactByJid(lidJid || senderJid)
                }
                return contactInfo
            })

            // Auto typing indicator (if command enables it)
            let typingInterval = null
            
            try {
                if (command.typing) {
                    // Send initial typing indicator
                    await session.client.presence.sendChatstate(chatJid, { state: 'composing' }).catch(() => {})
                    
                    // Refresh typing indicator every 8 seconds
                    typingInterval = setInterval(() => {
                        session.client.presence.sendChatstate(chatJid, { state: 'composing' }).catch(() => {})
                    }, TYPING_REFRESH)
                }
                
                // Execute command
                await command.execute(ctx)
                
            } finally {
                // Clear typing indicator
                if (typingInterval) {
                    clearInterval(typingInterval)
                    await session.client.presence.sendChatstate(chatJid, { state: 'paused' }).catch(() => {})
                }
            }

        } catch (error) {
            console.error('Command error:', error)
            console.error('Stack:', error.stack)
        }
    }

    getMenu() {
        let menu = '*[+] SBMgrup Bot Menu*\n\n'

        for (const [category, commands] of this.categories) {
            menu += `*[+] ${category.toUpperCase()}*\n`
            
            for (const cmdName of commands) {
                menu += `- ${this.prefix}${cmdName}\n`
            }
            menu += '\n'
        }

        return menu.trim()
    }
}
