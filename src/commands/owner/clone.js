import { isOwner } from '../../utils/helpers.js'
import axios from 'axios'
import fs from 'fs'
import path from 'path'

export default {
    name: 'clone',
    category: 'owner',
    aliases: ['copy', 'duplicate'],
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event, session, chatJid } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        // Must be reply
        const quotedMessage = event.message?.extendedTextMessage?.contextInfo
        if (!quotedMessage) {
            return await send('*[!]* Reply to a message to clone it')
        }
        
        try {
            // Get the quoted message object
            const originalMsg = quotedMessage.quotedMessage
            
            if (!originalMsg) {
                return await send('*[!]* Cannot access quoted message')
            }
            
            // Save full metadata to file for analysis
            const timestamp = Date.now()
            const metadataDir = path.join(process.cwd(), 'data', 'clone-metadata')
            if (!fs.existsSync(metadataDir)) {
                fs.mkdirSync(metadataDir, { recursive: true })
            }
            
            const metadataFile = path.join(metadataDir, `clone-${timestamp}.json`)
            const metadata = {
                timestamp,
                clonedBy: senderJid,
                chatJid,
                originalSender: quotedMessage.participant || 'unknown',
                messageId: quotedMessage.stanzaId,
                messageType: Object.keys(originalMsg)[0],
                fullMessage: originalMsg,
                contextInfo: quotedMessage
            }
            
            fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2))
            console.log('[Clone] Metadata saved:', metadataFile)
            
            const msgType = Object.keys(originalMsg)[0]
            console.log('[Clone] Message type:', msgType)
            
            // Extract quote from original message
            const originalQuote = quotedMessage.quotedMessage?.extendedTextMessage?.contextInfo?.quotedMessage ||
                                 originalMsg.extendedTextMessage?.contextInfo?.quotedMessage ||
                                 null
            
            const quoteKey = originalQuote ? {
                remoteJid: quotedMessage.participant || chatJid,
                id: quotedMessage.stanzaId,
                fromMe: false
            } : null
            
            // Clone different message types
            
            // 1. Text message (conversation or extendedTextMessage)
            if (originalMsg.conversation) {
                await session.client.message.send(chatJid, {
                    type: 'text',
                    text: originalMsg.conversation
                }, quoteKey ? { quote: { key: quoteKey, message: originalQuote } } : {})
                
                await send(`✅ Cloned (text)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 2. Extended text (with link preview, mentions, etc)
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
                }, originalQuote ? { quote: { key: quoteKey, message: originalQuote } } : {})
                
                await send(`✅ Cloned (extended text)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 3. Image message
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
                }, originalQuote ? { quote: { key: quoteKey, message: originalQuote } } : {})
                
                await send(`✅ Cloned (image)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 4. Video message
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
                }, originalQuote ? { quote: { key: quoteKey, message: originalQuote } } : {})
                
                await send(`✅ Cloned (video)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 5. Audio message
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
                }, originalQuote ? { quote: { key: quoteKey, message: originalQuote } } : {})
                
                await send(`✅ Cloned (audio)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 6. Document message
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
                }, originalQuote ? { quote: { key: quoteKey, message: originalQuote } } : {})
                
                await send(`✅ Cloned (document)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 7. Sticker message
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
                }, originalQuote ? { quote: { key: quoteKey, message: originalQuote } } : {})
                
                await send(`✅ Cloned (sticker)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 8. Location message
            if (originalMsg.locationMessage) {
                const loc = originalMsg.locationMessage
                
                await session.client.message.send(chatJid, {
                    type: 'location',
                    latitude: loc.degreesLatitude,
                    longitude: loc.degreesLongitude,
                    name: loc.name || undefined,
                    address: loc.address || undefined
                })
                
                await send(`✅ Cloned (location)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 9. Contact message
            if (originalMsg.contactMessage) {
                const contact = originalMsg.contactMessage
                
                await session.client.message.send(chatJid, {
                    type: 'contact',
                    displayName: contact.displayName,
                    vcard: contact.vcard
                })
                
                await send(`✅ Cloned (contact)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 10. Buttons message
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
                
                await send(`✅ Cloned (buttons)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 11. List message
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
                
                await send(`✅ Cloned (list)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 12. Template message (buttons with image/video/document)
            if (originalMsg.templateMessage) {
                await session.client.message.send(chatJid, originalMsg)
                await send(`✅ Cloned (template)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 13. Interactive message (new WhatsApp buttons/carousel/native UI)
            if (originalMsg.interactiveMessage) {
                console.log('[Clone] InteractiveMessage detected, forwarding raw proto')
                await session.client.message.send(chatJid, originalMsg)
                await send(`✅ Cloned (interactive)\nMetadata: clone-${timestamp}.json`)
                return
            }
            
            // 14. View once message (ephemeral media)
            if (originalMsg.viewOnceMessage || originalMsg.viewOnceMessageV2) {
                const viewOnce = originalMsg.viewOnceMessage || originalMsg.viewOnceMessageV2
                const innerMsg = viewOnce.message
                
                if (innerMsg?.imageMessage) {
                    const img = innerMsg.imageMessage
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
                    
                    await send(`✅ Cloned (view-once image)\nMetadata: clone-${timestamp}.json`)
                    return
                }
                
                if (innerMsg?.videoMessage) {
                    const vid = innerMsg.videoMessage
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
                    
                    await send(`✅ Cloned (view-once video)\nMetadata: clone-${timestamp}.json`)
                    return
                }
            }
            
            // Fallback: Try raw forward for unknown/anomaly types
            console.log('[Clone] Unknown type, attempting raw forward:', msgType)
            
            try {
                await session.client.message.send(chatJid, originalMsg)
                await send(`✅ Cloned (${msgType})\nMetadata: clone-${timestamp}.json`)
                console.log('[Clone] Raw forward successful')
            } catch (forwardError) {
                console.error('[Clone] Raw forward failed:', forwardError.message)
                await send(`*[!]* Cannot clone: ${msgType}\n\n` +
                          `Error: ${forwardError.message}\n\n` +
                          `Metadata saved: clone-${timestamp}.json`)
            }
            
        } catch (error) {
            console.error('[Clone] Error:', error)
            await send('*[!]* Clone failed\n\n' + error.message)
        }
    }
}
