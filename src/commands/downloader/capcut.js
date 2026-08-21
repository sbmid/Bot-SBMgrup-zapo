import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'capcut',
    category: 'downloader',
    aliases: ['cc', 'capcutdl'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const url = args[0]
        
        if (!url) {
            return await send(
                '*[+] CapCut Downloader*\n\n' +
                'Usage: .capcut <url>\n' +
                'Alias: .cc / .capcutdl\n\n' +
                'Example:\n.cc https://www.capcut.com/template-detail/123'
            )
        }
        
        if (!url.includes('capcut.com')) {
            return await send('*[!]* Invalid CapCut URL')
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
            const response = await axios.get(`https://api.alyachan.dev/api/downloader/capcut?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to fetch CapCut template')
            }
            
            const data = response.data.data
            const videoUrl = data.video_url
            
            if (!videoUrl) {
                return await send('*[!]* Video URL not found')
            }
            
            // Download video from URL first
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer'
            })
            const videoBuffer = Buffer.from(videoResponse.data)
            
            // Caption
            let caption = '*[+] CapCut Template*\n\n'
            if (data.title) {
                caption += `*Title:* ${data.title}\n`
            }
            if (data.usage) {
                caption += `*Usage:* ${data.usage}\n`
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
            console.error('CapCut download error:', error)
            
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
