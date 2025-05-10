document.addEventListener('DOMContentLoaded', () => {
  const chatWindow = document.getElementById('chat-window');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // Display user message
    appendMessage('You', userMessage);
    chatInput.value = '';

    // Send message to serverless function
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage })
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

    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('flex', 'items-start');

    if (sender === 'You') {
      messageDiv.classList.add('bg-emerald-100', 'self-end', 'text-right');
      messageWrapper.classList.add('justify-end');
    } else if (sender === 'Assistant') {
      messageDiv.classList.add('bg-gray-100', 'self-start', 'text-left');
      messageWrapper.classList.add('justify-start');
    } else {
      messageDiv.classList.add('bg-red-100', 'text-red-800', 'self-start', 'text-left');
      messageWrapper.classList.add('justify-start');
    }

    messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messageWrapper.appendChild(messageDiv);
    chatWindow.appendChild(messageWrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});
