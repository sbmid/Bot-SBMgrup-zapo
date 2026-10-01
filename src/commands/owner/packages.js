import fs from 'fs'
import path from 'path'

export default {
    name: 'packages',
    category: 'owner',
    aliases: ['pkg-list', 'deps'],
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, args } = ctx
        
        try {
            const packageJsonPath = path.join(process.cwd(), 'package.json')
            
            if (!fs.existsSync(packageJsonPath)) {
                return await send('*[!]* package.json not found!')
            }
            
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
            const deps = packageJson.dependencies || {}
            const devDeps = packageJson.devDependencies || {}
            
            const filter = args[0]?.toLowerCase()
            
            let message = '*[+] Installed Packages*\n\n'
            
            // Dependencies
            const depsEntries = Object.entries(deps)
            if (depsEntries.length > 0) {
                message += '*📦 Dependencies:*\n'
                const filtered = filter 
                    ? depsEntries.filter(([name]) => name.toLowerCase().includes(filter))
                    : depsEntries
                
                if (filtered.length > 0) {
                    message += filtered
                        .map(([name, version]) => `• ${name}@${version.replace('^', '').replace('~', '')}`)
                        .join('\n')
                    message += `\n\n_Total: ${filtered.length} package(s)_`
                } else if (filter) {
                    message += `_No packages matching "${filter}"_`
                }
            } else {
                message += '*📦 Dependencies:*\n_None installed_'
            }
            
            message += '\n\n'
            
            // Dev Dependencies
            const devDepsEntries = Object.entries(devDeps)
            if (devDepsEntries.length > 0) {
                message += '*🔧 Dev Dependencies:*\n'
                const filtered = filter 
                    ? devDepsEntries.filter(([name]) => name.toLowerCase().includes(filter))
                    : devDepsEntries
                
                if (filtered.length > 0) {
                    message += filtered
                        .map(([name, version]) => `• ${name}@${version.replace('^', '').replace('~', '')}`)
                        .join('\n')
                    message += `\n\n_Total: ${filtered.length} package(s)_`
                } else if (filter) {
                    message += `_No dev packages matching "${filter}"_`
                }
            } else {
                message += '*🔧 Dev Dependencies:*\n_None installed_'
            }
            
            if (!filter) {
                const totalDeps = depsEntries.length + devDepsEntries.length
                message += `\n\n*Total: ${totalDeps} package(s)*`
                message += `\n\n_Use: .packages <search> to filter_`
            }
            
            await send(message)
            
        } catch (error) {
            console.error('List packages error:', error)
            await send(`*[!]* Failed to list packages\n\n${error.message}`)
        }
    }
}
