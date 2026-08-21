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
        
        // React loading
        try {
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'reaction',
                emoji: '⏳',
                target: ctx.event
            })
        } catch (e) {}
        
        try {
            // Download media (returns Uint8Array)
            let mediaBuffer
            if (imageMsg) {
                mediaBuffer = await session.client.message.downloadBytes(imageMsg)
            } else if (videoMsg) {
                mediaBuffer = await session.client.message.downloadBytes(videoMsg)
            }
            
            if (!mediaBuffer) {
                return await send('*[!]* Failed to download media')
            }
            
            // Send as sticker - Zapo media-utils will auto-convert to WebP
            await session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: mediaBuffer
            })
            
            // React success
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '✅',
                    target: ctx.event
                })
            } catch (e) {}
            
        } catch (error) {
            console.error('Sticker creation error:', error)
            
            // React error
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
            await send(`*[!]* Failed to create sticker\n\n${error.message}`)
        }
    }
}
