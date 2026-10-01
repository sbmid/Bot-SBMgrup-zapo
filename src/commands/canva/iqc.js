import axios from 'axios'

export default {
    name: 'iqc',
    category: 'canva',
    description: 'Create Instagram-style quote card',
    usage: '.iqc <text>',
    
    async execute(ctx) {
        const { reply, args } = ctx
        
        // Debug log
        console.log('[IQC] Called with args:', args)
        console.log('[IQC] Joined text:', args.join(' '))
        
        const text = args.join(' ')
        if (!text) {
            return reply('Usage: .iqc <text>\n\nExample: .iqc Lorem ipsum dolor sit amet')
        }
        
        const apiKey = process.env.ALYACHAN_API_KEY
        if (!apiKey) {
            return reply('❌ ALYACHAN_API_KEY not configured in .env')
        }
        
        try {
            // Call IQC API
            const response = await axios.get('https://api.alyachan.dev/api/canvas/iqc', {
                params: { text },
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                timeout: 30000
            })
            
            if (!response.data?.status || !response.data?.data?.url) {
                return reply('❌ Failed to generate quote card')
            }
            
            // Download image
            const imageUrl = response.data.data.url
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 15000
            })
            
            // Send as image
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: Buffer.from(imageResponse.data)
            }, {
                quote: {
                    key: ctx.event.key,
                    message: ctx.event.message
                }
            })
        } catch (error) {
            console.error('IQC error:', error)
            return reply(`❌ Failed to create quote card: ${error.message}`)
        }
    }
}
