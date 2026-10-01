import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'vietnam',
    category: 'random',
    description: 'Get random Vietnamese cecan image',
    aliases: ['viet'],
    
    async execute(ctx) {
        try {
            const imageBuffer = await fetchRandomImage('siputzx', 'cecan/vietnam')
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return ctx.reply(`❌ ${error.message}`)
        }
    }
}
