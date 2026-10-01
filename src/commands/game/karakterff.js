import axios from 'axios'
import { checkCooldown, processGameResult, formatNumber } from '../../utils/gameHelper.js'
import { setActiveSession, deleteActiveSession, getActiveSession } from '../../services/GameHandler.js'

export default {
    name: 'karakterff',
    category: 'game',
    aliases: ['kff', 'tebakff'],

    async execute(ctx) {
        const { send, senderJid, event, chatJid, isGroup } = ctx

        try {
            const senderPnJid = event.key?.participantAlt || senderJid
            const phoneNumber = senderPnJid.split('@')[0]
            const sessionKey = isGroup ? chatJid : phoneNumber
            const session = getActiveSession(sessionKey)

            const commandName = event.message?.conversation?.split(' ')[0]?.substring(1).toLowerCase() ||
                               event.message?.extendedTextMessage?.text?.split(' ')[0]?.substring(1).toLowerCase()

            // Disappearing message contextInfo untuk hasil game (7 detik setelah dibaca)
            const disappearContextInfo = {
                expiration: 0,
                ephemeralSettingTimestamp: Date.now(),
                disappearingMode: { initiator: 0, trigger: 1 },
                afterReadDuration: 7
            }

            // Disappearing message contextInfo untuk gambar soal (60 detik pas sesuai durasi 1 menit game)
            const questionDisappearContextInfo = {
                expiration: 0,
                ephemeralSettingTimestamp: Date.now(),
                disappearingMode: { initiator: 0, trigger: 1 },
                afterReadDuration: 60
            }

            // Handle .nyerah
            if ((commandName === 'nyerah') && session?.game === 'karakterff') {
                if (session.starter !== phoneNumber) return

                const quotedMessageId = event.message?.extendedTextMessage?.contextInfo?.stanzaId
                if (session.messageId && quotedMessageId !== session.messageId) return

                // Hentikan timer 1 menit
                if (session.timer) clearTimeout(session.timer)

                console.log(`\x1b[33m[GAME] karakterff - User: +${phoneNumber}, Answer: ${session.answer}, Result: gave up\x1b[0m`)

                const gameResult = processGameResult(phoneNumber, isGroup ? chatJid : null, 'karakterff', false)
                deleteActiveSession(sessionKey)

                return await ctx.session.client.message.send(chatJid, {
                    type: 'text',
                    text: `*[+] Karakter Free Fire (Nyerah)*\n\nJawaban yang benar: *${session.answer}*\n\n+${gameResult.coins} koin\nSisa koin: ${formatNumber(gameResult.totalCoins)}`,
                    contextInfo: disappearContextInfo
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

            if (session?.game === 'karakterff') {
                return await ctx.session.client.message.send(chatJid, {
                    type: 'text',
                    text: `⚠️ *Game sedang berlangsung!* Selesaikan atau ketik *.nyerah*`
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

            const cooldown = checkCooldown(sessionKey, 'karakterff', 30)
            if (cooldown.onCooldown) {
                return await ctx.session.client.message.send(chatJid, {
                    type: 'text',
                    text: `⏳ Tunggu ${cooldown.remaining} detik untuk main lagi.`
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

            // (1. Hilangkan pesan loading awal - langsung fetch API)
            const response = await axios.get('https://api.siputzx.my.id/api/games/karakter-freefire', { timeout: 15000 })
            if (!response.data?.status) {
                return await ctx.session.client.message.send(chatJid, {
                    type: 'text',
                    text: '❌ *Gagal mengambil data karakter Free Fire.*'
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

            const { name, gambar } = response.data.data
            const answerText = name.trim()

            const imageResponse = await axios.get(gambar, { responseType: 'arraybuffer', timeout: 20000 })
            const imageBuffer = Buffer.from(imageResponse.data)

            // (4. Pasang waktu game selama 1 menit / 60 detik)
            const timestamp = Date.now()
            const timer = setTimeout(async () => {
                const currentSession = getActiveSession(sessionKey)
                if (currentSession && currentSession.game === 'karakterff' && currentSession.timestamp === timestamp) {
                    deleteActiveSession(sessionKey)
                    console.log(`[GAME] karakterff timed out after 60s for ${sessionKey}`)

                    await ctx.session.client.message.send(chatJid, {
                        type: 'text',
                        text: `⏳ *Waktu Habis!* (1 Menit)\n\nJawaban yang benar adalah: *${answerText}*`,
                        contextInfo: disappearContextInfo
                    }).catch(() => {})
                }
            }, 60000)

            setActiveSession(sessionKey, {
                game: 'karakterff',
                answer: answerText,
                timestamp: timestamp,
                starter: phoneNumber,
                timer: timer
            })

            console.log(`\x1b[33m[GAME] karakterff - Starter: +${phoneNumber}, Answer: ${answerText}, Status: started (1 min timer)\x1b[0m`)

            // (2. Respon game replay / quote ke pengirim command dengan disappear contextInfo durasi 60 detik)
            const sentMsg = await ctx.session.client.message.send(chatJid, {
                type: 'image',
                media: imageBuffer,
                mimetype: 'image/png',
                caption: `*[+] TEBAK KARAKTER FREE FIRE*\n\nSiapa nama karakter di foto ini?\n\n🎁 *Hadiah:* +70 Koin | +22 XP\n⏱️ *Waktu:* 1 Menit (60 Detik)\n\nKetik jawabanmu atau *.nyerah*`,
                contextInfo: questionDisappearContextInfo
            }, {
                quote: {
                    key: event.key,
                    message: event.message
                }
            })

            const messageId = sentMsg?.key?.id || sentMsg?.id || null
            const currentSession = getActiveSession(sessionKey)
            if (currentSession) {
                currentSession.messageId = messageId
            }

        } catch (error) {
            console.error('Karakter FF error:', error)
            await send('❌ *Terjadi kesalahan saat memulai game.*')
        }
    }
}
