import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'korea',
    category: 'random',
    description: 'Get random Korean cecan image',
    aliases: ['kor', 'korean'],
    
    async execute(ctx) {
        try {
            const imageBuffer = await fetchRandomImage('siputzx', 'cecan/korea')
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return ctx.reply(`❌ ${error.message}`)
        }
    }
}
