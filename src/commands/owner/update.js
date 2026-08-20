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
        
        await send('*[+] Starting Update*\n\nChecking for updates...')
        
        try {
            // Step 1: Fetch from remote
            await execAsync('git fetch origin main')
            
            // Step 2: Check current branch
            const { stdout: currentBranch } = await execAsync('git branch --show-current')
            if (currentBranch.trim() !== 'main') {
                return await send(`*[!]* Not on main branch\n\nCurrent: ${currentBranch.trim()}\n\nCheckout main first: git checkout main`)
            }
            
            // Step 3: Get current commit
            const { stdout: currentCommit } = await execAsync('git rev-parse --short HEAD')
            const { stdout: remoteCommit } = await execAsync('git rev-parse --short origin/main')
            
            if (currentCommit.trim() === remoteCommit.trim()) {
                return await send('*[+] Already Up to Date*\n\nBot is running latest version.')
            }
            
            // Step 4: List files that will be updated
            const { stdout: diffOutput } = await execAsync('git diff --name-only HEAD origin/main')
            const allChangedFiles = diffOutput.trim().split('\n').filter(f => f)
            
            // Step 5: Filter hanya file yang safe untuk di-update
            // ALLOWED: src/commands/, src/services/, src/utils/, views/, public/
            const allowedPaths = [
                'src/commands/',
                'src/services/',
                'src/utils/',
                'src/routes/',
                'views/',
                'public/',
                'package.json',
                'package-lock.json',
                '.gitignore',
                '.gitattributes',
                'README.md'
            ]
            
            const changedFiles = allChangedFiles.filter(f => 
                allowedPaths.some(p => f.startsWith(p) || f === p)
            )
            
            const skippedFiles = allChangedFiles.filter(f => !changedFiles.includes(f))
            
            if (changedFiles.length === 0) {
                if (skippedFiles.length > 0) {
                    return await send(`*[+] No Safe Updates*\n\nAll changes (${skippedFiles.length} files) are in protected paths.\n\nProtected:\n- .env\n- sessions/\n- data/\n- temp/\n- src/index.js`)
                }
                return await send('*[+] No Changes*\n\nNo files to update.')
            }
            
            // Step 6: Update hanya file yang allowed dengan checkout per-file
            await send(`*[+] Updates Available*\n\nSafe files: ${changedFiles.length}${skippedFiles.length > 0 ? `\nSkipped: ${skippedFiles.length}` : ''}\n\nApplying update...`)
            
            // Checkout each allowed file individually
            for (const file of changedFiles) {
                try {
                    await execAsync(`git checkout origin/main -- "${file}"`)
                } catch (e) {
                    console.error(`Failed to update ${file}:`, e.message)
                }
            }
            
            // Step 7: Install dependencies if package.json changed
            if (changedFiles.includes('package.json')) {
                await send('*[+] Installing Dependencies*\n\nPlease wait...')
                try {
                    await execAsync('npm install')
                } catch (npmError) {
                    await send('*[!]* npm install failed\n\nRun manually: npm install')
                }
            }
            
            let summary = `*[+] Update Complete!*\n\n`
            summary += `*From:* ${currentCommit.trim()}\n`
            summary += `*To:* ${remoteCommit.trim()}\n`
            summary += `*Updated:* ${changedFiles.length} files\n`
            
            if (skippedFiles.length > 0) {
                summary += `*Skipped:* ${skippedFiles.length} files (protected)\n`
            }
            
            // Group files by type
            const commands = changedFiles.filter(f => f.startsWith('src/commands/'))
            const services = changedFiles.filter(f => f.startsWith('src/services/'))
            const utils = changedFiles.filter(f => f.startsWith('src/utils/'))
            
            summary += `\n`
            if (commands.length > 0) summary += `*Commands:* ${commands.length}\n`
            if (services.length > 0) summary += `*Services:* ${services.length}\n`
            if (utils.length > 0) summary += `*Utils:* ${utils.length}\n`
            
            summary += `\n*Status:* Bot will auto-restart (nodemon)\n`
            summary += `Or use: .restart`
            
            await send(summary)
            
        } catch (error) {
            console.error('Update error:', error)
            console.error('Stack:', error.stack)
            
            let errorMsg = '*[!]* Update Failed\n\n'
            
            if (error.message.includes('not a git repository')) {
                errorMsg += 'Error: Not a git repository\n\nInitialize: git init'
            } else if (error.message.includes('no remote') || error.message.includes('does not appear')) {
                errorMsg += 'Error: No remote configured\n\nAdd remote:\ngit remote add origin https://github.com/sbmid/Bot-SBMgrup-zapo.git'
            } else if (error.message.includes('merge conflict') || error.message.includes('CONFLICT')) {
                errorMsg += 'Error: Merge conflict\n\nResolve manually:\ngit status\ngit merge --abort'
            } else if (error.message.includes('fatal')) {
                errorMsg += `Git Error: ${error.message.split('\n')[0]}`
            } else {
                errorMsg += `Error: ${error.message}`
            }
            
            await send(errorMsg)
        }
    }
}
