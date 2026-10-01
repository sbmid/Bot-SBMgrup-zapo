import { getDownloadableMedia } from '../../utils/messageHelpers.js'
import { uploadFile } from '../../utils/uploader.js'

export default {
    name: 'removewm',
    aliases: ['dewatermark', 'delwatermark', 'delwm'],
    category: 'tools',
    
    async execute(ctx) {
        const { send, reply, session, args, chatJid, event } = ctx
        
        try {
            let imageUrl = null
            
            // Check for image (direct or quoted)
            const media = getDownloadableMedia(event, 'image')
            
            if (media) {
                await send('⏳ Downloading image...')
                
                try {
                    // Download the image
                    const imageBuffer = await session.client.message.downloadBytes(media.message)
                    
                    if (!imageBuffer) {
                        return await send('*[!]* Failed to download image')
                    }
                    
                    // Upload to temporary hosting for API
                    imageUrl = await uploadFile(Buffer.from(imageBuffer), 'watermark.jpg', 'image/jpeg')
                    
                } catch (downloadError) {
                    console.error('Download error:', downloadError)
                    return await send('*[!]* Failed to download image')
                }
            }
            // Case: URL provided in args
            else if (args[0] && args[0].startsWith('http')) {
                imageUrl = args[0]
            }
            // No image source
            else {
                return await send(
                    '*[+] Remove Watermark*\n\n' +
                    '*Usage:*\n' +
                    '• Send image + caption: Send image + caption `.removewm`\n' +
                    '• Reply to image: .removewm\n' +
                    '• With URL: .removewm <image_url>\n\n' +
                    '*Aliases:* dewatermark, delwatermark, delwm'
                )
            }
            
            if (!imageUrl) {
                return await send('*[!]* No image URL found')
            }
            
            // Process watermark removal
            await send('🔄 Processing watermark removal...')
            
            const axios = (await import('axios')).default
            const apiUrl = 'https://api.alyachan.dev/api/tools/wmremover'
            
            const response = await axios.get(apiUrl, {
                params: {
                    image_url: imageUrl
                },
                headers: {
                    'Authorization': `Bearer ${process.env.ALYACHAN_API_KEY}`
                },
                timeout: 60000
            })
            
            const result = response.data
            
            if (!result.status || !result.data?.url) {
                return await send('*[!]* Failed to remove watermark. API returned error.')
            }
            
            // Download the result image
            const resultImageResponse = await axios.get(result.data.url, {
                responseType: 'arraybuffer',
                timeout: 30000
            })
            const resultImageBuffer = Buffer.from(resultImageResponse.data)
            
            // Send the watermark-free image
            await session.client.message.send(chatJid, {
                type: 'image',
                media: resultImageBuffer,
                mimetype: 'image/jpeg',
                caption: `*[+] Watermark Removed*\n\n📦 Size: ${result.data.size}\n⏰ Expires: ${result.data.expires}`
            })
            
        } catch (error) {
            console.error('Remove watermark error:', error)
            
            if (error.response) {
                return await send(`*[!]* API Error: ${error.response.status} - ${error.response.statusText}`)
            }
            
            await send(`*[!]* Error: ${error.message}`)
        }
    }
}
