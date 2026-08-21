import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'facebook',
    category: 'downloader',
    aliases: ['fb', 'fbdl'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const url = args[0]
        
        if (!url) {
            return await send(
                '*[+] Facebook Downloader*\n\n' +
                'Usage: .facebook <url>\n' +
                'Alias: .fb / .fbdl\n\n' +
                'Example:\n.fb https://www.facebook.com/share/r/123'
            )
        }
        
        if (!url.includes('facebook.com') && !url.includes('fb.watch')) {
            return await send('*[!]* Invalid Facebook URL')
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
            const response = await axios.get(`https://api.alyachan.dev/api/downloader/fb?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to fetch Facebook video')
            }
            
            const data = response.data.data
            
            const videoUrl = data.result.find(v => v.quality === 'hd')?.url || 
                           data.result.find(v => v.quality === 'sd')?.url ||
                           data.result[0]?.url
            
            if (!videoUrl) {
                return await send('*[!]* Video URL not found')
            }
            
            // Download video from URL first
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer'
            })
            const videoBuffer = Buffer.from(videoResponse.data)
            
            // Caption
            let caption = '*[+] Facebook Video*\n\n'
            if (data.duration) {
                caption += `*Duration:* ${data.duration}\n`
            }
            caption += `Downloaded by SBMgrup Bot`
            
            // Send video with caption
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'video',
                media: videoBuffer,
                mimetype: 'video/mp4',
                caption: caption
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
            console.error('Facebook download error:', error)
            
            // React error
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
            let errorMsg = '*[!]* Download failed\n\n'
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
