const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    const formattedContents = [
        { role: 'user', parts: [{ text: 'nama saya fendi, wa 08683745222, email fendi@mail.com' }] },
        { role: 'model', parts: [{ text: '**Terima kasih banyak...**' }] },
        { role: 'user', parts: [{ text: 'ada rekomndasilain ga' }] }
    ];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: formattedContents,
            config: {
                temperature: 0.7,
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

        console.log("Function Calls:", response.functionCalls);
        console.log("Text:", response.text);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
