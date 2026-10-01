import axios from 'axios'
import FormData from 'form-data'

/**
 * Upload file buffer ke berbagai hosting dengan fallback
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Nama file
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} URL file yang di-upload
 */
export async function uploadFile(buffer, filename, contentType) {
    // Try catbox.moe first (no expiry, reliable)
    try {
        const formData = new FormData()
        formData.append('reqtype', 'fileupload')
        formData.append('fileToUpload', buffer, {
            filename: filename,
            contentType: contentType
        })
        
        const response = await axios.post('https://catbox.moe/user/api.php', formData, {
            headers: formData.getHeaders(),
            timeout: 30000
        })
        
        if (response.data && typeof response.data === 'string' && response.data.startsWith('http')) {
            return response.data.trim()
        }
    } catch (error) {
        console.error('Catbox upload failed:', error.message)
    }
    
    // Fallback 1: file.io (1 download limit but works)
    try {
        const formData = new FormData()
        formData.append('file', buffer, {
            filename: filename,
            contentType: contentType
        })
        
        const response = await axios.post('https://file.io', formData, {
            headers: formData.getHeaders(),
            timeout: 30000
        })
        
        if (response.data.success && response.data.link) {
            return response.data.link
        }
    } catch (error) {
        console.error('File.io upload failed:', error.message)
    }
    
    // Fallback 2: tmpfiles.org (24h expiry)
    try {
        const formData = new FormData()
        formData.append('file', buffer, {
            filename: filename,
            contentType: contentType
        })
        
        const response = await axios.post('https://tmpfiles.org/api/v1/upload', formData, {
            headers: formData.getHeaders(),
            timeout: 30000
        })
        
        if (response.data.status === 'success' && response.data.data?.url) {
            // tmpfiles returns dl.tmpfiles.org URL that needs conversion to tmpfiles.org
            return response.data.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/')
        }
    } catch (error) {
        console.error('Tmpfiles upload failed:', error.message)
    }
    
    throw new Error('All upload services failed')
}
