const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getEncryptionKey = () => {
    const key = process.env.EHR_ENCRYPTION_KEY;
    if (key) {
        return crypto.createHash('sha256').update(key).digest();
    }
    console.warn('[CRYPTO] EHR_ENCRYPTION_KEY not set in .env — using dev fallback. DO NOT use in production.');
    return crypto.createHash('sha256').update('docx_dev_ehr_key_2024').digest();
};


const encrypt = (text) => {
    if (!text) return '';

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
};


const decrypt = (encryptedText) => {
    if (!encryptedText) return '';

    try {
        const key = getEncryptionKey();
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encrypted = parts.join(':');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('[CRYPTO] Decryption failed:', error.message);
        return '[Decryption Error]';
    }
};

/**
 * Encrypts multiple fields on an object (mutates in place).
 * @param {Object} obj - The object to encrypt fields on
 * @param {string[]} fields - Array of field names to encrypt
 */
const encryptFields = (obj, fields) => {
    for (const field of fields) {
        if (obj[field]) {
            obj[field] = encrypt(obj[field]);
        }
    }
    return obj;
};

/**
 * Decrypts multiple fields on an object (returns a new plain object).
 * @param {Object} obj - The object/document to decrypt fields on
 * @param {string[]} fields - Array of field names to decrypt
 */
const decryptFields = (obj, fields) => {
    const plain = obj.toObject ? obj.toObject() : { ...obj };
    for (const field of fields) {
        if (plain[field]) {
            plain[field] = decrypt(plain[field]);
        }
    }
    return plain;
};

module.exports = { encrypt, decrypt, encryptFields, decryptFields };
