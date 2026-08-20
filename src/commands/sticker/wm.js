export default {
    name: 'wm',
    category: 'sticker',
    aliases: ['wmstiker', 'wmsticker'],
    
    async execute(ctx) {
        const { send, msg, args, session } = ctx
        
        // Get quoted sticker
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const stickerMsg = quoted?.stickerMessage
        
        if (!stickerMsg) {
            return await send(
                '*[+] Watermark Sticker*\n\n' +
                'Usage: Reply to sticker with .wm <text>\n' +
                'Alias: .wm / .wmstiker / .wmsticker\n\n' +
                'Format:\n' +
                '.wm packname|author\n\n' +
                'Examples:\n' +
                '.wm adi → packname=adi, author=empty\n' +
                '.wm adi|budi → packname=adi, author=budi\n' +
                '.wm |budi → packname=empty, author=budi\n' +
                '.wm budi| → packname=budi, author=empty'
            )
        }
        
        if (args.length === 0) {
            return await send('*[!]* Please provide watermark text\n\nExample: .wm packname|author')
        }
        
        await send('*[~]* Adding watermark...\n\nPlease wait...')
        
        try {
            // Parse watermark text (handle pipe separator)
            const text = args.join(' ')
            let packname = ''
            let author = ''
            
            if (text.includes('|')) {
                const parts = text.split('|')
                packname = parts[0].trim()
                author = parts[1]?.trim() || ''
            } else {
                packname = text.trim()
            }
            
            // Download sticker (returns Uint8Array)
            const stickerBuffer = await session.client.message.downloadBytes(stickerMsg)
            
            if (!stickerBuffer) {
                return await send('*[!]* Failed to download sticker')
            }
            
            // Upload sticker to get descriptor
            const uploaded = await session.client.message.upload(stickerBuffer, {
                type: 'sticker',
                mimetype: 'image/webp'
            })
            
            // Send using raw proto to include packname/author metadata
            // (typed builder doesn't expose these fields)
            await session.client.message.send(ctx.chatJid, {
                stickerMessage: {
                    url: uploaded.url,
                    directPath: uploaded.directPath,
                    mediaKey: uploaded.mediaKey,
                    fileSha256: uploaded.fileSha256,
                    fileEncSha256: uploaded.fileEncSha256,
                    fileLength: uploaded.fileLength,
                    mediaKeyTimestamp: uploaded.mediaKeyTimestamp,
                    mimetype: 'image/webp',
                    height: 512,
                    width: 512,
                    // Metadata fields for sticker pack info
                    contextInfo: {
                        externalAdReply: {
                            title: packname || 'SBMgrup',
                            body: author || 'Bot',
                            mediaType: 1
                        }
                    }
                }
            })
            
        } catch (error) {
            console.error('Watermark error:', error)
            await send(`*[!]* Failed to add watermark\n\n${error.message}`)
        }
    }
}
