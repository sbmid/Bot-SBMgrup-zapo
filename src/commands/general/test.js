import { proto } from 'zapo-js'

export default {
    name: 'test',
    category: 'general',
    
    async execute(ctx) {
        const { send, reply, session, args, chatJid, event } = ctx
        
        const testType = args[0]?.toLowerCase()
        
        if (!testType) {
            return await send(
                '*[+] Test Command*\n\n' +
                'Usage: .test <type>\n\n' +
                '*Available Tests:*\n' +
                '1. text - Plain text\n' +
                '2. link - Extended text with link preview\n' +
                '3. quote - Reply with quote\n' +
                '4. mention - Mention users\n' +
                '5. button - Quick reply buttons (3 buttons)\n' +
                '6. list - List message (dropdown menu)\n' +
                '7. location - Location message\n' +
                '8. contact - Contact vCard\n' +
                '9. react - React to message\n' +
                '10. poll - Poll message\n' +
                '11. all - Run all tests'
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
                    
                case 'button':
                    await testButton(ctx)
                    break
                    
                case 'list':
                    await testList(ctx)
                    break
                    
                case 'location':
                    await testLocation(ctx)
                    break
                    
                case 'contact':
                    await testContact(ctx)
                    break
                    
                case 'poll':
                    await testPoll(ctx)
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
    const { session, chatJid, event, send } = ctx
    
    if (!event.key || !event.message) {
        return await send('*[!]* Reply to a message to test reaction')
    }
    
    try {
        await session.client.message.send(chatJid, {
            type: 'reaction',
            target: event,
            emoji: '👍'
        })
        await send('*[+] Test: Reaction*\n\nReaction sent! Check the message you replied to.')
    } catch (error) {
        await send(`*[!]* Reaction failed: ${error.message}`)
    }
}

// Test 6: Button Message (Quick Reply)
async function testButton(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Button Message*\n\nSending button message...')
    
    await session.client.message.send(chatJid, {
        buttonsMessage: {
            contentText: 'Welcome to SBMgrup Bot!',
            footerText: 'Powered by Zapo-JS',
            headerType: proto.Message.ButtonsMessage.HeaderType.TEXT,
            text: 'Choose an option below:',
            buttons: [
                {
                    buttonId: 'btn_menu',
                    buttonText: { displayText: '📋 Menu' },
                    type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                },
                {
                    buttonId: 'btn_help',
                    buttonText: { displayText: '❓ Help' },
                    type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                },
                {
                    buttonId: 'btn_info',
                    buttonText: { displayText: 'ℹ️ Info' },
                    type: proto.Message.ButtonsMessage.Button.Type.RESPONSE
                }
            ]
        }
    })
}

// Test 7: List Message
async function testList(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: List Message*\n\nSending list message...')
    
    await session.client.message.send(chatJid, {
        listMessage: {
            title: 'Bot Commands',
            description: 'Select a category to see available commands',
            buttonText: 'Open Menu',
            footerText: 'SBMgrup Bot v1.0',
            listType: proto.Message.ListMessage.ListType.SINGLE_SELECT,
            sections: [
                {
                    title: 'General Commands',
                    rows: [
                        {
                            title: 'Menu',
                            rowId: 'row_menu',
                            description: 'Show all commands'
                        },
                        {
                            title: 'Ping',
                            rowId: 'row_ping',
                            description: 'Check bot latency'
                        },
                        {
                            title: 'Info',
                            rowId: 'row_info',
                            description: 'Bot information'
                        }
                    ]
                },
                {
                    title: 'Owner Commands',
                    rows: [
                        {
                            title: 'Update',
                            rowId: 'row_update',
                            description: 'Update bot from GitHub'
                        },
                        {
                            title: 'Restart',
                            rowId: 'row_restart',
                            description: 'Restart bot process'
                        }
                    ]
                }
            ]
        }
    })
}

// Test 8: Location Message
async function testLocation(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Location*\n\nSending location...')
    
    await session.client.message.send(chatJid, {
        locationMessage: {
            degreesLatitude: -6.200000,
            degreesLongitude: 106.816666,
            name: 'Jakarta, Indonesia',
            address: 'Capital City of Indonesia'
        }
    })
}

// Test 9: Contact vCard
async function testContact(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Contact*\n\nSending contact vCard...')
    
    const vcard = 
        'BEGIN:VCARD\n' +
        'VERSION:3.0\n' +
        'FN:SBMgrup Bot\n' +
        'TEL;type=CELL;type=VOICE;waid=6281234567890:+62 812-3456-7890\n' +
        'END:VCARD'
    
    await session.client.message.send(chatJid, {
        contactMessage: {
            displayName: 'SBMgrup Bot',
            vcard: vcard
        }
    })
}

// Test 10: Poll Message
async function testPoll(ctx) {
    const { session, chatJid, send } = ctx
    
    await send('*[+] Test: Poll*\n\nSending poll...')
    
    await session.client.message.send(chatJid, {
        type: 'poll',
        name: 'Which feature do you like most?',
        options: [
            'Auto-Response',
            'VoIP Calls',
            'Multi-Session',
            'Web Dashboard',
            'Auto-Update'
        ],
        selectableCount: 1
    })
}

// Test 5: Reaction (React to message) - OLD VERSION, REPLACED ABOVE
async function testReactionOld(ctx) {
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
    
    await send('*[+] Running All Tests*\n\nStarting test suite...\n\n_Note: Some tests require specific conditions_')
    
    // Delay helper
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    
    await testPlainText(ctx)
    await delay(2000)
    
    await testLinkPreview(ctx)
    await delay(2000)
    
    await testButton(ctx)
    await delay(2000)
    
    await testList(ctx)
    await delay(2000)
    
    await testLocation(ctx)
    await delay(2000)
    
    await testContact(ctx)
    await delay(2000)
    
    await testPoll(ctx)
    await delay(2000)
    
    if (ctx.event.key && ctx.event.message) {
        await testQuote(ctx)
        await delay(2000)
    } else {
        await send('*[~]* Skipped: Quote test (reply to a message to test)')
        await delay(1000)
    }
    
    if (ctx.isGroup) {
        await testMention(ctx)
        await delay(2000)
    } else {
        await send('*[~]* Skipped: Mention test (only works in groups)')
        await delay(1000)
    }
    
    if (ctx.event.key && ctx.event.message) {
        await testReaction(ctx)
        await delay(2000)
    } else {
        await send('*[~]* Skipped: Reaction test (reply to a message to test)')
        await delay(1000)
    }
    
    await send('*[+] All Tests Complete!*\n\nCheck messages above for results.')
}


// Note: Button and List responses are handled by CommandHandler
// When user clicks button/list, it comes back as buttonsResponseMessage or listResponseMessage
// The selectedId (buttonId or rowId) will be in the message
