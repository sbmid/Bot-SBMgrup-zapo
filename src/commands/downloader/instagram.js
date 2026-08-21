import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'instagram',
    category: 'downloader',
    aliases: ['ig', 'igdl'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const url = args[0]
        
        if (!url) {
            return await send(
                '*[+] Instagram Downloader*\n\n' +
                'Usage: .instagram <url>\n' +
                'Alias: .ig / .igdl\n\n' +
                'Example:\n.ig https://www.instagram.com/p/ABC123'
            )
        }
        
        if (!url.includes('instagram.com')) {
            return await send('*[!]* Invalid Instagram URL')
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
            const response = await axios.get(`https://api.alyachan.dev/api/downloader/ig?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to fetch Instagram media')
            }
            
            const data = response.data.data
            const total = data.total
            
            // Send all media with caption
            for (let i = 0; i < data.result.length; i++) {
                const media = data.result[i]
                
                try {
                    // Download media from URL first
                    const mediaResponse = await axios.get(media.url, {
                        responseType: 'arraybuffer'
                    })
                    const mediaBuffer = Buffer.from(mediaResponse.data)
                    
                    // Caption for each media
                    let caption = `*[+] Instagram Downloader*\n\n`
                    if (total > 1) {
                        caption += `*Media:* ${i + 1}/${total}\n`
                    }
                    caption += `Downloaded by SBMgrup Bot`
                    
                    if (media.type === 'video') {
                        await ctx.session.client.message.send(ctx.chatJid, {
                            type: 'video',
                            media: mediaBuffer,
                            mimetype: 'video/mp4',
                            caption: caption
                        })
                    } else if (media.type === 'image') {
                        await ctx.session.client.message.send(ctx.chatJid, {
                            type: 'image',
                            media: mediaBuffer,
                            mimetype: 'image/jpeg',
                            caption: caption
                        })
                    }
                    
                    // Delay between multiple media
                    if (i < data.result.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                } catch (mediaError) {
                    console.error(`Failed to send media ${i + 1}:`, mediaError)
                }
            }
            
            // React success
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '✅',
                    target: ctx.event
                })
            } catch (e) {}
            
        } catch (error) {
            console.error('Instagram download error:', error)
            
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
