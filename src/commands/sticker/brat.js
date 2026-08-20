import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'brat',
    category: 'sticker',
    aliases: [],
    
    async execute(ctx) {
        const { send, args, session } = ctx
        
        const text = args.join(' ')
        
        if (!text) {
            return await send(
                '*[+] Brat Generator*\n\n' +
                'Usage: .brat <text>\n\n' +
                'Example:\n.brat bratbretbrot'
            )
        }
        
        await send('*[~]* Generating brat image...\n\nPlease wait...')
        
        try {
            const response = await axios.get(`https://api.alyachan.dev/api/canvas/brat?text=${encodeURIComponent(text)}`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            })
            
            if (!response.data.status) {
                return await send('*[!]* Failed to generate brat image')
            }
            
            const imageUrl = response.data.url
            
            // Send as image
            await session.client.message.send(ctx.chatJid, {
                imageMessage: {
                    url: imageUrl,
                    caption: `*[+] Brat Image*\n\nText: ${text}`
                }
            })
            
        } catch (error) {
            console.error('Brat generation error:', error)
            
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
