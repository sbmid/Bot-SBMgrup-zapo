import axios from 'axios'
import { getDownloadableMedia } from '../../utils/messageHelpers.js'
import { uploadFile } from '../../utils/uploader.js'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'aiedit',
    category: 'ai',
    aliases: ['editai', 'aiimage', 'imageedit'],
    typing: true, // Enable auto typing indicator
    
    async execute(ctx) {
        const { reply, event, args, session } = ctx
        
        const prompt = args.join(' ')
        
        const media = getDownloadableMedia(event, 'image')
        
        if (!media) {
            return await reply(
                '*[+] AI Image Edit*\n\n' +
                'Usage: Reply to image with .aiedit <instruction>\n' +
                'Alias: .aiedit / .editai / .aiimage / .imageedit\n\n' +
                'Example:\n' +
                '.aiedit Hitamkan\n' +
                '.aiedit Ubah jadi hitam putih\n' +
                '.aiedit Tambahkan efek vintage'
            )
        }
        
        if (!prompt) {
            return await reply('*[!]* Please provide edit instruction\n\nExample: .aiedit Hitamkan')
        }
        
        try {
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'reaction',
                emoji: '🧠',
                target: ctx.event
            })
        } catch (e) {}
        
        try {
            const imageBuffer = await session.client.message.downloadBytes(media.message)
            
            if (!imageBuffer) {
                return await reply('*[!]* Failed to download image')
            }
            
            const imageUrl = await uploadFile(Buffer.from(imageBuffer), 'image.jpg', 'image/jpeg')
            
            const response = await axios.get(`https://api.alyachan.dev/api/ai/edit`, {
                params: {
                    image_url: imageUrl,
                    prompt: prompt
                },
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                },
                timeout: 120000
            })
            
            if (!response.data.status || !response.data.data?.images?.[0]?.url) {
                return await reply('*[!]* AI failed to edit image')
            }
            
            const editedImageUrl = response.data.data.images[0].url
            
            const editedResponse = await axios.get(editedImageUrl, {
                responseType: 'arraybuffer'
            })
            const editedBuffer = Buffer.from(editedResponse.data)
            
            // Send dengan reply
            await session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: editedBuffer,
                mimetype: 'image/png',
                caption: `*[+] AI Image Edit*\n\nPrompt: ${prompt}`
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
            })
            
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '✅',
                    target: ctx.event
                })
            } catch (e) {}
            
        } catch (error) {
            console.error('AI Edit error:', error)
            
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
            let errorMsg = '*[!]* Image edit failed\n\n'
            if (error.response?.status === 503) {
                errorMsg += 'AI service unavailable. Try again later.'
            } else if (error.response?.status === 401) {
                errorMsg += 'API key invalid'
            } else if (error.code === 'ECONNABORTED') {
                errorMsg += 'Request timeout. Image processing took too long.'
            } else {
                errorMsg += error.message
            }
            
            await reply(errorMsg)
        }
    }
}
