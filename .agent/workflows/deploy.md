---
description: Deploy the agentops-ui to GitHub Pages
---

# Deploy to GitHub Pages

The agentops-ui frontend is deployed to GitHub Pages at: https://edc1009.github.io/Freightbot/

## Important: Repository Name
The repository has been renamed to **Freightbot**. The `vite.config.js` must have `base: '/Freightbot/'` configured.

## Automatic Deployment
The project uses GitHub Actions for automatic deployment. When you push to the `main` branch, the workflow in `.github/workflows/deploy.yml` will:
1. Build the project with `npm run build` in the `agentops-ui` directory
2. Deploy the `dist` folder to the `gh-pages` branch

## Manual Steps

// turbo-all
1. Navigate to the agentops-ui directory
```bash
cd agentops-ui
```

2. Install dependencies (if needed)
```bash
npm install
```

3. Build the project
```bash
npm run build
```

4. Commit and push changes
```bash
git add .
git commit -m "chore: update build"
git push
```

5. Wait 2-3 minutes for GitHub Actions to complete, then verify at:
   - Actions status: https://github.com/edc1009/Freightbot/actions
   - Live site: https://edc1009.github.io/Freightbot/

## Local Development

// turbo
Run the development server:
```bash
cd agentops-ui
npm run dev
```

The local site will be available at: http://localhost:5173/Freightbot/

## Troubleshooting

### Blank page on GitHub Pages
If the site shows a blank page after deployment:
1. Check that `vite.config.js` has `base: '/Freightbot/'`
2. Verify GitHub Actions completed successfully
3. Clear browser cache or use incognito mode

### Git remote warning about "repository moved"
Update the remote URL:
```bash
git remote set-url origin https://github.com/edc1009/Freightbot.git
```
