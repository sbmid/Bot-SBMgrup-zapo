import { getDownloadableMedia } from '../../utils/messageHelpers.js'
import { processImageToSticker, processVideoToSticker } from '../../utils/stickerHelper.js'

export default {
    name: 'sticker',
    category: 'sticker',
    aliases: ['s', 'stiker'],
    
    async execute(ctx) {
        const { reply, event, session } = ctx
        
        // Try to get image or video
        const imageMedia = getDownloadableMedia(event, 'image')
        const videoMedia = getDownloadableMedia(event, 'video')
        const media = imageMedia || videoMedia
        
        if (!media) {
            return await reply('*[!]* Please reply to an image or video message')
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
            // Download media using full message object
            const mediaBuffer = await session.client.message.downloadBytes(media.message)
            
            if (!mediaBuffer) {
                return await reply('*[!]* Failed to download media')
            }
            
            // Process sticker dengan background putih (fix transparansi)
            const isVideo = !!videoMedia
            const processedBuffer = isVideo 
                ? await processVideoToSticker(Buffer.from(mediaBuffer))
                : await processImageToSticker(Buffer.from(mediaBuffer))
            
            // Send as sticker dengan reply
            await session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: processedBuffer
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
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
            
            await reply(`*[!]* Failed to create sticker\n\n${error.message}`)
        }
    }
}
