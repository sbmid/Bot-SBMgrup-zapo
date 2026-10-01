import axios from 'axios'
import { processImageToSticker } from '../../utils/stickerHelper.js'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'brat',
    category: 'sticker',
    aliases: ['bratst'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const text = args.join(' ')
        
        if (!text) {
            return await send(
                '*[+] Brat Sticker*\n\n' +
                'Usage: .brat <text>\n' +
                'Alias: .bratst\n\n' +
                'Example:\n.brat Hello World'
            )
        }
        
        if (text.length > 100) {
            return await send('*[!]* Text too long (max 100 characters)')
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
            // Get PNG URL from API
            const response = await axios.get(`https://api.alyachan.dev/api/canvas/brat?text=${encodeURIComponent(text)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status || !response.data.data?.url) {
                return await send('*[!]* Failed to generate brat sticker')
            }
            
            const imageUrl = response.data.data.url
            
            // Download PNG from URL
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer'
            })
            const imageBuffer = Buffer.from(imageResponse.data)
            
            // Process dengan background putih (fix transparansi)
            const processedBuffer = await processImageToSticker(imageBuffer)
            
            // Send as sticker (reply to command)
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: processedBuffer
            }, {
                quote: {
                    key: ctx.event.key,
                    message: ctx.event.message
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
            console.error('Brat generation error:', error)
            
            // React error
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
            let errorMsg = '*[!]* Sticker generation failed\n\n'
            if (error.response?.status === 503) {
                errorMsg += 'API service unavailable. Try again later.'
            } else if (error.response?.status === 401) {
                errorMsg += 'API key invalid'
            } else {
                errorMsg += error.message
            }
            
            await send(errorMsg)
        }
    }
}
