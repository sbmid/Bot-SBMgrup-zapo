import { fetchRandomImage } from '../../utils/randomImage.js'

export default {
    name: 'cecan',
    category: 'random',
    description: 'Get random cecan image',
    usage: 'cecan <country>\nAvailable: japan, indonesia, vietnam, china, thailand, korea',
    aliases: ['cewek'],
    
    async execute(ctx) {
        const { args, reply } = ctx
        
        const validCountries = ['japan', 'indonesia', 'vietnam', 'china', 'thailand', 'korea']
        const country = args[0]?.toLowerCase()
        
        if (!country || !validCountries.includes(country)) {
            return reply(
                `❌ Please specify country!\n\n` +
                `*Available:*\n${validCountries.map(c => `• ${c}`).join('\n')}\n\n` +
                `*Usage:* .cecan japan`
            )
        }
        
        try {
            const imageBuffer = await fetchRandomImage('siputzx', `cecan/${country}`)
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'image',
                media: imageBuffer,
                caption: `🌸 Cecan ${country.charAt(0).toUpperCase() + country.slice(1)}`
            }, { quote: { key: ctx.event.key, message: ctx.event.message } })
        } catch (error) {
            return reply(`❌ ${error.message}`)
        }
    }
}
