document.addEventListener('DOMContentLoaded', async () => {
  const mailtoConfig = await fetch('/mailto.json', { cache: 'no-store' }).then(r => r.json());
  const form        = document.getElementById('email-form');
  const includeCtl  = document.getElementById('include-default-paras');
  const copyLink    = document.getElementById('copy-email');
  const confirmMsg  = document.getElementById('copy-confirm');

  function buildEmailText() {
    const cfg      = mailtoConfig.bodyConfig;
    const name     = form['full-name'].value.trim();
    const addr     = form['address'].value.trim();
    const personal = form['personal-message'].value.trim();
    const surname  = form['councillor-surname'].value.trim();

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
      const text = buildEmailText();
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
    const councillor = form['councillor-email'].value.trim() || '';

    const subject   = encodeURIComponent(mailtoConfig.subject);
    const fullText  = buildEmailText().split('\n\n').slice(1).join('\n\n');
    const bodyParam = encodeURIComponent(fullText);
    const ccList    = mailtoConfig.cc.map(encodeURIComponent).join(',');

    const link =
      `mailto:${encodeURIComponent(councillor)}` +
      `?cc=${ccList}` +
      `&subject=${subject}` +
      `&body=${bodyParam}`;

    window.open(link, '_blank');
  });
});