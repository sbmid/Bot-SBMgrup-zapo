import { getContactByJid, getPhoneNumberFromLid } from '../../database/contacts.js'
import { getUser, getUserRank } from '../../database/game.js'
import { formatNumber } from '../../utils/gameHelper.js'
import axios from 'axios'

export default {
    name: 'profile',
    category: 'general',
    aliases: ['me', 'profil'],

    async execute(ctx) {
        const { session, event, senderJid, chatJid, isGroup } = ctx

        try {
            // Get target user (mention or self)
            const mentionedJid = event.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            let targetJid = mentionedJid || senderJid

            // Resolve LID to phone number if needed
            if (targetJid.endsWith('@lid')) {
                const phoneJid = getPhoneNumberFromLid(targetJid)
                if (phoneJid) {
                    targetJid = phoneJid
                } else {
                    // Fallback: Try to get from contact database
                    const contact = getContactByJid(targetJid)
                    if (contact?.pn_jid) {
                        targetJid = contact.pn_jid
                    }
                }
            }

            const targetNumber = targetJid.split('@')[0]

            // Get profile picture
            let profilePicUrl = null
            try {
                const pic = await session.client.profile.getProfilePicture(targetJid, 'image')
                profilePicUrl = pic?.url || null
            } catch (e) {
                console.log('No profile picture for:', targetNumber)
            }

            // Get user name from contact database first
            let userName = 'Unknown'
            const contactData = getContactByJid(targetJid)
            if (contactData?.push_name) {
                userName = contactData.push_name
            } else if (event.pushName) {
                userName = event.pushName
            } else {
                userName = targetNumber
            }

            // Get status/bio
            let status = '_No status_'
            try {
                const statusData = await session.client.profile.getStatus(targetJid)
                status = statusData?.status || '_No status_'
            } catch (e) {
                console.log('No status for:', targetNumber)
            }

            // Check if user is in group and get group role
            let groupRole = null
            if (isGroup) {
                try {
                    const groupMeta = await session.client.group.queryGroupMetadata(chatJid)
                    const participant = groupMeta.participants?.find(p => {
                        const pJid = p.phoneNumber || p.jid
                        return pJid === targetJid ||
                               pJid.split('@')[0] === targetNumber ||
                               p.jid === targetJid
                    })

                    if (participant) {
                        if (participant.isSuperAdmin) groupRole = 'Owner Group'
                        else if (participant.isAdmin) groupRole = 'Admin Group'
                        else groupRole = 'Member'
                    }
                } catch (e) {
                    console.error('Failed to get group role:', e.message)
                }
            }

            // Fetch game data & ranks
            const gameUser = getUser(targetNumber)
            const globalRank = getUserRank(targetNumber)
            const groupRank = isGroup ? getUserRank(targetNumber, chatJid) : null

            const xpNeeded = (gameUser?.level || 1) * 100
            const winRate = gameUser?.total_games > 0
                ? ((gameUser.total_wins / gameUser.total_games) * 100).toFixed(1) + '%'
                : '0%'

            // Build caption
            let caption = `[+] *USER PROFILE*\n`
            caption += `• *Nama:* ${userName}\n`
            caption += `• *Nomor:* +${targetNumber}\n`
            caption += `• *Bio:* ${status}\n`

            if (isGroup && groupRole) {
                caption += `• *Role Grup:* ${groupRole}\n`
            }

            caption += `\n[+] *STATISTIK KOIN & LEVEL*\n`
            caption += `• *Koin:* ${formatNumber(gameUser?.coins || 0)}\n`
            caption += `• *Level:* Level ${gameUser?.level || 1} (${gameUser?.xp || 0}/${xpNeeded} XP)\n`
            caption += `• *Game Winrate:* 🏆 ${gameUser?.total_wins || 0}/${gameUser?.total_games || 0} (${winRate})\n`

            caption += `\n[+] *PERINGKAT (RANK)*\n`
            caption += `• *Rank Global:* #${globalRank || '-'}\n`
            if (isGroup) {
                caption += `• *Rank Grup:* #${groupRank || '-'}\n`
            }

            caption += `\n• *WhatsApp:* wa.me/${targetNumber}\n`

            // Check if target is owner
            const ownerNumbers = process.env.OWNER_NUMBERS?.split(',').map(n => n.trim()) || []
            const isOwner = ownerNumbers.includes(targetNumber)
            if (isOwner) {
                caption += `• *Status:* 👑 Bot Owner\n`
            }

            // Send profile picture with caption
            if (profilePicUrl) {
                try {
                    const response = await axios.get(profilePicUrl, {
                        responseType: 'arraybuffer',
                        timeout: 10000
                    })
                    const imageBuffer = Buffer.from(response.data)

                    await session.client.message.send(chatJid, {
                        type: 'image',
                        media: imageBuffer,
                        mimetype: 'image/jpeg',
                        caption: caption
                    })
                } catch (error) {
                    console.error('Failed to download/send profile picture:', error.message)
                    caption += `\n_📷 Profile picture error_`
                    await session.client.message.send(chatJid, caption)
                }
            } else {
                await session.client.message.send(chatJid, caption)
            }

        } catch (error) {
            console.error('Profile command error:', error)
            await session.client.message.send(
                chatJid,
                `*[!]* Failed to get profile\n\n${error.message}`
            )
        }
    }
}
