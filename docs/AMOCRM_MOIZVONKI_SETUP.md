# AmoCRM & Moizvonki API integration

This guide explains how to get API keys for AmoCRM and Moizvonki and add them to the backend so the dashboard and TaritiGPT can use them.

---

## 1. AmoCRM

### What you need

- **AMOCRM_BASE_URL** – Your AmoCRM base URL, e.g. `https://yoursubdomain.amocrm.com` or `https://yoursubdomain.amocrm.ru`
- **AMOCRM_API_KEY** – OAuth access token (Bearer) or long-lived token

### How to get the token

AmoCRM uses **OAuth 2.0**. You can get an access token in one of these ways:

**Option A: Long-lived token (simplest if available)**

1. Log in to your AmoCRM account.
2. Go to **Settings** (Настройки) → **Integrations** (Интеграции).
3. If your plan offers **“Long-lived token”** or **“Токен для интеграций”**, create/copy it and use it as `AMOCRM_API_KEY`.

**Option B: OAuth (integration / developer)**

1. Register an integration at [AmoCRM Developers](https://www.amocrm.com/developers/) (or amocrm.ru):
   - Get **Client ID** and **Client Secret**.
   - Set **Redirect URI** (e.g. `http://localhost:3001/oauth/amocrm/callback` for local testing).
2. Open the OAuth authorization URL in a browser (replace with your client_id and redirect_uri):
   ```text
   https://www.amocrm.com/oauth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code
   ```
3. After authorizing, you’ll be redirected with a `code` in the URL.
4. Exchange the code for tokens (POST to AmoCRM token endpoint with `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`, `code`).
5. Use the returned **access_token** as `AMOCRM_API_KEY`.  
   Note: access tokens expire; use **refresh_token** to get a new access token and consider storing both and refreshing in the backend.

**Base URL**

- Use the same domain you use in the browser, e.g. `https://sudic.amocrm.com` or `https://sudic.amocrm.ru` (replace `sudic` with your subdomain).

### Add to backend

In `backend/.env`:

```env
AMOCRM_BASE_URL=https://yoursubdomain.amocrm.com
AMOCRM_API_KEY=your_access_token_or_long_lived_token
```

Restart the backend. TaritiGPT can then use AmoCRM (e.g. `call_amocrm_api`, `forward_lead_to_amocrm`) and lead forwarding will work.

---

## 2. Moizvonki

### What you need

- **MOIZVONKI_API_KEY** – API key from the Moizvonki cabinet.
- **MOIZVONKI_USER** – Email (login) of the Moizvonki account (used as `user_name` in API requests).

### Where to get them

1. Log in at [app.moizvonki.ru](https://app.moizvonki.ru).
2. Open **Настройки** (Settings) → **Интеграция** (Integration).
3. In **Параметры API** (API parameters) you’ll see:
   - **API ключ** (API key) → use as `MOIZVONKI_API_KEY`
   - **Email логин** (email login) → use as `MOIZVONKI_USER`

### Add to backend

In `backend/.env`:

```env
MOIZVONKI_API_KEY=your_api_key_from_moizvonki
MOIZVONKI_USER=your_account_email@example.com
```

Optional (defaults are already set in code):

```env
# MOIZVONKI_BASE_URL=https://app.moizvonki.ru/api/v1
```

Restart the backend. TaritiGPT can then use Moizvonki (e.g. `call_moizvonki_api`, `get_moizvonki_analytics`).

---

## 3. Summary

| Variable             | Required | Where to get it |
|----------------------|----------|------------------|
| `AMOCRM_BASE_URL`    | For AmoCRM | Your AmoCRM URL (e.g. `https://subdomain.amocrm.com`) |
| `AMOCRM_API_KEY`     | For AmoCRM | AmoCRM OAuth access token or long-lived token |
| `MOIZVONKI_API_KEY`  | For Moizvonki | Moizvonki → Настройки → Интеграция → API ключ |
| `MOIZVONKI_USER`     | For Moizvonki | Moizvonki account email (API “user_name”) |

Copy `backend/.env.example` to `backend/.env`, fill in the values above, then run the backend again. The dashboard widgets (AmoCRM Analytics, Moizvonki Analytics) use data from your DB; TaritiGPT and “forward lead to AmoCRM” use these keys to call the APIs.
