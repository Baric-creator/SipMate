# SipMate Website

Pre-launch marketing website for `officialsipmate.de`.

## Current contents

- Responsive dark/red SipMate landing page
- App-style profile and CHEERS mockups
- How it works section
- Activity/vibe section
- Premium teaser
- Waitlist connected to the live Supabase `join-waitlist` endpoint
- Instagram and TikTok links
- Privacy, Terms, Imprint and account-deletion placeholders

## Deployment

This directory is deployed by `.github/workflows/deploy-website.yml` using GitHub Pages.

One-time repository setup is still required before the first successful Pages deployment:

1. GitHub repository Settings → Pages.
2. Under Build and deployment, set Source to **GitHub Actions**.
3. Set the custom domain to `officialsipmate.de`.
4. Point the IONOS apex DNS records to GitHub Pages and add `www` as a CNAME to `Baric-creator.github.io`.
5. Enable HTTPS after GitHub finishes DNS/certificate validation.

## Important before full public launch

- Replace legal placeholders with reviewed final text and operator/contact details.
- Add store links when the app listings are available.

This directory is intentionally independent from the Expo mobile app so website work does not affect the application build.
