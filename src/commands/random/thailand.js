import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'thailand',
    category: 'random',
    description: 'Get random Thai cecan image',
    aliases: ['thai'],
    
    async execute(ctx) {
        try {
            const imageBuffer = await fetchRandomImage('siputzx', 'cecan/thailand')
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return ctx.reply(`❌ ${error.message}`)
        }
    }
}
