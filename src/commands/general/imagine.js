import axios from 'axios'

export default {
    name: 'imagine',
    category: 'general',
    
    async execute(ctx) {
        const { send, reply, session, chatJid, args } = ctx
        
        if (args.length === 0) {
            return await send(
                '*[!]* Usage: imagine <prompt>\n\n' +
                'Example: imagine beautiful sunset over ocean\n\n' +
                'Generate AI images from text descriptions.'
            )
        }
        
        const prompt = args.join(' ')
        
        await reply('*[+] Generating Image...*\n\nCreating AI art, please wait...')
        
        try {
            // Using AI image generation API
            const response = await axios.get('https://api.siputzx.my.id/api/ai/text2img', {
                params: {
                    prompt,
                    negative: 'blurry, bad quality, distorted',
                    ratio: '1:1'
                },
                timeout: 60000
            })
            
            if (response.data?.status && response.data?.data?.url) {
                const imageUrl = response.data.data.url
                
                // Download image
                const imageResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                })
                
                const imageBuffer = Buffer.from(imageResponse.data)
                
                // Send image with caption
                await session.client.message.send(
                    chatJid,
                    {
                        type: 'image',
                        media: imageBuffer,
                        mimetype: 'image/jpeg',
                        caption: `*[+] AI Generated Image*\n\nPrompt: ${prompt}`
                    }
                )
                
            } else {
                await send('*[!]* Failed to generate image')
            }
            
        } catch (error) {
            console.error('Imagine error:', error.message)
            
            if (error.code === 'ECONNABORTED') {
                await send('*[!]* Request timeout - image generation took too long')
            } else if (error.response) {
                await send(`*[!]* API Error: ${error.response.status}`)
            } else {
                await send(`*[!]* Failed: ${error.message}`)
            }
        }
    }
}
