import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'bratgif',
    category: 'sticker',
    aliases: ['bratvid'],
    
    async execute(ctx) {
        const { send, args, session } = ctx
        
        const text = args.join(' ')
        
        if (!text) {
            return await send(
                '*[+] Brat GIF Generator*\n\n' +
                'Usage: .bratgif <text>\n' +
                'Alias: .bratgif / .bratvid\n\n' +
                'Example:\n.bratgif bratbretbrot'
            )
        }
        
        await send('*[~]* Generating brat GIF...\n\nPlease wait...')
        
        try {
            const response = await axios.get(`https://api.alyachan.dev/api/canvas/bratgif?text=${encodeURIComponent(text)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                },
                responseType: 'arraybuffer' // Handle binary response
            })
            
            // Response is binary array buffer, not JSON
            const gifBuffer = Buffer.from(response.data)
            
            if (!gifBuffer || gifBuffer.length === 0) {
                return await send('*[!]* Failed to generate brat GIF')
            }
            
            // Send as sticker (animated) - Zapo handles conversion
            await session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: gifBuffer,
                mimetype: 'image/webp'  // Let Zapo convert GIF to animated WebP
            })
            
        } catch (error) {
            console.error('BratGIF generation error:', error)
            
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
