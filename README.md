# Calisthenics tracker

A small offline-first web app for logging a beginner, back-friendly bodyweight program: three floor sessions a week (Tue/Thu upper + core, Sat full), progression ladders per movement, earned-next-step flags, PRs and charts, weekly consistency, and a plain-text weekly summary for a coach.

Live: https://ocholonii.github.io/calisthenics-tracker/

## Your data stays on your device

There is no backend and no account. Everything is stored in your browser's `localStorage` on the device you use. Nothing is uploaded. That also means clearing browser data or losing the phone deletes it, so use **Summary → Export backup (JSON)** regularly, and **Import backup** to restore.

Progression ladders and session types are defined in one config block at the top of `app.js`. They are starting defaults, not medical advice.

## Run the tests

```sh
cd tests && npm install && cd ..
node tests/test.mjs
```

The tests use `playwright-core` with a local Chrome (`/usr/bin/google-chrome`; edit `executablePath` in `tests/test.mjs` if yours lives elsewhere). They seed demo data only inside the test browser and write screenshots to `shots/`.

## Deploy

GitHub Pages via `.github/workflows/pages.yml`. The PNG icons are stored as base64 (`*.png.b64`) and decoded during the deploy.
