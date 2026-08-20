import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'tiktok',
    category: 'downloader',
    aliases: ['tt', 'tiktokdl'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const url = args[0]
        
        if (!url) {
            return await send(
                '*[+] TikTok Downloader*\n\n' +
                'Usage: .tiktok <url>\n' +
                'Alias: .tt / .tiktokdl\n\n' +
                'Example:\n.tt https://www.tiktok.com/@user/video/123'
            )
        }
        
        if (!url.includes('tiktok.com')) {
            return await send('*[!]* Invalid TikTok URL')
        }
        
        await send('*[~]* Downloading from TikTok...\n\nPlease wait...')
        
        try {
            const response = await axios.get(`https://api.alyachan.dev/api/downloader/tiktok?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to fetch TikTok video')
            }
            
            const data = response.data.data
            
            // Format stats
            const views = formatNumber(data.stats.views)
            const likes = formatNumber(data.stats.likes)
            const comments = formatNumber(data.stats.comment)
            const shares = formatNumber(data.stats.share)
            
            // Caption
            let caption = '*[+] TikTok Downloader*\n\n'
            caption += `*Author:* ${data.author.nickname} (@${data.author.fullname})\n`
            caption += `*Duration:* ${data.duration}s\n\n`
            caption += `*Views:* ${views}\n`
            caption += `*Likes:* ${likes}\n`
            caption += `*Comments:* ${comments}\n`
            caption += `*Shares:* ${shares}\n\n`
            caption += `*Description:*\n${data.title.substring(0, 200)}${data.title.length > 200 ? '...' : ''}`
            
            await send(caption)
            
            // Get video URL (priority: HD > No Watermark > Watermark)
            const videoUrl = data.result.find(v => v.type === 'nowatermarkhd')?.url ||
                           data.result.find(v => v.type === 'nowatermark')?.url ||
                           data.result.find(v => v.type === 'watermark')?.url
            
            if (!videoUrl) {
                return await send('*[!]* Video URL not found')
            }
            
            // Send video
            await ctx.session.client.message.send(ctx.chatJid, {
                videoMessage: {
                    url: videoUrl,
                    caption: `Downloaded by SBMgrup Bot`
                }
            })
            
        } catch (error) {
            console.error('TikTok download error:', error)
            
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

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
}
