const { createClient } = require('@supabase/supabase-js');
const settings = require('../settings');

const supabaseUrl = settings.supabase_url;
const supabaseKey = settings.supabase_key;

async function initPasswordTable() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('Supabase not configured');
        return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Checking system_settings table...');
    
    const { data: existingConsole } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'console_password')
        .single();
    
    if (!existingConsole) {
        console.log('Inserting default console_password...');
        await supabase
            .from('system_settings')
            .insert({ key: 'console_password', value: 'man23148' });
    } else {
        console.log('console_password exists:', existingConsole.value);
    }
    
    const { data: existingWeb } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'web_password')
        .single();
    
    if (!existingWeb) {
        console.log('Inserting default web_password...');
        await supabase
            .from('system_settings')
            .insert({ key: 'web_password', value: 'man23148' });
    } else {
        console.log('web_password exists:', existingWeb.value);
    }
    
    console.log('Password initialization complete!');
}

initPasswordTable().catch(console.error);
