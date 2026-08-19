import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { getRealJid } from '../../utils/helpers.js'

// Track calls that need audio loaded
const pendingAudioLoads = new Map()

export default {
    name: 'call',
    category: 'general',
    
    async execute(ctx) {
        const { send, session, args, reply, event } = ctx
        
        if (!session.client.voip) {
            return await send('*[!]* VoIP not available')
        }
        
        if (args.length < 2) {
            return await send('*[!]* Usage: call <phone> <audio_query>\n\nExample: call 628123456789 duka')
        }
        
        let targetNumber = args[0].replace(/\D/g, '')
        const query = args.slice(1).join(' ')
        
        // Special case: "me" calls sender back
        if (!targetNumber || args[0].toLowerCase() === 'me') {
            const realJid = getRealJid(event)
            if (!realJid || realJid.includes('@lid')) {
                return await send('*[!]* Cannot determine phone number')
            }
            targetNumber = realJid.split('@')[0].replace(/\D/g, '')
        }
        
        if (!targetNumber || targetNumber.length < 10) {
            return await send('*[!]* Invalid phone number')
        }
        
        const targetJid = `${targetNumber}@s.whatsapp.net`
        
        console.log('Call request - Target:', targetJid, 'Query:', query)
        
        await reply('*[+] Processing Call*\n- Searching audio...')
        
        let audioFilePath = null
        
        try {
            // Step 1: Search audio
            const searchResponse = await axios.get(`https://api.siputzx.my.id/api/s/soundcloud`, {
                params: { query },
                timeout: 10000
            })
            
            if (!searchResponse.data?.status || !searchResponse.data?.data || searchResponse.data.data.length === 0) {
                return await send('*[!]* Audio not found')
            }
            
            // Get first valid audio
            const audio = searchResponse.data.data.find(item => item.permalink_url && item.duration)
            if (!audio) {
                return await send('*[!]* No valid audio found')
            }
            
            const durationSec = Math.floor(audio.duration / 1000)
            
            await send(`*[+] Found Audio*\n- Title: ${audio.permalink}\n- Duration: ${durationSec}s\n- Downloading...`)
            
            // Step 2: Get download URL
            const downloadResponse = await axios.get(`https://api.siputzx.my.id/api/d/soundcloud`, {
                params: { url: audio.permalink_url },
                timeout: 15000
            })
            
            if (!downloadResponse.data?.status || !downloadResponse.data?.data?.url) {
                return await send('*[!]* Failed to get download URL')
            }
            
            const downloadUrl = downloadResponse.data.data.url
            const title = downloadResponse.data.data.title || 'audio'
            
            // Step 3: Download audio file
            const audioResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            })
            
            // Save to temp directory
            const tempDir = './temp/audio'
            await fs.mkdir(tempDir, { recursive: true })
            
            const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)
            audioFilePath = path.join(tempDir, `${sanitizedTitle}_${Date.now()}.mp3`)
            
            await fs.writeFile(audioFilePath, Buffer.from(audioResponse.data))
            
            console.log('Audio downloaded:', audioFilePath)
            
            await send(`*[+] Audio Ready*\n- File: ${sanitizedTitle}.mp3\n- Calling +${targetNumber}...`)
            
            // Step 4: Make call WITHOUT audioFile (will load manually)
            const callId = await session.client.voip.startCall({
                peerJid: targetJid,
                isVideo: false
            })
            
            console.log('Call started with ID:', callId)
            
            // Store audio path for this call to load when active
            pendingAudioLoads.set(callId, audioFilePath)
            
            // Setup one-time listener for when call becomes active
            const stateListener = async (call) => {
                if (call.callId === callId && call.stateData.state === 'active') {
                    console.log('Call active, loading audio:', audioFilePath)
                    
                    try {
                        await session.client.voip.loadAudio(callId, audioFilePath)
                        console.log('Audio loaded successfully')
                        await send(`*[+] Audio Playing*\n- Call connected\n- Playing: ${sanitizedTitle}.mp3`)
                    } catch (loadError) {
                        console.error('Failed to load audio:', loadError.message)
                        await send(`*[!]* Call connected but audio failed to load: ${loadError.message}`)
                    }
                    
                    // Remove listener
                    session.client.off('voip_call_state', stateListener)
                }
            }
            
            session.client.on('voip_call_state', stateListener)
            
            await send(`*[+] Call Started*\n- Call ID: ${callId}\n- To: +${targetNumber}\n- Waiting for connection...`)
            
            // Cleanup after 5 minutes
            setTimeout(async () => {
                try {
                    pendingAudioLoads.delete(callId)
                    await fs.unlink(audioFilePath)
                    console.log('Cleaned up audio file:', audioFilePath)
                } catch (e) {
                    console.error('Cleanup error:', e.message)
                }
            }, 5 * 60 * 1000)
            
        } catch (error) {
            console.error('Call error:', error.message)
            if (error.stack) console.error('Stack:', error.stack)
            
            // Cleanup on error
            if (audioFilePath) {
                try {
                    await fs.unlink(audioFilePath)
                } catch (e) {}
            }
            
            if (error.message.includes('max concurrent calls')) {
                await send('*[!]* Max concurrent calls reached\n\nUse .endcall to end current call first.')
            } else if (error.message.includes('ffmpeg')) {
                await send('*[!]* FFmpeg not found\n\nInstall FFmpeg to enable audio playback:\nchoco install ffmpeg')
            } else if (error.response) {
                await send(`*[!]* API Error: ${error.response.status}`)
            } else if (error.code === 'ECONNABORTED') {
                await send('*[!]* Request timeout')
            } else {
                await send(`*[!]* Failed: ${error.message}`)
            }
        }
    }
}
