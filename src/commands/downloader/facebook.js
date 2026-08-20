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
        
        await send('*[~]* Downloading from Facebook...\n\nPlease wait...')
        
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
            
            let caption = '*[+] Facebook Video*\n\n'
            caption += `*Duration:* ${data.duration}\n\n`
            caption += 'Downloaded by SBMgrup Bot'
            
            await send(caption)
            
            // Get HD video if available, fallback to SD
            const videoUrl = data.result.find(v => v.quality === 'HD')?.url ||
                           data.result.find(v => v.quality === 'SD')?.url
            
            if (!videoUrl) {
                return await send('*[!]* Video URL not found')
            }
            
            // Send video
            await ctx.session.client.message.send(ctx.chatJid, {
                videoMessage: {
                    url: videoUrl,
                    caption: 'Facebook Video - SBMgrup Bot'
                }
            })
            
        } catch (error) {
            console.error('Facebook download error:', error)
            
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
