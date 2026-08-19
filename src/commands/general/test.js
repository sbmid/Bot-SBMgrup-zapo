export default {
    name: 'test',
    category: 'general',
    
    async execute(ctx) {
        const { send, reply, session, args, chatJid, event } = ctx
        
        const testType = args[0]?.toLowerCase()
        
        if (!testType) {
            return await send(
                '*[+] Test Command*\n\n' +
                'Usage: test <type>\n\n' +
                '*Available Tests:*\n' +
                '- text - Plain text\n' +
                '- link - Extended text with link preview\n' +
                '- quote - Reply with quote\n' +
                '- mention - Mention users\n' +
                '- react - React to message\n' +
                '- all - Run all tests'
            )
        }
        
        try {
            switch (testType) {
                case 'text':
                    await testPlainText(ctx)
                    break
                    
                case 'link':
                    await testLinkPreview(ctx)
                    break
                    
                case 'quote':
                    await testQuote(ctx)
                    break
                    
                case 'mention':
                    await testMention(ctx)
                    break
                    
                case 'react':
                    await testReaction(ctx)
                    break
                    
                case 'all':
                    await runAllTests(ctx)
                    break
                    
                default:
                    await send('*[!]* Unknown test type. Use: test (without args) for help')
            }
        } catch (error) {
            console.error('Test error:', error)
            await send(`*[!]* Test failed: ${error.message}`)
        }
    }
}

// Test 1: Plain Text
async function testPlainText(ctx) {
    const { send } = ctx
    await send('*[+] Test: Plain Text*\n\nThis is a simple text message.')
}

// Test 2: Link Preview (Extended Text)
async function testLinkPreview(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Link Preview*\n\nSending extended text with link preview...')
    
    await session.client.message.send(
        chatJid,
        {
            extendedTextMessage: {
                text: '*Link Preview Test*\n\nCheck out this amazing website!\n\nhttps://github.com/vinikjkkj/zapo',
                matchedText: 'https://github.com/vinikjkkj/zapo',
                canonicalUrl: 'https://github.com/vinikjkkj/zapo',
                title: 'Zapo - WhatsApp Web Protocol',
                description: 'High-performance WhatsApp Web implementation in TypeScript'
            }
        }
    )
}

// Test 3: Quote/Reply
async function testQuote(ctx) {
    const { session, chatJid, event, send } = ctx
    
    if (!event.key || !event.message) {
        return await send('*[!]* Reply to a message to test quote feature')
    }
    
    await session.client.message.send(
        chatJid,
        '*[+] Test: Quote*\n\nThis is a quoted reply to your message!',
        {
            quote: {
                key: event.key,
                message: event.message
            }
        }
    )
}

// Test 4: Mention
async function testMention(ctx) {
    const { session, chatJid, senderJid, send, isGroup, event } = ctx
    
    if (!isGroup) {
        return await send('*[!]* Mention test only works in groups')
    }
    
    // Get sender's real JID (handle LID)
    const mentionJid = event.key?.participantAlt || event.key?.participant || senderJid
    
    await session.client.message.send(
        chatJid,
        `*[+] Test: Mention*\n\nHello @${mentionJid.split('@')[0]}! This is a mention test.`,
        {
            mentions: [mentionJid]
        }
    )
}

// Test 5: Reaction (React to message)
async function testReaction(ctx) {
    const { send } = ctx
    
    // Note: Zapo can RECEIVE reactions via message_addon event
    // but sending reactions requires protocol message
    // This is a placeholder - actual implementation needs protocol message
    
    await send(
        '*[+] Test: Reaction*\n\n' +
        'Note: Reactions are received via message_addon event.\n' +
        'Sending reactions requires protocol-level implementation.'
    )
}

// Run all tests sequentially
async function runAllTests(ctx) {
    const { send } = ctx
    
    await send('*[+] Running All Tests*\n\nStarting test suite...')
    
    // Delay helper
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    
    await testPlainText(ctx)
    await delay(1000)
    
    await testLinkPreview(ctx)
    await delay(1000)
    
    if (ctx.event.key && ctx.event.message) {
        await testQuote(ctx)
        await delay(1000)
    }
    
    if (ctx.isGroup) {
        await testMention(ctx)
        await delay(1000)
    }
    
    await testReaction(ctx)
    
    await send('*[+] All Tests Complete*\n\nCheck messages above for results.')
}
