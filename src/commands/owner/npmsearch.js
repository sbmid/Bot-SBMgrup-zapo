import axios from 'axios'

export default {
    name: 'npmsearch',
    category: 'owner',
    aliases: ['searchnpm', 'pkgsearch'],
    ownerOnly: true,
    
    async execute(ctx) {
        const { send, args } = ctx
        
        const query = args.join(' ').trim()
        
        if (!query) {
            return await send(
                '*[+] NPM Package Search*\n\n' +
                'Usage: .npmsearch <query>\n' +
                'Alias: .searchnpm / .pkgsearch\n\n' +
                '*Examples:*\n' +
                '• .npmsearch axios\n' +
                '• .npmsearch image processing\n\n' +
                '_⚠️ Owner only command_'
            )
        }
        
        await send(`*[~]* Searching npm registry for: *${query}*\n\n_Please wait..._`)
        
        try {
            // Search npm registry
            const response = await axios.get(`https://registry.npmjs.org/-/v1/search`, {
                params: {
                    text: query,
                    size: 10
                },
                timeout: 10000
            })
            
            const results = response.data.objects || []
            
            if (results.length === 0) {
                return await send(`*[!]* No packages found for: *${query}*`)
            }
            
            let message = `*[+] NPM Search Results*\n\n`
            message += `Query: *${query}*\n`
            message += `Found: ${results.length} package(s)\n\n`
            
            results.forEach((item, index) => {
                const pkg = item.package
                const name = pkg.name
                const version = pkg.version
                const description = pkg.description || '_No description_'
                const downloads = item.score?.detail?.popularity 
                    ? `${Math.round(item.score.detail.popularity * 100)}% popular` 
                    : ''
                
                message += `*${index + 1}. ${name}*\n`
                message += `   Version: ${version}\n`
                message += `   ${description.slice(0, 80)}${description.length > 80 ? '...' : ''}\n`
                if (downloads) message += `   ${downloads}\n`
                message += `\n`
            })
            
            message += `_Install with: .install <package-name>_`
            
            await send(message)
            
        } catch (error) {
            console.error('NPM search error:', error)
            
            let errorMsg = '*[!]* Search Failed\n\n'
            
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                errorMsg += 'Request timeout - npm registry slow'
            } else if (error.response?.status === 404) {
                errorMsg += 'npm registry not available'
            } else {
                errorMsg += error.message
            }
            
            await send(errorMsg)
        }
    }
}
