const axios = require('axios');

async function createDnsRecord(zoneId, apiToken, name, type = 'A', content, ttl = 1, proxied = false) {
    if (!zoneId || !apiToken || !name || !content) throw new Error('Missing parameters for createDnsRecord');

    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

    try {
        const res = await axios.post(url, {
            type,
            name,
            content,
            ttl,
            proxied
        }, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        if (res.data && res.data.success) {
            return { success: true, result: res.data.result };
        }

        return { success: false, error: res.data.errors || res.data };
    } catch (err) {
        return { success: false, error: err.message || err.toString() };
    }
}

module.exports = { createDnsRecord };
