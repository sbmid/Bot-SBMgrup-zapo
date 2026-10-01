import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'japan',
    category: 'random',
    description: 'Get random Japanese cecan image',
    aliases: ['jepang'],
    
    async execute(ctx) {
        try {
            const imageBuffer = await fetchRandomImage('siputzx', 'cecan/japan')
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return ctx.reply(`❌ ${error.message}`)
        }
    }
}
