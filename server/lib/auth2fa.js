const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const supabaseDB = require('../database/supabase');

async function generateSecret(telegramId, username) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(username || telegramId, 'MadzzCexiBot', secret);
    
    await supabaseDB.save2FASecret(telegramId, secret, false);
    
    const qrCodeBuffer = await QRCode.toBuffer(otpauth);
    return { secret, qrCodeBuffer };
}

async function verifyToken(telegramId, token) {
    const user2fa = await supabaseDB.get2FASecret(telegramId);
    if (!user2fa || !user2fa.secret) return { success: false, error: '2FA not setup' };
    
    const isValid = authenticator.verify({ token, secret: user2fa.secret });
    if (isValid && !user2fa.is_verified) {
        await supabaseDB.update2FAVerified(telegramId, true);
    }
    return { success: isValid, isVerified: user2fa.is_verified || isValid };
}

async function is2FAVerified(telegramId) {
    const user2fa = await supabaseDB.get2FASecret(telegramId);
    return user2fa && user2fa.is_verified;
}

module.exports = {
    generateSecret,
    verifyToken,
    is2FAVerified
};
