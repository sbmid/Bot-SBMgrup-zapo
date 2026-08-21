import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'threads',
    category: 'downloader',
    aliases: ['thread', 'threadsdl'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const url = args[0]
        
        if (!url) {
            return await send(
                '*[+] Threads Downloader*\n\n' +
                'Usage: .threads <url>\n' +
                'Alias: .thread / .threadsdl\n\n' +
                'Example:\n.threads https://www.threads.com/@user/post/ABC123'
            )
        }
        
        if (!url.includes('threads.com')) {
            return await send('*[!]* Invalid Threads URL')
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
            const response = await axios.get(`https://api.alyachan.dev/api/downloader/threads?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to fetch Threads media')
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
                    let caption = `*[+] Threads Downloader*\n\n`
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
            console.error('Threads download error:', error)
            
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
