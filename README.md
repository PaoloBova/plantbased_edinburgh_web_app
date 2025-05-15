# Plantbased Edinburgh

A simple static web app to help residents easily email their local councillors advocating for plant-based policies.  
Currently configured to ask Edinburgh Council to adopt plant-based menus in council-run facilities.

---

## 🍃 Purpose

- Empower the public to push for plant-based policies via pre-filled, personalized emails.  
- Provide campaign groups with a forkable template for any city or region.  
- Offer a clear codebase for new contributors to improve or adapt the app.

---

## 🚀 For Other Campaign Groups

1. **Fork this repo** on GitHub.  
2. **Edit HTML**
   - For most groups, it is probably sufficient to replace all mentions of
   `Edinburgh` in `index.html` with the name of your jurisdiction.
3. **Customize email templates**  
   - In `site/mailto_configs/`, replace `mailto_config_*.json` with your own files.  
   - Each config must follow this shape:
     ```json
     {
       "cc": ["optional_cc@domain.com"],
       "subject": "Your email subject",
       "bodyConfig": {
         "greeting": "Dear Councillor",
         "opening_paragraph": "...",
         "later_paragraphs": ["...","..."],
         "closing": "Kind regards,",
         "signature": "[fullName]"
       }
     }
     ```
4. **Populate councillors data**  
   - Replace `site/councillors.json` with your city’s contacts.  
   - Columns: `Full Name`, `Surname`, `Email`, `Ward`, `Party`, plus optional `Phone`/`Mobile`.  
   - Tip: Use an AI assistant (e.g. ChatGPT) to scrape and format your council’s directory into this JSON. I advise asking the best AI assistant you have with search capabilties to collect the public data from your council's website and to directly present it in full to you as a CSV. If the AI gets stuck and tries to write code to do this, ask it to just read the data and create the file directly. Finally, make sure to double-check the data.

If you hit any barrier, please [open an issue](https://github.com/your-org/plantbased-edinburgh/issues) or DM me on GitHub — happy to help non-technical teams get set up!

---

## 👩‍💻 For Developers & Contributors

### Prerequisites  
- Node.js ≥20  
- A Netlify account (https://www.netlify.com/)  
- Netlify CLI  
  ```bash
  npm install -g netlify-cli
  ```

### Local Setup  
```bash
# 1. Clone repository
git clone https://github.com/your-org/plantbased-edinburgh.git
cd plantbased-edinburgh

# 2. Install dependencies (includes TailwindCSS, PostCSS, Autoprefixer)
npm install

# 3. Build CSS
npm run build:css

# 4. Start local dev server
netlify dev
```

### Deploy to Netlify  
- In the Netlify dashboard, **New site from Git** → connect this repo  
- In settings, set the publish directory to:
  ```
  site
  ```
- Run the following commands from the project folder in your local terminal:
  ```bash
  npm run build:css
  netlify deploy --dir="site"
  ```  

_Note: Email sending is client-side via `mailto:` links. No backend required._

---

## 📂 Project Structure

```
├── site/
│   ├── index.html
│   ├── mailto.js
│   ├── main.js
│   ├── styles.css
│   ├── councillors.json
│   └── mailto_configs/
│       ├── index.json
│       ├── mailto_config_1.json
│       └── mailto_config_2.json
├── styles/
│   └── index.css
├── postcss.config.js
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 🤝 Contributing

1. Fork & clone  
2. Create a feature branch  
3. Commit & push  
4. Open a Pull Request — friendly feedback is welcome!

---

## 📜 License

MIT © Paolo Bova
