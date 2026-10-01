import { getDownloadableMedia } from '../../utils/messageHelpers.js'

export default {
    name: 'disappear',
    aliases: ['rahasia', 'timer', 'dmsg'],
    category: 'general',
    description: 'Kirim pesan teks atau media (foto/video/audio) yang otomatis terhapus setelah dibaca',

    async execute(ctx) {
        const { session, chatJid, args, reply, send, event } = ctx

        // Cek media (image, video, atau audio) dari pesan langsung atau balasan (quote)
        const imageMedia = getDownloadableMedia(event, 'image')
        const videoMedia = getDownloadableMedia(event, 'video')
        const audioMedia = getDownloadableMedia(event, 'audio')

        const mediaInfo = imageMedia || videoMedia || audioMedia

        // Jika tidak ada media DAN tidak ada teks argumen
        if (!mediaInfo && (!args || args.length === 0)) {
            return await reply(
                '⏳ *Disappearing Message & Media (Pesan/Foto Rahasia)*\n\n' +
                'Kirim teks atau media (foto/video/suara) yang otomatis terhapus sendiri setelah dibaca.\n\n' +
                '📌 *Cara Penggunaan:*\n' +
                '• *Teks:* `.disappear <detik> <pesan>`\n' +
                '• *Media:* Balas (reply) foto/video/VN dengan `.disappear <detik> [caption]`\n' +
                '_(Default durasi: 5 detik jika detik tidak ditentukan)_\n\n' +
                '💡 *Contoh:*\n' +
                '• `.disappear 5 Halo ini pesan rahasia!`\n' +
                '• Reply foto dengan `.disappear 10 Foto rahasia!`'
            )
        }

        let duration = 5
        let textToSend = ''

        // Cek apakah argumen pertama adalah angka positif (durasi dalam detik)
        if (args && args.length > 0 && !isNaN(args[0]) && parseInt(args[0]) > 0) {
            duration = parseInt(args[0])
            textToSend = args.slice(1).join(' ')
        } else if (args && args.length > 0) {
            textToSend = args.join(' ')
        }

        // Reusable contextInfo untuk disappearing mode
        const contextInfo = {
            expiration: 0,
            ephemeralSettingTimestamp: Date.now(),
            disappearingMode: {
                initiator: 0,
                trigger: 1
            },
            afterReadDuration: duration
        }

        // ===== APABILA MEDIA DITEMUKAN (FOTO / VIDEO / AUDIO) =====
        if (mediaInfo) {
            try {
                // Beri reaksi loading
                await session.client.message.send(chatJid, {
                    type: 'reaction',
                    emoji: '⏳',
                    target: event
                }).catch(() => {})

                // Unduh buffer media
                const mediaBuffer = await session.client.message.downloadBytes(mediaInfo.message)
                if (!mediaBuffer) {
                    return await reply('❌ *Gagal mengunduh media!*')
                }

                const buffer = Buffer.from(mediaBuffer)

                if (imageMedia) {
                    const mimetype = imageMedia.message.imageMessage?.mimetype || 'image/jpeg'
                    const caption = textToSend || imageMedia.message.imageMessage?.caption || ''

                    await session.client.message.send(chatJid, {
                        type: 'image',
                        media: buffer,
                        mimetype,
                        caption: caption ? `⏳ _[HILANG ${duration} DETIK SETELAH DIBACA]_\n\n${caption}` : `⏳ _[HILANG ${duration} DETIK SETELAH DIBACA]_`,
                        contextInfo
                    })
                } else if (videoMedia) {
                    const mimetype = videoMedia.message.videoMessage?.mimetype || 'video/mp4'
                    const caption = textToSend || videoMedia.message.videoMessage?.caption || ''

                    await session.client.message.send(chatJid, {
                        type: 'video',
                        media: buffer,
                        mimetype,
                        caption: caption ? `⏳ _[HILANG ${duration} DETIK SETELAH DIBACA]_\n\n${caption}` : `⏳ _[HILANG ${duration} DETIK SETELAH DIBACA]_`,
                        contextInfo
                    })
                } else if (audioMedia) {
                    const mimetype = audioMedia.message.audioMessage?.mimetype || 'audio/ogg; codecs=opus'
                    const isPtt = !!audioMedia.message.audioMessage?.ptt

                    await session.client.message.send(chatJid, {
                        type: 'audio',
                        media: buffer,
                        mimetype,
                        ptt: isPtt,
                        contextInfo
                    })
                }

                return
            } catch (error) {
                console.error('[Disappear Media Error]:', error)
                return await reply(`❌ *Gagal mengirim media disappear:* ${error.message}`)
            }
        }

        // ===== APABILA HANYA TEKS =====
        if (!textToSend || textToSend.trim().length === 0) {
            return await reply('⚠️ *Harap masukkan teks pesan atau balas (reply) media!*')
        }

        try {
            await session.client.message.send(chatJid, {
                extendedTextMessage: {
                    text: textToSend,
                    previewType: 0,
                    contextInfo
                }
            })
        } catch (error) {
            console.error('[Disappear Text Error]:', error)
            await send(`❌ *Gagal mengirim pesan disappear:* ${error.message}`)
        }
    }
}
