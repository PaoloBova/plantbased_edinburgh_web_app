document.addEventListener('DOMContentLoaded', () => {
    fetch('/mailto.json', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const mailtoLink = data.mailto;
        const emailButton = document.getElementById('cta-email');
        if (emailButton && mailtoLink) {
          emailButton.setAttribute('href', mailtoLink);
        } else {
          console.error('Email button or mailto link not found.');
        }
      })
      .catch(error => {
        console.error('Error fetching mailto link:', error);
      });
  });