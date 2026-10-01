import { isOwner } from '../../utils/helpers.js'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
    name: 'restart',
    category: 'owner',
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, senderJid, event } = ctx
        
        // Owner verification
        if (!isOwner(senderJid, event)) {
            return await send('*[!]* Owner only command')
        }
        
        await send('*[+] Restarting Bot*\n\nBot will be back online in 3-5 seconds...')
        
        setTimeout(() => {
            console.log('[Restart] Bot restart requested by owner')
            
            // Spawn new process before killing current (ensures restart)
            const entryFile = path.join(process.cwd(), 'src', 'index.js')
            
            console.log('[Restart] Spawning new process:', entryFile)
            
            const child = spawn('node', [entryFile], {
                detached: true,
                stdio: 'inherit',
                cwd: process.cwd(),
                env: process.env
            })
            
            child.unref() // Allow parent to exit
            
            console.log('[Restart] New process spawned, killing current...')
            
            // Kill current process after 1 second
            setTimeout(() => {
                process.exit(0)
            }, 1000)
            
        }, 2000)
    }
}
