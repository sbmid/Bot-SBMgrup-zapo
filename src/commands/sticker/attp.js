import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'attp',
    category: 'sticker',
    aliases: ['ttp'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const text = args.join(' ')
        
        if (!text) {
            return await send(
                '*[+] ATTP Sticker*\n\n' +
                'Usage: .attp <text>\n' +
                'Alias: .ttp\n\n' +
                'Example:\n.attp Hello World'
            )
        }
        
        if (text.length > 100) {
            return await send('*[!]* Text too long (max 100 characters)')
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
            // Get GIF URL from API
            const response = await axios.get(`https://api.alyachan.dev/api/canvas/attp?text=${encodeURIComponent(text)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status || !response.data.data?.url) {
                return await send('*[!]* Failed to generate ATTP sticker')
            }
            
            const gifUrl = response.data.data.url
            
            // Download GIF from URL
            const gifResponse = await axios.get(gifUrl, {
                responseType: 'arraybuffer'
            })
            const gifBuffer = Buffer.from(gifResponse.data)
            
            // Send as sticker - Zapo media-utils will auto-convert GIF to animated WebP
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: gifBuffer
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
            console.error('ATTP generation error:', error)
            
            // React error
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
            let errorMsg = '*[!]* Sticker generation failed\n\n'
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
