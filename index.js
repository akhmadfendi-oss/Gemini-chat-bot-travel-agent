const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const { saveLead } = require('./database');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
const path = require('path');
app.use(express.static(path.join(__dirname, 'public'))); // Menyajikan file frontend statis
// Inisialisasi Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Endpoint Chat
app.post('/api/chat', async (req, res) => {
    try {
        const { conversation } = req.body;

        // Format histori percakapan dari frontend ke format Gemini API
        const formattedContents = conversation.map(msg => ({
            role: msg.role, // 'user' atau 'model'
            parts: [{ text: msg.text }]
        }));

        // Panggil Gemini AI dengan persona Travel Agent dan Function Calling
        let response;
        let retries = 3;
        
        while (retries > 0) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-3.5-flash',
                    contents: formattedContents,
                    config: {
                        temperature: 0.7, // Kreativitas seimbang untuk rekomendasi travel
                        systemInstruction: "Kamu adalah 'NusaBot', asisten virtual travel agent profesional kelas atas. Tugasmu adalah merekomendasikan destinasi wisata Indonesia, menyusun itinerary, dan memberikan tips perjalanan dengan ramah, elegan, dan persuasif. STRATEGI KOMUNIKASI (SANGAT PENTING): 1. Selalu balas setiap chat dengan pertanyaan baru yang relevan di akhir pesan untuk menjaga interaksi (misal menanyakan preferensi, durasi liburan, atau siapa saja yang ikut). 2. Fokus melayani pertanyaan customer hingga tuntas tanpa memaksa meminta kontak. 3. JIKA DAN HANYA JIKA customer sudah selesai bertanya, sudah menentukan destinasi, atau ingin mengakhiri sesi, BARULAH kamu gunakan teknik 'closing' dengan menanyakan secara sopan: Nama lengkap, Nomor WhatsApp, dan Email mereka agar tim sales human expert bisa menindaklanjuti. JANGAN meminta data kontak saat mereka masih asyik bertanya. JANGAN PERNAH memanggil fungsi/tool save_lead jika belum mendapatkan ketiga data kontak tersebut secara lengkap.",
                        tools: [{
                            functionDeclarations: [{
                                name: 'save_lead',
                                description: 'Menyimpan data lead customer ke database. Panggil fungsi ini SECARA OTOMATIS jika dan hanya jika customer sudah memberikan informasi: Nama, Nomor WhatsApp, dan Email.',
                                parameters: {
                                    type: 'OBJECT',
                                    properties: {
                                        nama: { type: 'STRING', description: 'Nama lengkap customer' },
                                        whatsapp: { type: 'STRING', description: 'Nomor WhatsApp customer' },
                                        email: { type: 'STRING', description: 'Alamat email customer' }
                                    },
                                    required: ['nama', 'whatsapp', 'email']
                                }
                            }]
                        }]
                    }
                });
                break; // Berhasil, keluar dari loop
            } catch (err) {
                if (err.status === 503 && retries > 1) {
                    console.log(`Mendapat error 503 dari Gemini API. Mencoba ulang... (${retries - 1} percobaan tersisa)`);
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik sebelum mencoba lagi
                } else {
                    throw err; // Lempar error jika bukan 503 atau retries habis
                }
            }
        }

        // Cek jika AI melakukan pemanggilan fungsi (Function Calling)
        console.log("Gemini Response:", JSON.stringify(response, null, 2));
        
        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            console.log("Function Call Detected:", call.name, call.args);
            if (call.name === 'save_lead') {
                const { nama, whatsapp, email } = call.args;
                
                // Cek jika ada data yang kurang
                if (!nama || !whatsapp || !email) {
                    return res.json({ result: "Mohon maaf, boleh lengkapi Nama, Nomor WhatsApp, dan Email terlebih dahulu agar tim kami bisa mencatat pesanan Kakak? 😊" });
                }
                
                // Simpan ke database
                await saveLead(nama, whatsapp, email);
                
                // Kembalikan pesan sukses yang elegan dengan Teknik Referral & Tagline
                return res.json({ 
                    result: `**Terima kasih banyak atas kepercayaannya, Kak ${nama}!** 🎉\n\nData Kakak (WA: *${whatsapp}*, Email: *${email}*) sudah masuk ke sistem prioritas VIP kami.\n\nAgen *travel expert* kami akan segera menghubungi Kakak melalui WhatsApp untuk mewujudkan liburan impian tersebut.\n\nOh ya, jika ada keluarga, sahabat, atau rekan kerja Kakak yang juga sedang butuh "healing" dan mencari paket liburan estetik, jangan ragu untuk merekomendasikan kami ya, Kak! Kami pasti akan memberikan servis terbaik untuk orang-orang terdekat Kakak. 😉\n\nSekali lagi terima kasih banyak!\n\n🌟 **NusaBot Travel: Jelajah Mudah, Kenangan Indah.** 🌟` 
                });
            } else {
                return res.json({ result: "Mohon maaf, terjadi kesalahan pada sistem internal kami." });
            }
        }

        // Jika tidak ada panggilan fungsi, kirim balasan teks biasa ke frontend
        res.json({ result: response.text || "Mohon maaf, saya belum memahami pertanyaan tersebut." });

    } catch (error) {
        console.error('Error memanggil Gemini API:', error);
        res.status(500).json({ error: 'Gagal mendapatkan respons dari server.' });
    }
});

app.listen(port, () => {
    console.log(`Server TravelBot berjalan di http://localhost:${port}`);
});

// Export app untuk Vercel Serverless Function
module.exports = app;