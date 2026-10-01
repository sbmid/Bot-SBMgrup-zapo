import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'koala',
    category: 'random',
    description: 'Get random koala image',
    
    async execute(ctx) {
        try {
            const imageBuffer = await fetchRandomImage('alyachan', 'koala')
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return ctx.reply(`❌ ${error.message}`)
        }
    }
}
