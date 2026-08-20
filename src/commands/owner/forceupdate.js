import { exec } from 'child_process'
import { promisify } from 'util'
import { isOwner } from '../../utils/helpers.js'

const execAsync = promisify(exec)

export default {
    name: 'forceupdate',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        await send('*[!] FORCE UPDATE*\n\nSkipping protection checks...')
        
        try {
            // Fetch from remote
            await execAsync('git fetch origin main')
            
            // Get commits info
            const { stdout: currentCommit } = await execAsync('git rev-parse --short HEAD')
            const { stdout: remoteCommit } = await execAsync('git rev-parse --short origin/main')
            
            if (currentCommit.trim() === remoteCommit.trim()) {
                return await send('*[+] Already Up to Date*')
            }
            
            // Reset hard to remote
            await send('*[~]* Resetting to origin/main...')
            await execAsync('git reset --hard origin/main')
            
            // List changed files
            const { stdout: diffOutput } = await execAsync(`git diff --name-only ${currentCommit.trim()} ${remoteCommit.trim()}`)
            const changedFiles = diffOutput.trim().split('\n').filter(f => f)
            
            // Install deps if needed
            if (changedFiles.includes('package.json')) {
                await send('*[+]* Installing dependencies...')
                await execAsync('npm install')
            }
            
            let summary = `*[+] Force Update Complete!*\n\n`
            summary += `*From:* ${currentCommit.trim()}\n`
            summary += `*To:* ${remoteCommit.trim()}\n`
            summary += `*Files:* ${changedFiles.length}\n\n`
            summary += `Bot will auto-restart.\n\nOr use: .restart`
            
            await send(summary)
            
        } catch (error) {
            console.error('Force update error:', error)
            await send(`*[!]* Force Update Failed\n\n${error.message}`)
        }
    }
}
