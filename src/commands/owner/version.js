import { exec } from 'child_process'
import { promisify } from 'util'
import { isOwner } from '../../utils/helpers.js'

const execAsync = promisify(exec)

export default {
    name: 'version',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        try {
            // Get current commit info
            const { stdout: commitHash } = await execAsync('git rev-parse --short HEAD')
            const { stdout: commitMsg } = await execAsync('git log -1 --pretty=%B')
            const { stdout: commitDate } = await execAsync('git log -1 --pretty=%cd --date=relative')
            const { stdout: branch } = await execAsync('git branch --show-current')
            
            // Check if there are updates
            await execAsync('git fetch origin main')
            const { stdout: behind } = await execAsync('git rev-list --count HEAD..origin/main')
            
            let message = `*[+] Bot Version Info*\n\n`
            message += `*Branch:* ${branch.trim()}\n`
            message += `*Commit:* ${commitHash.trim()}\n`
            message += `*Message:* ${commitMsg.trim()}\n`
            message += `*Date:* ${commitDate.trim()}\n`
            message += `*Status:* ${parseInt(behind) > 0 ? `${behind.trim()} commits behind` : 'Up to date'}\n`
            
            if (parseInt(behind) > 0) {
                message += `\n*Action:* Use .update to get latest changes`
            }
            
            await send(message)
            
        } catch (error) {
            console.error('Version check error:', error)
            await send(`*[!]* Failed to get version info\n\nError: ${error.message}`)
        }
    }
}
