/**
 * Game Handler - Handle non-command messages for active game sessions
 */

import { processGameResult, formatNumber } from '../utils/gameHelper.js'
import { getContactByJid } from '../database/contacts.js'

// Active game sessions (imported from commands)
const activeSessions = new Map()

export function getActiveSession(key) {
    return activeSessions.get(key)
}

export function setActiveSession(key, data) {
    activeSessions.set(key, data)
}

export function deleteActiveSession(key) {
    activeSessions.delete(key)
}

/**
 * Handle incoming message for active games
 */
export async function handleGameMessage(event, session, chatJid, senderJid) {
    try {
        // Get message text
        const text = event.message?.conversation ||
                    event.message?.extendedTextMessage?.text || ''

        if (!text || text.startsWith('.')) return false // Skip commands

        // Get phone number & user info
        const senderPnJid = event.key?.participantAlt || senderJid
        const phoneNumber = senderPnJid.split('@')[0]

        // Check for active game session
        const isGroup = chatJid?.endsWith('@g.us')
        const sessionKey = isGroup ? chatJid : phoneNumber
        const gameSession = activeSessions.get(sessionKey)

        if (!gameSession) return false // No active game

        // Check answer for active game
        return await handleGameAnswer(event, session, chatJid, senderJid, senderPnJid, phoneNumber, gameSession, text, isGroup)

    } catch (error) {
        console.error('[GameHandler] Error:', error)
        return false
    }
}

/**
 * Handle game answer check for all games
 */
async function handleGameAnswer(event, clientSession, chatJid, senderJid, senderPnJid, phoneNumber, gameSession, userAnswer, isGroup) {
    const correctAnswer = gameSession.answer.toUpperCase().trim()
    const guess = userAnswer.toUpperCase().trim()

    // Flexible matching: exact match or clean string match
    const cleanCorrect = correctAnswer.replace(/[^\w\s]/g, '')
    const cleanGuess = guess.replace(/[^\w\s]/g, '')

    const won = guess === correctAnswer ||
                cleanGuess === cleanCorrect ||
                (cleanGuess.length > 2 && cleanCorrect.length > 2 && (cleanGuess === cleanCorrect || cleanCorrect.includes(cleanGuess)))

    // Log answer (yellow)
    console.log(`\x1b[33m[GAME] ${gameSession.game} - User: +${phoneNumber}, Answer: ${correctAnswer}, UserGuess: ${guess}, Result: ${won ? 'correct' : 'wrong'}\x1b[0m`)

    if (won) {
        // Clear game timer if active
        if (gameSession.timer) {
            clearTimeout(gameSession.timer)
        }

        // Process win & database coin update
        const gameResult = processGameResult(phoneNumber, isGroup ? chatJid : null, gameSession.game, true)

        // Remove session
        const sessionKey = isGroup ? chatJid : phoneNumber
        activeSessions.delete(sessionKey)

        // Game display names
        const gameNames = {
            tebakgambar: 'Tebak Gambar',
            tebakhewan: 'Tebak Hewan',
            tebakkalimat: 'Tebak Kalimat',
            tebakkata: 'Tebak Kata',
            tebaktebakan: 'Tebak-tebakan',
            tebakwarna: 'Tebak Warna',
            tebakbendera: 'Tebak Bendera',
            tebakkartun: 'Tebak Kartun',
            tebakgame: 'Tebak Game',
            karakterff: 'Tebak Karakter FF'
        }

        // Tag & Username resolution from Contact DB / event
        const userJid = senderPnJid.endsWith('@s.whatsapp.net') ? senderPnJid : `${phoneNumber}@s.whatsapp.net`
        const contact = getContactByJid(senderPnJid) || getContactByJid(senderJid)
        const pushName = contact?.push_name || event.pushName || phoneNumber

        // Disappearing message contextInfo (7 detik setelah dibaca) + mentionedJid
        const disappearContextInfo = {
            expiration: 0,
            ephemeralSettingTimestamp: Date.now(),
            disappearingMode: { initiator: 0, trigger: 1 },
            afterReadDuration: 7,
            mentionedJid: [userJid]
        }

        await clientSession.client.message.send(chatJid, {
            type: 'text',
            text: `*[+] ${gameNames[gameSession.game] || 'Game'}*\n\n` +
                  `✅ *JAWABAN BENAR!* @${phoneNumber} (${pushName})\n\n` +
                  `Jawaban: *${gameSession.answer}*\n` +
                  `Hadiah: +${gameResult.coins} Koin | +${gameResult.xp} XP\n\n` +
                  `💰 Sisa Koin: ${formatNumber(gameResult.totalCoins)}`,
            contextInfo: disappearContextInfo
        }, {
            quote: {
                key: event.key,
                message: event.message
            }
        })

        return true
    } else {
        // (3. Jawaban salah -> Cukup baca/diam saja, tidak usah di-respon)
        return false
    }
}

export default {
    handleGameMessage,
    getActiveSession,
    setActiveSession,
    deleteActiveSession
}
