import axios from 'axios'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

// Filter markdown untuk WhatsApp
function formatForWhatsApp(text) {
    if (!text) return text
    
    // Convert ** (bold) to * (WhatsApp bold)
    text = text.replace(/\*\*(.+?)\*\*/g, '*$1*')
    
    // Remove -- (strikethrough) karena WhatsApp tidak support dengan baik
    text = text.replace(/--(.+?)--/g, '$1')
    
    // Remove ~~strikethrough~~ juga
    text = text.replace(/~~(.+?)~~/g, '$1')
    
    return text
}

// System prompt untuk AI identity
const SYSTEM_INSTRUCTION = `Kamu adalah AI SBMgrup, asisten AI yang ramah dan membantu. 
Selalu perkenalkan diri sebagai "AI SBMgrup" bukan ChatGPT atau AI lainnya kalok ditanya aja kalok enggak ditanya kamu siapa enggak usah nagsih tau.
Jawab dengan bahasa Indonesia yang natural dan ramah.
Format response tanpa markdown kompleks, karena akan dikirim via WhatsApp.`

export default {
    name: 'ai',
    category: 'ai',
    aliases: ['ai'],
    typing: true, // Enable auto typing indicator
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const prompt = args.join(' ')
        
        if (!prompt) {
            return await send(
                '*[+] AI SBMgrup*\n\n' +
                'Usage: .ai <pertanyaan>\n' +
                'Example:\n' +
                '.ai Apa itu JavaScript?\n' +
                '.ai Ceritakan tentang Indonesia'
            )
        }
        
        // React loading
        try {
            await ctx.session.client.message.send(ctx.chatJid, {
                type: 'reaction',
                emoji: '🧠',
                target: ctx.event
            })
        } catch (e) {}
        
        try {
            // Build full prompt with system instruction
            const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nUser: ${prompt}`
            
            // Call AI API
            const response = await axios.get(`https://api.alyachan.dev/api/ai/openai`, {
                params: {
                    prompt: fullPrompt
                },
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                },
                timeout: 60000 // 60 detik untuk AI response
            })
            
            if (!response.data.status || !response.data.data?.content) {
                return await send('*[!]* AI tidak dapat menjawab pertanyaan ini')
            }
            
            let aiResponse = response.data.data.content
            
            // Filter markdown untuk WhatsApp
            aiResponse = formatForWhatsApp(aiResponse)
            
            // Format response
            const formattedResponse = `${aiResponse}`
            
            // Send response
            await send(formattedResponse)
            
            // React success
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '✅',
                    target: ctx.event
                })
            } catch (e) {}
            
        } catch (error) {
            console.error('AI error:', error)
            
            // React error
            try {
                await ctx.session.client.message.send(ctx.chatJid, {
                    type: 'reaction',
                    emoji: '❌',
                    target: ctx.event
                })
            } catch (e) {}
            
            let errorMsg = '*[!]* AI request failed\n\n'
            if (error.response?.status === 503) {
                errorMsg += 'AI service unavailable. Try again later.'
            } else if (error.response?.status === 401) {
                errorMsg += 'API key invalid'
            } else if (error.code === 'ECONNABORTED') {
                errorMsg += 'Request timeout. The question might be too complex.'
            } else {
                errorMsg += error.message
            }
            
            await send(errorMsg)
        }
    }
}
