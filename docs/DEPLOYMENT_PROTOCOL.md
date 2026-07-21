# 🚀 Institutional Deployment Protocol
**Version:** 1.0.0 (FastAPI + Capacitor + Static Next.js)

This document provides the authoritative sequence for broadcasting the Node Quick Terminal to production environments.

---

## 1. Backend Engine (FastAPI)
**Target:** Railway / Render / VPS
**Function:** 24/7 Transaction Orchestration & Webhooks

### 🛠️ Pre-Flight Check
1. Ensure your `.env` in the `backend/` folder contains:
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`
   - `FLW_SECRET_KEY` (Flutterwave Production Key)
   - `FLW_WEBHOOK_HASH` (Set this in FLW Dashboard)
   - `ADMIN_SECRET_PHRASE` (12-word mnemonic for the Admin Vault)

### 🚢 Deployment Sequence
1. Push the `backend/` folder to a new GitHub repository.
2. Connect the repo to **Railway.app**.
3. Add your Environment Variables in the Railway dashboard.
4. Deployment will trigger automatically via the `Procfile`.
5. **Note:** Your backend URL will be something like `https://api-production-xxxx.up.railway.app`.

---

## 2. Frontend Terminal (Web)
**Target:** Firebase Hosting / Vercel
**Function:** Public Static Registry

### 🛠️ Pre-Flight Check
1. Update `NEXT_PUBLIC_BACKEND_URL` in your main `.env` to point to your Railway URL.
2. Verify `next.config.ts` has `output: 'export'`.

### 🚢 Deployment Sequence
1. **Firebase Path:**
   - Run `firebase init hosting`.
   - Select `out` as your public directory.
   - Run `npm run build` then `firebase deploy`.
2. **Vercel Path:**
   - Connect your GitHub repo.
   - Set Build Command: `next build`.
   - Output Directory: `out`.

---

## 3. Native Mobile (Android/iOS)
**Target:** Android Studio / Xcode
**Function:** Local Hardware Installation

### 🚢 Synchronization Sequence
1. **Build Static Node**: 
   ```bash
   npm run static
   ```
   *This compiles Next.js into the `out/` folder and syncs it to the `android/` project.*

2. **Open Native IDE**:
   ```bash
   npx cap open android
   ```

3. **Generate APK**:
   - In Android Studio: `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.
   - Install the generated `.apk` on your **Tecno Pop 10 Pro**.

---

## 🛡️ Registry Configuration (Supabase)
Ensure your Supabase project has the following tables to support the Movement Engine:
1. `profiles`: Add `virtual_account_number` and `virtual_bank_name`.
2. `wnc_transfers`: Central ledger for all movements.
3. `fees`: Revenue tracking node.

*Deployment Authorized. Protocol Active.*
