# Calisthenics tracker

A small offline-first web app for logging a bodyweight training program: session logging with steppers, progression ladders per movement, earned-next-step flags, personal bests and charts, weekly consistency, and a plain-text weekly summary.

Live: https://ocholonii.github.io/calisthenics-tracker/

## Data stays on your device

There is no backend and no account. Everything is stored in your browser's `localStorage` on the device you use, and nothing is uploaded. Clearing browser data or losing the device deletes it, so use **Summary → Export backup (JSON)** regularly, and **Import backup** to restore.

Progression ladders and session types are defined in one config block at the top of `app.js`. They are starting defaults, not medical advice.

## Tests

Tests are kept outside this repository. Where you have the tests folder, run them with `node tests/test.mjs`.

## Deploy

GitHub Pages via `.github/workflows/pages.yml`. The PNG icons are stored as base64 (`*.png.b64`) and decoded during the deploy.
