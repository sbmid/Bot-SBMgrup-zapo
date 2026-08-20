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
        
        await send('*[~]* Downloading from CapCut...\n\nPlease wait...')
        
        try {
            const response = await axios.get(`https://api.alyachan.dev/api/downloader/capcut?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to fetch CapCut template')
            }
            
            const videoUrl = response.data.data.url
            
            if (!videoUrl) {
                return await send('*[!]* Video URL not found')
            }
            
            // Send video
            await ctx.session.client.message.send(ctx.chatJid, {
                videoMessage: {
                    url: videoUrl,
                    caption: '*[+] CapCut Template*\n\nDownloaded by SBMgrup Bot'
                }
            })
            
        } catch (error) {
            console.error('CapCut download error:', error)
            
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
