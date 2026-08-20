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
            const changedFiles = diffOutput.trim().split('\n').filter(f => f)
            
            // Step 5: Check for uncommitted changes
            const { stdout: statusOutput } = await execAsync('git status --porcelain')
            const hasChanges = statusOutput.trim().length > 0
            
            // Step 6: Check for untracked files that would conflict
            const { stdout: untrackedOutput } = await execAsync('git ls-files --others --exclude-standard')
            const untrackedFiles = untrackedOutput.trim().split('\n').filter(f => f)
            
            // Check if any untracked files exist in remote
            const conflictingFiles = []
            for (const file of untrackedFiles) {
                if (changedFiles.includes(file)) {
                    conflictingFiles.push(file)
                }
            }
            
            if (conflictingFiles.length > 0) {
                await send(`*[!]* Conflict Detected*\n\nLocal untracked files will be backed up:\n\n${conflictingFiles.slice(0, 5).join('\n')}${conflictingFiles.length > 5 ? `\n...and ${conflictingFiles.length - 5} more` : ''}\n\nBacking up with .local extension...`)
                
                // Backup conflicting files
                for (const file of conflictingFiles) {
                    try {
                        await execAsync(`Move-Item -Path "${file}" -Destination "${file}.local" -Force`)
                    } catch (e) {
                        // Try Unix mv as fallback
                        try {
                            await execAsync(`mv "${file}" "${file}.local"`)
                        } catch (e2) {
                            // Ignore if already moved
                        }
                    }
                }
            }
            
            // Step 7: Re-check changed files count
            // Step 7: Re-check changed files count
            const fileCount = changedFiles.length
            
            if (fileCount === 0) {
                return await send('*[+] No Changes*\n\nNo files to update.')
            }
            
            // Check if any protected files would be overwritten
            // Protect: .env file dan folder sessions/, data/, temp/
            // Tapi allow file di folder data/ seperti data/.gitkeep
            const protectedPaths = ['.env', 'sessions/', 'data/responses.db', 'temp/']
            const wouldOverwrite = changedFiles.some(f => {
                // Exact match untuk .env
                if (f === '.env') return true
                
                // Check folder sessions/ dan temp/
                if (f.startsWith('sessions/') || f.startsWith('temp/')) return true
                
                // Untuk data/, cuma protect responses.db
                if (f === 'data/responses.db') return true
                
                return false
            })
            
            if (wouldOverwrite) {
                const protectedFound = changedFiles.filter(f => 
                    f === '.env' || 
                    f.startsWith('sessions/') || 
                    f.startsWith('temp/') || 
                    f === 'data/responses.db'
                )
                return await send(`*[!]* Update Blocked*\n\nProtected files would be overwritten:\n\n${protectedFound.join('\n')}`)
            }
            
            await send(`*[+] Updates Available*\n\nFiles: ${fileCount}\n\nApplying update...`)
            
            // Step 8: Backup uncommitted changes if any
            let stashFailed = false
            if (hasChanges) {
                await send('*[~]* Backing up local changes...')
                try {
                    await execAsync('git stash save "Auto-backup before update"')
                } catch (stashError) {
                    // If stash fails due to merge conflict, skip stash and continue
                    if (stashError.message.includes('needs merge') || stashError.stdout?.includes('needs merge')) {
                        stashFailed = true
                        await send('*[!]* Stash failed (merge conflict), forcing reset...')
                        
                        // Abort merge and reset
                        try {
                            await execAsync('git merge --abort')
                        } catch (e) {
                            // Ignore
                        }
                        
                        // Hard reset to remove conflict
                        await execAsync('git reset --hard HEAD')
                    } else {
                        throw stashError
                    }
                }
            }
            
            // Step 9: Pull with merge strategy that preserves local files
            // Using --no-commit to review changes before committing
            try {
                await execAsync('git pull origin main --no-edit')
            } catch (pullError) {
                // If pull fails, try to restore
                if (hasChanges) {
                    await execAsync('git stash pop')
                }
                throw pullError
            }
            
            // Step 10: Restore local changes (skip if stash failed)
            if (hasChanges && !stashFailed) {
                try {
                    await execAsync('git stash pop')
                    await send('*[+]* Local changes restored')
                } catch (stashError) {
                    await send('*[!]* Warning: Could not restore local changes\n\nCheck: git stash list')
                }
            }
            
            // Step 11: Install dependencies if package.json changed
            if (changedFiles.includes('package.json')) {
                await send('*[+] Installing Dependencies*\n\nPlease wait...')
                try {
                    await execAsync('npm install')
                } catch (npmError) {
                    await send('*[!]* npm install failed\n\nRun manually: npm install')
                }
            }
            
            // Step 12: Clean up backup files and generate summary
            if (conflictingFiles.length > 0) {
                await send(`*[~]* Cleaning up ${conflictingFiles.length} backup files...`)
                for (const file of conflictingFiles) {
                    try {
                        await execAsync(`Remove-Item -Path "${file}.local" -Force -ErrorAction SilentlyContinue`)
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
            }
            
            let summary = `*[+] Update Complete!*\n\n`
            summary += `*From:* ${currentCommit.trim()}\n`
            summary += `*To:* ${remoteCommit.trim()}\n`
            summary += `*Files:* ${fileCount}\n\n`
            
            // Group files by type
            const commands = changedFiles.filter(f => f.startsWith('src/commands/'))
            const services = changedFiles.filter(f => f.startsWith('src/services/'))
            const views = changedFiles.filter(f => f.startsWith('views/'))
            const utils = changedFiles.filter(f => f.startsWith('src/utils/'))
            
            if (commands.length > 0) summary += `*Commands:* ${commands.length}\n`
            if (services.length > 0) summary += `*Services:* ${services.length}\n`
            if (views.length > 0) summary += `*Views:* ${views.length}\n`
            if (utils.length > 0) summary += `*Utils:* ${utils.length}\n`
            
            summary += `\n*Status:* Bot will auto-restart (nodemon)\n`
            summary += `\nOr use: .restart`
            
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
