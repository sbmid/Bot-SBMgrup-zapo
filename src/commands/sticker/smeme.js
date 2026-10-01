import axios from 'axios'
import { processImageToSticker } from '../../utils/stickerHelper.js'
import { getDownloadableMedia } from '../../utils/messageHelpers.js'

export default {
    name: 'smeme',
    category: 'sticker',
    description: 'Add text to image (sticker meme)',
    usage: 'smeme <top text>|<bottom text>',
    aliases: ['stickermeme', 'memesticker'],
    
    async execute(ctx) {
        const { args, reply, session, chatJid, event } = ctx
        
        // Get image from quoted message or current message
        const imageMedia = getDownloadableMedia(event, 'image')
        
        if (!imageMedia) {
            return reply(
                `*[+] STICKER MEME GENERATOR*\n\n` +
                `Usage:\n` +
                `Reply to image: .smeme <text>\n` +
                `Send with image: .smeme <text>\n\n` +
                `Format:\n` +
                `.smeme top|bottom - text top & bottom\n` +
                `.smeme top| - only top text\n` +
                `.smeme |bottom - only bottom text\n` +
                `.smeme text - only bottom text\n\n` +
                `Example:\n` +
                `.smeme Me|Going to sleep at 3am`
            )
        }
        
        if (args.length === 0) {
            return reply('*[!]* Provide text for meme\n\nExample: .smeme top|bottom')
        }
        
        await reply('*[+]* Generating sticker meme...')
        
        try {
            // Download image - use downloadBytes with media.message
            const imageBuffer = await session.client.message.downloadBytes(imageMedia.message)
            
            if (!imageBuffer) {
                return reply('*[!]* Failed to download image')
            }
            
            // Convert Uint8Array to Buffer
            const buffer = Buffer.from(imageBuffer)
            
            // Upload image to get URL (use tmpfiles or similar)
            const FormData = (await import('form-data')).default
            const form = new FormData()
            form.append('file', buffer, 'image.jpg')
            
            // Upload to temporary hosting
            const uploadResponse = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
                headers: form.getHeaders(),
                timeout: 30000
            })
            
            if (!uploadResponse.data?.data?.url) {
                return reply('*[!]* Failed to upload image')
            }
            
            // Get direct URL (tmpfiles returns dl URL)
            let imageUrl = uploadResponse.data.data.url
            imageUrl = imageUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
            
            // Parse text
            const text = args.join(' ')
            let topText = ''
            let bottomText = ''
            
            if (text.includes('|')) {
                const parts = text.split('|')
                topText = parts[0].trim()
                bottomText = parts[1]?.trim() || ''
            } else {
                bottomText = text.trim()
            }
            
            // Call smeme API
            const smemeResponse = await axios.get('https://api.sawit.biz.id/api/maker/smeme', {
                params: {
                    url: imageUrl,
                    top: topText || ' ',
                    bottom: bottomText || ' '
                },
                timeout: 30000
            })
            
            if (!smemeResponse.data?.status || !smemeResponse.data?.result?.url) {
                return reply('*[!]* Failed to generate meme')
            }
            
            const memeUrl = smemeResponse.data.result.url
            
            // Download meme image
            const memeResponse = await axios.get(memeUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            })
            
            const memeBuffer = Buffer.from(memeResponse.data)
            
            // Process to sticker
            const stickerBuffer = await processImageToSticker(memeBuffer)
            
            // Send sticker (reply to command)
            await session.client.message.send(chatJid, {
                type: 'sticker',
                media: stickerBuffer
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
            })
            
            console.log('[Smeme] Success:', topText, bottomText)
            
        } catch (error) {
            console.error('[Smeme] Error:', error.message)
            
            if (error.code === 'ECONNABORTED') {
                await reply('*[!]* Request timeout. Try again later.')
            } else if (error.response?.status === 503) {
                await reply('*[!]* API service unavailable. Try again later.')
            } else {
                await reply(`*[!]* Error: ${error.message}`)
            }
        }
    }
}
