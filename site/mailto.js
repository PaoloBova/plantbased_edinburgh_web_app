document.addEventListener('DOMContentLoaded', async () => {
  const mailtoConfig = await fetch('/mailto.json', { cache: 'no-store' }).then(r => r.json());
  const form         = document.getElementById('email-form');
  const includeCtl   = document.getElementById('include-default-paras');
  const copyLink     = document.getElementById('copy-email');
  const confirmMsg   = document.getElementById('copy-confirm');
    const listContainer= document.getElementById('councillors-list');
  const addBtn       = document.getElementById('add-councillor');
  const queue        = document.getElementById('email-queue');
  const buttonsDiv   = document.getElementById('email-buttons');
  const genBtn       = form.querySelector('button[type="submit"]');

  // helper to reset queue UI
  function resetQueue() {
    queue.classList.add('hidden');
    buttonsDiv.innerHTML = '';
    genBtn.classList.remove('hidden');
    copyLink.classList.remove('hidden');
  }

  // clear queue whenever user edits councillor info
  listContainer.addEventListener('input', resetQueue);
  addBtn.addEventListener('click', resetQueue);

  // add new empty row
  addBtn.addEventListener('click', () => {
    const row = listContainer.firstElementChild.cloneNode(true);
    row.querySelectorAll('input').forEach(i => i.value = '');
    listContainer.append(row);
  });

  // delegate remove
  listContainer.addEventListener('click', e => {
    if (e.target.matches('.remove-councillor')) {
      const rows = listContainer.querySelectorAll('.councillor-row');
      if (rows.length > 1) e.target.closest('.councillor-row').remove();
    }
  });

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

  if (copyLink) {
    copyLink.addEventListener('click', e => {
      e.preventDefault();
      const text = buildEmailText([], 0);
      navigator.clipboard.writeText(text)
        .then(() => {
          confirmMsg.classList.remove('hidden');
          setTimeout(() => confirmMsg.classList.add('hidden'), 3000);
        })
        .catch(console.error);
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    resetQueue(); // hide any prior queue
    // collect each councillor row
    const rows = Array.from(listContainer.querySelectorAll('.councillor-row'));
    const list = rows.map(r => r.querySelector('[name="councillor-email"]').value.trim())
                     .filter(Boolean);
    const surnames = rows.map(r => r.querySelector('[name="councillor-surname"]').value.trim());
    const subject   = encodeURIComponent(mailtoConfig.subject);
    const bodyParam = encodeURIComponent(
      buildEmailText(surnames, 0).split('\n\n').slice(1).join('\n\n')
    );
    const ccList    = mailtoConfig.cc.map(encodeURIComponent).join(',');
    // if no councillor specified, open one blank‐to mail draft
    if (!list.length) {
      const link = `mailto:?cc=${ccList}&subject=${subject}&body=${bodyParam}`;
      window.open(link, '_blank');
      return;
    }
    // hide original submit & copy link
    genBtn.classList.add('hidden');
    copyLink.classList.add('hidden');

    // prepare queue UI
    queue.classList.remove('hidden');
    const progress   = document.getElementById('email-progress');
    progress.textContent = `0 of ${list.length} emails sent`;

    // create a mailto button for each
    let sentCount = 0;
    list.forEach((addr, i) => {
      // container for paired buttons
      const container = document.createElement('div');
      container.className = 'flex items-center space-x-2';

      // open‐email button
      const openBtn = document.createElement('button');
      openBtn.textContent = `Open email to ${addr}`;
      openBtn.type = 'button';
      openBtn.className = 'flex-1 px-4 py-2 bg-emerald-100 rounded-md hover:bg-emerald-200';
      openBtn.addEventListener('click', () => {
        // correct mailto syntax
        const link = `mailto:${encodeURIComponent(addr)}?` +
          `cc=${mailtoConfig.cc.map(encodeURIComponent).join(',')}` +
          `&subject=${encodeURIComponent(mailtoConfig.subject)}` +
          `&body=${encodeURIComponent(buildEmailText(surnames, i).split('\n\n').slice(1).join('\n\n'))}`;

        window.open(link, '_blank');
        openBtn.disabled = true;
        sentCount++;
        progress.textContent = `${sentCount} of ${list.length} emails sent`;
      });

      // copy‐email button
      const copyBtn = document.createElement('button');
      copyBtn.textContent = `Copy email for ${addr}`;
      copyBtn.type = 'button';
      copyBtn.className = 'px-3 py-1 text-sm text-emerald-600 hover:underline';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(buildEmailText(surnames, i))
          .then(() => {
            confirmMsg.classList.remove('hidden');
            setTimeout(() => confirmMsg.classList.add('hidden'), 3000);
          })
          .catch(console.error);
      });

      container.append(openBtn, copyBtn);
      buttonsDiv.appendChild(container);
    });
  });
});