import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { getResponse } from '../utils/responseStore.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class CommandHandler {
    constructor() {
        this.commands = new Map()
        this.categories = new Map()
        this.prefix = process.env.BOT_PREFIX || '.'
        // Regex untuk detect command: simbol/emoji diikuti optional spasi, lalu command
        this.commandPattern = /^[\W_]+\s*(\w+)/
    }

    async loadCommands() {
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
                const command = await import(`file://${filePath}`)
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
    }

    async handleMessage(session, event) {
        try {
            // Extract message text
            const text = event.message?.conversation || 
                        event.message?.extendedTextMessage?.text || ''

            if (!text || text.length === 0) return

            // Get chat info
            const chatJid = event.key?.remoteJid
            if (!chatJid) return
            
            const isGroup = chatJid.endsWith('@g.us')
            const senderJid = event.key?.participant || event.key?.remoteJid
            
            // DI PRIVATE CHAT: Bot hanya respon owner
            // DI GROUP: Bot respon untuk semua orang
            if (!isGroup) {
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

            // Pattern: symbol/emoji + optional space + command + args
            // Example: .menu, #menu, # menu, !ping, etc
            const match = text.match(/^[\W_]+\s*(\w+)/)
            if (!match) return

            const commandName = match[1].toLowerCase()
            
            // Extract args (everything after command)
            const argsStart = text.indexOf(commandName) + commandName.length
            const argsText = text.slice(argsStart).trim()
            const args = argsText.length > 0 ? argsText.split(/ +/) : []

            const command = this.commands.get(commandName)
            if (!command) return

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

            // Execute command
            await command.execute(ctx)

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
