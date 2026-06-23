const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Pastikan kredensial Supabase sudah diisi
if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://YOUR_PROJECT_ID.supabase.co') {
    console.warn("⚠️ Peringatan: SUPABASE_URL atau SUPABASE_KEY belum di-set di .env. Fitur database tidak akan berfungsi.");
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// Fungsi untuk menyimpan lead ke dalam database
async function saveLead(nama, whatsapp, email) {
    if (!supabaseUrl || supabaseUrl === 'https://YOUR_PROJECT_ID.supabase.co') {
        console.warn("⚠️ Data tidak disimpan karena konfigurasi Supabase belum lengkap.");
        return null;
    }

    const { data, error } = await supabase
        .from('leads')
        .insert([{ nama, whatsapp, email }])
        .select();

    if (error) {
        console.error('Error inserting lead to Supabase:', error.message);
        throw error;
    }

    console.log(`Lead baru disimpan di Supabase: ${nama} (${whatsapp})`);
    return data;
}

module.exports = {
    saveLead
};
