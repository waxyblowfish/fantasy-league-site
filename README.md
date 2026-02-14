# Fantasy Football League Site

A comprehensive fantasy football league management website with Sleeper API integration and AI-powered weekly recaps.

## 🚀 Quick Deploy to Vercel

1. **Upload all these files to your GitHub repository**
2. **Go to [vercel.com](https://vercel.com) and click "Add New" → "Project"**
3. **Import your GitHub repository**
4. **Click "Deploy"** - Vercel will auto-detect everything!

That's it! Your site will be live at `https://your-project.vercel.app`

## 📁 Project Structure

```
fantasy-league-site/
├── src/
│   ├── App.jsx          # Main application (your fantasy site)
│   ├── main.jsx         # React entry point
│   └── index.css        # Tailwind CSS imports
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── postcss.config.js    # PostCSS configuration
└── .gitignore          # Git ignore rules
```

## 🔧 Local Development (Optional)

If you want to run locally:

```bash
npm install
npm run dev
```

Open http://localhost:5173

## ✨ Features

- ✅ Real-time Sleeper API integration
- ✅ AI-powered weekly recaps (auto-generated on Tuesdays)
- ✅ Interactive keeper cost calculator
- ✅ Live standings and matchups
- ✅ 6 dedicated pages: Home, Current, History, Waivers, Data, Draft

## 🛠️ Troubleshooting

**Build fails on Vercel?**
- Make sure all files are uploaded to GitHub
- Check that `src/App.jsx` exists
- Verify `package.json` has all dependencies

**Data not loading?**
- Data only loads when deployed (not locally without workarounds)
- Check browser console (F12) for errors
- Verify your league ID in `src/App.jsx` line 4

**Need help?**
Open an issue or check the deployment guide!
