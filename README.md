# Maintenance complaint form — 5 languages

Prepared from **Maintenance_QR_Form_5_Languages.xlsx**. The form questions,
location/category choices and confirmation messages are taken from its five
language sheets. Additional interface text and video-upload labels are translated.

## What is included

- Green design matching the supplied reference: centered rounded card, LIFE+ and
  Anabeeb branding, title, five stacked language buttons, and company footer.
- Language order: English, Hindi, Arabic, Urdu, Filipino.
- A language-first, mobile-friendly form: English, Arabic, Hindi, Urdu and Tagalog.
- Arabic and Urdu right-to-left layout; language changes retain entered details.
- Required: name, room, building, location, category, description. Floor is optional.
- Optional photos/videos: up to 3 files, 10 MB each, 25 MB combined.
- GitHub Pages frontend: `index.html`, `style.css`, `languages.js`, `app.js`,
  `config.js`, and the **assets** folder.
- Cloudflare Worker backend with Microsoft authorization, private uploads,
  server-side checks, Turnstile verification and retry protection.
- Mapping to exactly 10 form fields in **Master Log** of the corrected Maintenance_Complaints.xlsx.

**Not yet connected or deployed.** With blank `config.js`, the form opens for
review and clearly disables submission. It never pretends a report was saved.
The Microsoft account, OneDrive workbook and Cloudflare resources must be
configured before accepting real complaints. No Microsoft credentials are included.

## Pehle kya karein

1. ZIP extract karke `index.html` browser mein kholo. Paanchon languages check karo.
2. GitHub par **frontend ki 5 files aur assets folder** upload karo (upar list di hai).
3. GitHub repository → Settings → Pages → Deploy from a branch → main → root.
4. Ab neeche backend setup complete karo. Sirf Excel sharing link kaafi nahi hai.
5. `config.js` mein Worker URL aur public Turnstile site key daalo.
6. Incognito mein photo/video ke saath test complaint bhejo. Excel aur OneDrive
   dono verify karne ke baad residents ko link/QR do.

## OneDrive / Excel setup

Use a **licensed company Microsoft 365 account with OneDrive for Business and
Excel access**. This package is designed for that account type.

1. Your supplied SharePoint/OneDrive Excel link is already set in
   `backend/wrangler.toml` as `WORKBOOK_SHARE_URL`. The actual cloud contents could
   not be inspected from this environment; authorization checks them later.
2. The file must be the corrected **Maintenance_Complaints.xlsx**, containing
   **Master Log** with the 10 headers listed below in A1:J1.
3. In the authorizing account's OneDrive, create a root-level folder named
   **Maintenance Uploads** for photos and videos. No public sharing is needed.
4. Do not convert the workbook to a table or add extra columns. The backend writes
   directly into the 10-column worksheet. Keep the workbook and uploads private;
   only permitted staff can open the file links.

## Backend deployment (one-time administrator setup)

Requirements: Node.js supported by Wrangler, a Cloudflare account, and authority
to register an app in your Microsoft tenant. Run commands inside `backend/`.

### 1. Create the database

```sh
npx wrangler login
npx wrangler d1 create maintenance-records
```

Copy the returned `database_id` into `wrangler.toml`. Then:

```sh
npx wrangler d1 execute maintenance-records --remote --file=schema.sql
```

D1 records reserved Excel row numbers, request IDs, complaint details and the
Microsoft refresh token. Restrict Cloudflare account access. Keep database backups.
Never reset the database while keeping the same live workbook.

### 2. Configure Microsoft Entra

1. Entra admin center → App registrations → New registration.
2. Choose **Accounts in this organizational directory only**.
3. Copy Tenant ID and Application (client) ID into `wrangler.toml`.
4. API permissions → Microsoft Graph → **Delegated** → `Files.ReadWrite`.
5. Grant tenant consent if your organization's policy requires it.
6. Certificates & secrets → create a client secret; store the **value** using:

```sh
npx wrangler secret put CLIENT_SECRET
```

The backend requests `offline_access` during authorization. Only the workbook
owner authorizes Microsoft access. Residents never sign in.

### 3. Set public URLs and security check

- Set `ALLOWED_ORIGIN` to `https://YOUR-USERNAME.github.io` (no repository path).
- Create a Cloudflare Turnstile widget for that hostname. Set
  `TURNSTILE_HOSTNAME` to the hostname only.
- Put its **public site key** in frontend `config.js`.
- Store its secret and a long random administrator key:

```sh
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put ADMIN_KEY
npx wrangler deploy
```

The administrator key should be generated with a password manager, at least
32 random characters. Never put secrets in GitHub or frontend JavaScript.

Copy the deployed Worker URL. Set `REDIRECT_URI` in `wrangler.toml` to
`https://YOUR-WORKER.workers.dev/oauth/callback`, then deploy again.
In Entra → Authentication → Add a platform → **Web**, add that exact redirect URI.
Set frontend `apiUrl` to the Worker URL (without `/submit`).

### 4. Connect the owner account

Make this administrator request using an API client such as Postman, with your
actual Worker URL and administrator key:

```text
POST https://YOUR-WORKER.workers.dev/admin/connect
Authorization: Bearer YOUR_ADMIN_KEY
```

Open the `authorizationUrl` returned by the request. Sign in as the licensed
owner of the OneDrive workbook and allow access. This link expires after
10 minutes. Wait for the **OneDrive connected** message.

This checks the workbook headers and initially empty log. If a connection fails,
fix the account, permissions or paths and repeat. Connection can need renewal
when Microsoft access is revoked or policies change. Client secrets also expire;
rotate them before expiry and redeploy if necessary.

## Exact Master Log mapping

| Excel column | Form value |
|---|---|
| Name | Resident name |
| Room Number | Room, including leading zeros |
| Building Number | Building |
| Floor Number | Optional floor |
| Fault Location | Selected option, stored in canonical English |
| Fault Category | Selected option, stored in canonical English |
| Fault Description | Original text as written by resident |
| Photo Link | OneDrive photo links, one per line |
| Video Link | OneDrive video links, one per line |
| Date & Time Reported | Server receipt timestamp, Asia/Riyadh by default |

No Priority, Status, Assigned To, translation, language or other tracking columns
are added to Excel. A receipt reference and the language used are kept in the
backend database for support, without changing your worksheet columns.

## Operating the log

- This implementation reserves fixed row numbers in D1. **Do not sort, insert,
  delete or move rows in the live Master Log**. Filter it, or make a separate
  reporting copy to sort. If a pending complaint row is edited, retry confirmation may require administrator reconciliation.
- Keep row 1, worksheet name and headers unchanged. Start with the supplied empty
  log; migrating an existing populated log needs a deliberate row allocation step.
- Same-request retries use the same row and filenames. A retry after successful
  Excel save compares the saved 10-column row with the expected row in D1. A mismatch stops the retry instead of overwriting data.
- If a submission fails, keep the form tab open and retry with unchanged details.
  Closing/reloading the page loses its in-memory retry ID and selected files.
- The backend can leave reserved rows or uploaded files after an interrupted
  request. They are not shown as successful until Excel confirms the write.
  Admins should reconcile abandoned D1 records (`done=0`) and orphaned uploads.
- A request running after a server interruption may remain locked for up to
  10 minutes. Retry after that interval. Persistent failures require admin review.
- Cloudflare, Microsoft API throttling, storage and license limits apply. A free
  hosting tier is not unlimited. This starter is intended for modest complaint
  volumes; monitor failures and capacity before larger use.
- Uploaded formats are restricted and their signatures checked, but this is not
  a dedicated malware scanning service. Existing organization file policies apply.

## Verification

The package is reviewed locally. Live Microsoft authorization, upload, workbook
write, tenant policies and Cloudflare deployment require your real configuration
and must be tested before sharing publicly. Run a test in each language and check
Master Log values, leading-zero room numbers, original description, combined timestamp,
and separate photo/video links.

If an earlier backend schema was already deployed, add the new retry record field:

```sh
npx wrangler d1 execute maintenance-records --remote --command="ALTER TABLE submissions ADD COLUMN expected_row TEXT;"
```

Run this only for an older database without that column. An existing deployment
using the old 20-column workbook needs a deliberate migration; do not reset its
database or silently point it at this different schema. New setups use schema.sql.

Official references:
- https://learn.microsoft.com/en-us/graph/api/range-update?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/driveitem-put-content?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- https://developers.cloudflare.com/workers/platform/pricing/

Keep `backend/`, this guide and credentials out of the public Pages folder.

The supplied screenshot is included as `assets/brand-reference.png`. CSS displays
only its logo region; the remainder is not displayed. Keep this asset when
publishing. Replace it with original transparent logo files if those become
available for a sharper rendering.
