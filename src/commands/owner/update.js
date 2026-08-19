import { exec } from 'child_process'
import { promisify } from 'util'
import { isOwner } from '../../utils/helpers.js'

const execAsync = promisify(exec)

export default {
    name: 'update',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        await send('*[+] Starting Update*\n\nPulling latest changes from GitHub...')
        
        try {
            // Step 1: Check git status
            const { stdout: statusOutput } = await execAsync('git status --porcelain')
            
            if (statusOutput.trim()) {
                await send(`*[!]* Uncommitted changes detected:\n\n${statusOutput.substring(0, 500)}\n\nStashing changes...`)
                await execAsync('git stash')
            }
            
            // Step 2: Fetch from remote
            await send('*[+] Fetching updates...*')
            await execAsync('git fetch origin main')
            
            // Step 3: Check if there are updates
            const { stdout: diffOutput } = await execAsync('git diff --name-only HEAD origin/main')
            
            if (!diffOutput.trim()) {
                return await send('*[+] Already Up to Date*\n\nNo new updates available.')
            }
            
            const changedFiles = diffOutput.trim().split('\n')
            const fileCount = changedFiles.length
            
            await send(`*[+] Updates Available*\n\nFiles to update: ${fileCount}\n\nPulling changes...`)
            
            // Step 4: Pull changes (will not overwrite .env and sessions/)
            const { stdout: pullOutput } = await execAsync('git pull origin main')
            
            // Step 5: Install new dependencies if package.json changed
            if (changedFiles.includes('package.json')) {
                await send('*[+] Package Updated*\n\nInstalling new dependencies...')
                await execAsync('npm install')
            }
            
            // Step 6: Pop stash if exists
            try {
                const { stdout: stashList } = await execAsync('git stash list')
                if (stashList) {
                    await execAsync('git stash pop')
                }
            } catch (e) {
                // No stash to pop
            }
            
            // Generate update summary
            let summary = `*[+] Update Complete!*\n\n`
            summary += `*Files Updated:* ${fileCount}\n\n`
            
            // Group files by type
            const commands = changedFiles.filter(f => f.startsWith('src/commands/'))
            const services = changedFiles.filter(f => f.startsWith('src/services/'))
            const views = changedFiles.filter(f => f.startsWith('views/'))
            const other = changedFiles.filter(f => !f.startsWith('src/commands/') && !f.startsWith('src/services/') && !f.startsWith('views/'))
            
            if (commands.length > 0) {
                summary += `*Commands:* ${commands.length}\n`
            }
            if (services.length > 0) {
                summary += `*Services:* ${services.length}\n`
            }
            if (views.length > 0) {
                summary += `*Views:* ${views.length}\n`
            }
            if (other.length > 0) {
                summary += `*Other:* ${other.length}\n`
            }
            
            summary += `\n*Next:* Restart bot to apply changes\n\nUse: npm run dev`
            
            await send(summary)
            
            // Note: Bot akan auto-restart jika pakai nodemon
            
        } catch (error) {
            console.error('Update error:', error)
            
            let errorMsg = '*[!]* Update Failed\n\n'
            
            if (error.message.includes('not a git repository')) {
                errorMsg += 'Error: Not a git repository\n\nRun: git init'
            } else if (error.message.includes('no remote')) {
                errorMsg += 'Error: No remote configured\n\nRun: git remote add origin https://github.com/sbmid/Bot-SBMgrup-zapo.git'
            } else if (error.message.includes('merge conflict')) {
                errorMsg += 'Error: Merge conflict detected\n\nResolve conflicts manually'
            } else {
                errorMsg += `Error: ${error.message}`
            }
            
            await send(errorMsg)
        }
    }
}
