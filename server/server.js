const express = require('express');
const { exec, spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const settings = require("./settings");

const webSupabaseUrl = settings.supabase_url;
const webSupabaseKey = settings.supabase_key;
const { createClient } = require('@supabase/supabase-js');
const webSupabase = createClient(webSupabaseUrl, webSupabaseKey);
const upload = { single: () => (_req, _res, next) => next() };

function resolveExistingPath(candidates = []) {
    for (const candidate of candidates) {
        if (candidate && fs.existsSync(candidate)) return candidate;
    }
    return null;
}

const LOCAL_METHODS_FILE = resolveExistingPath([
    path.join(__dirname, 'database', 'local_methods.json'),
    path.join(__dirname, '..', 'config', 'local_methods.json')
]);
const METHODS_FILE = resolveExistingPath([
    path.join(__dirname, '..', 'config', 'methods.json'),
    LOCAL_METHODS_FILE
]);
const BOTNET_DATA_FILE = resolveExistingPath([
    path.join(__dirname, 'lib', 'botnet.json'),
    path.join(__dirname, '..', 'config', 'botnet.json')
]);

const rateLimits = new Map();
function rateLimit(key, limit, windowMs) {
    const now = Date.now();
    if (!rateLimits.has(key)) rateLimits.set(key, []);
    const timestamps = rateLimits.get(key).filter(t => now - t < windowMs);
    timestamps.push(now);
    rateLimits.set(key, timestamps);
    return timestamps.length <= limit;
}

const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_OAUTH_STATE_CLEANUP_MS = 60 * 1000;
const GOOGLE_OAUTH_DEFAULT_SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.readonly'
];
const googleOAuthStateStore = new Map();

function readSetting(...keys) {
    for (const key of keys) {
        const value = settings?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
}

function parseOAuthScopes(rawScopes) {
    const source = Array.isArray(rawScopes)
        ? rawScopes
        : String(rawScopes || '').split(/[,\s]+/g);
    const scopes = source.map(scope => String(scope || '').trim()).filter(Boolean);
    return [...new Set(scopes.length > 0 ? scopes : GOOGLE_OAUTH_DEFAULT_SCOPES)];
}

function getGoogleOAuthRuntime() {
    const clientId = readSetting('google_oauth_client_id', 'googleOAuthClientId');
    const clientSecret = readSetting('google_oauth_client_secret', 'googleOAuthClientSecret');
    const redirectUri = readSetting('google_oauth_redirect_uri', 'googleOAuthRedirectUri')
        || (settings?.domain ? `${String(settings.domain).replace(/\/$/, '')}/api/web/cloud/oauth/callback` : '');
    const encryptionSecret = readSetting('google_oauth_encryption_key', 'googleOAuthEncryptionKey')
        || readSetting('supabase_key', 'database_url', 'token');
    const stateSecret = readSetting('google_oauth_state_secret', 'googleOAuthStateSecret')
        || encryptionSecret;
    const scopes = parseOAuthScopes(readSetting('google_oauth_scopes', 'googleOAuthScopes'));

    const missing = [];
    if (!clientId) missing.push('GOOGLE_OAUTH_CLIENT_ID');
    if (!clientSecret) missing.push('GOOGLE_OAUTH_CLIENT_SECRET');
    if (!redirectUri) missing.push('GOOGLE_OAUTH_REDIRECT_URI');

    return {
        clientId,
        clientSecret,
        redirectUri,
        encryptionSecret,
        stateSecret,
        scopes,
        missing
    };
}

function assertGoogleOAuthRuntime() {
    const runtime = getGoogleOAuthRuntime();
    if (runtime.missing.length > 0) {
        const error = new Error(`Google OAuth is not configured. Missing: ${runtime.missing.join(', ')}`);
        error.code = 'google_oauth_missing_config';
        throw error;
    }
    return runtime;
}

function buildGoogleOAuthClient() {
    const runtime = assertGoogleOAuthRuntime();
    return new google.auth.OAuth2(runtime.clientId, runtime.clientSecret, runtime.redirectUri);
}

function deriveOAuthKey(secret) {
    return crypto.createHash('sha256').update(String(secret || '')).digest();
}

function encryptOAuthTokenPayload(payload, secret = null) {
    const key = deriveOAuthKey(secret || getGoogleOAuthRuntime().encryptionSecret);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload ?? {}), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
        v: 1,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        ciphertext: encrypted.toString('base64')
    });
}

function decryptOAuthTokenPayload(payload, secret = null) {
    if (!payload) return null;
    const key = deriveOAuthKey(secret || getGoogleOAuthRuntime().encryptionSecret);
    let parsed = payload;
    if (typeof payload === 'string') {
        try {
            parsed = JSON.parse(payload);
        } catch {
            return null;
        }
    }
    if (!parsed || typeof parsed !== 'object' || !parsed.iv || !parsed.tag || !parsed.ciphertext) {
        return null;
    }

    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            key,
            Buffer.from(parsed.iv, 'base64')
        );
        decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(parsed.ciphertext, 'base64')),
            decipher.final()
        ]);
        return JSON.parse(decrypted.toString('utf8'));
    } catch {
        return null;
    }
}

function createGoogleOAuthState(appUser) {
    const runtime = assertGoogleOAuthRuntime();
    const userId = String(appUser?.id || appUser?.userId || '').trim();
    if (!userId) {
        const error = new Error('Authenticated user is required to start Google OAuth');
        error.code = 'google_oauth_missing_user';
        throw error;
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const issuedAt = Date.now();
    const payload = {
        v: 1,
        purpose: 'google_oauth_connect',
        nonce,
        appUserId: userId,
        issuedAt,
        expiresAt: issuedAt + GOOGLE_OAUTH_STATE_TTL_MS
    };
    const raw = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto.createHmac('sha256', runtime.stateSecret).update(raw).digest('base64url');
    googleOAuthStateStore.set(nonce, {
        ...payload,
        raw,
        signature,
        usedAt: null
    });
    return `${raw}.${signature}`;
}

function verifyGoogleOAuthState(state, expectedUserId = null) {
    const runtime = assertGoogleOAuthRuntime();
    const rawState = String(state || '').trim();
    if (!rawState || !rawState.includes('.')) {
        const error = new Error('Missing or invalid OAuth state');
        error.code = 'google_oauth_invalid_state';
        throw error;
    }

    const [raw, signature] = rawState.split('.', 2);
    const expectedSignature = crypto.createHmac('sha256', runtime.stateSecret).update(raw).digest();
    const providedSignature = Buffer.from(signature, 'base64url');

    if (expectedSignature.length !== providedSignature.length || !crypto.timingSafeEqual(expectedSignature, providedSignature)) {
        const error = new Error('Invalid OAuth state signature');
        error.code = 'google_oauth_invalid_state';
        throw error;
    }

    let payload;
    try {
        payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    } catch {
        const error = new Error('Invalid OAuth state payload');
        error.code = 'google_oauth_invalid_state';
        throw error;
    }

    if (!payload || payload.purpose !== 'google_oauth_connect' || !payload.nonce || !payload.appUserId) {
        const error = new Error('Invalid OAuth state payload');
        error.code = 'google_oauth_invalid_state';
        throw error;
    }

    if (payload.expiresAt && Date.now() > Number(payload.expiresAt)) {
        googleOAuthStateStore.delete(payload.nonce);
        const error = new Error('OAuth state expired');
        error.code = 'google_oauth_state_expired';
        throw error;
    }

    const stored = googleOAuthStateStore.get(payload.nonce);
    if (!stored || stored.raw !== raw || stored.signature !== signature || stored.usedAt) {
        const error = new Error('OAuth state has already been used or is unknown');
        error.code = 'google_oauth_invalid_state';
        throw error;
    }

    if (expectedUserId && String(expectedUserId) !== String(payload.appUserId)) {
        const error = new Error('OAuth state does not match the signed-in user');
        error.code = 'google_oauth_invalid_state';
        throw error;
    }

    googleOAuthStateStore.delete(payload.nonce);
    return payload;
}

function sanitizeGoogleOAuthAccount(record, tokenPayload = null) {
    if (!record) return null;
    const expiresAt = record.access_token_expires_at || null;
    const expiryMs = expiresAt ? new Date(expiresAt).getTime() : 0;
    const isExpired = expiryMs > 0 && expiryMs <= Date.now();
    const status = String(record.connection_status || 'missing').toLowerCase();
    const decryptedPayload = tokenPayload || decryptOAuthTokenPayload(record.encrypted_token_payload);
    const hasRefreshToken = !!decryptedPayload?.refresh_token;
    const connectionStatus = !hasRefreshToken
        ? 'missing'
        : (status === 'connected' && isExpired ? 'expired' : status);

    return {
        id: record.id,
        appUserId: record.app_user_id,
        provider: record.provider || 'google',
        providerAccountId: record.provider_account_id || null,
        providerAccountEmail: record.provider_account_email || null,
        connectionStatus,
        connected: connectionStatus === 'connected',
        accessTokenExpiresAt: expiresAt,
        accessTokenScopes: Array.isArray(record.access_token_scope) ? record.access_token_scope : [],
        connectedAt: record.connected_at || null,
        lastTestedAt: record.last_tested_at || null,
        lastRefreshedAt: record.last_refreshed_at || null,
        revokedAt: record.revoked_at || null,
        missingSinceAt: record.missing_since_at || null,
        lastError: record.last_error || null,
        createdAt: record.created_at || null,
        updatedAt: record.updated_at || null
    };
}

async function getGoogleOAuthAccount(appUserId) {
    const capability = await getTableCapability('cloud_oauth_accounts');
    if (!capability.available) {
        return {
            capability,
            account: null
        };
    }

    const result = await webSupabase
        .from('cloud_oauth_accounts')
        .select('*')
        .eq('app_user_id', String(appUserId))
        .eq('provider', 'google')
        .maybeSingle();

    if (result.error) {
        if (isMissingTableError(result.error, 'cloud_oauth_accounts')) {
            const missingCapability = markTableMissing('cloud_oauth_accounts', result.error);
            return {
                capability: missingCapability,
                account: null
            };
        }
        throw result.error;
    }

    return {
        capability,
        account: result.data || null
    };
}

async function upsertGoogleOAuthAccount({
    appUserId,
    providerAccountId,
    providerAccountEmail,
    tokenPayload,
    accessTokenExpiresAt,
    accessTokenScopes,
    connectionStatus = 'connected',
    connectedAt = new Date().toISOString(),
    lastRefreshedAt = null,
    lastTestedAt = null,
    revokedAt = null,
    missingSinceAt = null,
    lastError = null
}) {
    const capability = await getTableCapability('cloud_oauth_accounts');
    if (!capability.available) {
        throw new Error(buildMissingTableMessage('cloud_oauth_accounts'));
    }

    const encryptedPayload = encryptOAuthTokenPayload(tokenPayload);
    const payload = {
        app_user_id: String(appUserId),
        provider: 'google',
        provider_account_id: providerAccountId || null,
        provider_account_email: String(providerAccountEmail || '').trim().toLowerCase(),
        encrypted_token_payload: encryptedPayload,
        encrypted_token_payload_version: 1,
        access_token_expires_at: accessTokenExpiresAt || null,
        access_token_scope: Array.isArray(accessTokenScopes) ? accessTokenScopes : [],
        connection_status: connectionStatus,
        connected_at: connectionStatus === 'connected' ? connectedAt : null,
        last_refreshed_at: lastRefreshedAt || null,
        last_tested_at: lastTestedAt || null,
        revoked_at: revokedAt,
        missing_since_at: missingSinceAt,
        last_error: lastError
    };

    const result = await webSupabase
        .from('cloud_oauth_accounts')
        .upsert([payload], { onConflict: 'app_user_id,provider' })
        .select('*')
        .maybeSingle();

    if (result.error) {
        if (isMissingTableError(result.error, 'cloud_oauth_accounts')) {
            const missingCapability = markTableMissing('cloud_oauth_accounts', result.error);
            throw new Error(buildMissingTableMessage('cloud_oauth_accounts') + ` (${missingCapability.message || 'table missing'})`);
        }
        throw result.error;
    }

    return result.data || null;
}

function classifyGoogleOAuthConnectionFailure(error) {
    const rawMessage = extractErrorMessage(error) || String(error?.message || 'Unknown Google OAuth error');
    const message = rawMessage.toLowerCase();

    if (message.includes('no refresh token') || message.includes('missing refresh token') || message.includes('refresh_token')) {
        return {
            code: 'google_oauth_missing',
            status: 'missing',
            message: 'No linked Gmail refresh token found. Reconnect Gmail to continue.',
            rawMessage
        };
    }

    if (message.includes('invalid_grant') || message.includes('token has been expired or revoked') || message.includes('token revoked') || message.includes('revoked')) {
        return {
            code: 'google_oauth_revoked',
            status: 'revoked',
            message: 'Google Gmail connection was revoked. Reconnect Gmail to continue.',
            rawMessage
        };
    }

    if (message.includes('expired') || message.includes('access token') && message.includes('expired')) {
        return {
            code: 'google_oauth_expired',
            status: 'expired',
            message: 'Google Gmail connection expired. Reconnect Gmail to continue.',
            rawMessage
        };
    }

    return {
        code: 'google_oauth_error',
        status: 'error',
        message: 'Google Gmail connection could not be refreshed. Reconnect Gmail to continue.',
        rawMessage
    };
}

function buildGoogleOAuthUnavailablePayload(account, fallbackMessage = 'Google Gmail connection is unavailable', override = null) {
    const connection = sanitizeGoogleOAuthAccount(account);
    const classified = override && typeof override === 'object'
        ? override
        : classifyGoogleOAuthConnectionFailure(new Error(connection?.lastError || fallbackMessage));
    const status = connection?.connectionStatus || classified.status || 'missing';

    if (status === 'missing' && !connection) {
        return {
            error: 'No linked Gmail account found. Connect Gmail to use cloud storage.',
            errorCode: 'google_oauth_missing',
            connectionStatus: 'missing',
            connected: false,
            details: null
        };
    }

    return {
        error: connection?.lastError || classified.message || fallbackMessage,
        errorCode: classified.code || 'google_oauth_unavailable',
        connectionStatus: status,
        connected: false,
        details: connection?.lastError || classified.rawMessage || null
    };
}

async function updateGoogleOAuthAccountState(account, updates = {}, tokenPayload = null) {
    if (!account) return null;
    const payload = tokenPayload || decryptOAuthTokenPayload(account.encrypted_token_payload) || {};
    return upsertGoogleOAuthAccount({
        appUserId: account.app_user_id,
        providerAccountId: updates.providerAccountId ?? account.provider_account_id ?? null,
        providerAccountEmail: updates.providerAccountEmail ?? account.provider_account_email ?? null,
        tokenPayload: payload,
        accessTokenExpiresAt: updates.accessTokenExpiresAt ?? account.access_token_expires_at ?? null,
        accessTokenScopes: updates.accessTokenScopes ?? account.access_token_scope ?? [],
        connectionStatus: updates.connectionStatus ?? account.connection_status ?? 'connected',
        connectedAt: updates.connectedAt ?? account.connected_at ?? null,
        lastRefreshedAt: updates.lastRefreshedAt ?? account.last_refreshed_at ?? null,
        lastTestedAt: updates.lastTestedAt ?? account.last_tested_at ?? null,
        revokedAt: updates.revokedAt ?? account.revoked_at ?? null,
        missingSinceAt: updates.missingSinceAt ?? account.missing_since_at ?? null,
        lastError: updates.lastError ?? account.last_error ?? null
    });
}

async function getGoogleOAuthDriveContext(appUserId, options = {}) {
    const { folderId = null, forceRefresh = false } = options;
    const runtime = assertGoogleOAuthRuntime();
    const accountResult = await getGoogleOAuthAccount(appUserId);

    if (accountResult.capability && !accountResult.capability.available) {
        return {
            available: false,
            httpStatus: 503,
            error: buildMissingTableMessage('cloud_oauth_accounts'),
            errorCode: 'cloud_oauth_accounts_missing',
            connectionStatus: 'missing',
            connected: false,
            details: accountResult.capability?.message || null
        };
    }

    const account = accountResult.account;
    if (!account) {
        return {
            available: false,
            httpStatus: 409,
            ...buildGoogleOAuthUnavailablePayload(null)
        };
    }

    const connection = sanitizeGoogleOAuthAccount(account);
    if (connection.connectionStatus === 'revoked') {
        return {
            available: false,
            httpStatus: 409,
            ...buildGoogleOAuthUnavailablePayload(account, 'Google Gmail connection was revoked. Reconnect Gmail to continue.')
        };
    }

    const tokenPayload = decryptOAuthTokenPayload(account.encrypted_token_payload);
    if (!tokenPayload?.refresh_token) {
        const updated = await updateGoogleOAuthAccountState(account, {
            connectionStatus: 'missing',
            missingSinceAt: new Date().toISOString(),
            lastError: 'No linked Gmail refresh token found. Reconnect Gmail to continue.'
        }, tokenPayload || {});

        return {
            available: false,
            httpStatus: 409,
            ...buildGoogleOAuthUnavailablePayload(updated || account, 'No linked Gmail refresh token found. Reconnect Gmail to continue.')
        };
    }

    const oauthClient = buildGoogleOAuthClient();
    oauthClient.setCredentials(tokenPayload);

    try {
        await oauthClient.getAccessToken();
    } catch (error) {
        const classified = classifyGoogleOAuthConnectionFailure(error);
        const updated = await updateGoogleOAuthAccountState(account, {
            connectionStatus: classified.status,
            revokedAt: classified.status === 'revoked' ? new Date().toISOString() : account.revoked_at || null,
            missingSinceAt: classified.status === 'missing' ? new Date().toISOString() : account.missing_since_at || null,
            lastError: classified.message
        }, tokenPayload);

        return {
            available: false,
            httpStatus: classified.status === 'error' ? 503 : 409,
            ...buildGoogleOAuthUnavailablePayload(updated || account, classified.message, classified)
        };
    }

    const credentials = oauthClient.credentials || {};
    const accessToken = credentials.access_token || tokenPayload.access_token || null;
    const accessTokenExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : (account.access_token_expires_at || null);
    const accessTokenScopes = parseOAuthScopes(credentials.scope || account.access_token_scope || runtime.scopes);
    const nextTokenPayload = {
        ...tokenPayload,
        ...credentials,
        access_token: accessToken,
        expiry_date: credentials.expiry_date || tokenPayload.expiry_date || null,
        refresh_token: credentials.refresh_token || tokenPayload.refresh_token,
        obtained_at: tokenPayload.obtained_at || new Date().toISOString()
    };

    const savedAccount = forceRefresh || accessToken !== tokenPayload.access_token || accessTokenExpiresAt !== account.access_token_expires_at
        ? await updateGoogleOAuthAccountState(account, {
            connectionStatus: 'connected',
            connectedAt: account.connected_at || new Date().toISOString(),
            lastRefreshedAt: new Date().toISOString(),
            revokedAt: null,
            missingSinceAt: null,
            lastError: null,
            accessTokenExpiresAt,
            accessTokenScopes
        }, nextTokenPayload)
        : account;

    return {
        available: true,
        service: google.drive({ version: 'v3', auth: oauthClient }),
        accountId: savedAccount?.id || account.id,
        folderId,
        connection: sanitizeGoogleOAuthAccount(savedAccount || account, nextTokenPayload),
        oauthClient
    };
}

async function revokeGoogleOAuthRemoteToken(tokenPayload, runtime = null) {
    const refreshToken = tokenPayload?.refresh_token || null;
    const accessToken = tokenPayload?.access_token || null;
    const client = runtime ? new google.auth.OAuth2(runtime.clientId, runtime.clientSecret, runtime.redirectUri) : buildGoogleOAuthClient();

    if (refreshToken) {
        try {
            await client.revokeToken(refreshToken);
            return { revoked: true, revokedToken: 'refresh_token' };
        } catch (error) {
            if (accessToken) {
                try {
                    await client.revokeToken(accessToken);
                    return { revoked: true, revokedToken: 'access_token', revokeError: error };
                } catch (fallbackError) {
                    return { revoked: false, revokeError: fallbackError, revokeAttemptError: error };
                }
            }
            return { revoked: false, revokeError: error };
        }
    }

    if (accessToken) {
        try {
            await client.revokeToken(accessToken);
            return { revoked: true, revokedToken: 'access_token' };
        } catch (error) {
            return { revoked: false, revokeError: error };
        }
    }

    return { revoked: false, revokeError: new Error('No OAuth token available to revoke') };
}

setInterval(() => {
    const now = Date.now();
    for (const [nonce, entry] of googleOAuthStateStore.entries()) {
        if (!entry || !entry.expiresAt || Number(entry.expiresAt) <= now) {
            googleOAuthStateStore.delete(nonce);
        }
    }
}, GOOGLE_OAUTH_STATE_CLEANUP_MS);

// Drive service setup helper
async function getDriveService(accountId = null) {
    try {
        const cloudAccountsCapability = await getTableCapability('cloud_accounts');
        if (!cloudAccountsCapability.available) return null;

        let query = webSupabase.from('cloud_accounts').select('*');
        if (accountId) query = query.eq('id', accountId);

        const { data: accounts, error } = await query;
        if (error) {
            if (isMissingTableError(error, 'cloud_accounts')) {
                markTableMissing('cloud_accounts', error);
            }
            return null;
        }
        if (!accounts || accounts.length === 0) return null;

        let candidates = accounts;
        if (!accountId) {
            const activeAccounts = accounts.filter(acc =>
                acc.is_active === true || String(acc.status || '').toLowerCase() === 'active'
            );
            candidates = activeAccounts.length > 0 ? activeAccounts : accounts;
            candidates = shuffleArray(candidates);
        }

        for (const account of candidates) {
            if (!accountId) {
                const probe = await probeDriveAccountRecord(account);
                if (!probe.ready) continue;
            }
            const parsed = parseDriveCredentialsString(account.credentials_json);
            if (!parsed.success) {
                console.error('Drive Setup Error:', `Invalid credentials JSON for account ${account.id}`);
                continue;
            }
            try {
                const runtime = buildDriveRuntimeFromCredentials(parsed.credentials);
                return {
                    service: runtime.service,
                    accountId: account.id,
                    folderId: runtime.folderId,
                    sharedDriveId: runtime.sharedDriveId,
                    delegatedUser: runtime.delegatedUser
                };
            } catch (runtimeError) {
                console.error('Drive Setup Error:', runtimeError.message);
            }
        }
        return null;
    } catch (e) {
        console.error('Drive Setup Error:', e.message);
        return null;
    }
}

const { Client } = require('ssh2');
const axios = require('axios');

const logger = require('./lib/consoleLogger');
const supabaseDB = require('./database/supabase');

const app = express();
const PORT = process.env.PORT || 5000;

logger.logActivity('SERVER_INIT', { port: PORT }, 'System');

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    next();
});

const authTokens = new Map();
const AUTH_TOKENS_FILE = './auth_tokens.json';

function loadAuthTokens() {
    try {
        if (fs.existsSync(AUTH_TOKENS_FILE)) {
            const data = JSON.parse(fs.readFileSync(AUTH_TOKENS_FILE, 'utf-8'));
            const now = Date.now();
            for (const [token, tokenData] of Object.entries(data)) {
                if (tokenData.expiresAt > now) {
                    authTokens.set(token, tokenData.user);
                }
            }
            console.log(`Loaded ${authTokens.size} valid auth tokens from file`);
        }
    } catch (e) {
        console.log('No auth tokens to load or error loading:', e.message);
    }
}

function saveAuthTokens() {
    try {
        const data = {};
        for (const [token, user] of authTokens.entries()) {
            data[token] = {
                user,
                expiresAt: Date.now() + (24 * 60 * 60 * 1000)
            };
        }
        fs.writeFileSync(AUTH_TOKENS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.log('Error saving auth tokens:', e.message);
    }
}

loadAuthTokens();

const PLAN_LIMITS_FILE = './plan_limits.json';

let PLAN_LIMITS = {
    free: { maxDuration: 60, allowedMethods: ['storm'], apiAccess: false },
    pro: { maxDuration: 300, allowedMethods: null, apiAccess: true },
    owner: { maxDuration: 600, allowedMethods: null, apiAccess: true }
};

function loadPlanLimits() {
    try {
        if (fs.existsSync(PLAN_LIMITS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PLAN_LIMITS_FILE, 'utf-8'));
            PLAN_LIMITS = { ...PLAN_LIMITS, ...data };
            console.log('Plan limits loaded from file');
        }
    } catch (e) {
        console.log('Using default plan limits');
    }
}

function savePlanLimits() {
    try {
        fs.writeFileSync(PLAN_LIMITS_FILE, JSON.stringify(PLAN_LIMITS, null, 2));
    } catch (e) {
        console.log('Error saving plan limits:', e.message);
    }
}

loadPlanLimits();

function getUserFromToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return authTokens.get(token) || null;
}

function validatePlanRestrictions(user, method, duration, isApiMethod = false) {
    const role = user?.role || 'free';
    const plan = PLAN_LIMITS[role] || PLAN_LIMITS.free;

    if (duration > plan.maxDuration) {
        return { valid: false, error: `Max duration for ${role.toUpperCase()} is ${plan.maxDuration}s` };
    }

    if (isApiMethod && !plan.apiAccess) {
        return { valid: false, error: 'Upgrade to PRO for API methods' };
    }

    if (plan.allowedMethods && !plan.allowedMethods.includes(method.toLowerCase())) {
        return { valid: false, error: `Method "${method}" requires PRO plan. Free plan only allows: ${plan.allowedMethods.join(', ')}` };
    }

    return { valid: true };
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function verifyAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    if (!authTokens.has(token)) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = authTokens.get(token);
    next();
}

const OWNER_TELEGRAM_ID = '8253048034';

app.post('/api/auth/login', async (req, res) => {
    const { telegramId } = req.body;
    if (!telegramId) {
        return res.status(400).json({ success: false, error: 'Telegram ID diperlukan' });
    }

    const cleanTelegramId = telegramId.toString().trim();

    if (!/^\d+$/.test(cleanTelegramId)) {
        return res.status(400).json({ success: false, error: 'Telegram ID mesti nombor sahaja' });
    }

    try {
        const userData = await supabaseDB.getUserByTelegramId(cleanTelegramId);

        if (!userData) {
            return res.status(401).json({
                success: false,
                error: 'Telegram ID tidak berdaftar. Sila /start bot Telegram dahulu.'
            });
        }

        let role = 'free';
        if (cleanTelegramId === OWNER_TELEGRAM_ID) {
            role = 'owner';
        } else {
            const isAdmin = await supabaseDB.isAdminUser(cleanTelegramId);
            const isPremium = await supabaseDB.isPremiumUser(cleanTelegramId);
            if (isAdmin) role = 'admin';
            else if (isPremium) role = 'pro';
        }

        const token = generateToken();
        const username = userData.username || userData.first_name || `User_${cleanTelegramId.slice(-4)}`;

        authTokens.set(token, {
            username: username,
            role: role,
            telegramId: cleanTelegramId,
            firstName: userData.first_name
        });
        saveAuthTokens();

        setTimeout(() => {
            authTokens.delete(token);
            saveAuthTokens();
        }, 24 * 60 * 60 * 1000);

        return res.json({
            success: true,
            token: token,
            user: {
                username: username,
                role: role,
                telegramId: cleanTelegramId,
                firstName: userData.first_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, error: 'Ralat server' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        authTokens.delete(token);
        saveAuthTokens();
    }
    res.json({ success: true });
});

app.get('/api/auth/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ authenticated: false });
    }
    const token = authHeader.split(' ')[1];
    if (authTokens.has(token)) {
        const user = authTokens.get(token);
        return res.json({ authenticated: true, user });
    }
    return res.json({ authenticated: false });
});

app.post('/api/auth/signup', (req, res) => {
    return res.status(403).json({
        success: false,
        error: 'Pendaftaran web dinonaktifkan. Sila /start bot Telegram untuk mendaftar.'
    });
});

app.use(express.static(path.join(__dirname, '../dashboard')));

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

const sessions = new Map();
const vpsConnections = new Map();

function getSession(sessionId) {
    if (!sessionId) return null;
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            cwd: process.cwd(),
            created: Date.now()
        });
    }
    return sessions.get(sessionId);
}

function updateSessionCwd(sessionId, newCwd) {
    if (sessions.has(sessionId)) {
        sessions.get(sessionId).cwd = newCwd;
    }
}

setInterval(() => {
    const now = Date.now();
    const timeout = 30 * 60 * 1000;
    for (const [id, session] of sessions.entries()) {
        if (now - session.created > timeout) {
            sessions.delete(id);
        }
    }
}, 5 * 60 * 1000);

const allowedCommands = [
    'ls', 'cat', 'pwd', 'whoami', 'uptime', 'date', 'uname', 'hostname',
    'id', 'ps', 'free', 'df', 'echo', 'head', 'tail', 'wc', 'sort',
    'grep', 'find', 'which', 'type', 'env', 'printenv',
    'neofetch', 'screenfetch', 'lsb_release', 'hostnamectl',
    'lscpu', 'lsmem', 'nproc', 'arch', 'getconf',
    'ip', 'ifconfig', 'netstat', 'ss', 'ping', 'traceroute', 'nslookup', 'dig', 'host', 'curl', 'wget', 'netcheck',
    'apt', 'apt-get', 'dpkg', 'yum', 'dnf', 'pacman', 'nix-env', 'nix',
    'npm', 'node', 'yarn', 'npx', 'pnpm',
    'python', 'python3', 'pip', 'pip3',
    'bash', 'sh',
    'mkdir', 'touch', 'cp', 'mv', 'rm', 'chmod', 'chown',
    'tar', 'gzip', 'gunzip', 'zip', 'unzip',
    'git',
    'htop', 'top', 'kill', 'killall', 'pkill',
    'systemctl', 'service', 'journalctl',
    'nano', 'vim', 'vi', 'less', 'more',
    'clear', 'reset', 'exit', 'cd',
    'sudo',
    'man', 'help', 'info',
    'docker', 'docker-compose',
    'screen', 'tmux', 'nohup',
    'awk', 'sed', 'cut', 'tr', 'xargs',
    'time', 'timeout', 'watch',
    'base64', 'md5sum', 'sha256sum',
    'du', 'stat', 'file', 'tree',
    'nc', 'telnet', 'ftp', 'sftp'
];

const dangerousPatterns = [
    /[;&|`$]/,
    /\$\(/,
    />\s*>/,
    /<\s*</,
    /\|\|/,
    /&&/,
    /\n/,
    /\r/
];

const sandboxedCommands = {
    'ping': {
        reason: 'ICMP packets are blocked in cloud containers',
        alternatives: [
            'curl -I https://example.com  (check HTTP connectivity)',
            'nc -vz host port  (check TCP port)',
            'dig example.com  (check DNS resolution)'
        ]
    },
    'traceroute': {
        reason: 'Raw sockets/ICMP not available in sandbox',
        alternatives: [
            'curl -I https://example.com  (test reachability)',
            'dig +trace example.com  (trace DNS path)'
        ]
    },
    'telnet': {
        reason: 'telnet may not be installed',
        alternatives: [
            'nc -vz host port  (check if port is open)',
            'curl telnet://host:port  (connect via curl)'
        ]
    },
    'ftp': {
        reason: 'FTP not installed in this environment',
        alternatives: [
            'curl ftp://host/path  (FTP via curl)',
            'wget ftp://host/path  (download via wget)'
        ]
    },
    'ifconfig': {
        reason: 'ifconfig may not be installed',
        alternatives: [
            'ip addr  (show IP addresses)',
            'ip link  (show network interfaces)'
        ]
    },
    'netstat': {
        reason: 'netstat may not be available',
        alternatives: [
            'ss -tuln  (show listening ports)',
            'ss -tunp  (show connections with process)'
        ]
    },
    'systemctl': {
        reason: 'systemd not available in container',
        alternatives: [
            'ps aux  (check running processes)',
            'pgrep -a processname  (find specific process)'
        ]
    },
    'service': {
        reason: 'init.d services not available in container',
        alternatives: [
            'ps aux  (check running processes)'
        ]
    },
    'htop': {
        reason: 'htop may not be installed',
        alternatives: [
            'top  (basic process viewer)',
            'ps aux  (list all processes)',
            'free -h  (memory usage)'
        ]
    }
};

function getSandboxMessage(command) {
    const firstWord = command.trim().split(/\s+/)[0].toLowerCase();
    const info = sandboxedCommands[firstWord];
    if (info) {
        let msg = ` ${firstWord}: ${info.reason}\n\n`;
        msg += ` Alternatives that work here:\n`;
        info.alternatives.forEach(alt => {
            msg += `    ${alt}\n`;
        });
        return msg;
    }
    return null;
}

function containsDangerousChars(command) {
    for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
            return true;
        }
    }
    return false;
}

function isCommandAllowed(command) {
    const trimmed = command.trim();

    if (trimmed.startsWith('bash <(curl') || trimmed.includes('bash <(curl')) {
        return true;
    }

    if (containsDangerousChars(trimmed)) {
        if (!trimmed.startsWith('bash <(curl')) {
            return false;
        }
    }

    const firstWord = trimmed.split(/\s+/)[0];

    if (firstWord === 'bash' && trimmed.includes('-c')) {
        return false;
    }

    return allowedCommands.includes(firstWord);
}

function getSystemInfo() {
    return new Promise((resolve) => {
        const info = {
            os: 'Unknown',
            host: os.hostname(),
            kernel: os.release(),
            uptime: formatUptime(os.uptime()),
            packages: 'Unknown',
            shell: process.env.SHELL || '/bin/bash',
            terminal: 'web-console',
            cpu: 'Unknown',
            memory: formatMemory(os.totalmem() - os.freemem(), os.totalmem()),
            memoryUsed: os.totalmem() - os.freemem(),
            memoryTotal: os.totalmem(),
            cpuCores: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            platform: os.platform(),
            arch: os.arch(),
            loadAvg: os.loadavg()
        };

        exec('cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d \'"\'', { timeout: 5000 }, (err, stdout) => {
            if (!err && stdout.trim()) {
                info.os = stdout.trim();
            } else {
                info.os = `${os.type()} ${os.release()}`;
            }

            exec('ls /nix/store 2>/dev/null | wc -l', { timeout: 5000 }, (err2, stdout2) => {
                if (!err2 && stdout2.trim()) {
                    info.packages = `${stdout2.trim()} (nix)`;
                }

                exec('npm list --depth=0 2>/dev/null | wc -l', { timeout: 5000 }, (err3, stdout3) => {
                    if (!err3 && stdout3.trim()) {
                        const npmCount = parseInt(stdout3.trim()) - 1;
                        if (npmCount > 0) {
                            info.packages = info.packages !== 'Unknown'
                                ? `${info.packages}, ${npmCount} (npm)`
                                : `${npmCount} (npm)`;
                        }
                    }
                    resolve(info);
                });
            });
        });
    });
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

function formatMemory(used, total) {
    const usedMB = Math.round(used / 1024 / 1024);
    const totalMB = Math.round(total / 1024 / 1024);
    return `${usedMB}MiB / ${totalMB}MiB`;
}

app.get('/api/session', (req, res) => {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const session = getSession(sessionId);
    res.json({ sessionId, cwd: session.cwd });
});

app.post('/api/vps/connect', (req, res) => {
    const { sessionId, tailscaleEmail, tailscaleAuthKey, tailscaleApiKey, vpsIp, username, password } = req.body;

    if (!sessionId || !vpsIp) {
        return res.status(400).json({
            success: false,
            error: 'Session ID and VPS IP are required'
        });
    }

    if (!tailscaleEmail || !tailscaleAuthKey || !tailscaleApiKey) {
        return res.status(400).json({
            success: false,
            error: 'Tailscale credentials are required (Email, Auth Key, API Key)'
        });
    }

    if (vpsConnections.has(sessionId)) {
        const oldConn = vpsConnections.get(sessionId);
        try {
            if (oldConn.client) oldConn.client.end();
        } catch (e) { }
        vpsConnections.delete(sessionId);
    }

    const conn = new Client();
    let connectionTimeout = null;

    connectionTimeout = setTimeout(() => {
        try {
            conn.end();
        } catch (e) { }
        if (!res.headersSent) {
            res.json({
                success: false,
                error: 'Connection timeout. VPS tidak dapat dicapai dalam Tailscale network.'
            });
        }
    }, 30000);

    conn.on('ready', () => {
        clearTimeout(connectionTimeout);
        vpsConnections.set(sessionId, {
            client: conn,
            vpsIp: vpsIp,
            username: username || 'root',
            tailscaleEmail: tailscaleEmail,
            connectedAt: Date.now()
        });

        res.json({
            success: true,
            message: `Berjaya sambung ke VPS ${vpsIp} via Tailscale`,
            vpsIp: vpsIp,
            username: username || 'root',
            tailscaleEmail: tailscaleEmail
        });
    });

    conn.on('error', (err) => {
        clearTimeout(connectionTimeout);
        vpsConnections.delete(sessionId);
        if (!res.headersSent) {
            res.json({
                success: false,
                error: `Gagal sambung: ${err.message}`
            });
        }
    });

    conn.on('close', () => {
        vpsConnections.delete(sessionId);
    });

    const connectConfig = {
        host: vpsIp,
        port: 22,
        username: username || 'root',
        readyTimeout: 25000,
        keepaliveInterval: 10000
    };

    if (password) {
        connectConfig.password = password;
    }

    try {
        conn.connect(connectConfig);
    } catch (err) {
        clearTimeout(connectionTimeout);
        res.json({
            success: false,
            error: `Gagal memulakan sambungan: ${err.message}`
        });
    }
});

app.post('/api/vps/exec', (req, res) => {
    const { sessionId, command } = req.body;

    if (!sessionId || !command) {
        return res.status(400).json({
            success: false,
            error: 'Session ID and command are required'
        });
    }

    const vpsSession = vpsConnections.get(sessionId);
    if (!vpsSession || !vpsSession.client) {
        return res.json({
            success: false,
            error: 'VPS tidak disambung. Sila guna "entervps" untuk sambung semula.',
            disconnected: true
        });
    }

    const conn = vpsSession.client;

    conn.exec(command, { pty: true }, (err, stream) => {
        if (err) {
            return res.json({
                success: false,
                error: `Exec error: ${err.message}`
            });
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data) => {
            stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        stream.on('close', (code) => {
            let output = stdout || stderr || '';
            output = output.replace(/\x1b\[[0-9;]*m/g, '');
            output = output.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            res.json({
                success: true,
                output: output,
                exitCode: code || 0
            });
        });

        stream.on('error', (err) => {
            res.json({
                success: false,
                error: `Stream error: ${err.message}`
            });
        });
    });
});

app.post('/api/vps/disconnect', (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({
            success: false,
            error: 'Session ID is required'
        });
    }

    const vpsSession = vpsConnections.get(sessionId);
    if (vpsSession && vpsSession.client) {
        try {
            vpsSession.client.end();
        } catch (e) { }
    }

    vpsConnections.delete(sessionId);

    res.json({
        success: true,
        message: 'VPS disconnected successfully'
    });
});

app.get('/api/vps/status', (req, res) => {
    const { sessionId } = req.query;

    if (!sessionId) {
        return res.json({ connected: false });
    }

    const vpsSession = vpsConnections.get(sessionId);
    if (vpsSession && vpsSession.client) {
        res.json({
            connected: true,
            vpsIp: vpsSession.vpsIp,
            username: vpsSession.username,
            connectedAt: vpsSession.connectedAt
        });
    } else {
        res.json({ connected: false });
    }
});

app.get('/api/status', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    cpus.forEach(cpu => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });
    const cpuPercent = Math.round(100 - (totalIdle / totalTick * 100));

    res.json({
        status: 'running',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        bot: 'Madzz Cexi CPanel VIP',
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpu: cpuPercent,
        memory: memPercent,
        disk: 0
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

let attackProcessList = [];

function normalizeEndpoint(endpoint, type = 'auto') {
    let cleanEndpoint = endpoint.trim();
    if (cleanEndpoint.endsWith('/')) {
        cleanEndpoint = cleanEndpoint.slice(0, -1);
    }

    const hasPath = /\/[a-zA-Z]/.test(cleanEndpoint.replace(/^https?:\/\/[^\/]+/, ''));

    if (hasPath) {
        return cleanEndpoint;
    }

    if (type === 'auren') {
        cleanEndpoint += '/auren';
    } else if (type === 'cexi') {
        cleanEndpoint += '/cexi';
    } else if (type === 'api') {
        cleanEndpoint += '/api';
    } else if (type === 'none') {
    }

    return cleanEndpoint;
}

function detectEndpointType(endpoint) {
    if (endpoint.includes('/auren')) return 'auren';
    if (endpoint.includes('/cexi')) return 'cexi';
    if (endpoint.includes('/api')) return 'api';
    return 'unknown';
}

app.get('/api/methods', (req, res) => {
    try {
        if (!METHODS_FILE) return res.json({ success: true, methods: [] });
        const methods = JSON.parse(fs.readFileSync(METHODS_FILE, 'utf-8'));
        res.json({ success: true, methods });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/localmethods', (req, res) => {
    try {
        if (!LOCAL_METHODS_FILE) return res.json({ success: true, methods: [] });
        const methods = JSON.parse(fs.readFileSync(LOCAL_METHODS_FILE, 'utf-8'));
        res.json({ success: true, methods });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});


app.post('/api/scan', (req, res) => {
    const { target, startPort, endPort } = req.body;
    if (!target) {
        return res.json({ success: false, error: 'Target IP required' });
    }

    const net = require('net');
    const start = parseInt(startPort) || 1;
    const end = parseInt(endPort) || 1024;
    const results = [];
    let scanned = 0;

    const scanPort = (port) => {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(200);
            socket.on('connect', () => { results.push(port); socket.destroy(); resolve(); });
            socket.on('timeout', () => { socket.destroy(); resolve(); });
            socket.on('error', () => { socket.destroy(); resolve(); });
            socket.connect(port, target);
        });
    };

    const scanAll = async () => {
        for (let port = start; port <= end; port++) {
            await scanPort(port);
        }
        res.json({ success: true, target, openPorts: results });
    };

    scanAll().catch(err => res.json({ success: false, error: err.message }));
});

app.get('/api/httpcheck', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.json({ success: false, error: 'URL required' });
    }

    try {
        let targetUrl = url;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }

        const https = require('https');
        const http = require('http');
        const { URL } = require('url');

        const parsedUrl = new URL(targetUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const startTime = Date.now();

        const checkPromise = new Promise((resolve, reject) => {
            const req = protocol.request(targetUrl, {
                method: 'GET',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }, (response) => {
                const responseTime = Date.now() - startTime;
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    resolve({
                        success: true,
                        url: targetUrl,
                        status: response.statusCode,
                        statusText: response.statusMessage,
                        responseTime: responseTime,
                        headers: {
                            server: response.headers['server'] || 'Unknown',
                            contentType: response.headers['content-type'] || 'Unknown',
                            contentLength: response.headers['content-length'] || 'Unknown',
                            powered: response.headers['x-powered-by'] || 'Unknown'
                        },
                        ssl: parsedUrl.protocol === 'https:',
                        ip: response.socket?.remoteAddress || 'Unknown'
                    });
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });

        const result = await checkPromise;
        res.json(result);

    } catch (error) {
        res.json({
            success: false,
            url: url,
            error: error.message,
            errorCode: error.code || 'UNKNOWN'
        });
    }
});

app.get('/api/neofetch', async (req, res) => {
    try {
        const info = await getSystemInfo();
        res.json(info);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sysinfo', async (req, res) => {
    try {
        const info = await getSystemInfo();
        res.json({
            ...info,
            nodeVersion: process.version,
            pid: process.pid,
            cwd: process.cwd(),
            env: {
                NODE_ENV: process.env.NODE_ENV,
                HOME: process.env.HOME,
                USER: process.env.USER
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/exec', (req, res) => {
    const { command, sessionId } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'No command provided' });
    }

    const cleanCmd = command.trim();

    if (cleanCmd.toLowerCase() === 'clear' || cleanCmd.toLowerCase() === 'cls') {
        return res.json({ output: 'CLEAR', exitCode: 0 });
    }

    if (cleanCmd.toLowerCase() === 'exit') {
        return res.json({ output: 'Session terminated. Refresh to start new session.', exitCode: 0 });
    }

    if (!isCommandAllowed(cleanCmd)) {
        const firstWord = cleanCmd.split(/\s+/)[0];
        if (containsDangerousChars(cleanCmd)) {
            return res.json({
                output: "Command contains disallowed characters.\\nShell operators (;, |, &, etc.) are not permitted for security reasons.\\nPlease run commands individually.",
                exitCode: 1
            });
        }
        return res.json({
            output: "Command not allowed: ${firstWord}\\nType 'help' for available commands.",
            exitCode: 1
        });
    }

    let session = sessionId ? getSession(sessionId) : null;
    let workingDir = session ? session.cwd : process.cwd();

    try {
        if (!fs.existsSync(workingDir)) {
            workingDir = process.cwd();
            if (session) session.cwd = workingDir;
        }
    } catch (e) {
        workingDir = process.cwd();
    }

    const firstWord = cleanCmd.split(/\s+/)[0].toLowerCase();
    const preemptiveSandboxCmds = ['ping', 'traceroute', 'telnet', 'ftp'];
    if (preemptiveSandboxCmds.includes(firstWord)) {
        const sandboxMsg = getSandboxMessage(cleanCmd);
        if (sandboxMsg) {
            return res.json({ output: sandboxMsg, exitCode: 0 });
        }
    }

    if (cleanCmd.startsWith('cd ') || cleanCmd === 'cd') {
        let targetDir = cleanCmd === 'cd' ? process.env.HOME : cleanCmd.substring(3).trim();

        if (targetDir === '~') {
            targetDir = process.env.HOME;
        } else if (targetDir.startsWith('~/')) {
            targetDir = path.join(process.env.HOME, targetDir.substring(2));
        } else if (!path.isAbsolute(targetDir)) {
            targetDir = path.join(workingDir, targetDir);
        }

        try {
            targetDir = path.resolve(targetDir);
            if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
                if (session) {
                    updateSessionCwd(sessionId, targetDir);
                }
                return res.json({
                    output: '',
                    exitCode: 0,
                    newCwd: targetDir
                });
            } else {
                return res.json({
                    output: "cd: ${targetDir}: No such file or directory",
                    exitCode: 1
                });
            }
        } catch (e) {
            return res.json({
                output: "cd: ${targetDir}: ${e.message}",
                exitCode: 1
            });
        }
    }

    if (cleanCmd.toLowerCase() === 'netcheck' || cleanCmd.toLowerCase().startsWith('netcheck ')) {
        const parts = cleanCmd.split(/\s+/);
        let target = parts[1] || 'google.com';

        const validHostname = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
        if (!validHostname.test(target) || target.length > 253) {
            return res.json({
                output: "Invalid hostname: ${target}\\nUse format: netcheck example.com",
                exitCode: 1
            });
        }

        const { spawn } = require('child_process');
        const curl = spawn('curl', ['-sI', '--connect-timeout', '5', `https://${target}`], {
            cwd: workingDir,
            timeout: 10000
        });

        let stdout = '';
        let stderr = '';

        curl.stdout.on('data', (data) => { stdout += data.toString(); });
        curl.stderr.on('data', (data) => { stderr += data.toString(); });

        curl.on('close', (code) => {
            let output = '[Network Check] ' + target + '\n';
            output += ''.repeat(40) + '\n';

            const lines = stdout.split('\n').slice(0, 5).join('\n');

            if (code !== 0 || !stdout.includes('HTTP')) {
                output += " HTTPS connection failed\n";
                output += " Error: " + (stderr || "Connection timeout or refused") + "\n";
            } else {
                output += " HTTPS: OK\\n";
                output += lines;
            }

            res.json({ output, exitCode: 0 });
        });

        curl.on('error', (err) => {
            res.json({
                output: '[Network Check] ' + target + '\n\n Error: ' + (err ? err.message : 'Timeout'),
                exitCode: 1
            });
        });

        return;
    }

    const timeout = 60000;

    exec(cleanCmd, {
        timeout: timeout,
        maxBuffer: 1024 * 1024 * 10,
        cwd: workingDir,
        env: { ...process.env, TERM: 'xterm-256color' },
        shell: '/bin/bash'
    }, (error, stdout, stderr) => {
        if (error) {
            if (error.killed) {
                return res.json({
                    output: "Command timed out after ${timeout / 1000} seconds",
                    exitCode: 124
                });
            }

            const sandboxMsg = getSandboxMessage(cleanCmd);
            if (sandboxMsg && (error.code === 1 || error.code === 2 || error.code === 127)) {
                return res.json({
                    output: sandboxMsg,
                    exitCode: 0
                });
            }

            const output = stderr || stdout || error.message;
            return res.json({
                output: output,
                exitCode: error.code || 1
            });
        }

        const output = stdout || stderr || '';
        res.json({
            output: output,
            exitCode: 0
        });
    });
});

// Cloud storage has been removed from this build.
const CLOUD_FEATURE_REMOVED_MESSAGE = 'Cloud features have been removed from this build.';

function respondCloudFeatureRemoved(_req, res) {
    return res.status(410).json({
        success: false,
        error: CLOUD_FEATURE_REMOVED_MESSAGE
    });
}

app.use('/api/web/cloud', respondCloudFeatureRemoved);
app.use('/api/web/admin/cloud', respondCloudFeatureRemoved);
app.use('/api/web/admin/drives', respondCloudFeatureRemoved);

// ===== GOOGLE CLOUD DRIVE API (ADVANCED MULTI-DRIVE) =====

app.post('/api/web/cloud/folders', async (req, res) => {
    try {
        const { userId, name, parentId } = req.body;
        if (!userId || !name) return res.json({ success: false, error: 'Missing parameters' });

        const driveData = await getGoogleOAuthDriveContext(userId);
        if (!driveData.available) {
            return res.status(driveData.httpStatus || 409).json({ success: false, ...driveData });
        }

        const { error } = await webSupabase.from('cloud_files').insert([{
            user_id: userId,
            cloud_oauth_account_id: driveData.accountId || null,
            drive_account_id: null,
            file_name: name,
            is_folder: true,
            folder_id: parentId || null,
            file_size: 0,
            drive_file_id: 'folder'
        }]);

        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.post('/api/web/cloud/upload', upload.single('file'), async (req, res) => {
    const tempFilePath = req.file?.path || null;
    let driveData = null;
    let createdDriveFileId = null;
    try {
        const { userId, folderId, password, burnAfterRead, isPublic } = req.body;
        if (!userId || !req.file) return res.json({ success: false, error: 'Missing file or userId' });

        driveData = await getGoogleOAuthDriveContext(userId);
        if (!driveData.available) {
            return res.status(driveData.httpStatus || 409).json({ success: false, ...driveData });
        }

        const { service: driveService } = driveData;

        if (!rateLimit(`cloud:${userId}`, 10, 60000)) return res.json({ success: false, error: 'Upload rate limited. Wait 1 minute.' });

        const profileRes = await webSupabase.from('profiles').select('plan').eq('id', userId).maybeSingle();
        if (profileRes.error) throw profileRes.error;
        const profile = profileRes.data;

        // Storage Limits
        let maxStorage = 100 * 1024 * 1024 * 1024; // Free: 100GB
        if (profile?.plan === 'Owner') maxStorage = Infinity;
        else if (profile?.plan === 'VVIP') maxStorage = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
        else if (profile?.plan === 'Pro') maxStorage = 1 * 1024 * 1024 * 1024 * 1024;  // 1TB

        const userFilesRes = await webSupabase.from('cloud_files').select('file_size').eq('user_id', userId);
        if (userFilesRes.error) throw userFilesRes.error;
        const userFiles = userFilesRes.data;
        const totalUsedBytes = (userFiles || []).reduce((sum, f) => sum + (Number(f.file_size) || 0), 0);

        if (maxStorage !== Infinity && (totalUsedBytes + req.file.size) > maxStorage) {
            return res.json({ success: false, error: `Storage limit exceeded. Upgrade your plan.` });
        }

        const fileStream = fs.createReadStream(req.file.path);

        const response = await driveService.files.create({
            requestBody: {
                name: req.file.originalname,
                mimeType: req.file.mimetype,
                parents: undefined
            },
            media: { mimeType: req.file.mimetype, body: fileStream },
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true
        });

        const fileData = response.data;
        createdDriveFileId = fileData.id;

        let passHash = null;
        if (password && password.trim() !== '') {
            passHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
        }

        const { error } = await webSupabase.from('cloud_files').insert([{
            user_id: userId,
            cloud_oauth_account_id: driveData.accountId || null,
            file_name: fileData.name,
            file_size: req.file.size,
            mime_type: req.file.mimetype,
            drive_file_id: fileData.id,
            drive_account_id: null,
            folder_id: folderId || null,
            password_hash: passHash,
            burn_after_read: burnAfterRead === 'true',
            is_public: isPublic === 'true',
            web_view_link: fileData.webViewLink,
            web_content_link: fileData.webContentLink
        }]);

        if (error) {
            const cleanupError = await safeDeleteDriveFile(driveData, createdDriveFileId);
            if (cleanupError) {
                console.error('Drive cleanup failed after DB insert error:', cleanupError.message);
            }
            throw error;
        }

        let permissionWarning = null;
        if (String(isPublic) === 'true') {
            try {
                await driveService.permissions.create({
                    fileId: fileData.id,
                    requestBody: { role: 'reader', type: 'anyone' },
                    supportsAllDrives: true
                });
            } catch (permissionError) {
                permissionWarning = classifyDriveProviderError(permissionError);
            }
        }

        const responsePayload = { success: true, file: fileData };
        if (permissionWarning) {
            responsePayload.warning = permissionWarning.message;
        }
        res.json(responsePayload);
    } catch (e) {
        console.error('Drive Upload Error:', e);
        res.json({ success: false, ...buildCloudErrorPayload(e, 'Failed to upload to cloud') });
    } finally {
        if (tempFilePath) {
            fs.promises.unlink(tempFilePath).catch(() => {});
        }
    }
});

// Proxy Download Route with Advanced Security & PPD
app.get('/api/web/cloud/download/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const providedPassword = req.query.pwd;

        const { data: fileMeta } = await webSupabase.from('cloud_files').select('*').eq('id', fileId).maybeSingle();

        if (!fileMeta) return res.status(404).send('File not found or has been burned.');
        if (fileMeta.is_folder) return res.status(400).send('Cannot download folder directly.');

        // 1. Check Password
        if (fileMeta.password_hash) {
            if (!providedPassword) return res.status(401).send('Password required. Use ?pwd=YOUR_PASSWORD');
            const hash = crypto.createHash('sha256').update(providedPassword).digest('hex');
            if (hash !== fileMeta.password_hash) return res.status(401).send('Incorrect password');
        }

        // 2. Check Burner Status
        if (fileMeta.burn_after_read) {
            if (fileMeta.downloads_count >= 1) {
                const driveData = await getGoogleOAuthDriveContext(fileMeta.user_id);
                if (!driveData.available) {
                    return res.status(driveData.httpStatus || 409).send(driveData.error || 'Storage provider unavailable');
                }
                await safeDeleteDriveFile(driveData, fileMeta.drive_file_id);
                await webSupabase.from('cloud_files').delete().eq('id', fileId);
                return res.status(410).send('This burner file has already been read and destroyed.');
            }
        }

        // 3. Bandwidth Check
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        let bw = null;
        try {
            const bwRes = await webSupabase.from('user_bandwidth')
                .select('bytes_used')
                .eq('user_id', fileMeta.user_id)
                .eq('billing_month', currentMonth)
                .maybeSingle();
            if (bwRes.error) {
                console.error('Bandwidth read error:', bwRes.error.message);
            } else {
                bw = bwRes.data;
            }
        } catch (bwReadError) {
            console.error('Bandwidth read error:', bwReadError.message);
        }
        const bytesUsed = bw ? Number(bw.bytes_used) : 0;

        // Define bandwidth limits
        const { data: ownerProf } = await webSupabase.from('profiles').select('plan, tokens').eq('id', fileMeta.user_id).maybeSingle();
        let bwLimit = 10 * 1024 * 1024 * 1024; // 10GB Free
        if (ownerProf?.plan === 'Owner') bwLimit = Infinity;
        else if (ownerProf?.plan === 'VVIP') bwLimit = 1000 * 1024 * 1024 * 1024; // 1TB BW
        else if (ownerProf?.plan === 'Pro') bwLimit = 200 * 1024 * 1024 * 1024; // 200GB BW

        if (bwLimit !== Infinity && (bytesUsed + Number(fileMeta.file_size)) > bwLimit) {
            return res.status(429).send('File owner has exceeded their monthly bandwidth limit.');
        }

        const driveData = await getGoogleOAuthDriveContext(fileMeta.user_id);
        if (!driveData.available) {
            return res.status(driveData.httpStatus || 409).send(driveData.error || 'Storage provider unavailable');
        }

        // Increment Downloads and Bandwidth
        await webSupabase.from('cloud_files').update({ downloads_count: (fileMeta.downloads_count || 0) + 1 }).eq('id', fileId);

        // Upsert Bandwidth
        if (bw) {
            const bwUpdate = await webSupabase.from('user_bandwidth')
                .update({ bytes_used: bytesUsed + Number(fileMeta.file_size) })
                .eq('user_id', fileMeta.user_id)
                .eq('billing_month', currentMonth);
            if (bwUpdate.error) {
                console.error('Bandwidth update error:', bwUpdate.error.message);
            }
        } else {
            const bwInsert = await webSupabase.from('user_bandwidth')
                .insert([{ user_id: fileMeta.user_id, billing_month: currentMonth, bytes_used: Number(fileMeta.file_size) }]);
            if (bwInsert.error) {
                console.error('Bandwidth insert error:', bwInsert.error.message);
            }
        }

        // Pay-Per-Download Reward (Only for public files, 0.1 Token equivalent - represented as whole tokens if we want, or fractional if DB supports. Let's assume +1 token for every 10 downloads)
        if (fileMeta.is_public && ownerProf) {
            // Give 1 token per download for simplicity, or 0 if we want fractions. We will do +1 token.
            await webSupabase.from('profiles').update({ tokens: (ownerProf.tokens || 0) + 1 }).eq('id', fileMeta.user_id);
        }

        res.setHeader('Content-Type', fileMeta.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.file_name)}"`);

        const driveStream = await driveData.service.files.get({
            fileId: fileMeta.drive_file_id,
            alt: 'media',
            supportsAllDrives: true
        }, { responseType: 'stream' });

        // If Burner, delete after stream ends
        driveStream.data.on('end', async () => {
            if (fileMeta.burn_after_read) {
                await safeDeleteDriveFile(driveData, fileMeta.drive_file_id);
                await webSupabase.from('cloud_files').delete().eq('id', fileId);
            }
        });

        driveStream.data.on('error', (streamError) => {
            console.error('Drive stream error:', streamError.message);
        });

        driveStream.data.pipe(res);
    } catch (e) {
        console.error('Proxy Download Error:', e.message);
        const payload = buildCloudErrorPayload(e, 'Error downloading file');
        res.status(500).send(payload.error);
    }
});

app.get('/api/web/cloud/files', async (req, res) => {
    try {
        const { userId, folderId } = req.query;
        if (!userId) return res.json({ success: false, error: 'Missing userId' });

        let query = webSupabase.from('cloud_files').select('*').eq('user_id', userId).order('is_folder', { ascending: false }).order('created_at', { ascending: false });

        if (folderId && folderId !== 'root') {
            query = query.eq('folder_id', folderId);
        } else {
            query = query.is('folder_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json({ success: true, files: data });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

app.delete('/api/web/cloud/files/:id', async (req, res) => {
    try {
        const { userId } = req.body;
        const fileId = req.params.id;

        const { data: fileMeta } = await webSupabase.from('cloud_files').select('*').eq('id', fileId).eq('user_id', userId).maybeSingle();
        if (!fileMeta) return res.json({ success: false, error: 'File not found or unauthorized' });

        let deleteWarning = null;
        if (!fileMeta.is_folder) {
            const driveData = await getGoogleOAuthDriveContext(fileMeta.user_id);
            if (!driveData.available) {
                return res.status(driveData.httpStatus || 409).json({ success: false, ...driveData });
            }
            const providerDeleteError = await safeDeleteDriveFile(driveData, fileMeta.drive_file_id);
            if (providerDeleteError) {
                const payload = buildCloudErrorPayload(providerDeleteError, 'Failed to delete file from storage provider');
                deleteWarning = payload.error;
            }
        }

        await webSupabase.from('cloud_files').delete().eq('id', fileId);
        const responsePayload = { success: true };
        if (deleteWarning) responsePayload.warning = deleteWarning;
        res.json(responsePayload);
    } catch (e) { res.json({ success: false, error: e.message }); }
});

async function handleGoogleOAuthConnect(req, res) {
    try {
        const appUserId = resolveOAuthUserId(req);
        if (!appUserId) {
            return res.status(400).json({ success: false, error: 'Missing userId' });
        }

        const runtime = assertGoogleOAuthRuntime();
        const oauthClient = buildGoogleOAuthClient();
        const state = createGoogleOAuthState({ id: appUserId });
        const consentUrl = oauthClient.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            include_granted_scopes: true,
            scope: runtime.scopes,
            state
        });

        const wantsRedirect = String(req.query.redirect || req.body?.redirect || '').toLowerCase() === 'true'
            || String(req.query.format || '').toLowerCase() === 'redirect';

        if (wantsRedirect) {
            return res.redirect(consentUrl);
        }

        return res.json({
            success: true,
            consentUrl,
            stateExpiresInMs: GOOGLE_OAUTH_STATE_TTL_MS,
            scopes: runtime.scopes
        });
    } catch (error) {
        const statusCode = error.code === 'google_oauth_missing_config' ? 503 : 400;
        return res.status(statusCode).json({
            success: false,
            error: error.message,
            errorCode: error.code || 'google_oauth_error'
        });
    }
}

app.get('/api/web/cloud/oauth/connect', handleGoogleOAuthConnect);
app.post('/api/web/cloud/oauth/connect', handleGoogleOAuthConnect);
app.get('/api/web/cloud/oauth/start', handleGoogleOAuthConnect);
app.post('/api/web/cloud/oauth/start', handleGoogleOAuthConnect);

app.get('/api/web/cloud/oauth/callback', async (req, res) => {
    let exchangedTokens = null;
    let runtime = null;
    try {
        const { code, state, error, error_description: errorDescription } = req.query;
        if (error) {
            return res.status(400).json({
                success: false,
                error: errorDescription || error || 'Google OAuth was cancelled or denied',
                errorCode: 'google_oauth_denied'
            });
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Missing OAuth code',
                errorCode: 'google_oauth_missing_code'
            });
        }

        const statePayload = verifyGoogleOAuthState(state);
        runtime = assertGoogleOAuthRuntime();
        const oauthClient = buildGoogleOAuthClient();
        const tokenResponse = await oauthClient.getToken(String(code));
        exchangedTokens = tokenResponse?.tokens || null;

        if (!exchangedTokens || !exchangedTokens.access_token) {
            throw new Error('Google did not return an access token');
        }

        oauthClient.setCredentials(exchangedTokens);
        const oauth2 = google.oauth2({ version: 'v2', auth: oauthClient });
        const userInfoResponse = await oauth2.userinfo.get();
        const googleProfile = userInfoResponse?.data || {};

        const existingResult = await getGoogleOAuthAccount(statePayload.appUserId);
        if (existingResult.capability && !existingResult.capability.available) {
            return res.status(503).json({
                success: false,
                error: buildMissingTableMessage('cloud_oauth_accounts'),
                capabilities: { cloudOAuthAccounts: summarizeTableCapability(existingResult.capability) }
            });
        }

        const existingTokenPayload = decryptOAuthTokenPayload(existingResult.account?.encrypted_token_payload);
        const refreshToken = exchangedTokens.refresh_token || existingTokenPayload?.refresh_token || null;
        if (!refreshToken) {
            throw new Error('Google did not return a refresh token. Revoke the app and reconnect with consent.');
        }

        const tokenPayload = {
            ...(existingTokenPayload || {}),
            ...exchangedTokens,
            refresh_token: refreshToken,
            provider_account_id: String(googleProfile.id || '').trim() || null,
            provider_account_email: String(googleProfile.email || '').trim().toLowerCase() || null,
            obtained_at: new Date().toISOString()
        };

        const scopes = parseOAuthScopes(exchangedTokens.scope || runtime.scopes);
        const saved = await upsertGoogleOAuthAccount({
            appUserId: statePayload.appUserId,
            providerAccountId: String(googleProfile.id || '').trim() || null,
            providerAccountEmail: String(googleProfile.email || '').trim().toLowerCase() || null,
            tokenPayload,
            accessTokenExpiresAt: exchangedTokens.expiry_date ? new Date(exchangedTokens.expiry_date).toISOString() : null,
            accessTokenScopes: scopes,
            connectionStatus: 'connected',
            connectedAt: existingResult.account?.connected_at || new Date().toISOString(),
            lastRefreshedAt: new Date().toISOString(),
            revokedAt: null,
            missingSinceAt: null,
            lastError: null
        });

        return res.json({
            success: true,
            connection: sanitizeGoogleOAuthAccount(saved, tokenPayload)
        });
    } catch (error) {
        if (exchangedTokens) {
            try {
                await revokeGoogleOAuthRemoteToken(exchangedTokens, runtime || getGoogleOAuthRuntime());
            } catch { }
        }

        const statusCode = error.code === 'google_oauth_missing_config' ? 503 : 400;
        return res.status(statusCode).json({
            success: false,
            error: error.message,
            errorCode: error.code || 'google_oauth_error'
        });
    }
});

app.get('/api/web/cloud/oauth/status', async (req, res) => {
    try {
        const appUserId = resolveOAuthUserId(req);
        if (!appUserId) {
            return res.status(400).json({ success: false, error: 'Missing userId' });
        }

        const existingResult = await getGoogleOAuthAccount(appUserId);
        if (existingResult.capability && !existingResult.capability.available) {
            return res.status(503).json({
                success: false,
                error: buildMissingTableMessage('cloud_oauth_accounts'),
                connected: false,
                capabilities: { cloudOAuthAccounts: summarizeTableCapability(existingResult.capability) }
            });
        }

        if (!existingResult.account) {
            return res.json({
                success: true,
                connected: false,
                connection: null
            });
        }

        const connection = sanitizeGoogleOAuthAccount(existingResult.account);
        return res.json({
            success: true,
            connected: !!connection?.connected,
            connection
        });
    } catch (error) {
        const statusCode = error.code === 'google_oauth_missing_config' ? 503 : 500;
        return res.status(statusCode).json({
            success: false,
            error: error.message,
            errorCode: error.code || 'google_oauth_error'
        });
    }
});

async function handleGoogleOAuthDisconnect(req, res) {
    try {
        const appUserId = resolveOAuthUserId(req);
        if (!appUserId) {
            return res.status(400).json({ success: false, error: 'Missing userId' });
        }

        const runtime = assertGoogleOAuthRuntime();
        const existingResult = await getGoogleOAuthAccount(appUserId);
        if (existingResult.capability && !existingResult.capability.available) {
            return res.status(503).json({
                success: false,
                error: buildMissingTableMessage('cloud_oauth_accounts'),
                capabilities: { cloudOAuthAccounts: summarizeTableCapability(existingResult.capability) }
            });
        }

        if (!existingResult.account) {
            return res.json({
                success: true,
                disconnected: true,
                connection: null
            });
        }

        const tokenPayload = decryptOAuthTokenPayload(existingResult.account.encrypted_token_payload) || {};
        const revokeResult = await revokeGoogleOAuthRemoteToken(tokenPayload, runtime);
        const saved = await upsertGoogleOAuthAccount({
            appUserId,
            providerAccountId: existingResult.account.provider_account_id || null,
            providerAccountEmail: existingResult.account.provider_account_email || '',
            tokenPayload: {},
            accessTokenExpiresAt: null,
            accessTokenScopes: [],
            connectionStatus: 'revoked',
            connectedAt: existingResult.account.connected_at || null,
            lastRefreshedAt: existingResult.account.last_refreshed_at || null,
            revokedAt: new Date().toISOString(),
            missingSinceAt: null,
            lastError: revokeResult.revoked ? null : 'Remote revoke may not have completed'
        });

        return res.json({
            success: true,
            disconnected: true,
            warning: revokeResult.revoked ? null : 'Remote token revoke may not have completed',
            connection: sanitizeGoogleOAuthAccount(saved, {})
        });
    } catch (error) {
        const statusCode = error.code === 'google_oauth_missing_config' ? 503 : 400;
        return res.status(statusCode).json({
            success: false,
            error: error.message,
            errorCode: error.code || 'google_oauth_error'
        });
    }
}

app.post('/api/web/cloud/oauth/disconnect', handleGoogleOAuthDisconnect);
app.delete('/api/web/cloud/oauth/disconnect', handleGoogleOAuthDisconnect);
app.post('/api/web/cloud/oauth/revoke', handleGoogleOAuthDisconnect);
app.delete('/api/web/cloud/oauth/revoke', handleGoogleOAuthDisconnect);

// ===== PREMIUM TOOLS GENERATORS, REFERRAL, ORDERS & HOSTING API =====
const RESEND_API_KEY = "re_YujUxFRS_PH9NJt5H3ekXNsL9ri3PyTGJ";
const WEB_LOCAL_STORE_FILE = path.join(__dirname, 'web_admin_store.json');
const ADMIN_COLLECTION_TABLES = {
    inventory: 'web_inventory',
    nodes: 'web_nodes',
    eggs: 'web_eggs'
};
const TABLE_CAPABILITY_CACHE_TTL_MS = 30 * 1000;
const tableCapabilityCache = new Map();
const DRIVE_PROBE_CACHE_TTL_MS = 2 * 60 * 1000;
const driveProbeCache = new Map();
const PLAN_TOKEN_CREDIT = {
    STANDARD: 100,
    PRO: 500,
    VVIP: 2000,
    OWNER: 5000
};

function extractErrorMessage(error) {
    if (!error) return '';
    return [error.message, error.details, error.hint].filter(Boolean).join(' ').trim();
}

function isMissingTableError(error, tableName = '') {
    if (!error) return false;
    const code = String(error.code || '').toUpperCase();
    const message = extractErrorMessage(error).toLowerCase();
    const table = String(tableName || '').toLowerCase();

    if (code === '42P01' || code === 'PGRST205') return true;
    if (message.includes('could not find the table') && message.includes('schema cache')) return true;
    if (message.includes('relation') && message.includes('does not exist')) return true;
    if (table && message.includes(`public.${table}`) && message.includes('not found')) return true;
    if (table && message.includes(`'${table}'`) && message.includes('does not exist')) return true;
    return false;
}

function buildMissingTableMessage(tableName) {
    return `Required table '${tableName}' is missing. Run server/database/web_admin_tables_schema.sql in Supabase SQL editor.`;
}

function getCachedTableCapability(tableName) {
    const cached = tableCapabilityCache.get(tableName);
    if (!cached) return null;
    const age = Date.now() - new Date(cached.checkedAt || 0).getTime();
    if (age > TABLE_CAPABILITY_CACHE_TTL_MS) {
        tableCapabilityCache.delete(tableName);
        return null;
    }
    return cached;
}

function cacheTableCapability(tableName, payload) {
    const capability = {
        table: tableName,
        available: !!payload.available,
        reason: payload.reason || null,
        message: payload.message || null,
        checkedAt: new Date().toISOString()
    };
    tableCapabilityCache.set(tableName, capability);
    return capability;
}

function markTableMissing(tableName, error = null) {
    return cacheTableCapability(tableName, {
        available: false,
        reason: 'missing_table',
        message: extractErrorMessage(error) || buildMissingTableMessage(tableName)
    });
}

function getCachedDriveProbe(cacheKey) {
    if (!cacheKey) return null;
    const cached = driveProbeCache.get(cacheKey);
    if (!cached) return null;
    const age = Date.now() - new Date(cached.checkedAt || 0).getTime();
    if (age > DRIVE_PROBE_CACHE_TTL_MS) {
        driveProbeCache.delete(cacheKey);
        return null;
    }
    return cached;
}

function cacheDriveProbe(cacheKey, payload) {
    if (!cacheKey) return payload;
    const cached = {
        ...payload,
        checkedAt: payload.checkedAt || new Date().toISOString()
    };
    driveProbeCache.set(cacheKey, cached);
    return cached;
}

async function getTableCapability(tableName, options = {}) {
    const { forceRefresh = false } = options;
    if (!tableName) {
        return {
            table: null,
            available: false,
            reason: 'invalid_table',
            message: 'Missing table name',
            checkedAt: new Date().toISOString()
        };
    }

    if (!forceRefresh) {
        const cached = getCachedTableCapability(tableName);
        if (cached) return cached;
    }

    const probe = await webSupabase.from(tableName).select('id', { count: 'exact', head: true });
    if (!probe.error) {
        return cacheTableCapability(tableName, { available: true, reason: null, message: null });
    }

    if (isMissingTableError(probe.error, tableName)) {
        return markTableMissing(tableName, probe.error);
    }

    return cacheTableCapability(tableName, {
        available: false,
        reason: 'query_error',
        message: extractErrorMessage(probe.error) || `Failed to probe table '${tableName}'`
    });
}

function summarizeTableCapability(capability) {
    if (!capability) {
        return {
            table: null,
            available: false,
            reason: 'unknown',
            message: 'No capability data',
            checkedAt: null
        };
    }
    return {
        table: capability.table || null,
        available: !!capability.available,
        reason: capability.reason || null,
        message: capability.message || null,
        checkedAt: capability.checkedAt || null
    };
}

function shuffleArray(input = []) {
    const arr = Array.isArray(input) ? [...input] : [];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function parseDriveCredentialsString(rawCredentials) {
    const text = String(rawCredentials || '').trim();
    if (!text) return { success: false, error: 'Missing credentials JSON' };
    try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
            return { success: false, error: 'Invalid credentials JSON object' };
        }
        return { success: true, credentials: parsed };
    } catch (error) {
        return { success: false, error: `Invalid credentials JSON: ${error.message}` };
    }
}

function extractDriveConfigFromCredentials(credentials = {}) {
    const folderId = String(
        credentials.MAIN_FOLDER_ID ||
        credentials.main_folder_id ||
        credentials.folder_id ||
        ''
    ).trim() || null;

    const sharedDriveId = String(
        credentials.SHARED_DRIVE_ID ||
        credentials.shared_drive_id ||
        credentials.drive_id ||
        ''
    ).trim() || null;

    const delegatedUser = String(
        credentials.DELEGATED_USER ||
        credentials.delegated_user ||
        credentials.subject ||
        ''
    ).trim() || null;

    const clientEmail = String(credentials.client_email || '').trim();
    return { folderId, sharedDriveId, delegatedUser, clientEmail };
}

function buildDriveRuntimeFromCredentials(credentials = {}) {
    const { folderId, sharedDriveId, delegatedUser, clientEmail } = extractDriveConfigFromCredentials(credentials);
    const privateKey = String(credentials.private_key || '').trim();

    if (!clientEmail || !privateKey) {
        throw new Error('Drive credentials missing client_email or private_key');
    }

    const scopes = ['https://www.googleapis.com/auth/drive'];
    let auth;
    if (delegatedUser) {
        auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes,
            subject: delegatedUser
        });
    } else {
        auth = new google.auth.GoogleAuth({ credentials, scopes });
    }

    return {
        service: google.drive({ version: 'v3', auth }),
        folderId,
        sharedDriveId,
        delegatedUser,
        clientEmail
    };
}

function classifyDriveProviderError(error) {
    const rawMessage = extractErrorMessage(error) || String(error?.message || 'Unknown cloud provider error');
    const message = rawMessage.toLowerCase();

    if (message.includes('no refresh token') || message.includes('missing refresh token')) {
        return {
            code: 'google_oauth_missing',
            status: 'missing',
            message: 'No linked Gmail refresh token found. Reconnect Gmail to continue.',
            rawMessage
        };
    }

    if (message.includes('invalid_grant') || message.includes('token has been expired or revoked') || message.includes('token revoked') || message.includes('revoked')) {
        return {
            code: 'google_oauth_revoked',
            status: 'revoked',
            message: 'Google Gmail connection was revoked. Reconnect Gmail to continue.',
            rawMessage
        };
    }

    if (message.includes('expired') && message.includes('token')) {
        return {
            code: 'google_oauth_expired',
            status: 'expired',
            message: 'Google Gmail connection expired. Reconnect Gmail to continue.',
            rawMessage
        };
    }

    if (message.includes('missing client_email or private_key') || message.includes('invalid credentials json')) {
        return {
            code: 'drive_credentials_invalid',
            status: 'misconfigured',
            message: 'Drive credentials are invalid. Please provide a valid service account JSON.',
            rawMessage
        };
    }

    if (message.includes('main_folder_id is trashed') || message.includes('main_folder_id is not a folder')) {
        return {
            code: 'drive_folder_invalid',
            status: 'misconfigured',
            message: 'Configured MAIN_FOLDER_ID is invalid. Use a valid, accessible folder ID.',
            rawMessage
        };
    }

    if (message.includes('service accounts do not have storage quota')) {
        return {
            code: 'drive_quota_unavailable',
            status: 'quota_blocked',
            message: 'Drive account has no upload quota for this target. Configure a shared-drive folder or delegated user.',
            rawMessage
        };
    }

    if (message.includes('insufficient permissions') || message.includes('permission denied') || message.includes('insufficient file permissions')) {
        return {
            code: 'drive_permission_denied',
            status: 'permission_denied',
            message: 'Drive account does not have permission for this operation.',
            rawMessage
        };
    }

    if (message.includes('file not found') || message.includes('requested entity was not found') || message.includes('not found')) {
        return {
            code: 'drive_file_not_found',
            status: 'misconfigured',
            message: 'Configured Drive folder/file was not found or is not accessible by this account.',
            rawMessage
        };
    }

    if (message.includes('invalid_grant') || message.includes('unauthenticated') || message.includes('invalid_client')) {
        return {
            code: 'drive_auth_failed',
            status: 'auth_failed',
            message: 'Drive authentication failed. Check service account credentials or delegated user settings.',
            rawMessage
        };
    }

    if (message.includes('timed out') || message.includes('socket hang up') || message.includes('deadline exceeded') || message.includes('etimedout')) {
        return {
            code: 'drive_timeout',
            status: 'provider_error',
            message: 'Drive provider timed out while processing the request. Please retry.',
            rawMessage
        };
    }

    if (message.includes('maxcontentlength') || message.includes('max body length') || message.includes('request body larger than maxbodylength')) {
        return {
            code: 'remote_file_too_large',
            status: 'provider_error',
            message: 'Remote file is too large for proxy upload. Use a smaller file or upload locally.',
            rawMessage
        };
    }

    return {
        code: 'drive_provider_error',
        status: 'provider_error',
        message: 'Cloud provider request failed. Please retry.',
        rawMessage
    };
}

function isDriveFileNotFoundError(error) {
    return classifyDriveProviderError(error).code === 'drive_file_not_found';
}

function buildCloudErrorPayload(error, fallbackMessage = 'Cloud request failed') {
    const classified = classifyDriveProviderError(error);
    return {
        error: classified.message || fallbackMessage,
        errorCode: classified.code || 'cloud_provider_error',
        details: classified.rawMessage || null,
        status: classified.status || null,
        connectionStatus: classified.status || null,
        connected: classified.status ? false : null
    };
}

async function probeDriveCredentials(credentials = {}, options = {}) {
    const { skipWriteCheck = false } = options;
    const config = extractDriveConfigFromCredentials(credentials);
    let runtime;
    let probeFileId = null;
    try {
        runtime = buildDriveRuntimeFromCredentials(credentials);
    } catch (runtimeError) {
        const classified = classifyDriveProviderError(runtimeError);
        return {
            ready: false,
            status: classified.status,
            errorCode: classified.code,
            message: classified.message,
            details: classified.rawMessage,
            folderId: config.folderId,
            sharedDriveId: config.sharedDriveId,
            delegatedUser: config.delegatedUser,
            checkedAt: new Date().toISOString()
        };
    }

    try {
        let folderName = null;
        let folderDriveId = config.sharedDriveId || null;

        if (config.folderId) {
            const folderMeta = await runtime.service.files.get({
                fileId: config.folderId,
                fields: 'id,name,mimeType,driveId,trashed',
                supportsAllDrives: true
            });
            const mimeType = String(folderMeta.data?.mimeType || '');
            if (folderMeta.data?.trashed) {
                throw new Error('Configured MAIN_FOLDER_ID is trashed');
            }
            if (mimeType && !mimeType.includes('folder')) {
                throw new Error('Configured MAIN_FOLDER_ID is not a folder');
            }
            folderName = folderMeta.data?.name || null;
            folderDriveId = folderMeta.data?.driveId || folderDriveId;
        } else if (skipWriteCheck) {
            await runtime.service.about.get({
                fields: 'user(emailAddress),storageQuota(limit,usage)'
            });
        }

        if (!skipWriteCheck) {
            const probeUpload = await runtime.service.files.create({
                requestBody: {
                    name: `.cexistore-probe-${Date.now()}.txt`,
                    mimeType: 'text/plain',
                    parents: config.folderId ? [config.folderId] : undefined
                },
                media: {
                    mimeType: 'text/plain',
                    body: stream.Readable.from(Buffer.from('probe'))
                },
                fields: 'id',
                supportsAllDrives: true
            });

            probeFileId = probeUpload.data?.id || null;
            if (!probeFileId) throw new Error('Drive probe failed to create a test file');
            await runtime.service.files.delete({
                fileId: probeFileId,
                supportsAllDrives: true
            });
            probeFileId = null;
        }

        return {
            ready: true,
            status: 'ready',
            errorCode: null,
            message: 'Drive account verified and ready.',
            details: null,
            folderId: config.folderId,
            folderName,
            sharedDriveId: folderDriveId,
            delegatedUser: config.delegatedUser,
            checkedAt: new Date().toISOString()
        };
    } catch (probeError) {
        if (probeFileId) {
            try {
                await runtime.service.files.delete({
                    fileId: probeFileId,
                    supportsAllDrives: true
                });
            } catch {}
        }
        const classified = classifyDriveProviderError(probeError);
        return {
            ready: false,
            status: classified.status,
            errorCode: classified.code,
            message: classified.message,
            details: classified.rawMessage,
            folderId: config.folderId,
            sharedDriveId: config.sharedDriveId,
            delegatedUser: config.delegatedUser,
            checkedAt: new Date().toISOString()
        };
    }
}

async function probeDriveAccountRecord(account, options = {}) {
    const { forceRefresh = false } = options;
    const cacheKey = `${String(account?.id || 'drive')}:${String(account?.updated_at || account?.created_at || '')}`;
    if (!forceRefresh) {
        const cached = getCachedDriveProbe(cacheKey);
        if (cached) return cached;
    }

    const parsed = parseDriveCredentialsString(account?.credentials_json);
    if (!parsed.success) {
        const classified = classifyDriveProviderError(new Error(parsed.error));
        return cacheDriveProbe(cacheKey, {
            ready: false,
            status: classified.status,
            errorCode: classified.code,
            message: classified.message,
            details: classified.rawMessage,
            folderId: null,
            sharedDriveId: null,
            delegatedUser: null,
            checkedAt: new Date().toISOString()
        });
    }
    const probe = await probeDriveCredentials(parsed.credentials, options);
    return cacheDriveProbe(cacheKey, probe);
}

function sanitizeDriveRecord(drive, capability = null) {
    const parsed = parseDriveCredentialsString(drive?.credentials_json);
    const config = parsed.success ? extractDriveConfigFromCredentials(parsed.credentials) : {
        folderId: null,
        sharedDriveId: null,
        delegatedUser: null,
        clientEmail: ''
    };

    return {
        id: drive.id,
        name: drive.name,
        status: drive.status,
        is_active: drive.is_active === true || String(drive.status || '').toLowerCase() === 'active',
        created_at: drive.created_at || null,
        updated_at: drive.updated_at || null,
        client_email: config.clientEmail || '',
        folder_id: config.folderId,
        shared_drive_id: config.sharedDriveId,
        delegated_user: config.delegatedUser,
        capability: capability || null
    };
}

function mapDriveRows(rows = [], capabilityByDriveId = null) {
    return (rows || []).map(drive => {
        const capability = capabilityByDriveId ? capabilityByDriveId[String(drive.id)] || null : null;
        return sanitizeDriveRecord(drive, capability);
    });
}

async function safeDeleteDriveFile(driveData, driveFileId) {
    if (!driveData || !driveFileId || String(driveFileId) === 'folder') return null;
    try {
        await driveData.service.files.delete({
            fileId: driveFileId,
            supportsAllDrives: true
        });
        return null;
    } catch (error) {
        if (isDriveFileNotFoundError(error)) return null;
        return error;
    }
}

function makeId(prefix = 'id') {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function sanitizeReferralCode(raw) {
    if (!raw) return null;
    const cleaned = String(raw).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    return cleaned.length > 0 ? cleaned.slice(0, 24) : null;
}

function sanitizeDomainName(raw) {
    if (!raw) return null;
    const cleaned = String(raw).trim().toLowerCase();
    return isValidDomain(cleaned) ? cleaned : null;
}

function createReferralCode(userId) {
    const seed = String(userId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const head = seed.slice(0, 6) || crypto.randomBytes(3).toString('hex').toUpperCase();
    const tail = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${head}${tail}`;
}

function normalizePlan(plan) {
    const p = String(plan || '').trim().toUpperCase();
    if (p === 'PRO') return 'Pro';
    if (p === 'VVIP' || p === 'VIP') return 'VVIP';
    if (p === 'OWNER') return 'Owner';
    if (p === 'STANDARD') return 'Standard';
    if (p === 'FREE') return 'Free';
    return plan || 'Free';
}

function readLocalStore() {
    const fallback = { orders: [], inventory: [], nodes: [], eggs: [] };
    try {
        if (!fs.existsSync(WEB_LOCAL_STORE_FILE)) return fallback;
        const parsed = JSON.parse(fs.readFileSync(WEB_LOCAL_STORE_FILE, 'utf-8'));
        return {
            orders: Array.isArray(parsed.orders) ? parsed.orders : [],
            inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
            nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
            eggs: Array.isArray(parsed.eggs) ? parsed.eggs : []
        };
    } catch {
        return fallback;
    }
}

function writeLocalStore(store) {
    fs.writeFileSync(WEB_LOCAL_STORE_FILE, JSON.stringify(store, null, 2));
}

function listLocalCollection(name) {
    const store = readLocalStore();
    return store[name] || [];
}

function insertLocalCollection(name, payload) {
    const store = readLocalStore();
    const item = {
        id: payload.id || makeId(name),
        created_at: payload.created_at || new Date().toISOString(),
        ...payload
    };
    const current = Array.isArray(store[name]) ? store[name] : [];
    store[name] = [item, ...current];
    writeLocalStore(store);
    return item;
}

function deleteLocalCollection(name, id) {
    const store = readLocalStore();
    const current = Array.isArray(store[name]) ? store[name] : [];
    const next = current.filter(item => String(item.id) !== String(id));
    store[name] = next;
    writeLocalStore(store);
    return current.length !== next.length;
}

function updateLocalOrder(orderId, updater) {
    const store = readLocalStore();
    let found = null;
    store.orders = (store.orders || []).map(order => {
        if (String(order.id) !== String(orderId)) return order;
        found = typeof updater === 'function' ? updater(order) : { ...order, ...updater };
        return found;
    });
    writeLocalStore(store);
    return found;
}

async function resolveReferrerId(referralCode, currentUserId) {
    const code = sanitizeReferralCode(referralCode);
    if (!code) return null;
    const { data, error } = await webSupabase.from('profiles').select('id').ilike('referral_code', code).maybeSingle();
    if (error || !data?.id) return null;
    if (String(data.id) === String(currentUserId)) return null;
    return data.id;
}

function normalizeProfileEmail(emailInput) {
    const email = String(emailInput || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return null;
    return email;
}

async function resolveProfileBootstrapEmail(userId, emailInput = null) {
    const fromInput = normalizeProfileEmail(emailInput);
    if (fromInput) return fromInput;

    try {
        const { data, error } = await webSupabase.auth.admin.getUserById(userId);
        if (!error) {
            const fromAuthUser = normalizeProfileEmail(data?.user?.email);
            if (fromAuthUser) return fromAuthUser;

            const identities = Array.isArray(data?.user?.identities) ? data.user.identities : [];
            for (const identity of identities) {
                const fromIdentity = normalizeProfileEmail(identity?.email || identity?.identity_data?.email);
                if (fromIdentity) return fromIdentity;
            }
        }
    } catch (error) {
        console.error('Failed to resolve profile bootstrap email:', error.message);
    }

    const safeUserId = String(userId || 'user').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 24) || 'user';
    return `${safeUserId}@oauth.local`;
}

async function ensureWebProfile(userId, referralCodeInput = null, emailInput = null) {
    const referralCode = sanitizeReferralCode(referralCodeInput);
    const email = await resolveProfileBootstrapEmail(userId, emailInput);
    const referrerId = await resolveReferrerId(referralCode, userId);
    let { data: profile, error } = await webSupabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;

    if (!profile) {
        const payload = {
            id: userId,
            email,
            plan: 'Free',
            tokens: 5,
            total_emails_generated: 0,
            referral_code: createReferralCode(userId),
            referred_by: referrerId || null
        };
        const created = await webSupabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').single();
        if (created.error) throw created.error;
        profile = created.data;
    }

    const updates = {};
    if (!profile.referral_code) updates.referral_code = createReferralCode(userId);
    if (email && !profile.email) updates.email = email;
    if (referrerId && !profile.referred_by) {
        updates.referred_by = referrerId;
    }

    if (Object.keys(updates).length > 0) {
        const updated = await webSupabase.from('profiles').update(updates).eq('id', userId).select('*').single();
        if (!updated.error) profile = updated.data;
    }

    return profile;
}

async function getOrdersList() {
    const localOrders = listLocalCollection('orders');
    const { data, error } = await webSupabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return localOrders;

    const dbOrders = data || [];
    const userIds = [...new Set(dbOrders.map(x => x.user_id).filter(Boolean))];
    let profileMap = new Map();

    if (userIds.length > 0) {
        const { data: profiles } = await webSupabase.from('profiles').select('id, email').in('id', userIds);
        profileMap = new Map((profiles || []).map(p => [p.id, p.email]));
    }

    const merged = [
        ...dbOrders.map(order => ({ ...order, user_email: order.user_email || profileMap.get(order.user_id) || null })),
        ...localOrders
    ];

    return merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

async function createOrderRecord(payload) {
    const row = {
        user_id: payload.user_id,
        plan: payload.plan,
        amount: Number(payload.amount || 0),
        payment_method: payload.payment_method,
        payment_ref: payload.payment_ref,
        status: payload.status || 'pending'
    };

    const inserted = await webSupabase.from('orders').insert([row]).select('*').maybeSingle();
    if (inserted.error || !inserted.data) {
        return insertLocalCollection('orders', {
            id: makeId('order'),
            user_email: payload.user_email || null,
            created_at: new Date().toISOString(),
            ...row
        });
    }
    return { ...inserted.data, user_email: payload.user_email || null };
}

async function updateOrderStatus(orderId, status) {
    const updated = await webSupabase.from('orders').update({ status }).eq('id', orderId).select('*').maybeSingle();
    if (updated.error || !updated.data) {
        const local = updateLocalOrder(orderId, order => ({ ...order, status }));
        return local;
    }
    return updated.data;
}

async function applyOrderReward(order) {
    if (!order || !order.user_id) return;
    const plan = normalizePlan(order.plan);
    const credit = PLAN_TOKEN_CREDIT[plan.toUpperCase()] || 0;

    if (credit <= 0) return;
    const { data: profile } = await webSupabase.from('profiles').select('tokens').eq('id', order.user_id).maybeSingle();
    if (!profile) return;

    await webSupabase.from('profiles').update({
        plan,
        tokens: Number(profile.tokens || 0) + credit
    }).eq('id', order.user_id);
}

async function listAdminCollection(name) {
    const table = ADMIN_COLLECTION_TABLES[name];
    if (!table) return { items: [], source: 'local', capability: null };

    const capability = await getTableCapability(table);
    if (!capability.available) {
        if (capability.reason === 'missing_table') {
            return { items: listLocalCollection(name), source: 'local', capability };
        }
        throw new Error(capability.message || `Table '${table}' is unavailable`);
    }

    const { data, error } = await webSupabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) {
        if (isMissingTableError(error, table)) {
            const missingCapability = markTableMissing(table, error);
            return { items: listLocalCollection(name), source: 'local', capability: missingCapability };
        }
        throw error;
    }
    return { items: data || [], source: 'db', capability };
}

async function createAdminCollectionItem(name, payload) {
    const table = ADMIN_COLLECTION_TABLES[name];
    if (!table) return { item: insertLocalCollection(name, payload), source: 'local', capability: null };

    const capability = await getTableCapability(table);
    if (!capability.available) {
        if (capability.reason === 'missing_table') {
            return { item: insertLocalCollection(name, payload), source: 'local', capability };
        }
        throw new Error(capability.message || `Table '${table}' is unavailable`);
    }

    const inserted = await webSupabase.from(table).insert([payload]).select('*').maybeSingle();
    if (inserted.error) {
        if (isMissingTableError(inserted.error, table)) {
            const missingCapability = markTableMissing(table, inserted.error);
            return { item: insertLocalCollection(name, payload), source: 'local', capability: missingCapability };
        }
        throw inserted.error;
    }
    if (!inserted.data) return { item: insertLocalCollection(name, payload), source: 'local', capability };
    return { item: inserted.data, source: 'db', capability };
}

async function deleteAdminCollectionItem(name, id) {
    const table = ADMIN_COLLECTION_TABLES[name];
    if (!table) return { deleted: deleteLocalCollection(name, id), source: 'local', capability: null };

    const capability = await getTableCapability(table);
    if (!capability.available) {
        if (capability.reason === 'missing_table') {
            return { deleted: deleteLocalCollection(name, id), source: 'local', capability };
        }
        throw new Error(capability.message || `Table '${table}' is unavailable`);
    }

    const deleted = await webSupabase.from(table).delete().eq('id', id).select('id').maybeSingle();
    if (deleted.error) {
        if (isMissingTableError(deleted.error, table)) {
            const missingCapability = markTableMissing(table, deleted.error);
            return { deleted: deleteLocalCollection(name, id), source: 'local', capability: missingCapability };
        }
        throw deleted.error;
    }
    return { deleted: !!deleted.data, source: 'db', capability };
}

async function listDriveAccounts() {
    const capability = await getTableCapability('cloud_accounts');
    if (!capability.available) {
        if (capability.reason === 'missing_table') {
            return { drives: [], source: 'missing', capability };
        }
        throw new Error(capability.message || `Table 'cloud_accounts' is unavailable`);
    }

    const result = await webSupabase.from('cloud_accounts').select('*').order('created_at', { ascending: false });
    if (result.error) {
        if (isMissingTableError(result.error, 'cloud_accounts')) {
            const missingCapability = markTableMissing('cloud_accounts', result.error);
            return { drives: [], source: 'missing', capability: missingCapability };
        }
        throw result.error;
    }
    return { drives: result.data || [], source: 'db', capability };
}

async function buildDriveCapabilityMap(rows = []) {
    const entries = await Promise.all((rows || []).map(async (drive) => {
        const probe = await probeDriveAccountRecord(drive);
        return [String(drive.id), probe];
    }));
    return Object.fromEntries(entries);
}

const CLOUD_MIGRATION_FAILURE_SAMPLE_LIMIT = 10;
const cloudMigrationQueue = new Set();
let cloudMigrationQueueRunning = false;

function sanitizeMigrationSummary(summary = {}) {
    return {
        sourceDriveName: summary.sourceDriveName || null,
        targetDriveName: summary.targetDriveName || null,
        totalFiles: Number(summary.totalFiles || 0),
        processedFiles: Number(summary.processedFiles || 0),
        successFiles: Number(summary.successFiles || 0),
        failedFiles: Number(summary.failedFiles || 0),
        failureSamples: Array.isArray(summary.failureSamples) ? summary.failureSamples.slice(0, CLOUD_MIGRATION_FAILURE_SAMPLE_LIMIT) : [],
        warnings: Array.isArray(summary.warnings) ? summary.warnings.slice(0, CLOUD_MIGRATION_FAILURE_SAMPLE_LIMIT) : [],
        startedAt: summary.startedAt || null,
        completedAt: summary.completedAt || null,
        lastItemName: summary.lastItemName || null,
        lastItemError: summary.lastItemError || null
    };
}

function sanitizeMigrationJob(job) {
    if (!job) return null;
    return {
        id: job.id,
        admin_id: job.admin_id || null,
        source_drive_id: job.source_drive_id,
        target_drive_id: job.target_drive_id,
        status: job.status,
        total_items: Number(job.total_items || 0),
        processed_items: Number(job.processed_items || 0),
        success_items: Number(job.success_items || 0),
        failed_items: Number(job.failed_items || 0),
        current_step: job.current_step || 'queued',
        current_item_name: job.current_item_name || null,
        current_item_id: job.current_item_id || null,
        summary: sanitizeMigrationSummary(job.summary_json || {}),
        last_error: job.last_error || null,
        started_at: job.started_at || null,
        completed_at: job.completed_at || null,
        created_at: job.created_at || null,
        updated_at: job.updated_at || null
    };
}

function buildMigrationTempPath(fileName = 'cloud-file.bin') {
    const original = String(fileName || 'cloud-file.bin');
    const ext = path.extname(original).slice(0, 12);
    const base = path.basename(original, ext).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 64) || 'cloud-file';
    return path.join(CLOUD_MIGRATION_TEMP_DIR, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${base}${ext}`);
}

function appendMigrationWarning(summary, warning) {
    if (!summary) return;
    if (!Array.isArray(summary.warnings)) summary.warnings = [];
    if (warning && summary.warnings.length < CLOUD_MIGRATION_FAILURE_SAMPLE_LIMIT) {
        summary.warnings.push(String(warning));
    }
}

function appendMigrationFailure(summary, fileRow, error) {
    const payload = buildCloudErrorPayload(error, 'Migration failed');
    if (!summary) return payload;
    summary.failedFiles = Number(summary.failedFiles || 0) + 1;
    summary.lastItemName = fileRow?.file_name || null;
    summary.lastItemError = payload.error || 'Migration failed';
    if (!Array.isArray(summary.failureSamples)) summary.failureSamples = [];
    if (summary.failureSamples.length < CLOUD_MIGRATION_FAILURE_SAMPLE_LIMIT) {
        summary.failureSamples.push({
            cloudFileId: fileRow?.id || null,
            fileName: fileRow?.file_name || null,
            errorCode: payload.errorCode || 'cloud_migration_error',
            errorMessage: payload.error || 'Migration failed',
            details: payload.details || null
        });
    }
    return payload;
}

async function listMigrationJobs(limit = 10) {
    const capability = await getTableCapability('cloud_migration_jobs');
    if (!capability.available) {
        return { jobs: [], capability };
    }

    const result = await webSupabase.from('cloud_migration_jobs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (result.error) {
        if (isMissingTableError(result.error, 'cloud_migration_jobs')) {
            const missingCapability = markTableMissing('cloud_migration_jobs', result.error);
            return { jobs: [], capability: missingCapability };
        }
        throw result.error;
    }

    return {
        jobs: (result.data || []).map(sanitizeMigrationJob),
        capability
    };
}

async function updateMigrationJob(jobId, updates = {}) {
    const payload = { ...updates };
    if (payload.summary_json) {
        payload.summary_json = sanitizeMigrationSummary(payload.summary_json);
    }
    const updated = await webSupabase.from('cloud_migration_jobs')
        .update(payload)
        .eq('id', jobId)
        .select('*')
        .maybeSingle();
    if (updated.error) throw updated.error;
    return sanitizeMigrationJob(updated.data);
}

async function createMigrationJob(payload = {}) {
    const capability = await getTableCapability('cloud_migration_jobs');
    if (!capability.available) {
        throw new Error(buildMissingTableMessage('cloud_migration_jobs'));
    }

    const totalItems = Number(payload.totalItems || 0);
    const summary = sanitizeMigrationSummary({
        ...(payload.summary || {}),
        sourceDriveName: payload.sourceDriveName || null,
        targetDriveName: payload.targetDriveName || null,
        totalFiles: totalItems
    });

    const inserted = await webSupabase.from('cloud_migration_jobs').insert([{
        admin_id: payload.adminId || null,
        source_drive_id: payload.sourceDriveId,
        target_drive_id: payload.targetDriveId,
        status: totalItems > 0 ? 'queued' : 'completed',
        total_items: totalItems,
        processed_items: 0,
        success_items: 0,
        failed_items: 0,
        current_step: totalItems > 0 ? 'queued' : 'completed',
        current_item_name: null,
        current_item_id: null,
        summary_json: summary,
        last_error: null,
        started_at: totalItems > 0 ? null : new Date().toISOString(),
        completed_at: totalItems > 0 ? null : new Date().toISOString()
    }]).select('*').maybeSingle();

    if (inserted.error || !inserted.data) throw inserted.error || new Error('Failed to create migration job');
    return sanitizeMigrationJob(inserted.data);
}

async function downloadDriveFileToTempFile(driveData, fileRow, tempPath) {
    const response = await driveData.service.files.get({
        fileId: fileRow.drive_file_id,
        alt: 'media',
        supportsAllDrives: true
    }, { responseType: 'stream' });

    const hash = crypto.createHash('md5');
    let bytes = 0;

    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(tempPath);
        response.data.on('data', chunk => {
            hash.update(chunk);
            bytes += chunk.length;
        });
        response.data.on('error', reject);
        output.on('error', reject);
        output.on('finish', resolve);
        response.data.pipe(output);
    });

    return {
        bytes,
        md5: hash.digest('hex')
    };
}

async function uploadMigrationFileToDrive(driveData, fileRow, tempPath) {
    const mimeType = fileRow.mime_type || 'application/octet-stream';
    const requestBody = {
        name: fileRow.file_name,
        mimeType
    };

    if (driveData.folderId) {
        requestBody.parents = [driveData.folderId];
    }

    const response = await driveData.service.files.create({
        requestBody,
        media: { mimeType, body: fs.createReadStream(tempPath) },
        fields: 'id, name, size, md5Checksum, webViewLink, webContentLink',
        supportsAllDrives: true
    });

    return response.data;
}

async function verifyMigrationUpload(driveData, uploadedFile, expectedBytes, expectedMd5) {
    const verified = await driveData.service.files.get({
        fileId: uploadedFile.id,
        fields: 'id, size, md5Checksum',
        supportsAllDrives: true
    });

    const targetSize = Number(verified.data?.size || uploadedFile.size || 0);
    const targetMd5 = String(verified.data?.md5Checksum || uploadedFile.md5Checksum || '');

    if (Number.isFinite(expectedBytes) && expectedBytes >= 0 && targetSize !== Number(expectedBytes)) {
        throw new Error(`Uploaded file size mismatch: expected ${expectedBytes}, got ${targetSize}`);
    }

    if (expectedMd5 && targetMd5 && targetMd5 !== expectedMd5) {
        throw new Error('Uploaded file checksum mismatch');
    }

    return verified.data || uploadedFile;
}

async function migrateCloudFileRow(job, summary, sourceDriveData, targetDriveData, fileRow) {
    const tempPath = buildMigrationTempPath(fileRow.file_name);
    let targetFileId = null;
    try {
        const downloadInfo = await downloadDriveFileToTempFile(sourceDriveData, fileRow, tempPath);
        summary.lastItemName = fileRow.file_name || null;

        const uploadedFile = await uploadMigrationFileToDrive(targetDriveData, fileRow, tempPath);
        targetFileId = uploadedFile.id;

        await updateMigrationJob(job.id, {
            current_step: 'verifying',
            current_item_name: fileRow.file_name || null,
            current_item_id: fileRow.id,
            summary_json: summary
        });

        await verifyMigrationUpload(
            targetDriveData,
            uploadedFile,
            Number(fileRow.file_size || downloadInfo.bytes || 0),
            downloadInfo.md5
        );

        let permissionWarning = null;
        if (fileRow.is_public === true || String(fileRow.is_public) === 'true') {
            try {
                await targetDriveData.service.permissions.create({
                    fileId: uploadedFile.id,
                    requestBody: { role: 'reader', type: 'anyone' },
                    supportsAllDrives: true
                });
            } catch (permissionError) {
                permissionWarning = classifyDriveProviderError(permissionError);
            }
        }

        const updatePayload = {
            drive_file_id: uploadedFile.id,
            drive_account_id: targetDriveData.accountId,
            web_view_link: uploadedFile.webViewLink || null,
            web_content_link: uploadedFile.webContentLink || null
        };
        const updated = await webSupabase.from('cloud_files').update(updatePayload).eq('id', fileRow.id);
        if (updated.error) throw updated.error;

        const sourceCleanupError = await safeDeleteDriveFile(sourceDriveData, fileRow.drive_file_id);
        if (sourceCleanupError) {
            const payload = buildCloudErrorPayload(sourceCleanupError, 'Source cleanup failed');
            appendMigrationWarning(summary, `Source cleanup warning for "${fileRow.file_name}": ${payload.error}`);
        }

        if (permissionWarning) {
            appendMigrationWarning(summary, `Public permission warning for "${fileRow.file_name}": ${permissionWarning.message}`);
        }

        summary.successFiles = Number(summary.successFiles || 0) + 1;
        summary.processedFiles = Number(summary.processedFiles || 0) + 1;
        summary.lastItemError = null;
        return { success: true };
    } catch (error) {
        if (targetFileId) {
            const cleanupError = await safeDeleteDriveFile(targetDriveData, targetFileId);
            if (cleanupError) {
                const payload = buildCloudErrorPayload(cleanupError, 'Target cleanup failed');
                appendMigrationWarning(summary, `Target cleanup warning for "${fileRow.file_name}": ${payload.error}`);
            }
        }
        const payload = appendMigrationFailure(summary, fileRow, error);
        summary.processedFiles = Number(summary.processedFiles || 0) + 1;
        return { success: false, error: payload };
    } finally {
        await fs.promises.unlink(tempPath).catch(() => {});
    }
}

async function runCloudMigrationJob(jobId) {
    const capability = await getTableCapability('cloud_migration_jobs');
    if (!capability.available) return;

    const jobRes = await webSupabase.from('cloud_migration_jobs').select('*').eq('id', jobId).maybeSingle();
    if (jobRes.error) throw jobRes.error;
    if (!jobRes.data) return;

    const job = sanitizeMigrationJob(jobRes.data);
    if (!job || ['completed', 'completed_with_errors', 'failed', 'cancelled'].includes(job.status)) return;

    const sourceRes = await webSupabase.from('cloud_accounts').select('*').eq('id', job.source_drive_id).maybeSingle();
    if (sourceRes.error) throw sourceRes.error;
    if (!sourceRes.data) {
        await updateMigrationJob(job.id, {
            status: 'failed',
            current_step: 'failed',
            completed_at: new Date().toISOString(),
            last_error: 'Source drive not found'
        });
        return;
    }

    const targetRes = await webSupabase.from('cloud_accounts').select('*').eq('id', job.target_drive_id).maybeSingle();
    if (targetRes.error) throw targetRes.error;
    if (!targetRes.data) {
        await updateMigrationJob(job.id, {
            status: 'failed',
            current_step: 'failed',
            completed_at: new Date().toISOString(),
            last_error: 'Target drive not found'
        });
        return;
    }

    const sourceProbe = await probeDriveAccountRecord(sourceRes.data, { forceRefresh: true });
    if (!sourceProbe.ready) {
        await updateMigrationJob(job.id, {
            status: 'failed',
            current_step: 'failed',
            completed_at: new Date().toISOString(),
            last_error: `Source drive not ready: ${sourceProbe.message}`
        });
        return;
    }

    const targetProbe = await probeDriveAccountRecord(targetRes.data, { forceRefresh: true });
    if (!targetProbe.ready) {
        await updateMigrationJob(job.id, {
            status: 'failed',
            current_step: 'failed',
            completed_at: new Date().toISOString(),
            last_error: `Target drive not ready: ${targetProbe.message}`
        });
        return;
    }

    const sourceDriveData = await getDriveService(job.source_drive_id);
    const targetDriveData = await getDriveService(job.target_drive_id);
    if (!sourceDriveData || !targetDriveData) {
        await updateMigrationJob(job.id, {
            status: 'failed',
            current_step: 'failed',
            completed_at: new Date().toISOString(),
            last_error: 'Failed to build Drive service for migration'
        });
        return;
    }

    const filesRes = await webSupabase.from('cloud_files')
        .select('*')
        .eq('drive_account_id', job.source_drive_id)
        .order('created_at', { ascending: true });

    if (filesRes.error) {
        throw filesRes.error;
    }

    const rows = (filesRes.data || []).filter(row => String(row.drive_file_id || '') !== 'folder');
    const summary = sanitizeMigrationSummary(job.summary || {});
    summary.sourceDriveName = sourceRes.data.name || summary.sourceDriveName || null;
    summary.targetDriveName = targetRes.data.name || summary.targetDriveName || null;
    summary.totalFiles = Number(rows.length);
    summary.startedAt = job.started_at || new Date().toISOString();

    let processed = Number(job.processed_items || 0);
    let success = Number(job.success_items || 0);
    let failed = Number(job.failed_items || 0);

    await updateMigrationJob(job.id, {
        status: 'running',
        current_step: rows.length > 0 ? 'copying' : 'completed',
        total_items: rows.length,
        processed_items: processed,
        success_items: success,
        failed_items: failed,
        started_at: job.started_at || new Date().toISOString(),
        summary_json: summary,
        last_error: null
    });

    if (rows.length === 0) {
        summary.completedAt = new Date().toISOString();
        await updateMigrationJob(job.id, {
            status: 'completed',
            current_step: 'completed',
            completed_at: summary.completedAt,
            summary_json: summary
        });
        return;
    }

    for (const row of rows) {
        const latestRow = await webSupabase.from('cloud_migration_jobs').select('status').eq('id', job.id).maybeSingle();
        if (!latestRow.error && latestRow.data && latestRow.data.status === 'cancelled') {
            summary.lastItemError = 'Migration cancelled';
            await updateMigrationJob(job.id, {
                status: 'cancelled',
                current_step: 'cancelled',
                completed_at: new Date().toISOString(),
                last_error: 'Migration cancelled',
                summary_json: summary
            });
            return;
        }

        await updateMigrationJob(job.id, {
            current_step: 'copying',
            current_item_name: row.file_name || null,
            current_item_id: row.id,
            processed_items: processed,
            success_items: success,
            failed_items: failed,
            summary_json: summary,
            last_error: null
        });

        const result = await migrateCloudFileRow(job, summary, sourceDriveData, targetDriveData, row);
        processed = Number(summary.processedFiles || processed);
        success = Number(summary.successFiles || success);
        failed = Number(summary.failedFiles || failed);

        await updateMigrationJob(job.id, {
            current_step: result.success ? 'copying' : 'copying',
            current_item_name: row.file_name || null,
            current_item_id: row.id,
            processed_items: processed,
            success_items: success,
            failed_items: failed,
            summary_json: summary,
            last_error: result.success ? null : (result.error?.error || 'Migration item failed')
        });
    }

    summary.completedAt = new Date().toISOString();
    await updateMigrationJob(job.id, {
        status: failed > 0 ? 'completed_with_errors' : 'completed',
        current_step: 'completed',
        completed_at: summary.completedAt,
        processed_items: processed,
        success_items: success,
        failed_items: failed,
        current_item_name: null,
        current_item_id: null,
        last_error: failed > 0 ? `${failed} file(s) failed to migrate` : null,
        summary_json: summary
    });
}

async function processCloudMigrationQueue() {
    if (cloudMigrationQueueRunning) return;
    cloudMigrationQueueRunning = true;
    try {
        while (cloudMigrationQueue.size > 0) {
            const [jobId] = cloudMigrationQueue;
            cloudMigrationQueue.delete(jobId);
            try {
                await runCloudMigrationJob(jobId);
            } catch (error) {
                console.error('Cloud migration job failed:', jobId, error.message);
                const payload = buildCloudErrorPayload(error, 'Migration failed');
                try {
                    await updateMigrationJob(jobId, {
                        status: 'failed',
                        current_step: 'failed',
                        last_error: payload.error,
                        completed_at: new Date().toISOString()
                    });
                } catch (updateError) {
                    console.error('Failed to persist migration job failure:', updateError.message);
                }
            }
        }
    } finally {
        cloudMigrationQueueRunning = false;
    }
}

function queueCloudMigrationJob(jobId) {
    if (!jobId) return;
    cloudMigrationQueue.add(String(jobId));
    void processCloudMigrationQueue();
}

async function resumeQueuedCloudMigrationJobs() {
    const list = await listMigrationJobs(20);
    if (!list.capability?.available) return;
    for (const job of list.jobs || []) {
        if (['queued', 'running'].includes(job.status)) {
            queueCloudMigrationJob(job.id);
        }
    }
}

async function resolveDriveUnavailablePayload() {
    try {
        const drivesResult = await listDriveAccounts();
        if (!drivesResult.capability?.available) {
            return {
                error: buildMissingTableMessage('cloud_accounts'),
                errorCode: 'cloud_accounts_missing',
                details: drivesResult.capability?.message || null
            };
        }

        const rows = drivesResult.drives || [];
        if (rows.length === 0) {
            return {
                error: 'No drive account configured. Add and verify a drive in Admin Panel first.',
                errorCode: 'drive_not_configured',
                details: null
            };
        }

        for (const row of rows) {
            const probe = await probeDriveAccountRecord(row);
            if (!probe.ready) {
                return {
                    error: `Drive "${row.name}" is not ready: ${probe.message}`,
                    errorCode: probe.errorCode || 'drive_not_ready',
                    details: probe.details || null
                };
            }
        }
    } catch (error) {
        const payload = buildCloudErrorPayload(error, 'Drive configuration is unavailable');
        return {
            error: payload.error,
            errorCode: payload.errorCode,
            details: payload.details
        };
    }

    return {
        error: 'No ready drive account found.',
        errorCode: 'drive_not_ready',
        details: null
    };
}

function resolveOAuthUserId(req) {
    return String(
        req.body?.userId ||
        req.body?.appUserId ||
        req.query?.userId ||
        req.query?.appUserId ||
        ''
    ).trim();
}

function buildToolAccount(toolType) {
    if (toolType === 'canva') {
        const randomUser = `canvagen${Math.floor(Math.random() * 99999)}@cexistore.com`;
        const randomPass = crypto.randomBytes(6).toString('hex');
        return { email: randomUser, password: randomPass, type: 'Canva Pro Trial (1 Month)' };
    }
    if (toolType === 'alight') {
        const randomUser = `alight${Math.floor(Math.random() * 99999)}@cexistore.com`;
        const randomPass = crypto.randomBytes(6).toString('hex');
        return { email: randomUser, password: randomPass, type: 'Alight Motion Premium' };
    }
    return null;
}

async function deployHostingPanel({ email, username, node, allocation, egg, sendTo }) {
    const serverId = crypto.randomBytes(4).toString('hex');
    const password = crypto.randomBytes(6).toString('hex');
    let emailSent = true;

    try {
        await axios.post('https://api.resend.com/emails', {
            from: 'Cexistore Hosting <hosting@tempmail.amircexitech.com>',
            to: sendTo || email,
            subject: 'Your Pterodactyl Server Details',
            html: `
                <h2>Welcome to Cexistore Hosting</h2>
                <p>Your server has been deployed successfully.</p>
                <ul>
                    <li><b>Server ID:</b> ${serverId}</li>
                    <li><b>Username:</b> ${username}</li>
                    <li><b>Password:</b> ${password}</li>
                    <li><b>Node:</b> ${node}</li>
                    <li><b>Allocation:</b> ${allocation}</li>
                    <li><b>Egg:</b> ${egg}</li>
                </ul>
                <p>Login at: https://panel.amircexitech.com</p>
            `
        }, {
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }
        });
    } catch (mailErr) {
        emailSent = false;
        console.error('Failed to send Resend email:', mailErr.response ? mailErr.response.data : mailErr.message);
    }

    return { serverId, email, username, password, node, egg, sentTo: sendTo || email, emailSent };
}

app.get('/api/web/profile', async (req, res) => {
    try {
        const { userId, ref, email } = req.query;
        if (!userId) return res.json({ success: false, error: 'Missing userId' });

        const profile = await ensureWebProfile(userId, ref || null, email || null);
        const [domainsRes, emailsRes] = await Promise.all([
            webSupabase.from('domains').select('domain').eq('is_active', true),
            webSupabase.from('active_emails').select('email, created_at').eq('profile_id', userId).order('created_at', { ascending: false })
        ]);

        res.json({
            success: true,
            profile,
            domains: domainsRes.data || [],
            emails: emailsRes.data || []
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/order', async (req, res) => {
    try {
        const { userId, userEmail, plan, amount, paymentMethod, paymentRef } = req.body;
        if (!userId || !plan || !paymentMethod || !paymentRef) {
            return res.json({ success: false, error: 'Missing order fields' });
        }

        const profile = await ensureWebProfile(userId, null, userEmail || null);
        const created = await createOrderRecord({
            user_id: userId,
            user_email: profile.email || null,
            plan: normalizePlan(plan),
            amount,
            payment_method: paymentMethod,
            payment_ref: paymentRef,
            status: 'pending'
        });
        res.json({ success: true, order: created });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/download', async (req, res) => {
    try {
        const { userId, url, platform } = req.body;
        if (!userId || !url) return res.json({ success: false, error: 'Missing parameters' });
        new URL(url);

        const title = `${String(platform || 'media').toUpperCase()} media ready`;
        res.json({
            success: true,
            data: {
                title,
                url,
                video: url,
                music: platform === 'youtube' ? url : null,
                images: []
            }
        });
    } catch (e) {
        res.json({ success: false, error: 'Invalid URL' });
    }
});

app.post('/api/web/cloud/remote-upload', async (req, res) => {
    let driveData = null;
    let createdDriveFileId = null;
    try {
        const { userId, folderId, password, burnAfterRead, isPublic, url } = req.body;
        if (!userId || !url) return res.json({ success: false, error: 'Missing parameters' });
        if (!rateLimit(`cloud-remote:${userId}`, 5, 60000)) return res.json({ success: false, error: 'Remote upload rate limited. Wait 1 minute.' });
        let remoteUrl;
        try {
            remoteUrl = new URL(url);
        } catch {
            return res.json({ success: false, error: 'Invalid URL' });
        }

        driveData = await getGoogleOAuthDriveContext(userId);
        if (!driveData.available) {
            return res.status(driveData.httpStatus || 409).json({ success: false, ...driveData });
        }

        const profileRes = await webSupabase.from('profiles').select('plan').eq('id', userId).maybeSingle();
        if (profileRes.error) throw profileRes.error;
        const profile = profileRes.data;

        let maxStorage = 100 * 1024 * 1024 * 1024; // Free: 100GB
        if (profile?.plan === 'Owner') maxStorage = Infinity;
        else if (profile?.plan === 'VVIP') maxStorage = 5 * 1024 * 1024 * 1024 * 1024; // 5TB
        else if (profile?.plan === 'Pro') maxStorage = 1 * 1024 * 1024 * 1024 * 1024;  // 1TB

        const userFilesRes = await webSupabase.from('cloud_files').select('file_size').eq('user_id', userId);
        if (userFilesRes.error) throw userFilesRes.error;
        const totalUsedBytes = (userFilesRes.data || []).reduce((sum, f) => sum + (Number(f.file_size) || 0), 0);

        const MAX_REMOTE_UPLOAD_BYTES = 500 * 1024 * 1024; // 500MB safety guard for proxy mode
        const remoteResp = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: MAX_REMOTE_UPLOAD_BYTES,
            maxBodyLength: MAX_REMOTE_UPLOAD_BYTES
        });

        const remoteContentLength = Number(remoteResp.headers['content-length'] || 0);
        if (remoteContentLength > 0 && maxStorage !== Infinity && (totalUsedBytes + remoteContentLength) > maxStorage) {
            return res.json({ success: false, error: 'Storage limit exceeded. Upgrade your plan.' });
        }

        const remoteBuffer = Buffer.from(remoteResp.data);
        if (maxStorage !== Infinity && (totalUsedBytes + remoteBuffer.length) > maxStorage) {
            return res.json({ success: false, error: 'Storage limit exceeded. Upgrade your plan.' });
        }

        const rawName = path.basename(remoteUrl.pathname) || `remote-${Date.now()}.bin`;
        const fileName = decodeURIComponent(rawName);
        const mimeType = remoteResp.headers['content-type'] || 'application/octet-stream';

        const passHash = password && String(password).trim() !== ''
            ? crypto.createHash('sha256').update(String(password).trim()).digest('hex')
            : null;

        const bufferStream = new stream.PassThrough();
        bufferStream.end(remoteBuffer);

        const response = await driveData.service.files.create({
            requestBody: {
                name: fileName,
                mimeType,
                parents: undefined
            },
            media: { mimeType, body: bufferStream },
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true
        });
        createdDriveFileId = response.data.id;

        let permissionWarning = null;
        if (String(isPublic) === 'true') {
            try {
                await driveData.service.permissions.create({
                    fileId: response.data.id,
                    requestBody: { role: 'reader', type: 'anyone' },
                    supportsAllDrives: true
                });
            } catch (permissionError) {
                permissionWarning = classifyDriveProviderError(permissionError);
            }
        }

        const inserted = await webSupabase.from('cloud_files').insert([{
            user_id: userId,
            cloud_oauth_account_id: driveData.accountId || null,
            file_name: response.data.name,
            file_size: remoteBuffer.length,
            mime_type: mimeType,
            drive_file_id: response.data.id,
            drive_account_id: null,
            folder_id: folderId || null,
            password_hash: passHash,
            burn_after_read: String(burnAfterRead) === 'true',
            is_public: String(isPublic) === 'true',
            web_view_link: response.data.webViewLink,
            web_content_link: response.data.webContentLink
        }]);
        if (inserted.error) {
            const cleanupError = await safeDeleteDriveFile(driveData, createdDriveFileId);
            if (cleanupError) {
                console.error('Remote upload cleanup failed after DB insert error:', cleanupError.message);
            }
            throw inserted.error;
        }

        const responsePayload = { success: true, file: response.data };
        if (permissionWarning) responsePayload.warning = permissionWarning.message;
        res.json(responsePayload);
    } catch (e) {
        res.json({ success: false, ...buildCloudErrorPayload(e, 'Remote upload failed') });
    }
});

app.post('/api/web/tools/generate', async (req, res) => {
    try {
        const { userId, userEmail, toolType } = req.body;
        if (!userId || !toolType) return res.json({ success: false, error: 'Missing parameters' });

        const profile = await ensureWebProfile(userId, null, userEmail || null);
        if (!profile || profile.plan === 'Free') {
            return res.json({ success: false, error: 'This tool requires a Premium Plan (Pro, VVIP, Owner).' });
        }

        const account = buildToolAccount(toolType);
        if (!account) return res.json({ success: false, error: 'Invalid tool type' });

        res.json({ success: true, account });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/generate-canva', async (req, res) => {
    try {
        const { userId, userEmail } = req.body;
        if (!userId) return res.json({ success: false, error: 'Missing userId' });
        const profile = await ensureWebProfile(userId, null, userEmail || null);
        if (!profile || profile.plan === 'Free') return res.json({ success: false, error: 'Premium plan required' });
        if (Number(profile.tokens || 0) < 2) return res.json({ success: false, error: 'Need at least 2 tokens' });

        const account = buildToolAccount('canva');
        await webSupabase.from('profiles').update({ tokens: Number(profile.tokens || 0) - 2 }).eq('id', userId);
        res.json({ success: true, account });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/generate-alight', async (req, res) => {
    try {
        const { userId, userEmail } = req.body;
        if (!userId) return res.json({ success: false, error: 'Missing userId' });
        const profile = await ensureWebProfile(userId, null, userEmail || null);
        if (!profile || profile.plan === 'Free') return res.json({ success: false, error: 'Premium plan required' });
        if (Number(profile.tokens || 0) < 2) return res.json({ success: false, error: 'Need at least 2 tokens' });

        const account = buildToolAccount('alight');
        await webSupabase.from('profiles').update({ tokens: Number(profile.tokens || 0) - 2 }).eq('id', userId);
        res.json({ success: true, account });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/hosting/pterodactyl/deploy', async (req, res) => {
    try {
        const { userId, userEmail, email, username, node, allocation, egg, sendTo } = req.body;
        if (!userId || !email || !username) return res.json({ success: false, error: 'Missing parameters' });

        const profile = await ensureWebProfile(userId, null, userEmail || email || null);
        if (!profile || profile.plan === 'Free') {
            return res.json({ success: false, error: 'Hosting deployment requires a Premium Plan.' });
        }

        const order = await deployHostingPanel({ email, username, node, allocation, egg, sendTo });
        res.json({ success: true, server: { id: order.serverId, password: order.password, username: order.username }, order });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/ptero-order', async (req, res) => {
    try {
        const { userId, userEmail, email, username, node, allocation, egg, sendTo } = req.body;
        if (!userId || !email || !username || !egg) return res.json({ success: false, error: 'Missing parameters' });

        const profile = await ensureWebProfile(userId, null, userEmail || email || null);
        if (Number(profile.tokens || 0) < 5) return res.json({ success: false, error: 'Need at least 5 tokens' });

        await webSupabase.from('profiles').update({ tokens: Number(profile.tokens || 0) - 5 }).eq('id', userId);
        const order = await deployHostingPanel({ email, username, node, allocation, egg, sendTo });

        await createOrderRecord({
            user_id: userId,
            user_email: profile.email || null,
            plan: 'Hosting Panel',
            amount: 5,
            payment_method: 'tokens',
            payment_ref: `PTERO-${order.serverId}`,
            status: 'approved'
        });

        res.json({ success: true, order });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/hosting/nodes', async (req, res) => {
    try {
        const nodes = await listAdminCollection('nodes');
        const safeNodes = (nodes.items || []).map(node => {
            const { plta_key, ...rest } = node;
            return rest;
        });
        res.json({ success: true, nodes: safeNodes });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/hosting/eggs', async (req, res) => {
    try {
        const eggs = await listAdminCollection('eggs');
        res.json({ success: true, eggs: eggs.items || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ===== ADMIN API =====
async function isAdmin(userId) {
    if (!userId) return false;
    const { data } = await webSupabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle();
    return !!(data && data.is_admin);
}

app.get('/api/web/admin/stats', async (req, res) => {
    try {
        const adminId = req.query.adminId;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });

        const [
            usersCountRes, emailsCountRes,
            usersListRes, domListRes,
            ordersList, inventoryList, nodesList, eggsList
        ] = await Promise.all([
            webSupabase.from('profiles').select('*', { count: 'exact', head: true }),
            webSupabase.from('active_emails').select('*', { count: 'exact', head: true }),
            webSupabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
            webSupabase.from('domains').select('*').order('created_at', { ascending: false }),
            getOrdersList(),
            listAdminCollection('inventory'),
            listAdminCollection('nodes'),
            listAdminCollection('eggs')
        ]);

        const requiredErrors = [
            usersCountRes.error,
            emailsCountRes.error,
            usersListRes.error,
            domListRes.error
        ].filter(Boolean);
        if (requiredErrors.length > 0) throw requiredErrors[0];

        res.json({
            success: true,
            stats: {
                totalUsers: usersCountRes.count || 0,
                totalEmails: emailsCountRes.count || 0,
                totalOrders: (ordersList || []).length,
                revenue: 0
            },
            users: usersListRes.data || [],
            domains: domListRes.data || [],
            orders: ordersList || [],
            inventory: inventoryList.items || [],
            nodes: nodesList.items || [],
            eggs: eggsList.items || []
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/user/referrals', async (req, res) => {
    try {
        const code = sanitizeReferralCode(req.query.code);
        if (!code) return res.json({ success: false, count: 0 });
        const referrerId = await resolveReferrerId(code, null);
        if (!referrerId) return res.json({ success: true, count: 0 });
        const { count, error } = await webSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', referrerId);
        if (error) throw error;
        res.json({ success: true, count: count || 0 });
    } catch (e) {
        res.json({ success: false, count: 0 });
    }
});

app.get('/api/web/admin/orders', async (req, res) => {
    try {
        if (!await isAdmin(req.query.adminId)) return res.json({ success: false, error: 'Admin access required' });
        const orders = await getOrdersList();
        res.json({ success: true, orders });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/approve-order', async (req, res) => {
    try {
        const { adminId, orderId, action } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        if (!orderId || !['approve', 'reject'].includes(action)) return res.json({ success: false, error: 'Invalid payload' });

        const status = action === 'approve' ? 'approved' : 'rejected';
        const currentOrders = await getOrdersList();
        const order = currentOrders.find(o => String(o.id) === String(orderId));
        if (!order) return res.json({ success: false, error: 'Order not found' });
        if (String(order.status || '').toLowerCase() === status) {
            return res.json({ success: false, error: `Order already ${status}` });
        }

        const updatedOrder = await updateOrderStatus(orderId, status);
        if (action === 'approve' && String(order.status || '').toLowerCase() !== 'approved') await applyOrderReward(order);

        res.json({ success: true, order: updatedOrder || { ...order, status } });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/update-user', async (req, res) => {
    try {
        const { adminId, targetUserId, tokens, plan } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        if (!targetUserId) return res.json({ success: false, error: 'Missing targetUserId' });

        const payload = {};
        if (Number.isFinite(Number(tokens))) payload.tokens = Number(tokens);
        if (plan) payload.plan = normalizePlan(plan);
        if (Object.keys(payload).length === 0) return res.json({ success: false, error: 'No update data provided' });

        const updated = await webSupabase.from('profiles').update(payload).eq('id', targetUserId).select('*').maybeSingle();
        if (updated.error) throw updated.error;
        res.json({ success: true, user: updated.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/admin/users', async (req, res) => {
    try {
        if (!await isAdmin(req.query.adminId)) return res.json({ success: false, error: 'Admin access required' });
        const { data } = await webSupabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
        res.json({ success: true, users: data || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/admin/domains', async (req, res) => {
    try {
        if (!await isAdmin(req.query.adminId)) return res.json({ success: false, error: 'Admin access required' });
        const { data, error } = await webSupabase.from('domains').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, domains: data || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/domains', async (req, res) => {
    try {
        const { adminId, domain, isPremium } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        const normalizedDomain = sanitizeDomainName(domain);
        if (!normalizedDomain) return res.json({ success: false, error: 'Invalid domain format' });

        const created = await webSupabase.from('domains').insert([{
            domain: normalizedDomain,
            is_active: true,
            is_premium: !!isPremium
        }]).select('*').maybeSingle();

        if (created.error) {
            if (created.error.code === '23505') {
                return res.json({ success: false, error: 'Domain already exists' });
            }
            throw created.error;
        }
        res.json({ success: true, domain: created.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.put('/api/web/admin/domains/:id/active', async (req, res) => {
    try {
        const adminId = req.query.adminId || req.body.adminId;
        const isActive = req.body?.isActive;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        if (typeof isActive !== 'boolean') return res.json({ success: false, error: 'Missing isActive boolean' });

        const updated = await webSupabase.from('domains').update({ is_active: isActive }).eq('id', req.params.id).select('*').maybeSingle();
        if (updated.error) throw updated.error;
        if (!updated.data) return res.json({ success: false, error: 'Domain not found' });
        res.json({ success: true, domain: updated.data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/web/admin/domains/:id', async (req, res) => {
    try {
        const adminId = req.query.adminId || req.body.adminId;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        const deleted = await webSupabase.from('domains').delete().eq('id', req.params.id);
        if (deleted.error) throw deleted.error;
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/admin/drives', async (req, res) => {
    try {
        if (!await isAdmin(req.query.adminId)) return res.json({ success: false, error: 'Admin access required' });
        const drivesResult = await listDriveAccounts();
        if (!drivesResult.capability?.available) {
            return res.json({
                success: false,
                error: buildMissingTableMessage('cloud_accounts'),
                drives: [],
                capabilities: { cloudAccounts: summarizeTableCapability(drivesResult.capability) }
            });
        }

        const capabilityMap = await buildDriveCapabilityMap(drivesResult.drives || []);
        const drives = mapDriveRows(drivesResult.drives || [], capabilityMap);
        const warnings = drives
            .filter(drive => drive.capability && drive.capability.ready === false)
            .map(drive => `Drive "${drive.name}" is not ready: ${drive.capability.message}`);

        res.json({
            success: true,
            drives,
            warnings,
            capabilities: { cloudAccounts: summarizeTableCapability(drivesResult.capability) }
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/admin/cloud', async (req, res) => {
    try {
        if (!await isAdmin(req.query.adminId)) return res.json({ success: false, error: 'Admin access required' });
        const { data } = await webSupabase.from('cloud_files').select('*, profiles(email)').order('created_at', { ascending: false }).limit(100);
        res.json({ success: true, files: data || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/drives', async (req, res) => {
    try {
        const { adminId, name, credentialsJson, mainFolderId, sharedDriveId, delegatedUser } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        if (!String(name || '').trim() || !String(credentialsJson || '').trim()) {
            return res.json({ success: false, error: 'Missing drive name or credentials' });
        }

        const parsedCredentials = parseDriveCredentialsString(credentialsJson);
        if (!parsedCredentials.success) {
            return res.json({ success: false, error: parsedCredentials.error || 'Invalid service account JSON' });
        }

        const normalizedCredentials = { ...parsedCredentials.credentials };
        const normalizedFolderId = String(mainFolderId || '').trim();
        const normalizedSharedDriveId = String(sharedDriveId || '').trim();
        const normalizedDelegatedUser = String(delegatedUser || '').trim();

        if (normalizedFolderId) normalizedCredentials.MAIN_FOLDER_ID = normalizedFolderId;
        if (normalizedSharedDriveId) normalizedCredentials.SHARED_DRIVE_ID = normalizedSharedDriveId;
        if (normalizedDelegatedUser) normalizedCredentials.DELEGATED_USER = normalizedDelegatedUser;

        if (!normalizedCredentials?.client_email || !normalizedCredentials?.private_key) {
            return res.json({ success: false, error: 'Invalid service account JSON: client_email/private_key required' });
        }

        const driveProbe = await probeDriveCredentials(normalizedCredentials);

        const capability = await getTableCapability('cloud_accounts');
        if (!capability.available) {
            return res.json({
                success: false,
                error: buildMissingTableMessage('cloud_accounts'),
                capabilities: { cloudAccounts: summarizeTableCapability(capability) }
            });
        }

        const existingCount = await webSupabase.from('cloud_accounts').select('id', { count: 'exact', head: true });
        if (existingCount.error) {
            if (isMissingTableError(existingCount.error, 'cloud_accounts')) {
                const missingCapability = markTableMissing('cloud_accounts', existingCount.error);
                return res.json({
                    success: false,
                    error: buildMissingTableMessage('cloud_accounts'),
                    capabilities: { cloudAccounts: summarizeTableCapability(missingCapability) }
                });
            }
            throw existingCount.error;
        }

        const shouldActivate = Number(existingCount.count || 0) === 0 && driveProbe.ready;
        const inserted = await webSupabase.from('cloud_accounts').insert([{
            name: String(name).trim(),
            credentials_json: JSON.stringify(normalizedCredentials),
            status: shouldActivate ? 'active' : 'inactive',
            is_active: shouldActivate
        }]).select('*').maybeSingle();

        if (inserted.error) {
            if (isMissingTableError(inserted.error, 'cloud_accounts')) {
                const missingCapability = markTableMissing('cloud_accounts', inserted.error);
                return res.json({
                    success: false,
                    error: buildMissingTableMessage('cloud_accounts'),
                    capabilities: { cloudAccounts: summarizeTableCapability(missingCapability) }
                });
            }
            throw inserted.error;
        }
        if (!inserted.data) throw new Error('Failed to create drive record');
        cacheDriveProbe(
            `${String(inserted.data.id)}:${String(inserted.data.updated_at || inserted.data.created_at || '')}`,
            driveProbe
        );

        const drivePayload = mapDriveRows(
            [inserted.data],
            { [String(inserted.data.id)]: driveProbe }
        )[0];

        res.json({
            success: true,
            drive: drivePayload,
            capability: driveProbe,
            warning: driveProbe.ready ? null : driveProbe.message
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/drives/:id/test', async (req, res) => {
    try {
        const adminId = req.query.adminId || req.body.adminId;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });

        const capability = await getTableCapability('cloud_accounts');
        if (!capability.available) {
            return res.json({
                success: false,
                error: buildMissingTableMessage('cloud_accounts'),
                capabilities: { cloudAccounts: summarizeTableCapability(capability) }
            });
        }

        const driveRow = await webSupabase.from('cloud_accounts').select('*').eq('id', req.params.id).maybeSingle();
        if (driveRow.error) throw driveRow.error;
        if (!driveRow.data) return res.json({ success: false, error: 'Drive not found' });

        const probe = await probeDriveAccountRecord(driveRow.data, { forceRefresh: true });
        res.json({
            success: true,
            ready: !!probe.ready,
            capability: probe,
            drive: mapDriveRows([driveRow.data], { [String(driveRow.data.id)]: probe })[0]
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.put('/api/web/admin/drives/:id/active', async (req, res) => {
    try {
        const adminId = req.query.adminId || req.body.adminId;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });

        const capability = await getTableCapability('cloud_accounts');
        if (!capability.available) {
            return res.json({
                success: false,
                error: buildMissingTableMessage('cloud_accounts'),
                capabilities: { cloudAccounts: summarizeTableCapability(capability) }
            });
        }

        const target = await webSupabase.from('cloud_accounts').select('*').eq('id', req.params.id).maybeSingle();
        if (target.error) {
            if (isMissingTableError(target.error, 'cloud_accounts')) {
                const missingCapability = markTableMissing('cloud_accounts', target.error);
                return res.json({
                    success: false,
                    error: buildMissingTableMessage('cloud_accounts'),
                    capabilities: { cloudAccounts: summarizeTableCapability(missingCapability) }
                });
            }
            throw target.error;
        }
        if (!target.data) return res.json({ success: false, error: 'Drive not found' });

        const targetProbe = await probeDriveAccountRecord(target.data, { forceRefresh: true });
        if (!targetProbe.ready) {
            return res.json({
                success: false,
                error: `Cannot activate drive: ${targetProbe.message}`,
                capability: targetProbe
            });
        }

        const activeRowsRes = await webSupabase.from('cloud_accounts').select('*').eq('is_active', true).order('created_at', { ascending: false });
        if (activeRowsRes.error) throw activeRowsRes.error;
        const currentActive = (activeRowsRes.data || []).find(row => String(row.id) !== String(req.params.id)) || null;

        let migrationJob = null;
        if (currentActive) {
            const migrationCapability = await getTableCapability('cloud_migration_jobs');
            if (!migrationCapability.available) {
                return res.json({
                    success: false,
                    error: buildMissingTableMessage('cloud_migration_jobs'),
                    capabilities: { cloudMigrationJobs: summarizeTableCapability(migrationCapability) }
                });
            }

            const filesCountRes = await webSupabase.from('cloud_files')
                .select('id', { count: 'exact', head: true })
                .eq('drive_account_id', currentActive.id);
            if (filesCountRes.error) throw filesCountRes.error;

            migrationJob = await createMigrationJob({
                adminId,
                sourceDriveId: currentActive.id,
                targetDriveId: target.data.id,
                sourceDriveName: currentActive.name,
                targetDriveName: target.data.name,
                totalItems: Number(filesCountRes.count || 0),
                summary: {
                    sourceDriveName: currentActive.name,
                    targetDriveName: target.data.name
                }
            });
        }

        try {
            const reset = await webSupabase.from('cloud_accounts').update({ is_active: false, status: 'inactive' }).neq('id', req.params.id);
            if (reset.error) {
                if (isMissingTableError(reset.error, 'cloud_accounts')) {
                    const missingCapability = markTableMissing('cloud_accounts', reset.error);
                    return res.json({
                        success: false,
                        error: buildMissingTableMessage('cloud_accounts'),
                        capabilities: { cloudAccounts: summarizeTableCapability(missingCapability) }
                    });
                }
                throw reset.error;
            }

            const activated = await webSupabase.from('cloud_accounts')
                .update({ is_active: true, status: 'active' })
                .eq('id', req.params.id)
                .select('*')
                .maybeSingle();

            if (activated.error) {
                if (isMissingTableError(activated.error, 'cloud_accounts')) {
                    const missingCapability = markTableMissing('cloud_accounts', activated.error);
                    return res.json({
                        success: false,
                        error: buildMissingTableMessage('cloud_accounts'),
                        capabilities: { cloudAccounts: summarizeTableCapability(missingCapability) }
                    });
                }
                throw activated.error;
            }

            if (!activated.data) return res.json({ success: false, error: 'Drive not found' });

            if (migrationJob && migrationJob.total_items > 0) {
                queueCloudMigrationJob(migrationJob.id);
            }

            res.json({
                success: true,
                drive: mapDriveRows([activated.data], { [String(activated.data.id)]: targetProbe })[0],
                capability: targetProbe,
                migrationJob
            });
        } catch (activateError) {
            if (migrationJob?.id) {
                try {
                    await updateMigrationJob(migrationJob.id, {
                        status: 'failed',
                        current_step: 'failed',
                        last_error: activateError.message,
                        completed_at: new Date().toISOString(),
                        summary_json: {
                            ...sanitizeMigrationSummary(migrationJob.summary || {}),
                            lastItemError: activateError.message
                        }
                    });
                } catch (jobError) {
                    console.error('Failed to mark migration job as failed after activation error:', jobError.message);
                }
            }
            throw activateError;
        }
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/web/admin/drives/:id', async (req, res) => {
    try {
        const adminId = req.query.adminId || req.body.adminId;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });

        const capability = await getTableCapability('cloud_accounts');
        if (!capability.available) {
            return res.json({
                success: false,
                error: buildMissingTableMessage('cloud_accounts'),
                capabilities: { cloudAccounts: summarizeTableCapability(capability) }
            });
        }

        const fileCountRes = await webSupabase.from('cloud_files')
            .select('id', { count: 'exact', head: true })
            .eq('drive_account_id', req.params.id);
        if (fileCountRes.error) throw fileCountRes.error;
        if (Number(fileCountRes.count || 0) > 0) {
            return res.json({
                success: false,
                error: `Drive still has ${Number(fileCountRes.count || 0)} file(s). Migrate them first before deleting the drive.`
            });
        }

        const deleted = await webSupabase.from('cloud_accounts')
            .delete()
            .eq('id', req.params.id)
            .select('id, is_active')
            .maybeSingle();

        if (deleted.error) {
            if (isMissingTableError(deleted.error, 'cloud_accounts')) {
                const missingCapability = markTableMissing('cloud_accounts', deleted.error);
                return res.json({
                    success: false,
                    error: buildMissingTableMessage('cloud_accounts'),
                    capabilities: { cloudAccounts: summarizeTableCapability(missingCapability) }
                });
            }
            throw deleted.error;
        }
        if (!deleted.data) return res.json({ success: false, error: 'Drive not found' });

        if (deleted.data.is_active === true) {
            const replacementRows = await webSupabase.from('cloud_accounts').select('*').order('created_at', { ascending: true });
            if (replacementRows.error) throw replacementRows.error;

            const orderedRows = replacementRows.data || [];
            for (const candidate of orderedRows) {
                const probe = await probeDriveAccountRecord(candidate);
                if (!probe.ready) continue;

                const activateReplacement = await webSupabase.from('cloud_accounts')
                    .update({ is_active: true, status: 'active' })
                    .eq('id', candidate.id);
                if (activateReplacement.error) throw activateReplacement.error;
                break;
            }
        }

        res.json({ success: true, deletedId: deleted.data.id });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/web/admin/cloud/:id', async (req, res) => {
    try {
        const { adminId } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        const { data: file } = await webSupabase.from('cloud_files').select('*').eq('id', req.params.id).single();
        let deleteWarning = null;
        if (file && file.drive_file_id !== 'folder') {
            const driveData = await getGoogleOAuthDriveContext(file.user_id);
            if (!driveData.available) {
                return res.status(driveData.httpStatus || 409).json({ success: false, ...driveData });
            }
            const providerDeleteError = await safeDeleteDriveFile(driveData, file.drive_file_id);
            if (providerDeleteError) {
                deleteWarning = buildCloudErrorPayload(providerDeleteError, 'Failed to delete file from storage provider').error;
            }
        }
        await webSupabase.from('cloud_files').delete().eq('id', req.params.id);
        const responsePayload = { success: true };
        if (deleteWarning) responsePayload.warning = deleteWarning;
        res.json(responsePayload);
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/cloud/migrate', async (req, res) => {
    try {
        const { adminId, sourceDriveId, targetDriveId } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        if (!sourceDriveId || !targetDriveId) return res.json({ success: false, error: 'Missing drive IDs' });

        if (String(sourceDriveId) === String(targetDriveId)) {
            return res.json({ success: false, error: 'Source and target drive are the same' });
        }

        const accountsCapability = await getTableCapability('cloud_accounts');
        if (!accountsCapability.available) {
            return res.json({
                success: false,
                error: buildMissingTableMessage('cloud_accounts'),
                capabilities: { cloudAccounts: summarizeTableCapability(accountsCapability) }
            });
        }

        const migrationCapability = await getTableCapability('cloud_migration_jobs');
        if (!migrationCapability.available) {
            return res.json({
                success: false,
                error: buildMissingTableMessage('cloud_migration_jobs'),
                capabilities: { cloudMigrationJobs: summarizeTableCapability(migrationCapability) }
            });
        }

        const source = await webSupabase.from('cloud_accounts').select('*').eq('id', sourceDriveId).maybeSingle();
        if (source.error) throw source.error;
        if (!source.data) return res.json({ success: false, error: 'Source drive not found' });

        const target = await webSupabase.from('cloud_accounts').select('*').eq('id', targetDriveId).maybeSingle();
        if (target.error) throw target.error;
        if (!target.data) return res.json({ success: false, error: 'Target drive not found' });

        const sourceProbe = await probeDriveAccountRecord(source.data, { forceRefresh: true });
        if (!sourceProbe.ready) {
            return res.json({
                success: false,
                error: `Source drive not ready: ${sourceProbe.message}`,
                capability: sourceProbe
            });
        }

        const targetProbe = await probeDriveAccountRecord(target.data, { forceRefresh: true });
        if (!targetProbe.ready) {
            return res.json({
                success: false,
                error: `Target drive not ready: ${targetProbe.message}`,
                capability: targetProbe
            });
        }

        const filesCountRes = await webSupabase.from('cloud_files')
            .select('id', { count: 'exact', head: true })
            .eq('drive_account_id', sourceDriveId);
        if (filesCountRes.error) throw filesCountRes.error;

        const migrationJob = await createMigrationJob({
            adminId,
            sourceDriveId,
            targetDriveId,
            sourceDriveName: source.data.name,
            targetDriveName: target.data.name,
            totalItems: Number(filesCountRes.count || 0),
            summary: {
                sourceDriveName: source.data.name,
                targetDriveName: target.data.name
            }
        });

        if (migrationJob.total_items > 0) {
            queueCloudMigrationJob(migrationJob.id);
        }

        res.json({
            success: true,
            message: migrationJob.total_items > 0
                ? `Migration queued for ${migrationJob.total_items} file(s).`
                : 'No migratable files found. Migration completed immediately.',
            job: migrationJob
        });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/admin/inventory', async (req, res) => {
    try {
        if (!await isAdmin(req.query.adminId)) return res.json({ success: false, error: 'Admin access required' });
        const inventory = await listAdminCollection('inventory');
        res.json({ success: true, inventory: inventory.items || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/inventory', async (req, res) => {
    try {
        const { adminId, platform, email, password } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        if (!platform || !email || !password) return res.json({ success: false, error: 'Missing fields' });

        const created = await createAdminCollectionItem('inventory', {
            platform,
            email,
            password,
            status: 'available'
        });
        res.json({ success: true, item: created.item, source: created.source });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/web/admin/inventory/:id', async (req, res) => {
    try {
        const adminId = req.query.adminId || req.body.adminId;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        const deleted = await deleteAdminCollectionItem('inventory', req.params.id);
        if (!deleted.deleted) return res.json({ success: false, error: 'Inventory item not found' });
        res.json({ success: true, source: deleted.source });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/admin/nodes', async (req, res) => {
    try {
        if (!await isAdmin(req.query.adminId)) return res.json({ success: false, error: 'Admin access required' });
        const nodes = await listAdminCollection('nodes');
        res.json({ success: true, nodes: nodes.items || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/nodes', async (req, res) => {
    try {
        const { adminId, name, fqdn, memory, disk, plta_key } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        if (!name || !fqdn || !plta_key) return res.json({ success: false, error: 'Missing fields' });

        const created = await createAdminCollectionItem('nodes', {
            name,
            fqdn,
            memory: Number(memory || 2048),
            disk: Number(disk || 10240),
            plta_key
        });
        res.json({ success: true, node: created.item, source: created.source });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/web/admin/nodes/:id', async (req, res) => {
    try {
        const adminId = req.query.adminId || req.body.adminId;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        const deleted = await deleteAdminCollectionItem('nodes', req.params.id);
        if (!deleted.deleted) return res.json({ success: false, error: 'Node not found' });
        res.json({ success: true, source: deleted.source });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/web/admin/eggs', async (req, res) => {
    try {
        if (!await isAdmin(req.query.adminId)) return res.json({ success: false, error: 'Admin access required' });
        const eggs = await listAdminCollection('eggs');
        res.json({ success: true, eggs: eggs.items || [] });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.post('/api/web/admin/eggs', async (req, res) => {
    try {
        const { adminId, name, description, egg_id, nest_id, color } = req.body;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        if (!name || !egg_id || !nest_id) return res.json({ success: false, error: 'Missing fields' });

        const created = await createAdminCollectionItem('eggs', {
            name,
            description: description || '',
            egg_id: Number(egg_id),
            nest_id: Number(nest_id),
            color: color || '#0ea5e9'
        });
        res.json({ success: true, egg: created.item, source: created.source });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

app.delete('/api/web/admin/eggs/:id', async (req, res) => {
    try {
        const adminId = req.query.adminId || req.body.adminId;
        if (!await isAdmin(adminId)) return res.json({ success: false, error: 'Admin access required' });
        const deleted = await deleteAdminCollectionItem('eggs', req.params.id);
        if (!deleted.deleted) return res.json({ success: false, error: 'Egg not found' });
        res.json({ success: true, source: deleted.source });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});



const tempMailSessions = new Map();
let cachedGeneratorDomains = [];
let domainCacheTime = 0;

function generateRandomString(length = 10) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function isValidDomain(domain) {
    if (!domain || typeof domain !== 'string') return false;
    const d = domain.trim().toLowerCase();
    if (d.length < 4 || d.length > 50) return false;
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;
    if (!domainRegex.test(d)) return false;
    const blocked = ['generator', 'google', 'facebook', 'twitter', 'jquery', 'bootstrap', 'localhost', 'example'];
    if (blocked.some(b => d.includes(b))) return false;
    return true;
}

app.get('/api/tempmail/domains', async (req, res) => {
    try {
        const axios = require('axios');
        const cheerio = require('cheerio');

        const now = Date.now();
        if (cachedGeneratorDomains.length > 0 && (now - domainCacheTime) < 2 * 60 * 1000) {
            return res.json({ success: true, domains: cachedGeneratorDomains, cached: true });
        }

        console.log('[TempMail] Scraping domains from generator.email...');

        const response = await axios.get('https://generator.email/', {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Cache-Control': 'no-cache'
            }
        });

        const $ = cheerio.load(response.data);
        const domains = [];

        $('select#domain option, .domain-list a, .domains a').each((i, el) => {
            const domain = $(el).text().trim() || $(el).attr('value');
            if (domain && isValidDomain(domain)) {
                domains.push(domain);
            }
        });

        if (domains.length > 0) {
            cachedGeneratorDomains = domains;
            domainCacheTime = now;
        }

        res.json({ success: true, domains: domains, cached: false });
    } catch (error) {
        console.error('Domains error:', error.message);
        res.json({ success: false, error: 'Gagal mendapatkan domains.', domains: [] });
    }
});

app.get('/api/tempmail/read/:id', async (req, res) => {
    const { sessionId } = req.query;
    const messageId = req.params.id;

    if (!sessionId || !tempMailSessions.has(sessionId)) {
        return res.json({ success: false, error: 'Session tidak sah. Sila generate email baru dengan /tempmail' });
    }

    const session = tempMailSessions.get(sessionId);

    try {
        const axios = require('axios');
        const cheerio = require('cheerio');

        if (session.provider === 'generator') {
            const emailUrl = 'https://generator.email/' + (session.username) + '@' + (session.domain) + '/' + (messageId) + '';
            console.log('[TempMail] Reading message from:', emailUrl);

            const response = await axios.get(emailUrl, {
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            const $ = cheerio.load(response.data);
            const body = $('.e7m.mess_bodiyy, .email-body, .message-body, .mail-body, article, .content').first().html() ||
                $('body').html() || 'Email content not found';

            return res.json({
                success: true,
                id: messageId,
                body: body,
                provider: 'generator'
            });
        }

        const response = await axios.get('https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=' + (messageId) + '&sid_token=' + (session.sidToken) + '', {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        res.json({
            success: true,
            id: messageId,
            from: response.data.mail_from || 'Unknown',
            subject: response.data.mail_subject || 'No Subject',
            body: response.data.mail_body || 'No content',
            date: response.data.mail_date || 'Unknown'
        });
    } catch (error) {
        console.error('Read mail error:', error.message);
        res.json({ success: false, error: 'Gagal membaca email.' });
    }
});

app.get('/api/tempnum/messages', async (req, res) => {
    const { number } = req.query;

    if (!number) {
        return res.json({ success: false, error: 'Nombor telefon diperlukan' });
    }

    const cleanNumber = number.replace(/[^\d]/g, '');
    const detectedCountry = detectCountryFromNumber(number);
    const countryInfo = countryPrefixes[detectedCountry] || countryPrefixes['us'];

    try {
        const axios = require('axios');
        const cheerio = require('cheerio');

        const messages = [];

        const sources = [
            'https://receive-smss.com/sms/' + (cleanNumber) + '/',
            'https://www.receivesms.co/us-phone-number/' + (cleanNumber) + '/',
            'https://smsreceivefree.com/info/' + (cleanNumber) + '/'
        ];

        for (const sourceUrl of sources) {
            try {
                const response = await axios.get(sourceUrl, {
                    timeout: 12000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    }
                });

                const $ = cheerio.load(response.data);

                $('div.message_details, div.row.message_details').each((i, el) => {
                    const msgEl = $(el).find('.msgg span, .msgg').first();
                    const senderEl = $(el).find('.senderr a, .senderr span, .senderr').first();
                    const timeEl = $(el).find('.time').first();

                    let message = msgEl.text().replace(/^Message/i, '').trim();
                    let from = senderEl.text().replace(/^Sender/i, '').trim();
                    let time = timeEl.text().replace(/^Time/i, '').trim() || 'Just now';

                    if (message && message.length > 3 && from && !messages.find(m => m.message === message)) {
                        messages.push({
                            from: from.substring(0, 50),
                            message: message.substring(0, 500),
                            time: time,
                            country: countryInfo.name
                        });
                    }
                });

                $('table tbody tr').each((i, el) => {
                    const cells = $(el).find('td');
                    if (cells.length >= 2) {
                        let from = $(cells[0]).text().replace(/^Sender/i, '').trim();
                        let message = $(cells[1]).text().replace(/^Message/i, '').trim();
                        let time = cells.length >= 3 ? $(cells[2]).text().replace(/^Time/i, '').trim() : 'Just now';

                        if (message && message.length > 3 && from && !messages.find(m => m.message === message)) {
                            if (from.toLowerCase() === 'contact us' || message.includes('Privacy Policy')) return;

                            messages.push({
                                from: from.substring(0, 50),
                                message: message.substring(0, 500),
                                time: time,
                                country: countryInfo.name
                            });
                        }
                    }
                });

                if (messages.length > 0) break;
            } catch (e) {
                continue;
            }
        }

        res.json({
            success: true,
            number: number,
            country: countryInfo.name,
            flag: countryInfo.flag,
            count: messages.length,
            messages: messages.slice(0, 50),
            note: messages.length === 0 ? 'Tiada SMS terbaru. Cuba sebentar lagi atau pilih nombor lain.' : null
        });
    } catch (error) {
        res.json({ success: false, error: error.message, messages: [] });
    }
});

app.get('/api/tempnum2/numbers', async (req, res) => {
    const { country } = req.query;

    try {
        const axios = require('axios');
        const cheerio = require('cheerio');

        const response = await axios.get('https://smsreceivefree.com/', {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const numbers = [];

        $('a[href*="/info/"]').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            const phoneMatch = text.match(/\+?\d[\d\s-]{6,}/);

            if (phoneMatch) {
                const phoneNumber = phoneMatch[0].replace(/[^\d+]/g, '');
                if (phoneNumber.length >= 7) {
                    numbers.push({
                        number: phoneNumber,
                        country: 'US',
                        flag: '',
                        link: 'https://smsreceivefree.com' + (href) + ''
                    });
                }
            }
        });

        res.json({
            success: true,
            count: numbers.length,
            numbers: numbers.slice(0, 20)
        });
    } catch (error) {
        res.json({ success: false, error: error.message, numbers: [] });
    }
});


app.get('/api/console/dashboard', (req, res) => {
    logger.logFunction('getDashboard', {}, true);
    const report = logger.getFullReport();
    res.json({ success: true, ...report });
});

app.get('/api/console/methods', (req, res) => {
    logger.logFunction('getMethodsStats', {}, true);
    const stats = logger.getMethodsStats();
    res.json({ success: true, ...stats });
});

app.get('/api/console/activities', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    logger.logFunction('getActivities', { limit }, true);
    const activities = logger.getActivityStats();
    res.json({ success: true, ...activities });
});

app.get('/api/console/attacks', (req, res) => {
    logger.logFunction('getAttackStats', {}, true);
    const attacks = logger.getAttackStats();
    res.json({ success: true, ...attacks });
});

app.get('/api/console/functions', (req, res) => {
    logger.logFunction('getFunctionsStats', {}, true);
    const functions = logger.getFunctionsStats();
    res.json({ success: true, ...functions });
});

app.post('/api/sql/execute', verifyAuth, async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.json({ success: false, error: 'SQL query is required' });
    }

    const dangerousKeywords = ['DROP DATABASE', 'DROP SCHEMA'];
    const upperQuery = query.toUpperCase().trim();

    for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword) && req.user.role !== 'owner') {
            return res.json({
                success: false,
                error: 'Dangerous operation "' + (keyword) + '" requires owner privileges'
            });
        }
    }

    try {
        const supabaseDB = require('./database/supabase');

        if (!supabaseDB.isConfigured()) {
            return res.json({
                success: false,
                error: 'Database Supabase tidak dikonfigurasi'
            });
        }

        const result = await supabaseDB.executeRawSQL(query);

        logger.logActivity('SQL_EXECUTE', {
            query: query.substring(0, 100),
            success: result.success
        }, req.user.username);

        res.json(result);
    } catch (error) {
        logger.logError('SQL_EXECUTE', error);
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/sql/tables', verifyAuth, async (req, res) => {
    try {
        const supabaseDB = require('./database/supabase');

        if (!supabaseDB.isConfigured()) {
            return res.json({
                success: false,
                error: 'Database tidak dikonfigurasi'
            });
        }

        const { supabase } = supabaseDB;
        const tables = ['users', 'tiers', 'premium_users', 'admin_users', 'channels', 'server_access', 'created_users', 'user_activity', 'node_settings', 'transactions'];

        res.json({
            success: true,
            data: tables.map(t => ({ table_name: t, table_type: 'BASE TABLE' }))
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/sql/schema/:table', verifyAuth, async (req, res) => {
    try {
        const { table } = req.params;
        const supabaseDB = require('./database/supabase');

        if (!supabaseDB.isConfigured()) {
            return res.json({
                success: false,
                error: 'Database tidak dikonfigurasi'
            });
        }

        const { supabase } = supabaseDB;
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

        if (error) {
            return res.json({ success: false, error: error.message });
        }

        const columns = data && data[0] ? Object.keys(data[0]).map(col => ({
            column_name: col,
            data_type: typeof data[0][col],
            is_nullable: 'YES',
            column_default: null
        })) : [];

        res.json({ success: true, data: columns });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/sql/query/:table', verifyAuth, async (req, res) => {
    try {
        const { table } = req.params;
        const limit = parseInt(req.query.limit) || 100;
        const supabaseDB = require('./database/supabase');

        if (!supabaseDB.isConfigured()) {
            return res.json({ success: false, error: 'Database tidak dikonfigurasi' });
        }

        const { supabase } = supabaseDB;
        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .limit(limit);

        if (error) {
            return res.json({ success: false, error: error.message });
        }

        res.json({ success: true, data: data, rowCount: count || data.length });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

const apiServers = new Map();
let nextApiPort = 6000;

app.post('/api/auto-server/create', verifyAuth, async (req, res) => {
    const { serverName } = req.body;
    const name = serverName || 'api-server-' + (Date.now()) + '';

    try {
        const serverDir = path.join(__dirname, 'api-servers', name);
        const sourceDir = path.join(__dirname, 'attached_assets', 'apipanel_temp');

        if (!fs.existsSync(sourceDir)) {
            return res.json({
                success: false,
                error: 'Source files tidak dijumpai. Sila upload apispanel zip terlebih dahulu.'
            });
        }

        if (!fs.existsSync(path.join(__dirname, 'api-servers'))) {
            fs.mkdirSync(path.join(__dirname, 'api-servers'), { recursive: true });
        }

        if (fs.existsSync(serverDir)) {
            return res.json({
                success: false,
                error: 'Server dengan nama "' + (name) + '" sudah wujud.'
            });
        }

        fs.mkdirSync(serverDir, { recursive: true });

        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
            const srcPath = path.join(sourceDir, file);
            const destPath = path.join(serverDir, file);
            fs.copyFileSync(srcPath, destPath);
        }

        const assignedPort = nextApiPort++;

        const pkgPath = path.join(serverDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            let pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            pkgContent.name = name;
            fs.writeFileSync(pkgPath, JSON.stringify(pkgContent, null, 2));
        }

        const apiJsPath = path.join(serverDir, 'api.js');
        if (fs.existsSync(apiJsPath)) {
            let apiContent = fs.readFileSync(apiJsPath, 'utf-8');
            apiContent = apiContent.replace(
                /const port = process\.env\.PORT \|\| process\.env\.SERVER_PORT \|\| \d+;/,
                'const port = ' + (assignedPort) + ';'
            );
            fs.writeFileSync(apiJsPath, apiContent);
        }

        res.json({
            success: true,
            message: 'Server sedang dibuat. Sila tunggu untuk npm install...',
            serverName: name,
            port: assignedPort,
            status: 'installing'
        });

        exec('cd "' + (serverDir) + '" && npm install', { timeout: 300000 }, (installErr, installStdout, installStderr) => {
            if (installErr) {
                console.log('[' + (name) + '] npm install error:', installErr.message);
                apiServers.set(name, { status: 'install_failed', error: installErr.message, port: assignedPort, dir: serverDir });
                return;
            }

            console.log('[' + (name) + '] npm install selesai, starting server...');

            const serverProcess = spawn('node', ['api.js'], {
                cwd: serverDir,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: true,
                env: { ...process.env, PORT: assignedPort.toString() }
            });

            serverProcess.stdout.on('data', (data) => {
                console.log('[' + (name) + '] stdout:', data.toString());
            });

            serverProcess.stderr.on('data', (data) => {
                console.log('[' + (name) + '] stderr:', data.toString());
            });

            serverProcess.on('error', (err) => {
                console.log('[' + (name) + '] Process error:', err.message);
                apiServers.set(name, { status: 'error', error: err.message, port: assignedPort, dir: serverDir });
            });

            serverProcess.on('exit', (code) => {
                console.log('[' + (name) + '] Process exited with code:', code);
                const current = apiServers.get(name);
                if (current) {
                    current.status = 'stopped';
                    current.exitCode = code;
                }
            });

            const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co';

            apiServers.set(name, {
                status: 'running',
                port: assignedPort,
                dir: serverDir,
                pid: serverProcess.pid,
                process: serverProcess,
                startedAt: Date.now(),
                endpoint: 'http://localhost:' + (assignedPort) + '/auren'
            });

            console.log('[' + (name) + '] Server started on port ' + (assignedPort) + '');
        });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/auto-server/status/:name', verifyAuth, (req, res) => {
    const { name } = req.params;
    const serverInfo = apiServers.get(name);

    if (!serverInfo) {
        return res.json({ success: false, error: 'Server tidak dijumpai' });
    }

    res.json({
        success: true,
        name: name,
        status: serverInfo.status,
        port: serverInfo.port,
        endpoint: serverInfo.endpoint,
        startedAt: serverInfo.startedAt,
        error: serverInfo.error
    });
});

app.get('/api/auto-server/list', verifyAuth, (req, res) => {
    const servers = [];
    for (const [name, info] of apiServers.entries()) {
        servers.push({
            name: name,
            status: info.status,
            port: info.port,
            endpoint: info.endpoint,
            startedAt: info.startedAt
        });
    }
    res.json({ success: true, servers: servers });
});

app.post('/api/auto-server/stop/:name', verifyAuth, (req, res) => {
    const { name } = req.params;
    const serverInfo = apiServers.get(name);

    if (!serverInfo) {
        return res.json({ success: false, error: 'Server tidak dijumpai' });
    }

    if (serverInfo.process) {
        try {
            process.kill(-serverInfo.pid, 'SIGTERM');
        } catch (e) {
            try {
                serverInfo.process.kill('SIGTERM');
            } catch (e2) { }
        }
    }

    serverInfo.status = 'stopped';
    res.json({ success: true, message: 'Server ' + (name) + ' telah dihentikan' });
});

app.post('/api/auto-server/restart/:name', verifyAuth, (req, res) => {
    const { name } = req.params;
    const serverInfo = apiServers.get(name);

    if (!serverInfo) {
        return res.json({ success: false, error: 'Server tidak dijumpai' });
    }

    if (serverInfo.process) {
        try {
            process.kill(-serverInfo.pid, 'SIGTERM');
        } catch (e) {
            try {
                serverInfo.process.kill('SIGTERM');
            } catch (e2) { }
        }
    }

    setTimeout(() => {
        const serverProcess = spawn('node', ['api.js'], {
            cwd: serverInfo.dir,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: true,
            env: { ...process.env, PORT: serverInfo.port.toString() }
        });

        serverProcess.stdout.on('data', (data) => {
            console.log('[' + (name) + '] stdout:', data.toString());
        });

        serverProcess.stderr.on('data', (data) => {
            console.log('[' + (name) + '] stderr:', data.toString());
        });

        serverInfo.status = 'running';
        serverInfo.process = serverProcess;
        serverInfo.pid = serverProcess.pid;
        serverInfo.startedAt = Date.now();

        res.json({ success: true, message: 'Server ' + (name) + ' telah dimulakan semula' });
    }, 1000);
});

app.delete('/api/auto-server/:name', verifyAuth, (req, res) => {
    const { name } = req.params;
    const serverInfo = apiServers.get(name);

    if (!serverInfo) {
        return res.json({ success: false, error: 'Server tidak dijumpai' });
    }

    if (serverInfo.process) {
        try {
            process.kill(-serverInfo.pid, 'SIGTERM');
        } catch (e) {
            try {
                serverInfo.process.kill('SIGTERM');
            } catch (e2) { }
        }
    }

    try {
        fs.rmSync(serverInfo.dir, { recursive: true, force: true });
    } catch (e) {
        console.log('Error removing server dir: ' + (e.message) + '');
    }

    apiServers.delete(name);
    res.json({ success: true, message: 'Server ' + (name) + ' telah dipadam' });
});

app.post('/api/auto-server/upload-zip', verifyAuth, async (req, res) => {
    try {
        const AdmZip = require('adm-zip');
        const { zipPath, serverName } = req.body;

        if (!zipPath) {
            return res.json({ success: false, error: 'Sila nyatakan path ke zip file' });
        }

        const fullZipPath = path.join(__dirname, zipPath);
        if (!fs.existsSync(fullZipPath)) {
            return res.json({ success: false, error: 'Zip file tidak dijumpai' });
        }

        const name = serverName || 'api-server-' + (Date.now()) + '';
        const serverDir = path.join(__dirname, 'api-servers', name);

        if (!fs.existsSync(path.join(__dirname, 'api-servers'))) {
            fs.mkdirSync(path.join(__dirname, 'api-servers'), { recursive: true });
        }

        fs.mkdirSync(serverDir, { recursive: true });

        const zip = new AdmZip(fullZipPath);
        zip.extractAllTo(serverDir, true);

        const assignedPort = nextApiPort++;

        res.json({
            success: true,
            message: 'Zip file telah di-extract. Gunakan /api/auto-server/install untuk install modules.',
            serverName: name,
            port: assignedPort,
            serverDir: serverDir
        });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/plan-limits', verifyAuth, (req, res) => {
    const user = req.user;
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    res.json({ success: true, limits: PLAN_LIMITS });
});

app.post('/api/plan-limits', verifyAuth, (req, res) => {
    const user = req.user;
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { free, pro, owner } = req.body;

    if (free && free.maxDuration) {
        PLAN_LIMITS.free.maxDuration = parseInt(free.maxDuration) || 60;
    }
    if (pro && pro.maxDuration) {
        PLAN_LIMITS.pro.maxDuration = parseInt(pro.maxDuration) || 300;
    }
    if (owner && owner.maxDuration) {
        PLAN_LIMITS.owner.maxDuration = parseInt(owner.maxDuration) || 600;
    }

    savePlanLimits();

    res.json({ success: true, message: 'Plan limits updated', limits: PLAN_LIMITS });
});

app.get('/api/users', verifyAuth, (req, res) => {
    const user = req.user;
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const webUsers = settings.webUsers || [];
    const users = webUsers.map(u => ({
        username: u.username,
        role: u.role
    }));

    res.json({ success: true, users });
});

app.post('/api/users/role', verifyAuth, (req, res) => {
    const user = req.user;
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { username, newRole } = req.body;
    if (!username || !newRole) {
        return res.json({ success: false, error: 'Username and newRole required' });
    }

    const validRoles = ['free', 'pro', 'owner', 'admin'];
    if (!validRoles.includes(newRole)) {
        return res.json({ success: false, error: 'Invalid role' });
    }

    const userIndex = settings.webUsers.findIndex(u => u.username === username);
    if (userIndex === -1) {
        return res.json({ success: false, error: 'User not found' });
    }

    settings.webUsers[userIndex].role = newRole;

    try {
        const settingsContent = fs.readFileSync(path.join(__dirname, 'settings.js'), 'utf-8');
        const updatedContent = settingsContent.replace(
            /"webUsers":\s*\[[\s\S]*?\]/,
            '"webUsers": ' + (JSON.stringify(settings.webUsers, null, 4)) + ''
        );
        fs.writeFileSync(path.join(__dirname, 'settings.js'), updatedContent);
    } catch (err) {
        console.log('Failed to persist user role:', err.message);
    }

    res.json({ success: true, message: 'User ' + (username) + ' role updated to ' + (newRole) + '' });
});

app.delete('/api/users/:username', verifyAuth, (req, res) => {
    const user = req.user;
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { username } = req.params;

    const userIndex = settings.webUsers.findIndex(u => u.username === username);
    if (userIndex === -1) {
        return res.json({ success: false, error: 'User not found' });
    }

    if (settings.webUsers[userIndex].role === 'owner') {
        return res.json({ success: false, error: 'Cannot delete owner account' });
    }

    settings.webUsers.splice(userIndex, 1);

    try {
        const settingsContent = fs.readFileSync(path.join(__dirname, 'settings.js'), 'utf-8');
        const updatedContent = settingsContent.replace(
            /"webUsers":\s*\[[\s\S]*?\]/,
            '"webUsers": ' + (JSON.stringify(settings.webUsers, null, 4)) + ''
        );
        fs.writeFileSync(path.join(__dirname, 'settings.js'), updatedContent);
    } catch (err) {
        console.log('Failed to persist user deletion:', err.message);
    }

    res.json({ success: true, message: 'User ' + (username) + ' deleted' });
});

async function getPanelConfigs() {
    const dbPanels = await supabaseDB.getPanelConfigsFromDB();
    if (dbPanels && dbPanels.length > 0) {
        return dbPanels;
    }

    const panels = [];
    if (settings.domain && settings.domain !== "-" && settings.pltc) {
        panels.push({ id: 1, domain: settings.domain, clientKey: settings.pltc, apiKey: settings.plta, name: 'Panel 1' });
    }
    if (settings.domain2 && settings.domain2 !== "-" && settings.pltc2) {
        panels.push({ id: 2, domain: settings.domain2, clientKey: settings.pltc2, apiKey: settings.plta2, name: 'Panel 2' });
    }
    if (settings.domain3 && settings.domain3 !== "-" && settings.pltc3) {
        panels.push({ id: 3, domain: settings.domain3, clientKey: settings.pltc3, apiKey: settings.plta3, name: 'Panel 3' });
    }
    return panels;
}

async function fetchPteroServers(clientKey, domain) {
    try {
        const response = await axios.get('' + (domain) + '/api/client', {
            headers: {
                Authorization: 'Bearer ' + (clientKey) + '',
                Accept: "Application/vnd.pterodactyl.v1+json",
            },
            timeout: 30000
        });
        return response.data.data || [];
    } catch (err) {
        console.error("Error fetching servers from", domain, ":", err.message);
        return [];
    }
}

async function fetchServerResources(domain, clientKey, serverIdentifier) {
    try {
        const response = await axios.get('' + (domain) + '/api/client/servers/' + (serverIdentifier) + '/resources', {
            headers: {
                Authorization: 'Bearer ' + (clientKey) + '',
                Accept: "Application/vnd.pterodactyl.v1+json",
            },
            timeout: 15000
        });
        return response.data.attributes || {};
    } catch (err) {
        return { current_state: 'unknown' };
    }
}

async function fetchPteroNodes(apiKey, domain) {
    try {
        const response = await axios.get('' + (domain) + '/api/application/nodes?include=servers,allocations', {
            headers: {
                Authorization: 'Bearer ' + (apiKey) + '',
                Accept: "Application/vnd.pterodactyl.v1+json",
            },
            timeout: 30000
        });
        return response.data.data || [];
    } catch (err) {
        console.error("Error fetching nodes from", domain, ":", err.message);
        return [];
    }
}

app.get('/api/dashboard/stats', verifyAuth, async (req, res) => {
    try {
        const panels = getPanelConfigs();
        let totalServers = 0;
        let onlineServers = 0;
        let activeNodes = 0;

        for (const panel of panels) {
            const servers = await fetchPteroServers(panel.clientKey, panel.domain);
            totalServers += servers.length;

            for (const server of servers) {
                const resources = await fetchServerResources(panel.domain, panel.clientKey, server.attributes.identifier);
                if (resources.current_state === 'running') {
                    onlineServers++;
                }
            }

            if (panel.apiKey && panel.apiKey !== '-') {
                const nodes = await fetchPteroNodes(panel.apiKey, panel.domain);
                activeNodes += nodes.filter(n => n.attributes?.maintenance_mode === false).length;
            }
        }

        const dbStats = await supabaseDB.getDashboardStats();

        res.json({
            totalServers,
            onlineServers,
            activeNodes,
            totalUsers: dbStats.totalUsers || 0,
            premiumUsers: dbStats.premiumUsers || 0,
            adminUsers: dbStats.adminUsers || 0,
            totalPanels: dbStats.totalPanels || 0
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.json({ totalServers: 0, onlineServers: 0, activeNodes: 0, totalUsers: 0, premiumUsers: 0, adminUsers: 0, totalPanels: 0 });
    }
});

app.get('/api/dashboard/servers', verifyAuth, async (req, res) => {
    try {
        const panels = getPanelConfigs();
        const limit = parseInt(req.query.limit) || 100;
        const allServers = [];

        for (const panel of panels) {
            const servers = await fetchPteroServers(panel.clientKey, panel.domain);

            for (const server of servers) {
                const attr = server.attributes;
                const resources = await fetchServerResources(panel.domain, panel.clientKey, attr.identifier);

                let status = 'offline';
                if (resources.current_state === 'running') status = 'running';
                else if (resources.current_state === 'starting') status = 'starting';
                else if (resources.current_state === 'stopping') status = 'stopping';

                const cpuPercent = resources.resources?.cpu_absolute || 0;
                const memBytes = resources.resources?.memory_bytes || 0;
                const memLimit = attr.limits?.memory || 1024;
                const memPercent = memLimit > 0 ? Math.round((memBytes / (memLimit * 1024 * 1024)) * 100) : 0;
                const diskBytes = resources.resources?.disk_bytes || 0;
                const diskLimit = attr.limits?.disk || 1024;
                const diskPercent = diskLimit > 0 ? Math.round((diskBytes / (diskLimit * 1024 * 1024)) * 100) : 0;

                allServers.push({
                    id: attr.internal_id || attr.id,
                    identifier: attr.identifier,
                    name: attr.name,
                    status,
                    cpu: Math.round(cpuPercent),
                    memory: Math.min(memPercent, 100),
                    disk: Math.min(diskPercent, 100),
                    node: panel.name,
                    panelId: panel.id,
                    panelDomain: panel.domain
                });
            }
        }

        res.json({ servers: allServers.slice(0, limit) });
    } catch (err) {
        console.error('Error fetching servers:', err);
        res.json({ servers: [] });
    }
});

app.get('/api/dashboard/nodes', verifyAuth, async (req, res) => {
    try {
        const panels = getPanelConfigs();
        const allNodes = [];

        for (const panel of panels) {
            if (!panel.apiKey || panel.apiKey === '-') continue;

            const nodes = await fetchPteroNodes(panel.apiKey, panel.domain);
            const nodeSettings = await supabaseDB.getAllNodeSettings(panel.id);

            for (const node of nodes) {
                const attr = node.attributes;
                const serverCount = attr.relationships?.servers?.data?.length || 0;
                const allocations = attr.relationships?.allocations?.data || [];
                const totalSlots = allocations.length;
                const usedSlots = allocations.filter(a => a.attributes?.assigned).length;
                const freeSlots = totalSlots - usedSlots;

                const setting = nodeSettings.find(s => s.node_id === attr.id);
                const isActive = setting ? setting.is_active : true;
                const isUnlis = setting ? setting.is_unlis : false;

                let status = 'online';
                if (attr.maintenance_mode) status = 'maintenance';
                else if (!isActive) status = 'inactive';
                else if (freeSlots === 0) status = 'full';

                allNodes.push({
                    id: attr.id,
                    name: attr.name,
                    fqdn: attr.fqdn,
                    status,
                    isActive,
                    isUnlis,
                    servers: serverCount,
                    totalSlots,
                    usedSlots,
                    freeSlots,
                    memory: Math.round((attr.allocated_resources?.memory || 0) / (attr.memory || 1) * 100),
                    disk: Math.round((attr.allocated_resources?.disk || 0) / (attr.disk || 1) * 100),
                    cpu: 0,
                    panelId: panel.id,
                    panelName: panel.name
                });
            }
        }

        res.json({ nodes: allNodes });
    } catch (err) {
        console.error('Error fetching nodes:', err);
        res.json({ nodes: [] });
    }
});

app.get('/api/dashboard/users', verifyAuth, (req, res) => {
    const user = req.user;
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const users = (settings.webUsers || []).map(u => ({
        username: u.username,
        role: u.role,
        servers: 0
    }));

    res.json({ users });
});

app.post('/api/dashboard/server/power', verifyAuth, async (req, res) => {
    try {
        const { identifier, action, panelId } = req.body;

        if (!identifier || !action) {
            return res.json({ success: false, error: 'Server identifier and action required' });
        }

        const validActions = ['start', 'stop', 'restart', 'kill'];
        if (!validActions.includes(action)) {
            return res.json({ success: false, error: 'Invalid action' });
        }

        const panels = getPanelConfigs();
        let targetPanel = panels[0];

        if (panelId) {
            targetPanel = panels.find(p => p.id === panelId) || panels[0];
        }

        if (!targetPanel) {
            return res.json({ success: false, error: 'No panel configured' });
        }

        await axios.post('' + (targetPanel.domain) + '/api/client/servers/' + (identifier) + '/power',
            { signal: action },
            {
                headers: {
                    Authorization: 'Bearer ' + (targetPanel.clientKey) + '',
                    "Content-Type": "application/json",
                    Accept: "Application/vnd.pterodactyl.v1+json",
                },
                timeout: 30000
            }
        );

        logger.logActivity('SERVER_POWER', { action, identifier, user: req.user.username }, 'Dashboard');

        res.json({ success: true, message: 'Power action ' + (action) + ' sent' });
    } catch (err) {
        res.json({ success: false, error: err.response?.data?.errors?.[0]?.detail || err.message });
    }
});

const activityLogs = [];
const MAX_ACTIVITY_LOGS = 100;

function addActivityLog(type, message, user = 'System') {
    activityLogs.unshift({
        id: Date.now(),
        type,
        message,
        user,
        timestamp: new Date().toISOString()
    });
    if (activityLogs.length > MAX_ACTIVITY_LOGS) {
        activityLogs.pop();
    }
}

app.get('/api/dashboard/activity', verifyAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    res.json({ activities: activityLogs.slice(0, limit) });
});

app.get('/api/dashboard/logs', verifyAuth, (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type;

    let logs = [...activityLogs];
    if (type && type !== 'all') {
        logs = logs.filter(l => l.type === type);
    }

    res.json({ logs: logs.slice(0, limit) });
});

const DASHBOARD_SETTINGS_FILE = './dashboard_settings.json';

async function loadDashboardSettings() {
    const dbSettings = await supabaseDB.getDashboardSettings();
    if (dbSettings) {
        return dbSettings;
    }

    try {
        if (fs.existsSync(DASHBOARD_SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(DASHBOARD_SETTINGS_FILE, 'utf-8'));
        }
    } catch (e) { }

    const serverConfigs = await supabaseDB.getActiveServerConfigs();
    if (serverConfigs.length > 0) {
        const result = { autoRefresh: true, refreshInterval: 30 };
        serverConfigs.forEach((config, index) => {
            const num = index + 1;
            result['domain' + (num) + ''] = config.domain || '';
            result['apiKey' + (num) + ''] = config.plta || '';
            result['clientKey' + (num) + ''] = config.pltc || '';
        });
        return result;
    }

    return {
        domain1: settings.domain || '',
        apiKey1: settings.plta || '',
        clientKey1: settings.pltc || '',
        domain2: settings.domain2 || '',
        apiKey2: settings.plta2 || '',
        clientKey2: settings.pltc2 || '',
        domain3: settings.domain3 || '',
        apiKey3: settings.plta3 || '',
        clientKey3: settings.pltc3 || '',
        autoRefresh: true,
        refreshInterval: 30
    };
}

async function saveDashboardSettings(data) {
    const dbSaved = await supabaseDB.saveDashboardSettingsDB(data);
    if (dbSaved) {
        return true;
    }

    try {
        fs.writeFileSync(DASHBOARD_SETTINGS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        return false;
    }
}

app.get('/api/dashboard/settings', verifyAuth, async (req, res) => {
    const dashSettings = await loadDashboardSettings();
    res.json(dashSettings);
});

app.post('/api/dashboard/settings', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const saved = await saveDashboardSettings(req.body);
    if (saved) {
        addActivityLog('settings', 'Dashboard settings updated', user.username);
        res.json({ success: true, message: 'Settings saved' });
    } else {
        res.json({ success: false, error: 'Failed to save settings' });
    }
});

app.get('/api/dashboard/telegram/status', verifyAuth, (req, res) => {
    const hasToken = settings.token && settings.token.length > 10;
    res.json({
        connected: hasToken,
        botName: settings.namaBot || 'Unknown',
        botUsername: settings.userBot || 'Unknown'
    });
});

app.post('/api/dashboard/telegram/connect', verifyAuth, (req, res) => {
    const user = req.user;
    if (user.role !== 'owner' && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { token } = req.body;
    if (!token) {
        return res.json({ success: false, error: 'Token required' });
    }

    addActivityLog('telegram', 'Telegram bot token updated', user.username);
    res.json({ success: true, message: 'Telegram bot token saved. Restart required.' });
});

app.get('/api/owner/tiers', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    try {
        const tiers = await supabaseDB.getAllTiers();
        const tierList = Object.entries(tiers).map(([telegramId, data]) => ({
            telegramId,
            tier: data.tier,
            createdAt: data.createdAt
        }));
        res.json({ success: true, tiers: tierList });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/owner/tiers', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const { telegramId, tier } = req.body;
    if (!telegramId || !tier) {
        return res.json({ success: false, error: 'Telegram ID and tier required' });
    }
    try {
        await supabaseDB.setUserTier(telegramId, tier);
        addActivityLog('owner', 'Tier ' + (tier) + ' set for ' + (telegramId) + '', user.username);
        res.json({ success: true, message: 'Tier ' + (tier) + ' set for ' + (telegramId) + '' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.delete('/api/owner/tiers/:telegramId', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    try {
        await supabaseDB.removeUserTier(req.params.telegramId);
        addActivityLog('owner', 'Tier removed for ' + (req.params.telegramId) + '', user.username);
        res.json({ success: true, message: 'Tier removed' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/owner/premium', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    try {
        const premiumUsers = await supabaseDB.getPremiumUsers();
        res.json({ success: true, users: premiumUsers });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/owner/premium', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const { telegramId } = req.body;
    if (!telegramId) {
        return res.json({ success: false, error: 'Telegram ID required' });
    }
    try {
        await supabaseDB.addPremiumUser(telegramId, 'web-owner');
        addActivityLog('owner', 'Premium added: ' + (telegramId) + '', user.username);
        res.json({ success: true, message: 'Premium user added' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.delete('/api/owner/premium/:telegramId', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    try {
        await supabaseDB.removePremiumUser(req.params.telegramId);
        addActivityLog('owner', 'Premium removed: ' + (req.params.telegramId) + '', user.username);
        res.json({ success: true, message: 'Premium user removed' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/owner/admins', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    try {
        const admins = await supabaseDB.getAdminUsers();
        res.json({ success: true, admins });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/owner/admins', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const { telegramId } = req.body;
    if (!telegramId) {
        return res.json({ success: false, error: 'Telegram ID required' });
    }
    try {
        await supabaseDB.addAdminUser(telegramId, 'web-owner');
        addActivityLog('owner', 'Admin added: ' + (telegramId) + '', user.username);
        res.json({ success: true, message: 'Admin added' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.delete('/api/owner/admins/:telegramId', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    try {
        await supabaseDB.removeAdminUser(req.params.telegramId);
        addActivityLog('owner', 'Admin removed: ' + (req.params.telegramId) + '', user.username);
        res.json({ success: true, message: 'Admin removed' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/owner/ptero-users', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const { serverId, page = 1, limit = 20 } = req.query;
    try {
        if (serverId) {
            const result = await supabaseDB.getCreatedUsersPaginated(serverId, parseInt(page), parseInt(limit));
            res.json({ success: true, ...result });
        } else {
            const users = await supabaseDB.getAllCreatedUsersByServer();
            res.json({ success: true, data: users, total: users.length });
        }
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/owner/nodes', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const { serverId } = req.query;
    try {
        if (serverId) {
            const nodes = await supabaseDB.getAllNodeSettings(serverId);
            res.json({ success: true, nodes });
        } else {
            const allNodes = [];
            for (const sid of ['srv1', 'srv2', 'srv3']) {
                const nodes = await supabaseDB.getAllNodeSettings(sid);
                allNodes.push(...nodes.map(n => ({ ...n, serverId: sid })));
            }
            res.json({ success: true, nodes: allNodes });
        }
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/owner/nodes', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const { serverId, nodeId, nodeName, isActive, isUnlis } = req.body;
    if (!serverId || !nodeId) {
        return res.json({ success: false, error: 'Server ID and Node ID required' });
    }
    try {
        await supabaseDB.setNodeSettings(serverId, nodeId, nodeName || 'Node ' + (nodeId) + '', isActive !== false, isUnlis === true, 'web-owner');
        addActivityLog('owner', 'Node ' + (nodeId) + ' updated on ' + (serverId) + '', user.username);
        res.json({ success: true, message: 'Node settings updated' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/owner/activity', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const { telegramId, limit = 50 } = req.query;
    try {
        if (telegramId) {
            const activity = await supabaseDB.getUserActivity(telegramId, parseInt(limit));
            res.json({ success: true, activity });
        } else {
            res.json({ success: true, activity: activityLogs.slice(0, parseInt(limit)) });
        }
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/api/owner/panels', verifyAuth, (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const panels = getPanelConfigs();
    res.json({
        success: true,
        panels: panels.map(p => ({
            id: p.id,
            name: p.name,
            domain: p.domain,
            hasApiKey: p.apiKey && p.apiKey !== '-',
            hasClientKey: p.clientKey && p.clientKey !== '-'
        }))
    });
});

app.get('/api/owner/system', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    try {
        const consolePassword = await supabaseDB.getConsolePassword();
        const webPassword = await supabaseDB.getWebPassword();
        res.json({
            success: true,
            settings: {
                botName: settings.namaBot,
                botUsername: settings.userBot,
                ownerName: settings.namaOwner,
                consolePassword: consolePassword || 'man23148',
                webPassword: webPassword || 'man23148',
                owners: settings.owner || []
            }
        });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.post('/api/owner/system/password', verifyAuth, async (req, res) => {
    const user = req.user;
    if (user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'Owner access required' });
    }
    const { type, password } = req.body;
    if (!type || !password) {
        return res.json({ success: false, error: 'Type and password required' });
    }
    try {
        if (type === 'console') {
            await supabaseDB.setConsolePassword(password, 'web-owner');
        } else if (type === 'web') {
            await supabaseDB.setWebPassword(password, 'web-owner');
        }
        addActivityLog('owner', '' + (type) + ' password updated', user.username);
        res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

addActivityLog('system', 'Dashboard server started');

app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, error: 'API route not found' });
    }
    const dashboardIndexPath = path.join(__dirname, '../dashboard', 'index.html');
    if (!fs.existsSync(dashboardIndexPath)) {
        return res.status(404).json({ success: false, error: 'Dashboard build not found' });
    }
    res.sendFile(dashboardIndexPath);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(' Web server running on port ' + (PORT) + '');
    console.log(' Open http://localhost:' + (PORT) + ' to view status page');
    logger.logActivity('SERVER_STARTED', { port: PORT, timestamp: new Date().toISOString() }, 'System');
    logger.printDashboard();
});

module.exports = app;
// // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // // 
