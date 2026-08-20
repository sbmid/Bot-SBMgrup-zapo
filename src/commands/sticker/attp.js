import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'attp',
    category: 'sticker',
    aliases: [],
    
    async execute(ctx) {
        const { send, args, session } = ctx
        
        const text = args.join(' ')
        
        if (!text) {
            return await send(
                '*[+] ATTP Sticker*\n\n' +
                'Usage: .attp <text>\n\n' +
                'Example:\n.attp Hello World'
            )
        }
        
        await send('*[~]* Generating ATTP sticker...\n\nPlease wait...')
        
        try {
            const response = await axios.get(`https://api.alyachan.dev/api/canvas/attp?text=${encodeURIComponent(text)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to generate ATTP sticker')
            }
            
            const gifUrl = response.data.url
            
            // Download GIF from URL
            const gifResponse = await axios.get(gifUrl, {
                responseType: 'arraybuffer'
            })
            
            const gifBuffer = Buffer.from(gifResponse.data)
            
            // Send as animated sticker - Zapo handles conversion
            await session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: gifBuffer,
                mimetype: 'image/webp'  // Let Zapo convert GIF to animated WebP
            })
            
        } catch (error) {
            console.error('ATTP generation error:', error)
            
            let errorMsg = '*[!]* Generation failed\n\n'
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
