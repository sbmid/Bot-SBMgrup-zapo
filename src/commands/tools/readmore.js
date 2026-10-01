const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

export default {
    name: 'readmore',
    category: 'tools',
    description: 'Create read more text separator',
    usage: 'readmore <text before>|<text after>',
    aliases: ['rm'],
    
    async execute(ctx) {
        const { args, reply, event } = ctx
        
        // Support quoted message
        const quotedText = event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                          event.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text
        
        if (args.length === 0 && !quotedText) {
            return reply(
                `*[+] READ MORE GENERATOR*\n\n` +
                `Usage:\n` +
                `.readmore <text>|<text>\n` +
                `.readmore (reply to message)\n\n` +
                `Example:\n` +
                `.readmore Hello|Hidden text\n\n` +
                `The text after | will be hidden behind "Read more".`
            )
        }
        
        // If reply to message, use quoted text as "before"
        if (quotedText && args.length === 0) {
            return reply(quotedText + readMore)
        }
        
        const text = args.join(' ')
        const [before, after] = text.split('|')
        
        // Support tanpa | (just add readmore at the end)
        if (!after) {
            return reply((before || text) + readMore)
        }
        
        await reply((before || '') + readMore + (after || ''))
    }
}
