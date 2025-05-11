/**
 * @typedef {{ features: { chat: boolean } }} AppConfig
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load typed config
  fetch('/config.json')
    .then(r => r.json())
    .then(/** @param {AppConfig} cfg */ cfg => {
      const chatWrapper = document.getElementById('chat-wrapper');
      if (!cfg.features.chat) {
        if (chatWrapper) chatWrapper.remove();
        return;
      }
      if (chatWrapper) chatWrapper.hidden = false;

      const chatWindow = document.getElementById('chat-window');
      const chatForm = document.getElementById('chat-form');
      const chatInput = document.getElementById('chat-input');
      const chatError = document.getElementById('chat-error');
      const maxChatLen = 1000;
      const chatButton = chatForm.querySelector('button[type="submit"]');

      // initial guidance
      appendMessage('Assistant',
        'Hello! I’m here to help you personalize your email. ' +
        'Tell me briefly why this issue matters to you, and I’ll craft a concise email snippet ' +
        'to add at the beginning of your message.'
      );

      let systemPrompt = "";
      fetch('/system_prompt.json', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { systemPrompt = data.systemPrompt; })
        .catch(err => console.error('Error loading system prompt:', err));

      chatInput.addEventListener('input', () => {
        const len = chatInput.value.length;
        chatError.classList.toggle('hidden', len < maxChatLen);
        chatButton.disabled = len >= maxChatLen;
      });

      chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (chatInput.value.length >= maxChatLen) return;

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

          // if reply is an object, format it
          if (typeof data.reply === 'object') {
            appendMessage('Assistant', formatEmail(data.reply));
          } else {
            appendMessage('Assistant', data.reply);
          }
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

      // build an email preview from JSON
      function formatEmail(email) {
        const parts = [];
        // parts.push(`Subject: ${email.subject}`);
        // parts.push(`${email.opening_address}`);
        parts.push(`${email.opening_paragraph}`);
        if (Array.isArray(email.later_paragraphs) && email.later_paragraphs.length) {
          parts.push(email.later_paragraphs.join('\n\n'));
        }
        // parts.push(`${email.closing}`);
        // parts.push(`${email.signature}`);
        return parts.join('\n\n');
      }
    })
    .catch(err => {
      console.error('Could not load config:', err);
      // fail-safe: remove chat UI
      const chatWrapper = document.getElementById('chat-wrapper');
      if (chatWrapper) chatWrapper.remove();
    });

  const form = document.getElementById('email-form');
  const fields = ['full-name', 'address', 'personal-message'];

  fields.forEach(id => {
    const input = document.getElementById(id);
    const error = document.getElementById(`${id}-error`);

    // replace single blur listener with a shared validate function
    const validate = () => {
      if (!input.checkValidity()) {
        error.textContent = input.validationMessage;
        error.classList.remove('hidden');
      } else {
        error.textContent = '';
        error.classList.add('hidden');
      }
    };

    input.addEventListener('blur', validate);
    input.addEventListener('input', validate);
  });

  form.addEventListener('submit', e => {
    let hasError = false;
    fields.forEach(id => {
      const input = document.getElementById(id);
      const error = document.getElementById(`${id}-error`);
      if (!input.checkValidity()) {
        error.textContent = input.validationMessage;
        error.classList.remove('hidden');
        hasError = true;
      }
    });
    if (hasError) e.preventDefault();
  });
});
