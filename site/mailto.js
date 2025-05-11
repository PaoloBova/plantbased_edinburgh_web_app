document.addEventListener('DOMContentLoaded', async () => {
  // dynamically load list of config files
  const list = await fetch('/mailto_configs/index.json', { cache: 'no-store' })
    .then(r => r.json());
  const chosenFile = list[Math.floor(Math.random() * list.length)];
  const mailtoConfig = await fetch(`/mailto_configs/${chosenFile}`, { cache: 'no-store' })
    .then(r => r.json());

  const councillors  = await fetch('/councillors.json', { cache: 'no-store' }).then(r => r.json());
  const form         = document.getElementById('email-form');
  const hpField      = document.getElementById('hp');
  const wardSelect   = document.getElementById('ward-select');
  const includeCtl   = document.getElementById('include-default-paras');
  const queue        = document.getElementById('email-queue');
  const buttonsDiv   = document.getElementById('email-buttons');
  const progress     = document.getElementById('email-progress');

  let readyToRender = false;
  // unblock after 2s
  setTimeout(() => { readyToRender = true; renderButtons(); }, 1000);

  // helper to clear previous buttons
  function clearButtons() {
    buttonsDiv.innerHTML = '';
    queue.classList.add('hidden');
  }

  // populate ward dropdown, sorted by ward number 1–17
  const wards = [...new Set(councillors.map(c => c.Ward))];
  wards.sort((a, b) => {
    const na = parseInt(a.match(/Ward\s+(\d+)/)?.[1] || 0, 10);
    const nb = parseInt(b.match(/Ward\s+(\d+)/)?.[1] || 0, 10);
    return na - nb || a.localeCompare(b);
  });

  wards.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w; opt.textContent = w;
    wardSelect.append(opt);
  });
  wardSelect.addEventListener('change', renderButtons);

  function buildEmailText(surnames, index) {
    const cfg      = mailtoConfig.bodyConfig;
    const name     = form['full-name'].value.trim();
    const addr     = form['address'].value.trim();
    const personal = form['personal-message'].value.trim();
    const surname  = surnames[index];

    const greeting = surname
      ? `${cfg.greeting} ${surname},`
      : `${cfg.greeting},`;

    const firstPara = personal || cfg.opening_paragraph;
    const later     = includeCtl.checked ? (cfg.later_paragraphs || []) : [];
    const closing   = cfg.closing;
    const signature = name;
    const parts     = [ greeting, firstPara, ...later, closing, signature, addr ];

    return `Subject: ${mailtoConfig.subject}\n\n${parts.join('\n\n')}`;
  }

  // Render buttons dynamically
  function renderButtons() {
    // bot check: honeypot filled or not ready yet?
    if (hpField.value || !readyToRender) {
      clearButtons();
      return;
    }

    clearButtons();
    const ward = wardSelect.value;
    let list, surnames, fullNames;
    if (!ward) {
      // fallback: generic single row
      list = [''];
      surnames  = [''];
      fullNames = [''];
    } else {
      const filtered = councillors.filter(c => c.Ward === ward);
      list      = filtered.map(c => c.Email);
      surnames  = filtered.map(c => c.Surname);
      fullNames = filtered.map(c => c['Full Name']);
    }

    queue.classList.remove('hidden');
    progress.textContent = ward
      ? `0 of ${list.length} emails ready`
      : 'Ready to open email';

    list.forEach((addr, i) => {
      const container = document.createElement('div');
      container.className = 'email-button';

      // Open‐email button (generic if no ward)
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'email-open-btn whitespace-normal';
      openBtn.textContent = ward
        ? `Open email for Councillor ${fullNames[i]}`
        : 'Open email';
      openBtn.addEventListener('click', () => {
        const body = encodeURIComponent(
          buildEmailText(surnames, i)
            .split('\n\n').slice(1).join('\n\n')
        );
        const subject = encodeURIComponent(mailtoConfig.subject);
        const cc = mailtoConfig.cc.map(encodeURIComponent).join(',');
        const link = `mailto:${addr}?cc=${cc}&subject=${subject}&body=${body}`;
        window.open(link, '_blank');
        progress.textContent = `${i + 1} of ${list.length} emails ready`;
      });

      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'email-copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => {
        // include recipients header plus full email body
        const toLine = `To: ${addr}`;
        const ccLine = mailtoConfig.cc.length
          ? `CC: ${mailtoConfig.cc.join(',')}`
          : '';
        const header = ccLine ? `${toLine}\n${ccLine}` : toLine;
        const fullText = `${header}\n\n${buildEmailText(surnames, i)}`;
        navigator.clipboard.writeText(fullText)
          .then(() => {
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.textContent = 'Copy';
              copyBtn.classList.remove('copied');
            }, 2000);
          });
      });

      container.append(openBtn, copyBtn);
      buttonsDiv.appendChild(container);
    });
  }

  // initial attempt (will no-op until delay)
  renderButtons();

  // re-render whenever ward or any form input changes
  wardSelect.addEventListener('change', renderButtons);
  form.querySelectorAll('input, textarea').forEach(el =>
    el.addEventListener('input', renderButtons)
  );
});