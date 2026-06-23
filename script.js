const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

// Background Slider Logic
const slides = document.querySelectorAll('.bg-slide');
let currentSlide = 0;

function nextSlide() {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
}

// Change background every 5 seconds
setInterval(nextSlide, 5000);

// Array untuk menyimpan riwayat percakapan agar bot memiliki konteks memori
let conversationHistory = [];

function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'slide-up');

    if (sender === 'user') {
        messageDiv.classList.add('user-message');
        messageDiv.innerHTML = `<div class="text">${formatText(text)}</div>`;
    } else if (sender === 'bot') {
        messageDiv.classList.add('bot-message');
        messageDiv.innerHTML = `
            <div class="avatar"><img src="avatar.png" alt="CS"></div>
            <div class="text">${formatText(text)}</div>
        `;
    } else if (sender === 'thinking') {
        messageDiv.classList.add('bot-message');
        messageDiv.id = 'thinking-msg';
        messageDiv.innerHTML = `
            <div class="avatar"><img src="avatar.png" alt="CS"></div>
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function formatText(text) {
    let formatted = text;
    
    // Headings
    formatted = formatted.replace(/^#### (.*?)$/gm, '<h4 class="md-heading">$1</h4>');
    formatted = formatted.replace(/^### (.*?)$/gm, '<h3 class="md-heading">$1</h3>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h2 class="md-heading">$1</h2>');
    
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Bullet points (convert * or - at the start of a line)
    formatted = formatted.replace(/^[\*\-] (.*?)$/gm, '<li class="md-list-item">$1</li>');
    
    // Wrap consecutive <li> in <ul>
    formatted = formatted.replace(/(<li class="md-list-item">.*?<\/li>(?:\n<li class="md-list-item">.*?<\/li>)*)/g, '<ul class="md-list">$1</ul>');
    
    // Italic (after bullets are processed, remaining *text* is italic)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Newlines
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Cleanup <br> around block elements so it doesn't look weird
    formatted = formatted.replace(/<\/h\d><br>/g, function(match) { return match.replace('<br>', ''); });
    formatted = formatted.replace(/<br><ul/g, '<ul');
    formatted = formatted.replace(/<\/ul><br>/g, '</ul>');
    formatted = formatted.replace(/<\/li><br>/g, '</li>');
    
    return formatted;
}

function removeThinkingMessage() {
    const thinkingMsg = document.getElementById('thinking-msg');
    if (thinkingMsg) {
        thinkingMsg.remove();
    }
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Tampilkan pesan user
    appendMessage(text, 'user');
    userInput.value = '';

    // Masukkan ke history
    conversationHistory.push({ role: "user", text: text });

    // 2. Tampilkan status "Thinking..."
    appendMessage("", 'thinking');

    try {
        const GEMINI_API_KEY = "AQ.Ab8RN6IAQEeMBK5Jd1D7zr7yix0znhfsphX_E-Qyv4yJPBOo9w";
        const SUPABASE_URL = "https://wapihuzgpejbgskzbfit.supabase.co";
        const SUPABASE_KEY = "sb_publishable_JV0h7bF8KbyZgR5VW7D1YA_0KQuYaKMs";

        const formattedContents = conversationHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const requestBody = {
            systemInstruction: {
                parts: [{ text: "Kamu adalah 'NusaBot', asisten virtual travel agent profesional kelas atas. Tugasmu adalah merekomendasikan destinasi wisata Indonesia, menyusun itinerary, dan memberikan tips perjalanan dengan ramah, elegan, dan persuasif. STRATEGI KOMUNIKASI (SANGAT PENTING): 1. Selalu balas setiap chat dengan pertanyaan baru yang relevan di akhir pesan untuk menjaga interaksi (misal menanyakan preferensi, durasi liburan, atau siapa saja yang ikut). 2. Fokus melayani pertanyaan customer hingga tuntas tanpa memaksa meminta kontak. 3. JIKA DAN HANYA JIKA customer sudah selesai bertanya, sudah menentukan destinasi, atau ingin mengakhiri sesi, BARULAH kamu gunakan teknik 'closing' dengan menanyakan secara sopan: Nama lengkap, Nomor WhatsApp, dan Email mereka agar tim sales human expert bisa menindaklanjuti. JANGAN meminta data kontak saat mereka masih asyik bertanya. JANGAN PERNAH memanggil fungsi/tool save_lead jika belum mendapatkan ketiga data kontak tersebut secara lengkap." }]
            },
            contents: formattedContents,
            generationConfig: { temperature: 0.7 },
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
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        removeThinkingMessage();

        if (data.error) {
            console.error("Gemini Error:", data.error);
            appendMessage("Maaf, radar saya sedang gangguan. (" + data.error.message + ")", 'bot');
            conversationHistory.pop();
            return;
        }

        // Cek Function Calling
        const candidate = data.candidates && data.candidates[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
            appendMessage("Maaf, sepertinya radar saya sedang gangguan. (Empty response)", 'bot');
            conversationHistory.pop();
            return;
        }

        const parts = candidate.content.parts;
        let functionCall = null;
        let textResponse = null;

        for (const part of parts) {
            if (part.functionCall) functionCall = part.functionCall;
            if (part.text) textResponse = part.text;
        }

        if (functionCall && functionCall.name === 'save_lead') {
            const { nama, whatsapp, email } = functionCall.args;
            
            if (!nama || !whatsapp || !email) {
                const msg = "Mohon maaf, boleh lengkapi Nama, Nomor WhatsApp, dan Email terlebih dahulu agar tim kami bisa mencatat pesanan Kakak? 😊";
                appendMessage(msg, 'bot');
                conversationHistory.push({ role: "model", text: msg });
                return;
            }

            // Simpan ke Supabase secara langsung
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ nama, whatsapp, email })
                });
            } catch (err) {
                console.error("Supabase Error:", err);
            }

            const successMsg = `**Terima kasih banyak atas kepercayaannya, Kak ${nama}!** 🎉\n\nData Kakak (WA: *${whatsapp}*, Email: *${email}*) sudah masuk ke sistem prioritas VIP kami.\n\nAgen *travel expert* kami akan segera menghubungi Kakak melalui WhatsApp untuk mewujudkan liburan impian tersebut.\n\nOh ya, jika ada keluarga, sahabat, atau rekan kerja Kakak yang juga sedang butuh "healing" dan mencari paket liburan estetik, jangan ragu untuk merekomendasikan kami ya, Kak! Kami pasti akan memberikan servis terbaik untuk orang-orang terdekat Kakak. 😉\n\nSekali lagi terima kasih banyak!\n\n🌟 **NusaBot Travel: Jelajah Mudah, Kenangan Indah.** 🌟`;
            
            appendMessage(successMsg, 'bot');
            conversationHistory.push({ role: "model", text: successMsg });

        } else if (textResponse) {
            appendMessage(textResponse, 'bot');
            conversationHistory.push({ role: "model", text: textResponse });
        } else {
            appendMessage("Maaf, saya tidak mengerti.", 'bot');
            conversationHistory.pop();
        }

    } catch (error) {
        console.error(error);
        removeThinkingMessage();
        appendMessage("Maaf, koneksi ke server terputus.", 'bot');
        conversationHistory.pop();
    }
});