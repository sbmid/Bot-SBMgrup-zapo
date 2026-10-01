import { lock, unlock, isLocked } from '../../utils/lockState.js'

export default {
    name: 'lock',
    category: 'owner',
    aliases: ['lockbot', 'maintenance'],
    ownerOnly: true,
    description: 'Toggle maintenance mode',
    
    async execute({ send, reply }) {
        if (isLocked()) {
            unlock()
            await reply('🔓 *Bot Unlocked*\n\nSemua command aktif kembali.\nBot siap digunakan!')
        } else {
            lock()
            await reply('🔒 *Bot Locked*\n\nMode maintenance aktif.\nSemua command dinonaktifkan sementara.\n\nGunakan .lock lagi untuk unlock.')
        }
    }
}
