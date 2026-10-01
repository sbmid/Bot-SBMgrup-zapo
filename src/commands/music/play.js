import axios from 'axios'

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'play',
    category: 'music',
    description: 'Search and download YouTube audio',
    usage: 'play <song name>',
    
    async execute(ctx) {
        const { args, reply, session, chatJid, event } = ctx
        
        if (!API_KEY) {
            return reply('*[!]* ALYACHAN_API_KEY not configured')
        }
        
        if (args.length === 0) {
            return reply(
                `*[+] YOUTUBE MUSIC PLAYER*\n\n` +
                `Usage: .play <song name>\n\n` +
                `Examples:\n` +
                `.play duka\n` +
                `.play last child diary depresiku\n` +
                `.play alan walker faded\n\n` +
                `Bot akan cari di YouTube dan kirim audio MP3.`
            )
        }
        
        const query = args.join(' ')
        
        await reply(`*[+]* Searching and downloading: ${query}`)
        
        try {
            // Step 1: Search YouTube
            const musicQuery = `musik : ${query}`
            
            const searchResponse = await axios.get('https://api.alyachan.dev/api/searching/yts', {
                params: { q: musicQuery },
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                timeout: 15000
            })
            
            if (!searchResponse.data?.status || !searchResponse.data?.data || searchResponse.data.data.length === 0) {
                return reply('*[!]* Music not found. Try different keywords.')
            }
            
            // Filter: official > lyric > first result
            const videos = searchResponse.data.data
            const officialVideo = videos.find(v => 
                v.title.toLowerCase().includes('official') && 
                !v.title.toLowerCase().includes('karaoke')
            )
            const lyricVideo = videos.find(v => 
                (v.title.toLowerCase().includes('lyric') || v.title.toLowerCase().includes('lyrics')) &&
                !v.title.toLowerCase().includes('karaoke')
            )
            
            const video = officialVideo || lyricVideo || videos[0]
            
            if (!video.videoId) {
                return reply('*[!]* No valid video found')
            }
            
            const title = video.title || 'Unknown'
            const channel = video.author?.name || 'Unknown'
            const duration = video.timestamp || '0:00'
            const views = video.views ? `${(video.views / 1000000).toFixed(1)}M` : 'N/A'
            const thumbnail = video.image || video.thumbnail
            const youtubeUrl = `https://youtube.com/watch?v=${video.videoId}`
            
            // Step 2: Download MP3
            const downloadResponse = await axios.get('https://api.alyachan.dev/api/downloader/youtube', {
                params: { url: youtubeUrl, type: 'mp3' },
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                timeout: 60000
            })
            
            if (!downloadResponse.data?.status || !downloadResponse.data?.data?.url) {
                return reply('*[!]* Failed to download audio. Try again later.')
            }
            
            const audioUrl = downloadResponse.data.data.url
            
            // Download audio buffer
            const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: 50 * 1024 * 1024 // 50MB max
            })
            
            const audioBuffer = Buffer.from(audioResponse.data)
            
            // Send audio with thumbnail and reply to command
            await session.client.message.send(chatJid, {
                type: 'audio',
                media: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: thumbnail ? {
                    externalAdReply: {
                        title: title,
                        body: `${channel} - ${duration}`,
                        thumbnailUrl: thumbnail,
                        mediaType: 2,
                        sourceUrl: youtubeUrl
                    }
                } : undefined
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
            })
            
            console.log('[Play] Success:', title)
            
        } catch (error) {
            console.error('[Play] Error:', error.message)
            
            if (error.response?.status === 503) {
                await reply('*[!]* API service unavailable. Try again later.')
            } else if (error.response?.status === 401) {
                await reply('*[!]* API key invalid')
            } else if (error.code === 'ECONNABORTED') {
                await reply('*[!]* Request timeout. File might be too large.')
            } else if (error.code === 'ERR_BAD_RESPONSE') {
                await reply('*[!]* Download failed. Try shorter songs.')
            } else {
                await reply(`*[!]* Error: ${error.message}`)
            }
        }
    }
}
