import axios from 'axios'
import { createAnimatedSticker } from '../../utils/stickerHelper.js'

export default {
    name: 'bratgif',
    category: 'sticker',
    aliases: ['bratvid', 'bratvideo'],
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const text = args.join(' ')
        
        if (!text) {
            return await send(
                '*[+] Brat Animated Sticker*\n\n' +
                'Usage: .bratgif <text>\n' +
                'Alias: .bratvid / .bratvideo\n\n' +
                'Example:\n.bratgif Hello World'
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
            let gifBuffer = null
            let usedApi = null
            
            // API endpoints (primary → fallback)
            const apis = [
                {
                    name: 'haidarxd',
                    url: `https://api.haidarxd.my.id/api/v1/maker/bratvidhd?text=${encodeURIComponent(text)}&apikey=haidarapis-7e2b9e3374b04f999b4c90865bb05949`
                },
                {
                    name: 'siputzx',
                    url: `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=true&delay=500`
                }
            ]
            
            // Try APIs in order
            for (const api of apis) {
                try {
                    console.log(`[BratGif] Trying API: ${api.name}`)
                    
                    const response = await axios.get(api.url, {
                        responseType: 'arraybuffer',
                        timeout: 30000
                    })
                    
                    gifBuffer = Buffer.from(response.data)
                    usedApi = api.name
                    console.log(`[BratGif] Success with: ${api.name}`)
                    break
                    
                } catch (apiError) {
                    console.log(`[BratGif] ${api.name} failed:`, apiError.message)
                    // Continue to next API
                }
            }
            
            // All APIs failed
            if (!gifBuffer) {
                throw new Error('All API endpoints failed')
            }
            
            // Process to animated sticker
            const stickerBuffer = await createAnimatedSticker(gifBuffer, {
                packname: 'SBMgrup',
                author: 'Bot'
            })
            
            // Send as sticker (reply to command)
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: stickerBuffer
            }, {
                quote: {
                    key: ctx.event.key,
                    message: ctx.event.message
                }
            })
            
            // React success
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '✅',
                    target: ctx.event
                })
            } catch (e) {}
            
            console.log(`[BratGif] Completed using ${usedApi} API`)
            
        } catch (error) {
            console.error('[BratGif] Generation error:', error)
            
            // React error
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
            let errorMsg = '*[!]* Sticker generation failed\n\n'
            if (error.message === 'All API endpoints failed') {
                errorMsg += 'All API services unavailable. Try again later.'
            } else if (error.code === 'ECONNABORTED') {
                errorMsg += 'Request timeout. Try shorter text.'
            } else {
                errorMsg += error.message
            }
            
            await send(errorMsg)
        }
    }
}
