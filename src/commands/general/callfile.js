import fs from 'fs'
import path from 'path'

export default {
    name: 'callfile',
    category: 'general',
    
    async execute(ctx) {
        const { send, session, args, reply } = ctx
        
        if (!session.client.voip) {
            return await send('*[!]* VoIP not available')
        }
        
        if (args.length < 2) {
            return await send(
                '*[!]* Usage: callfile <phone> <audio_file>\n\n' +
                'Example: callfile 628123456789 ./audio/greeting.mp3\n\n' +
                'Note: Audio file must exist on server'
            )
        }
        
        const phoneNumber = args[0].replace(/\D/g, '')
        const audioPath = args[1]
        
        if (!phoneNumber || phoneNumber.length < 10) {
            return await send('*[!]* Invalid phone number')
        }
        
        // Check if file exists
        if (!fs.existsSync(audioPath)) {
            return await send(`*[!]* Audio file not found: ${audioPath}`)
        }
        
        const targetJid = `${phoneNumber}@s.whatsapp.net`
        
        console.log('Calling with file:', targetJid, 'Audio:', audioPath)
        
        try {
            await reply(`*[+] Calling*\n- To: +${phoneNumber}\n- Audio: ${path.basename(audioPath)}`)
            
            // Use CORRECT format with audioFile property
            const callId = await session.client.voip.startCall({
                peerJid: targetJid,
                isVideo: false,
                audioFile: audioPath
            })
            
            await send(`*[+] Call Started*\n- Call ID: ${callId}\n- To: +${phoneNumber}\n- Audio will play when connected`)
            
        } catch (error) {
            console.error('Call error:', error.message)
            if (error.stack) console.error('Stack:', error.stack)
            
            if (error.message.includes('ffmpeg')) {
                await send('*[!]* FFmpeg not found. Install FFmpeg to use audio playback.')
            } else {
                await send(`*[!]* Failed: ${error.message}`)
            }
        }
    }
}
