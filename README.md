<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1a0d8439-d7c2-4fcc-b177-aed41738ffc1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

This project is configured for the repository name `mirai-app`.

1. Push to the `main` branch.
2. Open GitHub repository settings.
3. Go to **Settings > Pages**.
4. In **Build and deployment**, set **Source** to **GitHub Actions**.
5. Wait for the workflow **Deploy to GitHub Pages** to complete.

If the page is blank:

1. Confirm the latest workflow run succeeded.
2. Open browser devtools and verify JS/CSS are loaded from `/mirai-app/assets/...`.
3. If you renamed the repository, update `base` in `vite.config.ts` accordingly.
