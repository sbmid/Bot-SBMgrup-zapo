import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'indonesia',
    category: 'random',
    description: 'Get random Indonesian cecan image',
    aliases: ['indo'],
    
    async execute(ctx) {
        try {
            const imageBuffer = await fetchRandomImage('siputzx', 'cecan/indonesia')
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return ctx.reply(`❌ ${error.message}`)
        }
    }
}
