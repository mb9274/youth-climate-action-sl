# Youth Climate Action SL

This bundle includes:

- `index.html`, `styles.css`, `script.js` for the public site
- `firebase.json` for Firebase Hosting and a Cloud Function rewrite
- `functions/index.js` for secure server-side submission handling
- `functions/package.json` for the Cloud Functions dependencies
- `firestore.rules` to keep the applications collection private

## What the form does

When a user submits the Join Our Team form:

1. The frontend sends the data to `/api/join-team`
2. Firebase Cloud Functions validates the data
3. The application is stored in Firestore under `applications`
4. An email notification is sent to the admin email
5. A confirmation email is sent to the applicant

## Environment variables

Set these in your Firebase Functions environment:

- `ADMIN_NOTIFICATION_EMAIL=climateteam971@gmail.com`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE=applications`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Notes

- The admin notification email is configurable with `ADMIN_NOTIFICATION_EMAIL`.
- On Vercel, the easiest setup is Supabase:
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `SUPABASE_TABLE`.
- If Supabase is not set, the code falls back to Firebase credentials.
- The frontend does not send email directly, so applicant data stays on the server.
- For Gmail, use an app password instead of your normal password.

## Supabase table

Create a table named `applications` with columns like:

- `full_name` text
- `age` integer
- `district_location` text
- `email_address` text
- `phone_number` text
- `skills_interests` text
- `motivation_for_joining` text
- `submission_date` timestamptz or text
- `source` text

## Deploy

From the `outputs` folder:

```bash
firebase init hosting functions firestore
firebase deploy
```

If you already have a Firebase project, point Hosting at the current folder and keep the `/api/join-team` rewrite in `firebase.json`.

## Local preview

If you want to view the site right now on this machine, run the preview server from the `work` folder:

```bash
node work/local-preview-server.mjs
```

Then open:

```text
http://127.0.0.1:4174
```
