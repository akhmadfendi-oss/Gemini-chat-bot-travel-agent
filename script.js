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
        // 3. Kirim POST request ke backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ conversation: conversationHistory })
        });

        const data = await response.json();

        // 4. Hapus status thinking dan tampilkan respons
        removeThinkingMessage();

        if (data.result) {
            appendMessage(data.result, 'bot');
            // Simpan jawaban bot ke history
            conversationHistory.push({ role: "model", text: data.result });
        } else {
            appendMessage("Maaf, sepertinya radar saya sedang gangguan. (Failed to get response)", 'bot');
            conversationHistory.pop(); // FIX: hapus pesan user agar history tidak rusak
        }

    } catch (error) {
        console.error(error);
        removeThinkingMessage();
        appendMessage("Maaf, koneksi ke server terputus.", 'bot');
        conversationHistory.pop(); // FIX: hapus pesan user agar history tidak rusak
    }
});