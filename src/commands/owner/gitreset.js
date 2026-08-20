import { exec } from 'child_process'
import { promisify } from 'util'
import { isOwner } from '../../utils/helpers.js'

const execAsync = promisify(exec)

export default {
    name: 'gitreset',
    category: 'owner',
    ownerOnly: true,
    aliases: ['resetgit'],
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        await send('*[!] WARNING: Git Reset*\n\nThis will discard ALL local changes!\n\nProcessing in 3 seconds...')
        
        // Wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        try {
            // Abort any ongoing merge
            try {
                await execAsync('git merge --abort')
            } catch (e) {
                // Ignore if no merge in progress
            }
            
            // Clear stash
            try {
                await execAsync('git stash clear')
            } catch (e) {
                // Ignore if no stash
            }
            
            // Reset to origin/main
            await execAsync('git reset --hard origin/main')
            
            // Clean untracked files
            await execAsync('git clean -fd')
            
            await send('*[+] Git Reset Complete*\n\nAll local changes discarded.\n\nBot synced with GitHub.')
            
        } catch (error) {
            console.error('Git reset error:', error)
            await send(`*[!]* Reset failed: ${error.message}`)
        }
    }
}
