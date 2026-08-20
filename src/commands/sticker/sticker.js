export default {
    name: 'sticker',
    category: 'sticker',
    aliases: ['s', 'stiker'],
    
    async execute(ctx) {
        const { send, msg, session } = ctx
        
        // Get quoted message
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        
        if (!quoted) {
            return await send(
                '*[+] Create Sticker*\n\n' +
                'Usage: Reply to image/video with .s or .sticker\n' +
                'Alias: .s / .stiker / .sticker\n\n' +
                'Note: Video longer than 10 seconds may not work'
            )
        }
        
        // Check if quoted message contains image or video
        const imageMsg = quoted.imageMessage
        const videoMsg = quoted.videoMessage
        
        if (!imageMsg && !videoMsg) {
            return await send('*[!]* Please reply to an image or video message')
        }
        
        await send('*[~]* Creating sticker...\n\nPlease wait...')
        
        try {
            let mediaBuffer
            
            // Download media (returns Uint8Array)
            if (imageMsg) {
                mediaBuffer = await session.client.message.downloadBytes(imageMsg)
            } else if (videoMsg) {
                mediaBuffer = await session.client.message.downloadBytes(videoMsg)
            }
            
            if (!mediaBuffer) {
                return await send('*[!]* Failed to download media')
            }
            
            // ponytail: No ffmpeg trim - WhatsApp client handles video duration limit
            // If video >10sec becomes an issue, upgrade path: shell out to ffmpeg -ss 0 -t 10
            
            // Send as sticker (Zapo handles WebP conversion and encryption)
            await session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: mediaBuffer,
                mimetype: 'image/webp'
            })
            
        } catch (error) {
            console.error('Sticker creation error:', error)
            await send(`*[!]* Failed to create sticker\n\n${error.message}`)
        }
    }
}
