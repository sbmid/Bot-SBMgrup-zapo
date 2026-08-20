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
        
        await send('*[~]* Downloading from Instagram...\n\nPlease wait...')
        
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
            
            let caption = `*[+] Instagram Downloader*\n\n`
            caption += `*Total Media:* ${total}\n\n`
            caption += `Downloaded by SBMgrup Bot`
            
            await send(caption)
            
            // Send all media
            for (let i = 0; i < data.result.length; i++) {
                const media = data.result[i]
                
                try {
                    if (media.type === 'video') {
                        await ctx.session.client.message.send(ctx.chatJid, {
                            videoMessage: {
                                url: media.url,
                                caption: total > 1 ? `Media ${i + 1}/${total}` : undefined
                            }
                        })
                    } else if (media.type === 'image') {
                        await ctx.session.client.message.send(ctx.chatJid, {
                            imageMessage: {
                                url: media.url,
                                caption: total > 1 ? `Media ${i + 1}/${total}` : undefined
                            }
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
            
        } catch (error) {
            console.error('Instagram download error:', error)
            
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
