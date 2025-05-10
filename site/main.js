document.addEventListener('DOMContentLoaded', () => {
  const chatWindow = document.getElementById('chat-window');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  let systemPrompt = "";
  fetch('/system_prompt.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => { systemPrompt = data.systemPrompt; })
    .catch(err => console.error('Error loading system prompt:', err));

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // Display user message
    appendMessage('You', userMessage);
    chatInput.value = '';

    // Send message to serverless function
    try {
      const body = JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: body
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      appendMessage('Assistant', data.reply);
    } catch (error) {
      console.error('Error:', error);
      appendMessage('Error', 'Sorry, something went wrong.');
    }
  });

  function appendMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('p-3', 'rounded-lg', 'shadow', 'max-w-full', 'break-words');

    if (sender === 'You') {
      messageDiv.classList.add('bg-emerald-100', 'self-end', 'text-right');
    } else if (sender === 'Assistant') {
      messageDiv.classList.add('bg-gray-100', 'self-start', 'text-left');
    } else {
      messageDiv.classList.add('bg-red-100', 'text-red-800', 'self-start', 'text-left');
    }

    messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;

    if (sender === 'Assistant') {
      const btn = document.createElement('button');
      btn.textContent = 'Use in email';
      btn.type = 'button';
      btn.classList.add('mt-1', 'text-sm', 'text-emerald-600', 'hover:underline');
      btn.addEventListener('click', () => {
        document.getElementById('personal-message').value = text;
      });
      messageDiv.appendChild(btn);
    }

    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});
