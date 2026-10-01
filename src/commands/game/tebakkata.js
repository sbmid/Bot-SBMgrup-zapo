import axios from 'axios'
import { checkCooldown, processGameResult, formatNumber } from '../../utils/gameHelper.js'
import { setActiveSession, deleteActiveSession, getActiveSession } from '../../services/GameHandler.js'

export default {
    name: 'tebakkata',
    category: 'game',
    aliases: ['tkk'],

    async execute(ctx) {
        const { send, senderJid, event, chatJid, isGroup } = ctx

        try {
            const senderPnJid = event.key?.participantAlt || senderJid
            const phoneNumber = senderPnJid.split('@')[0]
            const sessionKey = isGroup ? chatJid : phoneNumber
            const session = getActiveSession(sessionKey)

            const commandName = event.message?.conversation?.split(' ')[0]?.substring(1).toLowerCase() ||
                               event.message?.extendedTextMessage?.text?.split(' ')[0]?.substring(1).toLowerCase()

            const disappearContextInfo = {
                expiration: 0,
                ephemeralSettingTimestamp: Date.now(),
                disappearingMode: { initiator: 0, trigger: 1 },
                afterReadDuration: 7
            }

            const questionDisappearContextInfo = {
                expiration: 0,
                ephemeralSettingTimestamp: Date.now(),
                disappearingMode: { initiator: 0, trigger: 1 },
                afterReadDuration: 60
            }

            // Handle .nyerah
            if ((commandName === 'nyerah') && session?.game === 'tebakkata') {
                if (session.starter !== phoneNumber) return

                const quotedMessageId = event.message?.extendedTextMessage?.contextInfo?.stanzaId
                if (session.messageId && quotedMessageId !== session.messageId) return

                if (session.timer) clearTimeout(session.timer)

                console.log(`\x1b[33m[GAME] tebakkata - User: +${phoneNumber}, Answer: ${session.answer}, Result: gave up\x1b[0m`)

                const gameResult = processGameResult(phoneNumber, isGroup ? chatJid : null, 'tebakkata', false)
                deleteActiveSession(sessionKey)

                return await ctx.session.client.message.send(chatJid, {
                    type: 'text',
                    text: `*[+] Tebak Kata (Nyerah)*\n\nJawaban yang benar: *${session.answer}*\n\n+${gameResult.coins} koin\nSisa koin: ${formatNumber(gameResult.totalCoins)}`,
                    contextInfo: disappearContextInfo
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

            if (session?.game === 'tebakkata') {
                return await ctx.session.client.message.send(chatJid, {
                    type: 'text',
                    text: `⚠️ *Game sedang berlangsung!* Selesaikan atau ketik *.nyerah*`,
                    contextInfo: disappearContextInfo
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

            const cooldown = checkCooldown(sessionKey, 'tebakkata', 20)
            if (cooldown.onCooldown) {
                return await ctx.session.client.message.send(chatJid, {
                    type: 'text',
                    text: `⏳ Tunggu ${cooldown.remaining} detik untuk main lagi.`,
                    contextInfo: disappearContextInfo
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

            const response = await axios.get('https://api.siputzx.my.id/api/games/tebakkata', { timeout: 15000 })
            if (!response.data?.status || !response.data?.data) {
                return await ctx.session.client.message.send(chatJid, {
                    type: 'text',
                    text: '❌ *Gagal mengambil data tebak kata.*'
                }, {
                    quote: {
                        key: event.key,
                        message: event.message
                    }
                })
            }

            const { soal, jawaban } = response.data.data
            const answerText = jawaban.trim()

            const timestamp = Date.now()
            const timer = setTimeout(async () => {
                const currentSession = getActiveSession(sessionKey)
                if (currentSession && currentSession.game === 'tebakkata' && currentSession.timestamp === timestamp) {
                    deleteActiveSession(sessionKey)
                    console.log(`[GAME] tebakkata timed out after 60s for ${sessionKey}`)

                    await ctx.session.client.message.send(chatJid, {
                        type: 'text',
                        text: `⏳ *Waktu Habis!* (1 Menit)\n\nJawaban yang benar adalah: *${answerText}*`,
                        contextInfo: disappearContextInfo
                    }).catch(() => {})
                }
            }, 60000)

            setActiveSession(sessionKey, {
                game: 'tebakkata',
                answer: answerText,
                timestamp: timestamp,
                starter: phoneNumber,
                timer: timer
            })

            console.log(`\x1b[33m[GAME] tebakkata - Starter: +${phoneNumber}, Answer: ${answerText}, Status: started (1 min timer)\x1b[0m`)

            const sentMsg = await ctx.session.client.message.send(chatJid, {
                type: 'text',
                text: `*[+] TEBAK KATA*\n\n*Soal:* ${soal}\n\n🎁 *Hadiah:* +50 Koin | +15 XP\n⏱️ *Waktu:* 1 Menit (60 Detik)\n\nKetik jawabanmu atau *.nyerah*`,
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
            console.error('Tebak kata error:', error)
            await send('❌ *Terjadi kesalahan saat memulai game.*')
        }
    }
}
