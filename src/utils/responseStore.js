import fs from 'fs/promises'
import path from 'path'

const RESPONSE_DIR = './data/responses'

// Ensure data directory exists
async function ensureDir() {
    await fs.mkdir(RESPONSE_DIR, { recursive: true })
}

// Get response file path for group
function getResponseFile(groupJid) {
    const sanitized = groupJid.replace(/[^a-z0-9]/gi, '_')
    return path.join(RESPONSE_DIR, `${sanitized}.json`)
}

// Load responses for a group
export async function loadResponses(groupJid) {
    await ensureDir()
    const filePath = getResponseFile(groupJid)
    
    try {
        const data = await fs.readFile(filePath, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        // File doesn't exist or invalid JSON
        return {}
    }
}

// Save responses for a group
export async function saveResponses(groupJid, responses) {
    await ensureDir()
    const filePath = getResponseFile(groupJid)
    await fs.writeFile(filePath, JSON.stringify(responses, null, 2), 'utf-8')
}

// Add response
export async function addResponse(groupJid, key, text) {
    const responses = await loadResponses(groupJid)
    responses[key.toLowerCase()] = {
        text,
        createdAt: new Date().toISOString(),
        count: 0
    }
    await saveResponses(groupJid, responses)
    return true
}

// Delete response
export async function deleteResponse(groupJid, key) {
    const responses = await loadResponses(groupJid)
    const lowercaseKey = key.toLowerCase()
    
    if (!responses[lowercaseKey]) {
        return false
    }
    
    delete responses[lowercaseKey]
    await saveResponses(groupJid, responses)
    return true
}

// Get response
export async function getResponse(groupJid, key) {
    const responses = await loadResponses(groupJid)
    const lowercaseKey = key.toLowerCase()
    
    if (!responses[lowercaseKey]) {
        return null
    }
    
    // Increment counter
    responses[lowercaseKey].count++
    await saveResponses(groupJid, responses)
    
    return responses[lowercaseKey].text
}

// List all responses
export async function listResponses(groupJid) {
    const responses = await loadResponses(groupJid)
    return Object.entries(responses).map(([key, data]) => ({
        key,
        text: data.text,
        count: data.count,
        createdAt: data.createdAt
    }))
}
