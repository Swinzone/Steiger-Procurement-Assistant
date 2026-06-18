# Steiger Procurement Assistant — Deployment Guide

This folder is ready to deploy on Vercel. Your Anthropic API key stays on the
server. Whoever opens the site (Martin, anyone) never sees it and never has to
enter anything.

## Folder structure

```
steiger-vercel/
  public/
    index.html        <- the tool itself
  api/
    chat.js           <- serverless function that talks to Anthropic
  package.json
  vercel.json
```

## What happens behind the scenes

The tool calls `/api/chat` instead of calling Anthropic directly. That function
(`api/chat.js`) reads your key from an environment variable on Vercel's servers
and forwards the request. The key is never in the HTML and never reaches the
browser.

## Deploy in 5 steps

### Option A — fastest, no command line

1. Go to https://vercel.com and sign in (free account is fine).
2. Click "Add New" then "Project", then "Import" a folder. Drag this whole
   `steiger-vercel` folder in, or push it to a GitHub repo and import that.
3. Before clicking Deploy, open "Environment Variables" and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key (starts with sk-ant-...)
4. Click Deploy. Wait about a minute.
5. Vercel gives you a URL like `steiger-procurement.vercel.app`. Open it.
   Everything works immediately. Send that URL to whoever you want.

### Option B — command line

```
npm i -g vercel
cd steiger-vercel
vercel
# follow prompts, then set the key:
vercel env add ANTHROPIC_API_KEY
# paste your key when asked, choose Production
vercel --prod
```

## Updating the key later

Vercel dashboard -> your project -> Settings -> Environment Variables ->
edit `ANTHROPIC_API_KEY` -> redeploy.

## Cost

Each AI action (a price search, a chat reply, an RFP draft) is a single call to
Claude Sonnet and typically costs a fraction of a cent. Vercel's free tier
covers the hosting.

## Security notes

- The key lives only in Vercel's environment variables, never in the code.
- Anyone with the URL can use the tool and therefore spend against your key.
  If you want to limit access, add Vercel's password protection
  (Settings -> Deployment Protection) or share the URL privately.
- Do not commit your actual key into any file. Only set it as an environment
  variable in Vercel.
