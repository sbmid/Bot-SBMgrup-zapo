import axios from 'axios'
import { getDownloadableMedia } from '../../utils/messageHelpers.js'
import { uploadImage } from '../../utils/imageUpload.js'

export default {
    name: 'removebg',
    category: 'tools',
    description: 'Remove background from image',
    aliases: ['nobg', 'rbg'],
    usage: 'Reply to an image with .removebg',
    
    async execute(ctx) {
        const { reply, session, event } = ctx
        
        // Get image from quoted message
        const imageMedia = getDownloadableMedia(event, 'image')
        
        if (!imageMedia) {
            return reply('Please reply to an image with .removebg')
        }
        
        const apiKey = process.env.ALYACHAN_API_KEY
        if (!apiKey) {
            return reply('❌ ALYACHAN_API_KEY not configured in .env')
        }
        
        try {
            // Send processing message
            await reply('⏳ Uploading image...')
            
            // Download image
            const imageBuffer = await session.client.message.downloadBytes(imageMedia.message)
            
            if (!imageBuffer) {
                return reply('❌ Failed to download image')
            }
            
            // Upload image to get URL
            const imageUrl = await uploadImage(Buffer.from(imageBuffer))
            console.log('[RemoveBG] Uploaded image:', imageUrl)
            
            // Update status
            await reply('⏳ Removing background...')
            
            // Call RemoveBG API
            const response = await axios.get('https://api.alyachan.dev/api/tools/removebg', {
                params: {
                    image_url: imageUrl
                },
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 60000 // 60s timeout for processing
            })
            
            if (!response.data?.status || !response.data?.data?.url) {
                return reply('❌ Failed to remove background from API')
            }
            
            // Download result
            const resultUrl = response.data.data.url
            const resultResponse = await axios.get(resultUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            })|
            
            // Send as image
            await session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: Buffer.from(resultResponse.data)
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
            })
            
        } catch (error) {
            console.error('RemoveBG error:', error)
            return reply(`❌ Failed to remove background: ${error.message}`)
        }
    }
}
