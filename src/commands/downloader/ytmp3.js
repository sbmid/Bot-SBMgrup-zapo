import axios from 'axios'

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'ytmp3',
    category: 'downloader',
    description: 'Download YouTube audio',
    usage: 'ytmp3 <URL>',
    aliases: ['ytaudio'],
    
    async execute(ctx) {
        const { args, reply, session, chatJid, event } = ctx
        
        if (!API_KEY) {
            return reply('*[!]* ALYACHAN_API_KEY not configured')
        }
        
        if (args.length === 0) {
            return reply(
                `*[+] YOUTUBE AUDIO DOWNLOADER*\n\n` +
                `Usage: .ytmp3 <URL>\n\n` +
                `Example:\n` +
                `.ytmp3 https://youtu.be/xxxxx\n` +
                `.ytmp3 https://youtube.com/watch?v=xxxxx\n\n` +
                `Max: 50MB (limit WhatsApp)`
            )
        }
        
        const url = args[0]
        
        // Basic YouTube URL validation
        if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
            return reply('*[!]* Invalid YouTube URL')
        }
        
        await reply('*[+]* Downloading audio...')
        
        try {
            // Download via API
            const response = await axios.get('https://api.alyachan.dev/api/downloader/youtube', {
                params: { 
                    url: url,
                    type: 'mp3'
                },
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                timeout: 120000 // 2 menit
            })
            
            if (!response.data?.status || !response.data?.data?.url) {
                return reply('*[!]* Failed to download audio. Try again later.')
            }
            
            const audioData = response.data.data
            const audioUrl = audioData.url
            const title = audioData.title || 'Audio'
            const thumbnail = audioData.thumbnail || null
            
            // Download audio buffer
            const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 50 * 1024 * 1024 // 50MB max
            })
            
            const audioBuffer = Buffer.from(audioResponse.data)
            const fileSizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2)
            
            // Check size limit
            if (audioBuffer.length > 50 * 1024 * 1024) {
                return reply(`*[!]* Audio too large (${fileSizeMB}MB)\n\nWhatsApp limit: 50MB`)
            }
            
            // Send audio with metadata (reply to command)
            await session.client.message.send(chatJid, {
                type: 'audio',
                media: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: thumbnail ? {
                    externalAdReply: {
                        title: title,
                        body: `Audio - ${fileSizeMB}MB`,
                        thumbnailUrl: thumbnail,
                        mediaType: 2,
                        sourceUrl: url
                    }
                } : undefined
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
            })
            
            console.log('[YT-MP3] Success:', title, fileSizeMB + 'MB')
            
        } catch (error) {
            console.error('[YT-MP3] Error:', error.message)
            
            if (error.code === 'ECONNABORTED') {
                await reply('*[!]* Request timeout. Audio might be too large.')
            } else if (error.response?.status === 503) {
                await reply('*[!]* API service unavailable. Try again later.')
            } else if (error.response?.status === 401) {
                await reply('*[!]* API key invalid')
            } else if (error.code === 'ERR_BAD_RESPONSE') {
                await reply('*[!]* Download failed. Try shorter videos.')
            } else {
                await reply(`*[!]* Error: ${error.message}`)
            }
        }
    }
}
