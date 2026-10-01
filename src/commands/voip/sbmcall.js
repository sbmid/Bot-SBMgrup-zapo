import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { getPhoneNumberFromLid } from '../../database/contacts.js'

if (!process.env.ALYACHAN_API_KEY) {
    throw new Error('ALYACHAN_API_KEY not found in .env file')
}

const API_KEY = process.env.ALYACHAN_API_KEY

export default {
    name: 'sbmcall',
    category: 'general',
    aliases: ['playmusiccal', 'putarmusikcall'],
    
    async execute(ctx) {
        const { send, reply, session, args, senderJid, event, chatJid } = ctx
        
        if (!session.client.voip) {
            return await send('*[!]* VoIP not available')
        }
        
        if (args.length < 1) {
            return await send(
                '*[!]* Usage: sbmcall <song_name>\n\n' +
                'Example: sbmcall duka\n\n' +
                '⚠️ You must be in an active call with the bot first!'
            )
        }
        
        const query = args.join(' ')
        
        // Get sender's phone number from LID mapping
        const senderPnJid = event.key?.participantAlt || senderJid
        const senderPhone = senderPnJid.split('@')[0]
        
        console.log('SBMCall request - Sender:', senderJid, 'Phone:', senderPhone, 'Query:', query)
        
        // Find active call from this user
        const allCalls = session.client.voip.getCalls()
        let userCall = null
        
        for (const call of allCalls) {
            if (call.isEnded) continue
            
            // Resolve phone number
            let phoneNumber = call.peerJid.split('@')[0]
            if (call.peerJid.includes('@lid')) {
                const pnJid = getPhoneNumberFromLid(call.peerJid)
                if (pnJid) phoneNumber = pnJid.split('@')[0]
            }
            
            // Match with sender
            if (phoneNumber === senderPhone) {
                userCall = call
                break
            }
        }
        
        if (!userCall || !userCall.isActive) {
            return await send(
                '*[!]* No active call found\n\n' +
                '- Please call the bot first, then use this command!'
            )
        }
        
        const callId = userCall.callId
        
        console.log('SBMCall - Call ID:', callId, 'Query:', query)
        
        await reply('[+] Mencari musik...')
        
        let ttsFilePath = null
        let audioFilePath = null
        
        try {
            // Step 1: Search YouTube
            const musicQuery = `musik : ${query}`
            
            const searchResponse = await axios.get(`https://api.alyachan.dev/api/searching/yts`, {
                params: { q: musicQuery },
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                timeout: 15000
            })
            
            if (!searchResponse.data?.status || !searchResponse.data?.data || searchResponse.data.data.length === 0) {
                return await send('*[!]* Music not found')
            }
            
            // Filter: official > lyric > first
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
                return await send('*[!]* No valid video found')
            }
            
            const title = video.title || 'Unknown'
            const channel = video.author?.name || 'Unknown'
            const duration = video.timestamp || '0:00'
            const youtubeUrl = `https://youtube.com/watch?v=${video.videoId}`
            
            await send(`*[+] Found*\n- *${title}*\n- ${channel}\n- ${duration}\n\n[] Downloading...`)
            
            // Step 2: Download MP3
            const downloadResponse = await axios.get(`https://api.alyachan.dev/api/downloader/youtube`, {
                params: { url: youtubeUrl, type: 'mp3' },
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                timeout: 60000
            })
            
            if (!downloadResponse.data?.status || !downloadResponse.data?.data?.url) {
                return await send('*[!]* Failed to download audio')
            }
            
            const audioUrl = downloadResponse.data.data.url
            const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            })
            
            const tempDir = './temp/audio'
            await fs.mkdir(tempDir, { recursive: true })
            
            const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)
            audioFilePath = path.join(tempDir, `${sanitizedTitle}_${Date.now()}.mp3`)
            
            await fs.writeFile(audioFilePath, Buffer.from(audioResponse.data))
            
            console.log('Audio downloaded:', audioFilePath)
            
            // Step 3: Generate TTS announcement
            const ttsText = `Sekarang akan diputar lagu ${title}`
            const ttsResponse = await axios.get(`https://api.alyachan.dev/api/tools/tts`, {
                params: { 
                    text: ttsText,
                    iso: 'id'
                },
                headers: { 'Authorization': `Bearer ${API_KEY}` },
                timeout: 10000
            })
            
            if (!ttsResponse.data?.status || !ttsResponse.data?.data?.url) {
                // Skip TTS, play music directly
                console.log('TTS failed, playing music directly')
                await session.client.voip.loadAudio(callId, audioFilePath)
                await send(`*[+] Now Playing*\n${title}`)
                
                // Cleanup after 5 minutes
                setTimeout(async () => {
                    try {
                        await fs.unlink(audioFilePath)
                    } catch (e) {}
                }, 5 * 60 * 1000)
                
                return
            }
            
            const ttsUrl = ttsResponse.data.data.url
            const ttsAudioResponse = await axios.get(ttsUrl, {
                responseType: 'arraybuffer',
                timeout: 10000
            })
            
            ttsFilePath = path.join(tempDir, `tts_${Date.now()}.mp3`)
            await fs.writeFile(ttsFilePath, Buffer.from(ttsAudioResponse.data))
            
            console.log('TTS downloaded:', ttsFilePath)
            
            // Step 4: Play TTS first
            await session.client.voip.loadAudio(callId, ttsFilePath)
            await send(`🔊 Announcement: "${ttsText}"`)
            
            // Step 5: Wait for TTS to finish, then play music
            const audioFinishListener = async (call) => {
                if (call.callId === callId) {
                    console.log('TTS finished, loading music...')
                    
                    try {
                        await session.client.voip.loadAudio(callId, audioFilePath)
                        await send(`*[+] Now Playing*\n${title}`)
                        
                        // Cleanup TTS
                        try {
                            await fs.unlink(ttsFilePath)
                        } catch (e) {}
                    } catch (loadError) {
                        console.error('Failed to load music:', loadError.message)
                        await send(`*[!]* Failed to play music: ${loadError.message}`)
                    }
                    
                    // Remove listener
                    session.client.off('voip_call_outbound_audio_finished', audioFinishListener)
                }
            }
            
            session.client.on('voip_call_outbound_audio_finished', audioFinishListener)
            
            // Cleanup after 10 minutes
            setTimeout(async () => {
                try {
                    if (ttsFilePath) await fs.unlink(ttsFilePath)
                    if (audioFilePath) await fs.unlink(audioFilePath)
                    console.log('Cleaned up audio files')
                } catch (e) {
                    console.error('Cleanup error:', e.message)
                }
            }, 10 * 60 * 1000)
            
        } catch (error) {
            console.error('SBMCall error:', error.message)
            if (error.stack) console.error('Stack:', error.stack)
            
            // Cleanup on error
            try {
                if (ttsFilePath) await fs.unlink(ttsFilePath)
                if (audioFilePath) await fs.unlink(audioFilePath)
            } catch (e) {}
            
            if (error.response?.status === 503) {
                await send('*[!]* API service unavailable')
            } else if (error.response?.status === 401) {
                await send('*[!]* API key invalid')
            } else if (error.code === 'ECONNABORTED') {
                await send('*[!]* Request timeout')
            } else {
                await send(`*[!]* Failed: ${error.message}`)
            }
        }
    }
}
