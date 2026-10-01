import axios from 'axios'
import FormData from 'form-data'

/**
 * Upload image to catbox.moe (free, no API key needed)
 * Returns: direct image URL
 */
export async function uploadToCatbox(buffer) {
    try {
        const form = new FormData()
        form.append('reqtype', 'fileupload')
        form.append('fileToUpload', buffer, {
            filename: `image_${Date.now()}.jpg`,
            contentType: 'image/jpeg'
        })
        
        const response = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        })
        
        // Catbox returns direct URL as text
        const url = response.data.trim()
        
        if (!url.startsWith('http')) {
            throw new Error('Invalid response from catbox')
        }
        
        return url
    } catch (error) {
        throw new Error(`Catbox upload failed: ${error.message}`)
    }
}

/**
 * Upload image to tmpfiles.org (free, anonymous, 1 hour expiry)
 */
export async function uploadToTmpfiles(buffer) {
    try {
        const form = new FormData()
        form.append('file', buffer, {
            filename: `image_${Date.now()}.jpg`,
            contentType: 'image/jpeg'
        })
        
        const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: form.getHeaders(),
            timeout: 30000
        })
        
        if (response.data?.status !== 'success' || !response.data?.data?.url) {
            throw new Error('Invalid response from tmpfiles')
        }
        
        // tmpfiles returns URL like: https://tmpfiles.org/123456
        // Direct link is: https://tmpfiles.org/dl/123456
        let url = response.data.data.url
        url = url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
        
        return url
    } catch (error) {
        throw new Error(`Tmpfiles upload failed: ${error.message}`)
    }
}

/**
 * Upload image (tries multiple services)
 */
export async function uploadImage(buffer) {
    // Try catbox first (more reliable)
    try {
        return await uploadToCatbox(buffer)
    } catch (error) {
        console.error('Catbox upload failed:', error.message)
    }
    
    // Fallback to tmpfiles
    try {
        return await uploadToTmpfiles(buffer)
    } catch (error) {
        console.error('Tmpfiles upload failed:', error.message)
        throw new Error('All image upload services failed')
    }
}
