import axios from 'axios'

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'ytmp4',
    category: 'downloader',
    description: 'Download YouTube video',
    usage: 'ytmp4 <URL>',
    aliases: ['yt', 'ytvideo'],
    
    async execute(ctx) {
        const { args, reply, session, chatJid, event } = ctx
        
        if (!API_KEY) {
            return reply('*[!]* ALYACHAN_API_KEY not configured')
        }
        
        if (args.length === 0) {
            return reply(
                `*[+] YOUTUBE VIDEO DOWNLOADER*\n\n` +
                `Usage: .ytmp4 <URL>\n\n` +
                `Example:\n` +
                `.ytmp4 https://youtu.be/xxxxx\n` +
                `.ytmp4 https://youtube.com/watch?v=xxxxx\n\n` +
                `Max: 50MB (limit WhatsApp)`
            )
        }
        
        const url = args[0]
        
        // Basic YouTube URL validation
        if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
            return reply('*[!]* Invalid YouTube URL')
        }
        
        await reply('*[+]* Downloading video...')
        
        try {
            // Download via API
            const response = await axios.get('https://api.alyachan.dev/api/downloader/youtube', {
                params: { 
                    url: url,
                    type: 'mp4'
                },
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                timeout: 120000 // 2 menit
            })
            
            if (!response.data?.status || !response.data?.data?.url) {
                return reply('*[!]* Failed to download video. Try again later.')
            }
            
            const videoData = response.data.data
            const videoUrl = videoData.url
            const title = videoData.title || 'Video'
            const thumbnail = videoData.thumbnail || null
            
            // Download video buffer
            const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 50 * 1024 * 1024 // 50MB max
            })
            
            const videoBuffer = Buffer.from(videoResponse.data)
            const fileSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2)
            
            // Check size limit
            if (videoBuffer.length > 50 * 1024 * 1024) {
                return reply(`*[!]* Video too large (${fileSizeMB}MB)\n\nWhatsApp limit: 50MB`)
            }
            
            // Send video with caption (reply to command)
            await session.client.message.send(chatJid, {
                type: 'video',
                media: videoBuffer,
                mimetype: 'video/mp4',
                caption: `*${title}*\n\nSize: ${fileSizeMB}MB`,
                contextInfo: thumbnail ? {
                    externalAdReply: {
                        title: title,
                        body: 'YouTube Downloader',
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
            
            console.log('[YT-MP4] Success:', title, fileSizeMB + 'MB')
            
        } catch (error) {
            console.error('[YT-MP4] Error:', error.message)
            
            if (error.code === 'ECONNABORTED') {
                await reply('*[!]* Request timeout. Video might be too large.')
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
