import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'cat',
    category: 'random',
    description: 'Get random cat image',
    
    async execute(ctx) {
        const { reply, session } = ctx
        
        try {
            const imageBuffer = await fetchRandomImage('alyachan', 'cat')
            
            await session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, {
                quote: {
                    key: ctx.event.key,
                    message: ctx.event.message
                }
            })
        } catch (error) {
            console.error('Cat error:', error)
            return reply(`❌ ${error.message}`)
        }
    }
}
