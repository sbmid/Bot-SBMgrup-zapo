import { isOwner } from '../../utils/helpers.js'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

export default {
    name: 'getclone',
    category: 'owner',
    aliases: ['clonedata', 'resend'],
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event, args, session, chatJid } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        const metadataDir = path.join(process.cwd(), 'data', 'clone-metadata')
        
        // Check if directory exists
        if (!fs.existsSync(metadataDir)) {
            return await send('*[!]* No clone metadata found\n\nClone a message first with .clone')
        }
        
        // List all files if no argument
        if (!args[0]) {
            const files = fs.readdirSync(metadataDir)
                .filter(f => f.endsWith('.json'))
                .sort()
                .reverse() // Newest first
            
            if (files.length === 0) {
                return await send('*[!]* No clone metadata found')
            }
            
            let list = '*[+] Clone Metadata Files*\n\n'
            list += `Total: ${files.length} files\n\n`
            
            files.slice(0, 20).forEach((file, i) => {
                const timestamp = file.replace('clone-', '').replace('.json', '')
                const date = new Date(parseInt(timestamp))
                list += `${i + 1}. ${file}\n`
                list += `   ${date.toLocaleString()}\n\n`
            })
            
            if (files.length > 20) {
                list += `\n_Showing 20 of ${files.length} files_\n\n`
            }
            
            list += `Usage: .getclone <filename>\nExample: .getclone ${files[0]}`
            
            return await send(list)
        }
        
        // Read specific file and rebuild message
        let filename = args[0]
        
        // Auto-add .json if not present
        if (!filename.endsWith('.json')) {
            filename += '.json'
        }
        
        // Auto-prefix clone- if not present
        if (!filename.startsWith('clone-')) {
            filename = 'clone-' + filename
        }
        
        const filepath = path.join(metadataDir, filename)
        
        if (!fs.existsSync(filepath)) {
            return await send(`*[!]* File not found: ${filename}\n\nUse .getclone to list all files`)
        }
        
        try {
            const data = JSON.parse(fs.readFileSync(filepath, 'utf8'))
            const originalMsg = data.fullMessage
            const msgType = data.messageType
            
            await send(`*[~]* Rebuilding cloned message...\nType: ${msgType}`)
            
            // Rebuild and send message based on type
            
            // Text
            if (originalMsg.conversation) {
                await session.client.message.send(chatJid, {
                    type: 'text',
                    text: originalMsg.conversation
                })
                return
            }
            
            // Extended text
            if (originalMsg.extendedTextMessage) {
                const ext = originalMsg.extendedTextMessage
                
                await session.client.message.send(chatJid, {
                    type: 'text',
                    text: ext.text,
                    linkPreview: ext.matchedText ? {
                        url: ext.matchedText,
                        title: ext.title || ext.matchedText,
                        description: ext.description || '',
                        thumbnail: ext.jpegThumbnail || null
                    } : undefined,
                    mentions: ext.contextInfo?.mentionedJid || []
                })
                return
            }
            
            // Image
            if (originalMsg.imageMessage) {
                const img = originalMsg.imageMessage
                const imageUrl = img.url
                
                const imageResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000
                })
                const imageBuffer = Buffer.from(imageResponse.data)
                
                await session.client.message.send(chatJid, {
                    type: 'image',
                    media: imageBuffer,
                    mimetype: img.mimetype || 'image/jpeg',
                    caption: img.caption || undefined
                })
                return
            }
            
            // Video
            if (originalMsg.videoMessage) {
                const vid = originalMsg.videoMessage
                const videoUrl = vid.url
                
                const videoResponse = await axios.get(videoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000
                })
                const videoBuffer = Buffer.from(videoResponse.data)
                
                await session.client.message.send(chatJid, {
                    type: 'video',
                    media: videoBuffer,
                    mimetype: vid.mimetype || 'video/mp4',
                    caption: vid.caption || undefined
                })
                return
            }
            
            // Audio
            if (originalMsg.audioMessage) {
                const aud = originalMsg.audioMessage
                const audioUrl = aud.url
                
                const audioResponse = await axios.get(audioUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000
                })
                const audioBuffer = Buffer.from(audioResponse.data)
                
                await session.client.message.send(chatJid, {
                    type: 'audio',
                    media: audioBuffer,
                    mimetype: aud.mimetype || 'audio/mp4',
                    ptt: aud.ptt || false
                })
                return
            }
            
            // Document
            if (originalMsg.documentMessage) {
                const doc = originalMsg.documentMessage
                const docUrl = doc.url
                
                const docResponse = await axios.get(docUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000
                })
                const docBuffer = Buffer.from(docResponse.data)
                
                await session.client.message.send(chatJid, {
                    type: 'document',
                    media: docBuffer,
                    mimetype: doc.mimetype || 'application/octet-stream',
                    fileName: doc.fileName || 'document',
                    caption: doc.caption || undefined
                })
                return
            }
            
            // Sticker
            if (originalMsg.stickerMessage) {
                const stk = originalMsg.stickerMessage
                const stickerUrl = stk.url
                
                const stickerResponse = await axios.get(stickerUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000
                })
                const stickerBuffer = Buffer.from(stickerResponse.data)
                
                await session.client.message.send(chatJid, {
                    type: 'sticker',
                    media: stickerBuffer
                })
                return
            }
            
            // Location
            if (originalMsg.locationMessage) {
                const loc = originalMsg.locationMessage
                
                await session.client.message.send(chatJid, {
                    type: 'location',
                    latitude: loc.degreesLatitude,
                    longitude: loc.degreesLongitude,
                    name: loc.name || undefined,
                    address: loc.address || undefined
                })
                return
            }
            
            // Contact
            if (originalMsg.contactMessage) {
                const contact = originalMsg.contactMessage
                
                await session.client.message.send(chatJid, {
                    type: 'contact',
                    displayName: contact.displayName,
                    vcard: contact.vcard
                })
                return
            }
            
            // Buttons
            if (originalMsg.buttonsMessage) {
                const btn = originalMsg.buttonsMessage
                
                await session.client.message.send(chatJid, {
                    buttonsMessage: {
                        contentText: btn.contentText || '',
                        footerText: btn.footerText || '',
                        headerType: btn.headerType,
                        text: btn.text || btn.contentText || '',
                        buttons: btn.buttons || []
                    }
                })
                return
            }
            
            // List
            if (originalMsg.listMessage) {
                const list = originalMsg.listMessage
                
                await session.client.message.send(chatJid, {
                    listMessage: {
                        title: list.title || '',
                        description: list.description || '',
                        buttonText: list.buttonText || 'Select',
                        listType: list.listType || 1,
                        sections: list.sections || []
                    }
                })
                return
            }
            
            // Interactive / Template / Unknown - raw forward
            console.log('[GetClone] Forwarding raw proto for type:', msgType)
            await session.client.message.send(chatJid, originalMsg)
            
        } catch (error) {
            console.error('[GetClone] Error rebuilding message:', error)
            await send('*[!]* Failed to rebuild message\n\n' + error.message)
        }
    }
}
