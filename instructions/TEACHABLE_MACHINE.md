# Teachable Machine + SyncOps AI verification

The app runs **TensorFlow.js** on the **CPU backend** in React Native / Expo. It loads your **Exported TensorFlow.js model** from a **public HTTPS URL** (so `model.json` and weight shards can be fetched with CORS allowed).

## 1. Train the model in Teachable Machine

1. Open [Google Teachable Machine](https://teachablemachine.withgoogle.com/) → **Image Project** → **Standard image model**.
2. Create **two classes** (example names):
   - **Class 0 — “clean”** (good example photos of finished rooms)
   - **Class 1 — “not_clean”** (or “rework”, messy, incomplete rooms)
3. Train until you are happy with the preview accuracy.

**Important:** Remember which class index is “clean”. The first class you add is index **0**, the second is **1**, etc.

## 2. Export for TensorFlow.js

1. In Teachable Machine, click **Export Model**.
2. Choose **TensorFlow.js** → **Download** (you get a `.zip`).

The zip contains:

- `model.json`
- One or more `*.bin` weight shard files (e.g. `group1-shard1of1.bin`)

## 3. Host the folder (required)

`tf.loadLayersModel()` loads `model.json`, then fetches the `.bin` files using **relative URLs** from the same directory. You must upload **all** of those files to the **same public URL prefix**.

**Option A — Supabase Storage (simple)**

1. Create a public bucket, e.g. `tm-models`.
2. Upload **every** file from the export (`model.json` + all `.bin` files) into one folder, e.g. `room-clean/v1/`.
3. Ensure the bucket or objects are **publicly readable** (or use signed URLs — then you must use a stable signed base URL; simplest is public bucket for this asset).
4. Your model URL will look like:

`https://<project>.supabase.co/storage/v1/object/public/tm-models/room-clean/v1/model.json`

## 4. Configure SyncOps (`.env.local`)

Add or update:

```bash
# Full URL to model.json (app will fetch shards from the same directory)
EXPO_PUBLIC_TM_MODEL_URL=https://YOUR_PROJECT.supabase.co/storage/v1/object/public/tm-models/room-clean/v1/model.json

# Index of the TM class that means “clean” (usually 0 if “clean” was your first class)
EXPO_PUBLIC_TM_CLEAN_CLASS_INDEX=0

# Minimum probability of the “clean” class to auto-approve (0–1). Default 0.8 = 80%
EXPO_PUBLIC_TM_CLEAN_THRESHOLD=0.8

# Input normalization: "mobilenet" (default, ÷127.5−1) or "unit" (÷255)
EXPO_PUBLIC_TM_INPUT_NORMALIZATION=mobilenet

# Optional: remote AI endpoint fallback (POST JSON: { imageUrl } -> { result, confidence, classIndex? })
EXPO_PUBLIC_AI_VERIFY_ENDPOINT=

# Native local-TM is disabled by default (Expo Go instability).
# Set true only if you've validated tfjs native runtime in your build.
EXPO_PUBLIC_ENABLE_LOCAL_TM=false
```

Restart Expo after changing env vars (`npx expo start -c` if Metro caches aggressively).

## 5. Photos must be JPEG for on-device decode

Inference uses `jpeg-js`, which expects **JPEG** bytes. The camera flow should save **`.jpg`** to storage (default camera output is usually JPEG). If you upload PNG, the app will skip model inference and treat the result as **rework** until you convert uploads to JPEG.

## 6. How it runs in the app

1. Staff uploads a verification image → row in `images` with `image_url`.
2. `processCompletedTask` calls `verifyImageWithAI` → `classifyRoomImage`:
   - If `EXPO_PUBLIC_AI_VERIFY_ENDPOINT` is set, the app sends image URL to that endpoint first.
   - Otherwise it runs local TensorFlow.js model inference.
   - Downloads the JPEG from `image_url`
   - Resizes to **224×224** (same as TM MobileNet-sized exports)
   - Runs the model → probability of the clean class → compares to `EXPO_PUBLIC_TM_CLEAN_THRESHOLD`
   - Writes `ai_result` + `confidence` on `images`, updates `tasks.status` to `completed` or `rework`.

## 7. Troubleshooting

| Symptom | What to check |
|--------|----------------|
| Model never loads | URL must be **HTTPS**, **CORS** must allow your app origin; open `model.json` in a browser. |
| Shards 404 | All `.bin` files must sit **next to** `model.json` at the same path prefix. |
| Always rework / confidence 0 | Wrong `EXPO_PUBLIC_TM_CLEAN_CLASS_INDEX` or normalization; try `unit` vs `mobilenet`. |
| Slow first prediction | First load downloads + compiles the graph; later calls reuse a cached model. |

To force a reload after uploading a new model version, restart the app (or bump the folder path / cache-bust the URL).

## 8. Expo Go vs development build (notifications & Android)

From **SDK 53**, **Expo Go on Android** no longer supports the **remote push** path inside `expo-notifications`. Importing that module used to crash the bundle on load.

This project **does not import** `expo-notifications` in **Expo Go** (`storeClient` / `appOwnership === "expo"`). Supabase realtime still works; only **local push** UI is skipped there.

For **full notifications** (and the least friction on native modules), use a **development build**: [Development builds](https://docs.expo.dev/develop/development-builds/introduction/).

**Camera** (`expo-camera`) is supported in Expo Go; if the app previously failed on startup because of notifications, fixing the above allows the camera screen to load. If the camera still fails, grant **Camera** permission in system settings and restart the dev server with `npx expo start -c`.
