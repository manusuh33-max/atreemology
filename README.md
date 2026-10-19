# Atreemology backend (Supabase) — setup and operations

**Keep this folder OUT of the public GitHub repo.** It holds the database design, the payment
functions and (later) your paid root content. Only the files in `atreemology-site-update.zip`
go to GitHub.

Project: `yvgtixodtwrfsehkqsfi` → https://yvgtixodtwrfsehkqsfi.supabase.co

Everything below the "already done" line is already deployed. What is left is the few steps that
need *your* accounts (listed in "Do these before launch").

## What is already deployed

- Tables with row-level security: `progress` (one row per learner), `packs` (catalogue),
  `pack_content` (the paid roots — unreadable from the API), `entitlements` (who owns what —
  write-protected), `payment_orders` (unreadable from the API).
- `get_pack_content()` — the only way to read paid roots; it checks ownership.
- Edge Functions: `create-order`, `verify-payment`, `razorpay-webhook`, `delete-account`.
- 4 packs seeded but **unpublished**: Core Forest ₹499, Deep Forest ₹799, Scholar Grove ₹999,
  Everything ₹1,999 (edit prices in the `packs` table; they are paise: 49900 = ₹499).
- Until a pack is published, learners see no shop at all — the app looks exactly as today,
  plus an optional "Sign in" card on Profile.

## Do these before launch

### 1. Make the sign-in email show the code (required)
Sign-in uses a 6-digit code, not a link. Supabase's default emails only contain a link.
Dashboard → **Authentication → Emails → Templates**. Edit **both** "Confirm signup" and
"Magic Link" so the body contains `{{ .Token }}`, e.g.:

```html
<h2>Your Atreemology code</h2>
<p>Enter this code in the app to sign in:</p>
<p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
<p>It expires in an hour. If you didn't ask for it, ignore this email.</p>
```

### 2. Use your own email sender (strongly recommended)
Supabase's built-in sender is for testing and allows only a handful of emails per hour — real
learners will hit that limit. Dashboard → **Authentication → Emails → SMTP Settings** → enable
custom SMTP and enter a mailbox from your own domain (your Hostinger mailbox works:
host `smtp.hostinger.com`, port `465`, the mailbox address and its password).

### 3. Auth URLs
Dashboard → **Authentication → URL Configuration**: Site URL `https://atreemology.com/app/`;
add `https://atreemology.com/app/` and `https://www.atreemology.com/app/` to Redirect URLs.

### 4. Razorpay (needed for payments only)
1. Create a Razorpay account (razorpay.com), start in **Test mode**.
2. Settings → API Keys → generate keys. You get a Key ID (`rzp_test_…`) and a Key Secret.
3. Settings → Webhooks → add: URL `https://yvgtixodtwrfsehkqsfi.supabase.co/functions/v1/razorpay-webhook`,
   event **payment.captured** (also tick **order.paid**), and invent a long random *webhook secret*.
4. Supabase Dashboard → **Edge Functions → Secrets** → add three secrets:
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
5. Test a purchase with Razorpay's test card/UPI (see Razorpay "test payment details").
6. Complete Razorpay KYC, switch to **Live mode**, generate live keys and replace the two key
   secrets and the webhook secret/URL with the live ones.

Until the secrets exist, tapping Unlock shows "Purchases aren't open yet" — nothing breaks.

### 5. Upgrade Supabase before the first paid sale
The free plan **pauses the project after a week without activity**, which would take sign-in and
purchases offline. Pro ($25/month) doesn't pause and adds backups.

## Publishing a root pack

There is no paid content yet. When you've written a pack (same format as `src/data/roots.js` and
`words.js`, as one JSON file `{ "roots": [...], "words": { "id": {...} } }`):

```
node tools/pack-tool.mjs <path-to-your-website-repo> core-forest my-core-forest.json
```

It checks the pack with the app's own rules (and that no root id clashes with the free grove),
then writes `publish-core-forest.sql`. Open that file, paste it into Supabase → **SQL Editor** →
Run. The pack now appears in the app's "Root packs" shelf and unlocks for buyers. Run it again with
an edited JSON to ship fixes: the version number goes up and devices re-download it. The pack JSON
stays on your computer — never commit it to the public repo.

## Day-to-day

- **Refund:** refund in the Razorpay dashboard, then in SQL Editor:
  `delete from public.entitlements where payment_id = 'pay_XXXX';`
- **Give someone a pack free:** `insert into public.entitlements(user_id, pack, payment_id)
  select id, 'core-forest', 'gift-1' from auth.users where email = 'them@example.com';`
- **Change a price:** `update public.packs set price_inr_paise = 59900 where id = 'core-forest';`
- **See purchases:** `select * from public.entitlements order by created_at desc;`
- **Un-publish a pack:** `update public.packs set published = false where id = '...';`

## Files

- `supabase/schema.sql` — the full database design (already applied).
- `supabase/functions/*` — the four Edge Functions (already deployed); `_shared/payments.js` holds the logic.
- `tools/pack-tool.mjs` — validate a pack and generate the publish SQL.
