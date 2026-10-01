import axios from 'axios'
import { getDownloadableMedia } from '../../utils/messageHelpers.js'
import { uploadFile } from '../../utils/uploader.js'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'hdvid',
    category: 'tools',
    aliases: ['hdvideo', 'reminivid', 'enhancevid'],
    typing: true, // Enable auto typing indicator
    
    async execute(ctx) {
        const { reply, event, session } = ctx
        
        const media = getDownloadableMedia(event, 'video')
        
        if (!media) {
            return await reply(
                '*[+] HD Video Enhancer*\n\n' +
                'Usage: Reply to video with .hdvid or .hdvideo\n' +
                'Alias: .hdvid / .hdvideo / .reminivid / .enhancevid\n\n' +
                'This will enhance video quality to HD'
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
            const videoBuffer = await session.client.message.downloadBytes(media.message)
            
            if (!videoBuffer) {
                return await reply('*[!]* Failed to download video')
            }
            
            const videoUrl = await uploadFile(Buffer.from(videoBuffer), 'video.mp4', 'video/mp4')
            
            const response = await axios.get(`https://api.alyachan.dev/api/tools/remini/video`, {
                params: {
                    video_url: videoUrl
                },
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                },
                timeout: 180000
            })
            
            if (!response.data.status || !response.data.data?.url) {
                return await reply('*[!]* Failed to enhance video')
            }
            
            const hdVideoUrl = response.data.data.url
            const hdWidth = response.data.data.width
            const hdHeight = response.data.data.height
            const duration = response.data.data.duration
            
            const hdResponse = await axios.get(hdVideoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000
            })
            const hdBuffer = Buffer.from(hdResponse.data)
            
            // Send dengan reply
            await session.client.message.send(ctx.chatJid, {
                type: 'video',
                media: hdBuffer,
                mimetype: 'video/mp4',
                caption: `*[+] HD Enhanced*\n\nResolution: ${hdWidth}x${hdHeight}\nDuration: ${duration.toFixed(1)}s`
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
            console.error('HD video enhance error:', error)
            
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
                errorMsg += 'Request timeout. Video too large or processing took too long.'
            } else {
                errorMsg += error.message
            }
            
            await reply(errorMsg)
        }
    }
}
