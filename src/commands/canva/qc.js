import axios from 'axios'
import { getPhoneNumberFromLid } from '../../database/contacts.js'

// Color presets
const COLOR_PRESETS = {
    'hitam': '#0C0C0C',
    'putih': '#FFFFFF',
    'merah': '#FF0000',
    'biru': '#0000FF',
    'hijau': '#00FF00',
    'kuning': '#FFFF00',
    'ungu': '#800080',
    'pink': '#FFC0CB',
    'orange': '#FFA500',
    'abu': '#808080'
}

export default {
    name: 'qc',
    category: 'canva',
    description: 'Create WhatsApp-style quote (quotly)',
    usage: '.qc <text> [--color]',
    
    async execute(ctx) {
        const { reply, args, session, event, senderJid } = ctx
        
        // Parse args for text and color
        let text = args.join(' ')
        let backgroundColor = '#0C0C0C' // Default: hitam
        
        // Check for color flag (--colorname)
        const colorMatch = text.match(/--(\w+)$/i)
        if (colorMatch) {
            const colorName = colorMatch[1].toLowerCase()
            if (COLOR_PRESETS[colorName]) {
                backgroundColor = COLOR_PRESETS[colorName]
                text = text.replace(/--\w+$/, '').trim()
            }
        }
        
        if (!text) {
            return reply('Usage: .qc <text> [--color]\n\nExample: .qc Hello world --hitam\n\nAvailable colors: ' + Object.keys(COLOR_PRESETS).join(', '))
        }
        
        const apiKey = process.env.ALYACHAN_API_KEY
        if (!apiKey) {
            return reply('❌ ALYACHAN_API_KEY not configured in .env')
        }
        
        try {
            // Get sender info
            let senderName = 'User'
            let senderPhone = senderJid.split('@')[0]
            
            // Try get phone from LID
            if (senderJid.includes('@lid')) {
                const pnJid = getPhoneNumberFromLid(senderJid)
                if (pnJid) {
                    senderPhone = pnJid.split('@')[0]
                }
            }
            
            // Get push name from event
            if (event.pushName) {
                senderName = event.pushName
            }
            
            // Get profile picture
            let avatarUrl = 'https://i.pinimg.com/736x/af/cb/45/afcb4549a64c6b3a38d5d7209588b158.jpg'
            try {
                const profilePic = await session.client.profile.getProfilePicture(senderJid, 'preview')
                if (profilePic?.url) {
                    avatarUrl = profilePic.url
                }
            } catch (err) {
                // Use fallback
            }
            
            // Build quotly payload
            const payload = {
                json: {
                    type: 'quote',
                    format: 'png',
                    backgroundColor,
                    width: 512,
                    height: 768,
                    scale: 2,
                    messages: [{
                        entities: [],
                        avatar: true,
                        from: {
                            id: 1,
                            name: senderName,
                            photo: {
                                url: avatarUrl
                            }
                        },
                        text,
                        replyMessage: {}
                    }]
                }
            }
            
            // Call Quotly API
            const response = await axios.post('https://api.alyachan.dev/api/canvas/quotly', payload, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            })
            
            if (!response.data?.status || !response.data?.data?.url) {
                return reply('❌ Failed to generate quote')
            }
            
            // Download image
            const imageUrl = response.data.data.url
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 15000
            })
            
            // Send as sticker
            await session.client.message.send(ctx.chatJid, {
                type: 'sticker',
                media: Buffer.from(imageResponse.data)
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
            })
        } catch (error) {
            console.error('QC error:', error)
            return reply(`❌ Failed to create quote: ${error.message}`)
        }
    }
}
