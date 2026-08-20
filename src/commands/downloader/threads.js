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
        
        await send('*[~]* Downloading from Threads...\n\nPlease wait...')
        
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
            const total = data.result.length
            
            let caption = `*[+] Threads Downloader*\n\n`
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
            console.error('Threads download error:', error)
            
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
