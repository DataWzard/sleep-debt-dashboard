# Bedtime Screen Time & Sleep Debt Dashboard

Interactive React dashboard for a portfolio case study about bedtime phone use, sleep latency, fatigue, and sleep-debt categories.

The published dashboard uses aggregated metrics only. It does not ship the original row-level dataset or user IDs.

## Run locally

```bash
npm install
npm run dev
```

## Build for GitHub Pages

```bash
npm run build
```

Publish the `dist` folder to GitHub Pages with:

```bash
npm run deploy
```

The app is static and reads grouped metrics from `public/data/sleep-summary.json`. Vite uses relative asset paths so the site works from a GitHub Pages project URL.
