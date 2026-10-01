import axios from 'axios'

/**
 * Fetch random image from Alyachan API (returns JSON with URL)
 */
export async function fetchAlyachanRandom(endpoint) {
    const apiKey = process.env.ALYACHAN_API_KEY
    if (!apiKey) {
        throw new Error('ALYACHAN_API_KEY not configured in .env')
    }
    
    const response = await axios.get(`https://api.alyachan.dev/api/random/${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
    })
    
    if (!response.data?.status || !response.data?.data?.url) {
        throw new Error('Invalid response from API')
    }
    
    // Download image from URL
    const imageUrl = response.data.data.url
    const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000
    })
    
    return Buffer.from(imageResponse.data)
}

/**
 * Fetch random image from Siputzx API (returns image directly)
 */
export async function fetchSiputzxRandom(endpoint) {
    const response = await axios.get(`https://api.siputzx.my.id/api/r/${endpoint}`, {
        responseType: 'arraybuffer',
        timeout: 30000
    })
    
    return Buffer.from(response.data)
}

/**
 * Generic random image fetcher
 */
export async function fetchRandomImage(apiType, endpoint) {
    if (apiType === 'alyachan') {
        return await fetchAlyachanRandom(endpoint)
    } else if (apiType === 'siputzx') {
        return await fetchSiputzxRandom(endpoint)
    } else {
        throw new Error('Unknown API type')
    }
}
