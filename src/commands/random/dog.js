import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'dog',
    category: 'random',
    description: 'Get random dog image',
    
    async execute(ctx) {
        const { reply, session } = ctx
        
        try {
            const imageBuffer = await fetchRandomImage('alyachan', 'dog')
            
            await session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, {
                quote: { key: ctx.event.key, message: ctx.event.message }
            })
        } catch (error) {
            console.error('Dog error:', error)
            return reply(`❌ ${error.message}`)
        }
    }
}
