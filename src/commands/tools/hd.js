import axios from 'axios'
import { getDownloadableMedia } from '../../utils/messageHelpers.js'
import { uploadFile } from '../../utils/uploader.js'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'hd',
    category: 'tools',
    aliases: ['tohd', 'remini', 'enhance'],
    typing: true, // Enable auto typing indicator
    
    async execute(ctx) {
        const { reply, event, session } = ctx
        
        const media = getDownloadableMedia(event, 'image')
        
        if (!media) {
            return await reply(
                '*[+] HD Image Enhancer*\n\n' +
                'Usage: Reply to image with .hd or .tohd\n' +
                'Alias: .hd / .tohd / .remini / .enhance\n\n' +
                'This will enhance image quality to HD'
            )
        }
        
        try {
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'reaction',
                emoji: '🔥',
                target: ctx.event
            })
        } catch (e) {}
        
        try {
            const imageBuffer = await session.client.message.downloadBytes(media.message)
            
            if (!imageBuffer) {
                return await reply('*[!]* Failed to download image')
            }
            
            const imageUrl = await uploadFile(Buffer.from(imageBuffer), 'image.jpg', 'image/jpeg')
            
            await reply('*[+]* Enhancing image to HD...\n\n_This may take 1-3 minutes for large images_')
            
            const response = await axios.get(`https://api.alyachan.dev/api/tools/remini`, {
                params: {
                    image_url: imageUrl
                },
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                },
                timeout: 300000 // 5 menit
            })
            
            if (!response.data.status || !response.data.data?.url) {
                return await reply('*[!]* Failed to enhance image')
            }
            
            const hdImageUrl = response.data.data.url
            const hdWidth = response.data.data.width
            const hdHeight = response.data.data.height
            
            const hdResponse = await axios.get(hdImageUrl, {
                responseType: 'arraybuffer'
            })
            const hdBuffer = Buffer.from(hdResponse.data)
            
            // Send dengan reply
            await session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: hdBuffer,
                mimetype: 'image/png',
                caption: `*[+] HD Enhanced*\n\nResolution: ${hdWidth}x${hdHeight}`
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
            })
            
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '✅',
                    target: ctx.event
                })
            } catch (e) {}
            
        } catch (error) {
            console.error('HD enhance error:', error)
            
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
            let errorMsg = '*[!]* Enhancement failed\n\n'
            if (error.response?.status === 503) {
                errorMsg += 'Service unavailable. Try again later.'
            } else if (error.response?.status === 401) {
                errorMsg += 'API key invalid'
            } else if (error.code === 'ECONNABORTED') {
                errorMsg += 'Request timeout (>5 minutes).\n\nPossible causes:\n- Image too large\n- API server overload\n- Network unstable\n\nTry again with smaller image.'
            } else {
                errorMsg += error.message
            }
            
            await reply(errorMsg)
        }
    }
}
