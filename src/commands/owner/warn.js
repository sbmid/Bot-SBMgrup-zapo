import { addWarn, getWarnCount, getWarns, clearWarns } from '../../database/warns.js'

export default {
    name: 'warn',
    category: 'owner',
    description: 'Warn a user (admin only, 5 warns = auto kick)',
    usage: '.warn @mention [reason] or .warn check @mention or .warn clear @mention',
    groupOnly: true,
    adminOnly: true,
    
    async execute(ctx) {
        const { reply, session, chatJid, senderJid, args, event } = ctx
        
        const subcommand = args[0]?.toLowerCase()
        
        // Get mentioned user
        const mentionedJid = event.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        
        // Check warns
        if (subcommand === 'check') {
            if (!mentionedJid) {
                return reply('Usage: .warn check @mention')
            }
            
            const warns = getWarns(chatJid, mentionedJid)
            const count = warns.length
            
            if (count === 0) {
                return reply(`✅ @${mentionedJid.split('@')[0]} has no warns`, {
                    mentions: [mentionedJid]
                })
            }
            
            let message = `⚠️ *Warns for @${mentionedJid.split('@')[0]}*\n\n`
            message += `Total: ${count}/5\n\n`
            
            warns.forEach((warn, i) => {
                const date = new Date(warn.warned_at * 1000).toLocaleString('id-ID')
                message += `${i + 1}. ${warn.reason || 'No reason'}\n`
                message += `   By: ${warn.warned_by?.split('@')[0] || 'Unknown'}\n`
                message += `   Date: ${date}\n\n`
            })
            
            return reply(message, { mentions: [mentionedJid] })
        }
        
        // Clear warns
        if (subcommand === 'clear') {
            if (!mentionedJid) {
                return reply('Usage: .warn clear @mention')
            }
            
            const cleared = clearWarns(chatJid, mentionedJid)
            
            if (cleared === 0) {
                return reply(`✅ @${mentionedJid.split('@')[0]} has no warns to clear`, {
                    mentions: [mentionedJid]
                })
            }
            
            return reply(`✅ Cleared ${cleared} warn(s) for @${mentionedJid.split('@')[0]}`, {
                mentions: [mentionedJid]
            })
        }
        
        // Add warn (default)
        if (!mentionedJid) {
            return reply('Usage: .warn @mention [reason]\n\nOther commands:\n.warn check @mention\n.warn clear @mention')
        }
        
        // Prevent warning admins
        try {
            const metadata = await session.client.group.queryGroupMetadata(chatJid)
            const targetParticipant = metadata.participants.find(p => p.jid === mentionedJid)
            
            if (targetParticipant?.isAdmin || targetParticipant?.isSuperAdmin) {
                return reply('❌ Cannot warn admins')
            }
        } catch (error) {
            console.error('Warn metadata error:', error)
        }
        
        // Get reason
        const reason = args.slice(1).join(' ') || 'No reason provided'
        
        // Add warn
        addWarn(chatJid, mentionedJid, reason, senderJid)
        const newCount = getWarnCount(chatJid, mentionedJid)
        
        let message = `⚠️ *Warned @${mentionedJid.split('@')[0]}*\n\n`
        message += `Reason: ${reason}\n`
        message += `Total warns: ${newCount}/5\n\n`
        
        if (newCount >= 5) {
            message += '🚨 *5 warns reached! Auto-kicking...*'
            
            // Send warn message first
            await reply(message, { mentions: [mentionedJid] })
            
            // Auto-kick
            try {
                const results = await session.client.group.removeParticipants(chatJid, [mentionedJid])
                const result = results[0]
                
                if (result.status === 'ok') {
                    // Clear warns after kick
                    clearWarns(chatJid, mentionedJid)
                    return reply(`✅ @${mentionedJid.split('@')[0]} has been kicked (5 warns)`, {
                        mentions: [mentionedJid]
                    })
                } else {
                    return reply(`❌ Failed to kick: Error code ${result.code}`)
                }
            } catch (error) {
                console.error('Auto-kick error:', error)
                return reply(`❌ Failed to auto-kick: ${error.message}`)
            }
        } else {
            message += `Next warn will ${5 - newCount === 1 ? 'result in auto-kick' : `be ${newCount + 1}/5`}`
            return reply(message, { mentions: [mentionedJid] })
        }
    }
}
