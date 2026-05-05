const { createClient } = require('@supabase/supabase-js');
const settings = require('../settings');

const supabaseUrl = settings.supabase_url;
const supabaseKey = settings.supabase_key;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase connected to:', supabaseUrl);
} else {
    console.log('⚠️ Supabase not configured, using local JSON files');
}

async function getUserTier(telegramId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('tiers')
        .select('tier')
        .eq('telegram_id', telegramId.toString())
        .single();

    if (error) return null;
    return data?.tier || null;
}

async function setUserTier(telegramId, tier) {
    if (!supabase) return false;

    await ensureUserExists(telegramId);

    const { error } = await supabase
        .from('tiers')
        .upsert({
            telegram_id: telegramId.toString(),
            tier: tier,
            created_at: new Date().toISOString()
        }, { onConflict: 'telegram_id' });

    return !error;
}

async function removeUserTier(telegramId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('tiers')
        .delete()
        .eq('telegram_id', telegramId.toString());

    return !error;
}

async function ensureUserExists(telegramId, username = null, firstName = null) {
    if (!supabase) return;

    await supabase
        .from('users')
        .upsert({
            telegram_id: telegramId.toString(),
            username: username,
            first_name: firstName,
            updated_at: new Date().toISOString()
        }, { onConflict: 'telegram_id' });
}

async function getServerAccess(telegramId) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('server_access')
        .select('server_id')
        .eq('telegram_id', telegramId.toString());

    if (error) return [];
    return data.map(row => row.server_id);
}

async function addServerAccess(telegramId, serverId) {
    if (!supabase) return false;

    await ensureUserExists(telegramId);

    const { error } = await supabase
        .from('server_access')
        .upsert({
            telegram_id: telegramId.toString(),
            server_id: serverId
        }, { onConflict: 'telegram_id,server_id' });

    return !error;
}

async function getPremiumUsers() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('premium_users')
        .select('telegram_id');

    if (error) return [];
    return data.map(row => row.telegram_id);
}

async function addPremiumUser(telegramId, addedBy = null) {
    if (!supabase) return false;

    await ensureUserExists(telegramId);

    const { error } = await supabase
        .from('premium_users')
        .upsert({
            telegram_id: telegramId.toString(),
            added_by: addedBy?.toString()
        }, { onConflict: 'telegram_id' });

    return !error;
}

async function removePremiumUser(telegramId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('premium_users')
        .delete()
        .eq('telegram_id', telegramId.toString());

    return !error;
}

async function getAdminUsers() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('admin_users')
        .select('telegram_id');

    if (error) return [];
    return data.map(row => row.telegram_id);
}

async function addAdminUser(telegramId, addedBy = null) {
    if (!supabase) return false;

    await ensureUserExists(telegramId);

    const { error } = await supabase
        .from('admin_users')
        .upsert({
            telegram_id: telegramId.toString(),
            added_by: addedBy?.toString()
        }, { onConflict: 'telegram_id' });

    return !error;
}

async function removeAdminUser(telegramId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('telegram_id', telegramId.toString());

    return !error;
}

async function getChannels() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('channels')
        .select('channel_id');

    if (error) return [];
    return data.map(row => row.channel_id);
}

async function addChannel(channelId, addedBy = null) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('channels')
        .upsert({
            channel_id: channelId,
            added_by: addedBy?.toString()
        }, { onConflict: 'channel_id' });

    return !error;
}

async function logTransaction(telegramId, type, details) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('transactions')
        .insert({
            telegram_id: telegramId?.toString(),
            transaction_type: type,
            details: details
        });

    return !error;
}

async function getAllTiers() {
    if (!supabase) return {};

    const { data, error } = await supabase
        .from('tiers')
        .select('*');

    if (error) return {};

    const result = {};
    data.forEach(row => {
        result[row.telegram_id] = {
            tier: row.tier,
            createdAt: row.created_at,
            adpCreated: {
                srv1: row.adp_created_srv1,
                srv2: row.adp_created_srv2,
                srv3: row.adp_created_srv3
            }
        };
    });
    return result;
}

async function markAdpCreated(telegramId, serverId) {
    if (!supabase) return false;

    const columnName = `adp_created_${serverId}`;
    const { error } = await supabase
        .from('tiers')
        .update({ [columnName]: true })
        .eq('telegram_id', telegramId.toString());

    return !error;
}

async function canCreateAdp(telegramId, serverId) {
    if (!supabase) return false;

    const { data, error } = await supabase
        .from('tiers')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .single();

    if (error || !data) return false;

    if (data.tier === 'DEV') return true;

    if (data.tier === 'ADP') {
        const columnName = `adp_created_${serverId}`;
        return !data[columnName];
    }

    return false;
}

async function addCreatedUser(creatorTelegramId, pteroUserId, pteroUsername, serverId, pteroEmail = null) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('created_users')
        .upsert({
            creator_telegram_id: creatorTelegramId.toString(),
            pterodactyl_user_id: pteroUserId,
            pterodactyl_username: pteroUsername,
            server_id: serverId,
            pterodactyl_email: pteroEmail,
            created_at: new Date().toISOString()
        }, { onConflict: 'creator_telegram_id,pterodactyl_user_id,server_id' });

    return !error;
}

async function getCreatedUsers(creatorTelegramId, serverId = null) {
    if (!supabase) return [];

    let query = supabase
        .from('created_users')
        .select('*')
        .eq('creator_telegram_id', creatorTelegramId.toString())
        .order('created_at', { ascending: false });

    if (serverId) {
        query = query.eq('server_id', serverId);
    }

    const { data, error } = await query;

    if (error) return [];
    return data;
}

async function canAccessPteroUser(creatorTelegramId, pteroUserId, serverId) {
    if (!supabase) return false;

    const { data, error } = await supabase
        .from('created_users')
        .select('id')
        .eq('creator_telegram_id', creatorTelegramId.toString())
        .eq('pterodactyl_user_id', pteroUserId)
        .eq('server_id', serverId)
        .single();

    return !error && data !== null;
}

async function logActivity(telegramId, activityType, details = {}) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('user_activity')
        .insert({
            telegram_id: telegramId.toString(),
            activity_type: activityType,
            target_username: details.targetUsername || null,
            target_telegram_id: details.targetTelegramId || null,
            server_id: details.serverId || null,
            package: details.package || null,
            egg_id: details.eggId || null,
            node_id: details.nodeId || null,
            details: details,
            created_at: new Date().toISOString()
        });

    return !error;
}

async function getUserActivity(telegramId, limit = 20) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data;
}

async function getNodeSettings(serverId, nodeId = null) {
    if (!supabase) return null;

    let query = supabase
        .from('node_settings')
        .select('*')
        .eq('server_id', serverId);

    if (nodeId) {
        query = query.eq('node_id', nodeId).single();
    }

    const { data, error } = await query;

    if (error) return nodeId ? null : [];
    return data;
}

async function setNodeSettings(serverId, nodeId, nodeName, isActive, isUnlis, updatedBy = null) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('node_settings')
        .upsert({
            server_id: serverId,
            node_id: nodeId,
            node_name: nodeName,
            is_active: isActive,
            is_unlis: isUnlis,
            updated_by: updatedBy?.toString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'server_id,node_id' });

    return !error;
}

async function isNodeActive(serverId, nodeId) {
    if (!supabase) return true;

    const settings = await getNodeSettings(serverId, nodeId);
    return settings ? settings.is_active : true;
}

async function isNodeUnlis(serverId, nodeId) {
    if (!supabase) return false;

    const settings = await getNodeSettings(serverId, nodeId);
    return settings ? settings.is_unlis : false;
}

async function getAllNodeSettings(serverId) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('node_settings')
        .select('*')
        .eq('server_id', serverId)
        .order('node_id', { ascending: true });

    if (error) return [];
    return data;
}

async function executeRawSQL(query) {
    if (!supabase) {
        return { success: false, error: 'Database not configured' };
    }

    try {
        const { data, error } = await supabase.rpc('execute_sql', { query_text: query });

        if (error) {
            const { data: directData, error: directError } = await supabase
                .from('_raw_query')
                .select('*')
                .limit(1);

            return {
                success: false,
                error: `SQL execution not supported directly. Use Supabase dashboard for raw SQL. Error: ${error.message}`,
                hint: 'Create a stored procedure or use Supabase SQL Editor'
            };
        }

        return { success: true, data: data, rowCount: data?.length || 0 };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function getFeatureStatus(featureName) {
    if (!supabase) return 'ON';

    try {
        const { data, error } = await supabase
            .from('feature_toggles')
            .select('status')
            .eq('name', featureName)
            .single();

        if (error || !data) return 'ON';
        return data.status;
    } catch (err) {
        return 'ON';
    }
}

async function setFeatureStatus(featureName, status, updatedBy = null) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('feature_toggles')
        .upsert({
            name: featureName,
            status: status,
            updated_by: updatedBy?.toString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'name' });

    return !error;
}

async function getAllFeatures() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('feature_toggles')
        .select('*')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

    if (error) return [];
    return data || [];
}

async function getSystemSetting(key) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) return null;
    return data?.value || null;
}

async function setSystemSetting(key, value, updatedBy = null) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key: key,
            value: value,
            updated_by: updatedBy?.toString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

    return !error;
}

async function getPassword(passwordType) {
    const value = await getSystemSetting(passwordType);
    return value || 'man23148';
}

async function setPassword(passwordType, newPassword, updatedBy = null) {
    return await setSystemSetting(passwordType, newPassword, updatedBy);
}

async function getConsolePassword() {
    return await getPassword('console_password');
}

async function getWebPassword() {
    return await getPassword('web_password');
}

async function setConsolePassword(newPassword, updatedBy = null) {
    return await setPassword('console_password', newPassword, updatedBy);
}

async function setWebPassword(newPassword, updatedBy = null) {
    return await setPassword('web_password', newPassword, updatedBy);
}

async function getAllUsers() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('users')
        .select('telegram_id');

    if (error) return [];
    return data.map(row => row.telegram_id);
}

async function getAllCreatedUsersByServer(serverId = null) {
    if (!supabase) return [];

    let query = supabase
        .from('created_users')
        .select('*')
        .order('created_at', { ascending: false });

    if (serverId) {
        query = query.eq('server_id', serverId);
    }

    const { data, error } = await query;

    if (error) return [];
    return data;
}

async function getCreatedUsersCount(serverId = null) {
    if (!supabase) return 0;

    let query = supabase
        .from('created_users')
        .select('id', { count: 'exact', head: true });

    if (serverId) {
        query = query.eq('server_id', serverId);
    }

    const { count, error } = await query;

    if (error) return 0;
    return count || 0;
}

async function getCreatedUsersPaginated(serverId, page = 1, limit = 10) {
    if (!supabase) return { data: [], total: 0, totalPages: 0 };

    const offset = (page - 1) * limit;

    let query = supabase
        .from('created_users')
        .select('*', { count: 'exact' })
        .eq('server_id', serverId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) return { data: [], total: 0, totalPages: 0 };

    return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
    };
}

async function deleteCreatedUser(pteroUserId, serverId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('created_users')
        .delete()
        .eq('pterodactyl_user_id', pteroUserId)
        .eq('server_id', serverId);

    return !error;
}

async function saveUserServer(telegramId, serverId, panelId, serverIdentifier, serverName) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('user_servers')
        .upsert({
            telegram_id: telegramId.toString(),
            server_id: serverId,
            panel_id: panelId,
            server_identifier: serverIdentifier,
            server_name: serverName,
            updated_at: new Date().toISOString()
        }, { onConflict: 'telegram_id,server_identifier,panel_id' });

    return !error;
}

async function getUserServers(telegramId, panelId = null) {
    if (!supabase) return [];

    let query = supabase
        .from('user_servers')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .order('updated_at', { ascending: false });

    if (panelId) {
        query = query.eq('panel_id', panelId);
    }

    const { data, error } = await query;

    if (error) return [];
    return data;
}

async function removeUserServer(telegramId, serverIdentifier, panelId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('user_servers')
        .delete()
        .eq('telegram_id', telegramId.toString())
        .eq('server_identifier', serverIdentifier)
        .eq('panel_id', panelId);

    return !error;
}

async function logServerAction(telegramId, action, serverIdentifier, panelId, details = {}) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('server_actions')
        .insert({
            telegram_id: telegramId.toString(),
            action: action,
            server_identifier: serverIdentifier,
            panel_id: panelId,
            details: details,
            created_at: new Date().toISOString()
        });

    return !error;
}

async function getLastServerAction(telegramId, action, serverIdentifier) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('server_actions')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .eq('action', action)
        .eq('server_identifier', serverIdentifier)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) return null;
    return data;
}

async function getAllBotFunctions(category = null, page = 1, limit = 10) {
    if (!supabase) return { data: [], total: 0, totalPages: 0 };

    const offset = (page - 1) * limit;

    let query = supabase
        .from('bot_functions')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('function_name', { ascending: true });

    if (category) {
        query = query.eq('category', category);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) return { data: [], total: 0, totalPages: 0 };

    return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
    };
}

async function getBotFunctionCategories() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('bot_functions')
        .select('category')
        .eq('is_active', true);

    if (error) return [];

    const categories = [...new Set(data.map(d => d.category))].sort();
    return categories;
}

async function getTierPermissions(tierName) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('tier_permissions')
        .select('function_name, is_allowed')
        .eq('tier_name', tierName);

    if (error) return [];
    return data;
}

async function getTierFunctionsWithPermissions(tierName, category = null, page = 1, limit = 10) {
    if (!supabase) return { data: [], total: 0, totalPages: 0 };

    const offset = (page - 1) * limit;

    let query = supabase
        .from('bot_functions')
        .select('function_name, description, category', { count: 'exact' })
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('function_name', { ascending: true });

    if (category) {
        query = query.eq('category', category);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: functions, count, error: funcError } = await query;

    if (funcError) return { data: [], total: 0, totalPages: 0 };

    const permissions = await getTierPermissions(tierName);
    const permMap = {};
    permissions.forEach(p => { permMap[p.function_name] = p.is_allowed; });

    const result = (functions || []).map(f => ({
        ...f,
        is_allowed: permMap[f.function_name] !== undefined ? permMap[f.function_name] : false
    }));

    return {
        data: result,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
    };
}

async function setTierFunctionPermission(tierName, functionName, isAllowed) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('tier_permissions')
        .upsert({
            tier_name: tierName,
            function_name: functionName,
            is_allowed: isAllowed,
            updated_at: new Date().toISOString()
        }, { onConflict: 'tier_name,function_name' });

    return !error;
}

async function checkTierFunctionPermission(tierName, functionName) {
    if (!supabase) return true;

    const { data, error } = await supabase
        .from('tier_permissions')
        .select('is_allowed')
        .eq('tier_name', tierName)
        .eq('function_name', functionName)
        .single();

    if (error) return true;
    return data?.is_allowed !== false;
}

async function getAllTiersList() {
    const tiers = [
        'DEV', 'CEO', 'PENGUASA PANEL', 'TK', 'PT',
        'OWNER GANTENG', 'MEMBER VIP', 'OWN', 'ADP',
        'MURID PANEL', 'PEMBOKEP', 'RESELLER'
    ];
    return tiers;
}

async function bulkSetTierPermissions(tierName, permissions) {
    if (!supabase) return false;

    const records = permissions.map(p => ({
        tier_name: tierName,
        function_name: p.function_name,
        is_allowed: p.is_allowed,
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('tier_permissions')
        .upsert(records, { onConflict: 'tier_name,function_name' });

    return !error;
}

async function copyTierPermissions(fromTier, toTier) {
    if (!supabase) return false;

    const fromPermissions = await getTierPermissions(fromTier);
    if (fromPermissions.length === 0) return false;

    const toRecords = fromPermissions.map(p => ({
        tier_name: toTier,
        function_name: p.function_name,
        is_allowed: p.is_allowed,
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('tier_permissions')
        .upsert(toRecords, { onConflict: 'tier_name,function_name' });

    return !error;
}

async function countTierAllowedFunctions(tierName) {
    if (!supabase) return { allowed: 0, total: 0 };

    const { data: total, error: err1 } = await supabase
        .from('bot_functions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

    const { data: allowed, count: allowedCount, error: err2 } = await supabase
        .from('tier_permissions')
        .select('id', { count: 'exact', head: true })
        .eq('tier_name', tierName)
        .eq('is_allowed', true);

    return {
        allowed: allowedCount || 0,
        total: total || 0
    };
}

async function getServerConfig(serverId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('server_configs')
        .select('*')
        .eq('server_id', serverId)
        .eq('is_active', true)
        .single();

    if (error) return null;
    return data;
}

async function getAllServerConfigs() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('server_configs')
        .select('*')
        .order('server_id', { ascending: true });

    if (error) return [];
    return data || [];
}

async function getActiveServerConfigs() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('server_configs')
        .select('*')
        .eq('is_active', true)
        .order('server_id', { ascending: true });

    if (error) return [];
    return data || [];
}

async function saveServerConfig(serverId, domain, plta, pltc, serverName = null, addedBy = null) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('server_configs')
        .upsert({
            server_id: serverId,
            server_name: serverName || serverId.toUpperCase(),
            domain: domain,
            plta: plta,
            pltc: pltc,
            is_active: true,
            updated_at: new Date().toISOString(),
            added_by: addedBy?.toString()
        }, { onConflict: 'server_id' });

    return !error;
}

async function updateServerConfig(serverId, updates) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('server_configs')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('server_id', serverId);

    return !error;
}

async function setServerActive(serverId, isActive) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('server_configs')
        .update({
            is_active: isActive,
            updated_at: new Date().toISOString()
        })
        .eq('server_id', serverId);

    return !error;
}

async function deleteServerConfig(serverId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('server_configs')
        .delete()
        .eq('server_id', serverId);

    return !error;
}

async function initServerConfigsFromSettings(settings) {
    if (!supabase) return false;

    const configs = [];

    if (settings.domain && settings.domain !== '-' && settings.plta && settings.pltc) {
        configs.push({
            server_id: 'srv1',
            server_name: 'SERVER 1',
            domain: settings.domain,
            plta: settings.plta,
            pltc: settings.pltc,
            is_active: true
        });
    }

    if (settings.domain2 && settings.domain2 !== '-' && settings.plta2 && settings.pltc2 && settings.plta2 !== '-' && settings.pltc2 !== '-') {
        configs.push({
            server_id: 'srv2',
            server_name: 'SERVER 2',
            domain: settings.domain2,
            plta: settings.plta2,
            pltc: settings.pltc2,
            is_active: true
        });
    }

    if (settings.domain3 && settings.domain3 !== '-' && settings.plta3 && settings.pltc3 && settings.plta3 !== '-' && settings.pltc3 !== '-') {
        configs.push({
            server_id: 'srv3',
            server_name: 'SERVER 3',
            domain: settings.domain3,
            plta: settings.plta3,
            pltc: settings.pltc3,
            is_active: true
        });
    }

    for (const config of configs) {
        const existing = await getServerConfig(config.server_id);
        if (!existing) {
            await supabase.from('server_configs').insert(config);
        }
    }

    return true;
}

async function saveAIMemory(telegramId, memoryType, memoryKey, memoryValue, context = null, importance = 5) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('ai_memories')
        .upsert({
            telegram_id: telegramId.toString(),
            memory_type: memoryType,
            memory_key: memoryKey,
            memory_value: memoryValue,
            context: context,
            importance: importance,
            updated_at: new Date().toISOString(),
            is_active: true
        }, { onConflict: 'telegram_id,memory_key', ignoreDuplicates: false });

    if (error) {
        const { error: insertError } = await supabase
            .from('ai_memories')
            .insert({
                telegram_id: telegramId.toString(),
                memory_type: memoryType,
                memory_key: memoryKey,
                memory_value: memoryValue,
                context: context,
                importance: importance,
                is_active: true
            });
        return !insertError;
    }

    return !error;
}

async function getAIMemories(telegramId, memoryType = null, limit = 20) {
    if (!supabase) return [];

    let query = supabase
        .from('ai_memories')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .eq('is_active', true)
        .order('importance', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (memoryType) {
        query = query.eq('memory_type', memoryType);
    }

    const { data, error } = await query;

    if (error) return [];
    return data || [];
}

async function getAIMemoryByKey(telegramId, memoryKey) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('ai_memories')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .eq('memory_key', memoryKey)
        .eq('is_active', true)
        .single();

    if (error) return null;
    return data;
}

async function deleteAIMemory(telegramId, memoryKey = null) {
    if (!supabase) return false;

    let query = supabase
        .from('ai_memories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('telegram_id', telegramId.toString());

    if (memoryKey) {
        query = query.eq('memory_key', memoryKey);
    }

    const { error } = await query;
    return !error;
}

async function clearAllAIMemories(telegramId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('ai_memories')
        .delete()
        .eq('telegram_id', telegramId.toString());

    return !error;
}

async function getAIMemorySummary(telegramId) {
    if (!supabase) return '';

    const memories = await getAIMemories(telegramId, null, 15);
    if (memories.length === 0) return '';

    const memoryLines = memories.map(m => {
        if (m.memory_key) {
            return `- ${m.memory_key}: ${m.memory_value}`;
        }
        return `- ${m.memory_value}`;
    });

    return memoryLines.join('\n');
}

async function saveQuickAction(telegramId, actionName, actionTrigger, actionResponse = null) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('ai_quick_actions')
        .upsert({
            telegram_id: telegramId.toString(),
            action_name: actionName,
            action_trigger: actionTrigger,
            action_response: actionResponse,
            is_active: true
        }, { onConflict: 'telegram_id,action_name' });

    return !error;
}

async function getQuickActions(telegramId) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('ai_quick_actions')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

    if (error) return [];
    return data || [];
}

async function incrementQuickActionUsage(telegramId, actionName) {
    if (!supabase) return false;

    const { data: existing } = await supabase
        .from('ai_quick_actions')
        .select('usage_count')
        .eq('telegram_id', telegramId.toString())
        .eq('action_name', actionName)
        .single();

    const newCount = (existing?.usage_count || 0) + 1;

    const { error } = await supabase
        .from('ai_quick_actions')
        .update({
            usage_count: newCount,
            last_used_at: new Date().toISOString()
        })
        .eq('telegram_id', telegramId.toString())
        .eq('action_name', actionName);

    return !error;
}

async function deleteQuickAction(telegramId, actionName) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('ai_quick_actions')
        .delete()
        .eq('telegram_id', telegramId.toString())
        .eq('action_name', actionName);

    return !error;
}

async function saveConversationMessage(telegramId, role, message) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('ai_conversation_history')
        .insert({
            telegram_id: telegramId.toString(),
            role: role,
            message: message
        });

    return !error;
}

async function getConversationHistory(telegramId, limit = 50) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('ai_conversation_history')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return (data || []).reverse();
}

async function clearConversationHistory(telegramId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('ai_conversation_history')
        .delete()
        .eq('telegram_id', telegramId.toString());

    return !error;
}

async function cleanupOldConversations(telegramId, keepLast = 50) {
    if (!supabase) return false;

    const { data: allMessages } = await supabase
        .from('ai_conversation_history')
        .select('id')
        .eq('telegram_id', telegramId.toString())
        .order('created_at', { ascending: false });

    if (!allMessages || allMessages.length <= keepLast) return true;

    const idsToDelete = allMessages.slice(keepLast).map(m => m.id);

    const { error } = await supabase
        .from('ai_conversation_history')
        .delete()
        .in('id', idsToDelete);

    return !error;
}

async function saveGroupMember(groupId, telegramId, username, firstName, lastName = null, isAdmin = false, isBot = false) {
    if (!supabase) return false;

    const { data: existing } = await supabase
        .from('group_members')
        .select('id, message_count')
        .eq('group_id', groupId.toString())
        .eq('telegram_id', telegramId.toString())
        .single();

    const newMessageCount = (existing?.message_count || 0) + 1;

    const { error } = await supabase
        .from('group_members')
        .upsert({
            group_id: groupId.toString(),
            telegram_id: telegramId.toString(),
            username: username,
            first_name: firstName,
            last_name: lastName,
            is_admin: isAdmin,
            is_bot: isBot,
            last_seen_at: new Date().toISOString(),
            message_count: newMessageCount,
            is_active: true
        }, { onConflict: 'group_id,telegram_id' });

    return !error;
}

async function getGroupMembers(groupId, limit = 50) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId.toString())
        .eq('is_active', true)
        .order('message_count', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
}

async function getGroupMember(groupId, telegramId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId.toString())
        .eq('telegram_id', telegramId.toString())
        .eq('is_active', true)
        .single();

    if (error) return null;
    return data;
}

async function removeGroupMember(groupId, telegramId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('group_members')
        .update({ is_active: false, last_seen_at: new Date().toISOString() })
        .eq('group_id', groupId.toString())
        .eq('telegram_id', telegramId.toString());

    return !error;
}

async function saveGroupInfo(groupId, groupName, groupType, memberCount = 0) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('group_info')
        .upsert({
            group_id: groupId.toString(),
            group_name: groupName,
            group_type: groupType,
            member_count: memberCount,
            updated_at: new Date().toISOString(),
            is_active: true
        }, { onConflict: 'group_id' });

    return !error;
}

async function getGroupInfo(groupId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('group_info')
        .select('*')
        .eq('group_id', groupId.toString())
        .single();

    if (error) return null;
    return data;
}

async function getGroupMembersSummary(groupId, limit = 10) {
    if (!supabase) return '';

    const members = await getGroupMembers(groupId, limit);
    if (members.length === 0) return '';

    const memberLines = members.map((m, i) => {
        const name = m.first_name || m.username || 'Unknown';
        const username = m.username ? `@${m.username}` : '';
        const role = m.is_admin ? '👑' : '👤';
        return `${role} ${name} ${username} (${m.message_count} pesan)`;
    });

    return memberLines.join('\n');
}

async function isUserInGroup(groupId, telegramId) {
    if (!supabase) return false;

    const member = await getGroupMember(groupId, telegramId);
    return member !== null;
}

async function getMemberGroups(telegramId) {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('telegram_id', telegramId.toString())
        .eq('is_active', true);

    if (error) return [];
    return data.map(d => d.group_id);
}

async function getUserByTelegramId(telegramId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId.toString())
        .single();

    if (error) return null;
    return data;
}

async function isAdminUser(telegramId) {
    if (!supabase) return false;

    const { data, error } = await supabase
        .from('admin_users')
        .select('telegram_id')
        .eq('telegram_id', telegramId.toString())
        .single();

    return !error && data !== null;
}

async function isPremiumUser(telegramId) {
    if (!supabase) return false;

    const { data, error } = await supabase
        .from('premium_users')
        .select('telegram_id')
        .eq('telegram_id', telegramId.toString())
        .single();

    return !error && data !== null;
}

// ==================== OWNER UTAMA FUNCTIONS ====================
async function getOwnerUtama() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('owner_utama')
        .select('telegram_id');

    if (error) return [];
    return data.map(row => row.telegram_id);
}

async function addOwnerUtama(telegramId, addedBy = null) {
    if (!supabase) return false;

    await ensureUserExists(telegramId);

    const { error } = await supabase
        .from('owner_utama')
        .upsert({
            telegram_id: telegramId.toString(),
            added_by: addedBy?.toString(),
            created_at: new Date().toISOString()
        }, { onConflict: 'telegram_id' });

    return !error;
}

async function removeOwnerUtama(telegramId) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('owner_utama')
        .delete()
        .eq('telegram_id', telegramId.toString());

    return !error;
}

async function isOwnerUtama(telegramId) {
    if (!supabase) return false;

    const { data, error } = await supabase
        .from('owner_utama')
        .select('telegram_id')
        .eq('telegram_id', telegramId.toString())
        .single();

    return !error && data !== null;
}

// ==================== RENDER DEPLOY FUNCTIONS ====================
async function getRenderConfig(configKey) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('render_config')
        .select('config_value')
        .eq('config_key', configKey)
        .single();

    if (error) return null;
    return data?.config_value || null;
}

async function setRenderConfig(configKey, configValue, description = null, updatedBy = null) {
    if (!supabase) return false;

    const { error } = await supabase
        .from('render_config')
        .upsert({
            config_key: configKey,
            config_value: configValue,
            description: description,
            updated_by: updatedBy?.toString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'config_key' });

    return !error;
}

async function getAllRenderConfigs() {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('render_config')
        .select('config_key, config_value, description, updated_at')
        .order('config_key', { ascending: true });

    if (error) return [];
    return data || [];
}

async function getRenderApiKey() {
    return await getRenderConfig('render_api_key');
}

async function getRenderDeployUrl() {
    return await getRenderConfig('render_deploy_url');
}

async function setRenderApiKey(apiKey, updatedBy = null) {
    return await setRenderConfig('render_api_key', apiKey, 'Render API Key', updatedBy);
}

async function setRenderDeployUrl(deployUrl, updatedBy = null) {
    return await setRenderConfig('render_deploy_url', deployUrl, 'Render Deploy Hook URL', updatedBy);
}

async function triggerRenderDeploy() {
    const deployUrl = await getRenderDeployUrl();
    if (!deployUrl) {
        return { success: false, error: 'Render deploy URL not configured' };
    }

    try {
        const axios = require('axios');
        const response = await axios.post(deployUrl, {}, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });

        return {
            success: true,
            data: response.data,
            status: response.status
        };
    } catch (err) {
        return {
            success: false,
            error: err.message,
            status: err.response?.status
        };
    }
}

async function getRenderDeployStatus() {
    const apiKey = await getRenderApiKey();
    if (!apiKey) {
        return { success: false, error: 'Render API key not configured' };
    }

    try {
        const axios = require('axios');
        const response = await axios.get('https://api.render.com/v1/services', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return {
            success: true,
            services: response.data
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

async function getRenderServices() {
    const apiKey = await getRenderApiKey();
    if (!apiKey) {
        return { success: false, error: 'Render API key not configured' };
    }

    try {
        const axios = require('axios');
        const response = await axios.get('https://api.render.com/v1/services', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return {
            success: true,
            services: response.data
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

async function suspendRenderService(serviceId) {
    const apiKey = await getRenderApiKey();
    if (!apiKey) {
        return { success: false, error: 'Render API key not configured' };
    }

    try {
        const axios = require('axios');
        const response = await axios.post(`https://api.render.com/v1/services/${serviceId}/suspend`, {}, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return {
            success: true,
            data: response.data
        };
    } catch (err) {
        return {
            success: false,
            error: err.response?.data?.message || err.message
        };
    }
}

async function resumeRenderService(serviceId) {
    const apiKey = await getRenderApiKey();
    if (!apiKey) {
        return { success: false, error: 'Render API key not configured' };
    }

    try {
        const axios = require('axios');
        const response = await axios.post(`https://api.render.com/v1/services/${serviceId}/resume`, {}, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return {
            success: true,
            data: response.data
        };
    } catch (err) {
        return {
            success: false,
            error: err.response?.data?.message || err.message
        };
    }
}

async function getDashboardStats() {
    if (!supabase) return { totalUsers: 0, premiumUsers: 0, adminUsers: 0, totalServers: 0, totalPanels: 0 };

    try {
        const [usersRes, premiumRes, adminRes, panelsRes, serversRes] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('premium_users').select('id', { count: 'exact', head: true }),
            supabase.from('admin_users').select('id', { count: 'exact', head: true }),
            supabase.from('panels').select('id', { count: 'exact', head: true }),
            supabase.from('user_servers').select('id', { count: 'exact', head: true })
        ]);

        return {
            totalUsers: usersRes.count || 0,
            premiumUsers: premiumRes.count || 0,
            adminUsers: adminRes.count || 0,
            totalPanels: panelsRes.count || 0,
            totalServers: serversRes.count || 0
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return { totalUsers: 0, premiumUsers: 0, adminUsers: 0, totalServers: 0, totalPanels: 0 };
    }
}

async function getRecentActivities(limit = 10) {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('server_actions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return [];
        return data || [];
    } catch (error) {
        return [];
    }
}

async function getWebUsers() {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('web_users')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) return [];
        return data || [];
    } catch (error) {
        return [];
    }
}

async function getWebUser(username) {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('web_users')
            .select('*')
            .eq('username', username)
            .single();

        if (error) return null;
        return data;
    } catch (error) {
        return null;
    }
}

async function addWebUser(username, password, role = 'free') {
    if (!supabase) return false;

    try {
        const { error } = await supabase
            .from('web_users')
            .insert({
                username: username,
                password: password,
                role: role,
                created_at: new Date().toISOString()
            });

        return !error;
    } catch (error) {
        return false;
    }
}

async function updateWebUserRole(username, newRole) {
    if (!supabase) return false;

    try {
        const { error } = await supabase
            .from('web_users')
            .update({ role: newRole, updated_at: new Date().toISOString() })
            .eq('username', username);

        return !error;
    } catch (error) {
        return false;
    }
}

async function deleteWebUser(username) {
    if (!supabase) return false;

    try {
        const { error } = await supabase
            .from('web_users')
            .delete()
            .eq('username', username);

        return !error;
    } catch (error) {
        return false;
    }
}

async function getDashboardSettings() {
    if (!supabase) return null;

    try {
        const settingsValue = await getSystemSetting('dashboard_settings');
        if (settingsValue) {
            return JSON.parse(settingsValue);
        }
        return null;
    } catch (error) {
        return null;
    }
}

async function saveDashboardSettingsDB(settingsData) {
    if (!supabase) return false;

    try {
        return await setSystemSetting('dashboard_settings', JSON.stringify(settingsData));
    } catch (error) {
        return false;
    }
}

async function getPanelConfigsFromDB() {
    const serverConfigs = await getActiveServerConfigs();

    if (serverConfigs.length === 0) {
        return [];
    }

    return serverConfigs.map((config, index) => ({
        id: index + 1,
        serverId: config.server_id,
        domain: config.domain,
        clientKey: config.pltc,
        apiKey: config.plta,
        name: config.server_name || `Panel ${index + 1}`
    }));
}

async function getEnhancedAIContext(telegramId, groupId = null) {
    if (!supabase) return { memories: '', groupContext: '', quickActions: '' };

    const memorySummary = await getAIMemorySummary(telegramId);

    let groupContext = '';
    if (groupId) {
        const groupInfo = await getGroupInfo(groupId);
        const membersSummary = await getGroupMembersSummary(groupId, 15);
        const currentMember = await getGroupMember(groupId, telegramId);

        if (groupInfo || membersSummary) {
            groupContext = '\n═══════════════════════════════════════\n';
            groupContext += '👥 INFO GROUP INI:\n';
            groupContext += '═══════════════════════════════════════\n';

            if (groupInfo) {
                groupContext += `Nama Group: ${groupInfo.group_name || 'Unknown'}\n`;
                groupContext += `Tipe: ${groupInfo.group_type || 'group'}\n`;
            }

            if (currentMember) {
                groupContext += `\nUser yang bertanya adalah MEMBER group ini!\n`;
                groupContext += `Nama: ${currentMember.first_name || 'Unknown'}\n`;
                groupContext += `Username: ${currentMember.username ? '@' + currentMember.username : 'tidak ada'}\n`;
                groupContext += `Status: ${currentMember.is_admin ? 'Admin' : 'Member'}\n`;
                groupContext += `Total pesan: ${currentMember.message_count}\n`;
            }

            if (membersSummary) {
                groupContext += `\nAnggota aktif dalam group:\n${membersSummary}\n`;
            }
        }
    }

    const quickActions = await getQuickActions(telegramId);
    let quickActionsContext = '';
    if (quickActions.length > 0) {
        quickActionsContext = '\n═══════════════════════════════════════\n';
        quickActionsContext += '⚡ QUICK ACTIONS USER:\n';
        quickActionsContext += '═══════════════════════════════════════\n';
        quickActionsContext += quickActions.map(qa => `- ${qa.action_name}: ${qa.action_trigger}`).join('\n');
    }

    return {
        memories: memorySummary,
        groupContext: groupContext,
        quickActions: quickActionsContext
    };
}

// ==================== VPS CONNECTION PERSISTENCE ====================

async function saveVPSConfig(ownerTelegramId, config) {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('vps_connections')
            .upsert({
                owner_telegram_id: String(ownerTelegramId),
                host: config.host,
                port: config.port || 22,
                username: config.username || 'root',
                password_enc: config.password || null,
                private_key_enc: config.privateKey || null,
                label: config.label || `${config.host} (Auto)`,
                vps_type: config.vpsType || ['bot'], // "panel", "wings", "bot"
                is_active: true,
                last_connected_at: new Date().toISOString()
            }, {
                onConflict: 'owner_telegram_id'
            });
        return !error;
    } catch (_) { return false; }
}

async function getVPSConfig(ownerTelegramId) {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('vps_connections')
            .select('*')
            .eq('owner_telegram_id', String(ownerTelegramId))
            .eq('is_active', true)
            .single();
        if (error || !data) return null;
        return {
            host: data.host,
            port: data.port || 22,
            username: data.username || 'root',
            password: data.password_enc || null,
            privateKey: data.private_key_enc || null,
            label: data.label,
            vpsType: data.vps_type || ['bot']
        };
    } catch (_) { return null; }
}

async function deleteVPSConfig(ownerTelegramId) {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('vps_connections')
            .delete()
            .eq('owner_telegram_id', String(ownerTelegramId));
        return !error;
    } catch (_) { return false; }
}

async function getAllVPSConfigs() {
    if (!supabase) return [];
    try {
        const { data } = await supabase
            .from('vps_connections')
            .select('*')
            .eq('is_active', true)
            .order('last_connected_at', { ascending: false });
        return data || [];
    } catch (_) { return []; }
}

// ==================== GHOST ENFORCER FUNCTIONS ====================


async function logGhostEnforcement(data) {
    if (!supabase) return null;

    try {
        const { data: row, error } = await supabase
            .from('ghost_enforce_logs')
            .insert({
                telegram_id: data.telegram_id || null,
                telegram_username: data.telegram_username || null,
                telegram_first_name: data.telegram_first_name || null,
                panel_name: data.panel_name || null,
                panel_domain: data.panel_domain || null,
                ptero_server_id: data.ptero_server_id || null,
                server_name: data.server_name || null,
                server_uuid: data.server_uuid || null,
                server_size_gb: data.server_size_gb || 0,
                ptero_user_id: data.ptero_user_id || null,
                action_taken: data.action_taken || [],
                status: data.status || 'pending',
                dry_run: data.dry_run || false,
                details: data.details || {}
            })
            .select('id')
            .single();

        if (error) {
            console.error('[GhostEnforcer] Gagal log ke Supabase:', error.message);
            return null;
        }
        return row?.id || null;
    } catch (err) {
        console.error('[GhostEnforcer] Error logGhostEnforcement:', err.message);
        return null;
    }
}

async function updateGhostEnforcement(logId, status, actionsTaken = []) {
    if (!supabase || !logId) return false;

    try {
        const { error } = await supabase
            .from('ghost_enforce_logs')
            .update({
                status: status,
                action_taken: actionsTaken,
                updated_at: new Date().toISOString()
            })
            .eq('id', logId);

        return !error;
    } catch (err) {
        console.error('[GhostEnforcer] Error updateGhostEnforcement:', err.message);
        return false;
    }
}

async function getGhostEnforceLogs(limit = 20, status = null) {
    if (!supabase) return [];

    try {
        let query = supabase
            .from('ghost_enforce_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) return [];
        return data || [];
    } catch (_) {
        return [];
    }
}

async function getWebAuthnCredential(credentialId) {
    if (!supabase) return null;
    const { data } = await supabase.from('webauthn_credentials').select('*').eq('credential_id', credentialId).single();
    return data;
}

async function getUserWebAuthnCredentials(telegramId) {
    if (!supabase) return [];
    const { data } = await supabase.from('webauthn_credentials').select('*').eq('telegram_id', String(telegramId));
    return data || [];
}

async function saveWebAuthnCredential(telegramId, credentialId, publicKey, counter, transports) {
    if (!supabase) return false;
    const { error } = await supabase.from('webauthn_credentials').upsert({
        telegram_id: String(telegramId),
        credential_id: credentialId,
        public_key: publicKey,
        counter: counter,
        transports: transports || []
    }, { onConflict: 'credential_id' });
    return !error;
}

async function updateWebAuthnCounter(credentialId, counter) {
    if (!supabase) return false;
    const { error } = await supabase.from('webauthn_credentials').update({ counter }).eq('credential_id', credentialId);
    return !error;
}

async function get2FASecret(telegramId) {
    if (!supabase) return null;
    const { data } = await supabase.from('bot_2fa_secrets').select('*').eq('telegram_id', String(telegramId)).single();
    return data;
}

async function save2FASecret(telegramId, secret, isVerified = false) {
    if (!supabase) return false;
    const { error } = await supabase.from('bot_2fa_secrets').upsert({
        telegram_id: String(telegramId),
        secret: secret,
        is_verified: isVerified
    }, { onConflict: 'telegram_id' });
    return !error;
}

async function update2FAVerified(telegramId, isVerified) {
    if (!supabase) return false;
    const { error } = await supabase.from('bot_2fa_secrets').update({ is_verified: isVerified }).eq('telegram_id', String(telegramId));
    return !error;
}

module.exports = {
    supabase,
    isConfigured: () => !!supabase,
    getWebAuthnCredential,
    getUserWebAuthnCredentials,
    saveWebAuthnCredential,
    updateWebAuthnCounter,
    get2FASecret,
    save2FASecret,
    update2FAVerified,
    getUserTier,
    setUserTier,
    removeUserTier,
    ensureUserExists,
    getServerAccess,
    addServerAccess,
    getPremiumUsers,
    addPremiumUser,
    removePremiumUser,
    getAdminUsers,
    addAdminUser,
    removeAdminUser,
    getChannels,
    addChannel,
    logTransaction,
    getAllTiers,
    markAdpCreated,
    canCreateAdp,
    addCreatedUser,
    getCreatedUsers,
    canAccessPteroUser,
    logActivity,
    getUserActivity,
    getNodeSettings,
    setNodeSettings,
    isNodeActive,
    isNodeUnlis,
    getAllNodeSettings,
    executeRawSQL,
    getSystemSetting,
    setSystemSetting,
    getPassword,
    setPassword,
    getConsolePassword,
    getWebPassword,
    setConsolePassword,
    setWebPassword,
    getAllUsers,
    getAllCreatedUsersByServer,
    getCreatedUsersCount,
    getCreatedUsersPaginated,
    deleteCreatedUser,
    saveUserServer,
    getUserServers,
    removeUserServer,
    logServerAction,
    getLastServerAction,
    getAllBotFunctions,
    getBotFunctionCategories,
    getTierPermissions,
    getTierFunctionsWithPermissions,
    setTierFunctionPermission,
    checkTierFunctionPermission,
    getAllTiersList,
    bulkSetTierPermissions,
    copyTierPermissions,
    countTierAllowedFunctions,
    saveAIMemory,
    getAIMemories,
    getAIMemoryByKey,
    deleteAIMemory,
    clearAllAIMemories,
    getAIMemorySummary,
    saveQuickAction,
    getQuickActions,
    incrementQuickActionUsage,
    deleteQuickAction,
    saveConversationMessage,
    getConversationHistory,
    clearConversationHistory,
    cleanupOldConversations,
    getServerConfig,
    getAllServerConfigs,
    getActiveServerConfigs,
    saveServerConfig,
    updateServerConfig,
    setServerActive,
    deleteServerConfig,
    initServerConfigsFromSettings,
    saveGroupMember,
    getGroupMembers,
    getGroupMember,
    removeGroupMember,
    saveGroupInfo,
    getGroupInfo,
    getGroupMembersSummary,
    isUserInGroup,
    getMemberGroups,
    getEnhancedAIContext,
    getUserByTelegramId,
    isAdminUser,
    isPremiumUser,
    getDashboardStats,
    getRecentActivities,
    getOwnerUtama,
    addOwnerUtama,
    removeOwnerUtama,
    isOwnerUtama,
    getRenderConfig,
    setRenderConfig,
    getAllRenderConfigs,
    getRenderApiKey,
    getRenderDeployUrl,
    setRenderApiKey,
    setRenderDeployUrl,
    triggerRenderDeploy,
    getRenderDeployStatus,
    getRenderServices,
    suspendRenderService,
    resumeRenderService,
    getWebUsers,
    getWebUser,
    addWebUser,
    updateWebUserRole,
    deleteWebUser,
    getDashboardSettings,
    saveDashboardSettingsDB,
    getPanelConfigsFromDB,
    getFeatureStatus,
    setFeatureStatus,
    getAllFeatures,
    logGhostEnforcement,
    updateGhostEnforcement,
    getGhostEnforceLogs,
    saveVPSConfig,
    getVPSConfig,
    deleteVPSConfig,
    getAllVPSConfigs
};
