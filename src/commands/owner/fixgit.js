import { exec } from 'child_process'
import { promisify } from 'util'
import { isOwner } from '../../utils/helpers.js'

const execAsync = promisify(exec)

export default {
    name: 'fixgit',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        await send('*[+] Fixing Git Conflict*\n\nProcessing...')
        
        try {
            // Step 1: Abort any ongoing merge
            try {
                await execAsync('git merge --abort')
                await send('*[~]* Aborted merge')
            } catch (e) {
                // No merge in progress
            }
            
            // Step 2: Clear stash
            try {
                await execAsync('git stash clear')
                await send('*[~]* Cleared stash')
            } catch (e) {
                // No stash
            }
            
            // Step 3: Hard reset to HEAD (remove conflicts)
            await execAsync('git reset --hard HEAD')
            await send('*[~]* Reset to HEAD')
            
            // Step 4: Clean untracked files
            try {
                await execAsync('git clean -fd')
                await send('*[~]* Cleaned untracked files')
            } catch (e) {
                // Ignore
            }
            
            // Step 5: Get status
            const { stdout: status } = await execAsync('git status --short')
            
            let message = '*[+] Git Fixed!*\n\n'
            message += 'Merge conflict resolved.\n\n'
            
            if (status.trim()) {
                message += '*Remaining changes:*\n```\n' + status.trim() + '\n```\n\n'
            } else {
                message += 'Working tree clean.\n\n'
            }
            
            message += 'Now run: .update'
            
            await send(message)
            
        } catch (error) {
            console.error('Fix git error:', error)
            await send(`*[!]* Failed: ${error.message}`)
        }
    }
}
