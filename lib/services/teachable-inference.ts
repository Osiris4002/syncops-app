/**
 * Teachable Machine (TensorFlow.js) image classification for room verification.
 *
 * Configure via env — see TEACHABLE_MACHINE.md in the app root.
 */

import * as tf from "@tensorflow/tfjs";
import { decode as decodeJpeg } from "jpeg-js";
import { Platform } from "react-native";

const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff]);

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === JPEG_MAGIC[0] && bytes[1] === JPEG_MAGIC[1] && bytes[2] === JPEG_MAGIC[2];
}

function envModelUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_TM_MODEL_URL;
  if (!raw || raw === "") return null;
  return raw.endsWith(".json") ? raw : `${raw.replace(/\/$/, "")}/model.json`;
}

function cleanClassIndex(): number {
  const v = process.env.EXPO_PUBLIC_TM_CLEAN_CLASS_INDEX;
  if (v === undefined || v === "") return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function cleanThreshold(): number {
  const v = process.env.EXPO_PUBLIC_TM_CLEAN_THRESHOLD;
  if (v === undefined || v === "") return 0.8;
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.8;
}

function normalization(): "mobilenet" | "unit" {
  const v = (process.env.EXPO_PUBLIC_TM_INPUT_NORMALIZATION || "mobilenet").toLowerCase();
  return v === "unit" ? "unit" : "mobilenet";
}

function remoteAiEndpoint(): string | null {
  const raw = process.env.EXPO_PUBLIC_AI_VERIFY_ENDPOINT;
  return raw && raw.trim() !== "" ? raw.trim() : null;
}

function canUseLocalTfInference(): boolean {
  // Expo Go on native often lacks the full tfjs RN platform wiring.
  // Keep local inference enabled on web; on native require explicit opt-in.
  if (Platform.OS === "web") return true;
  return process.env.EXPO_PUBLIC_ENABLE_LOCAL_TM === "true";
}

let modelPromise: Promise<tf.LayersModel | null> | null = null;

function runtimeFetch(): typeof fetch {
  const f = globalThis.fetch;
  if (!f) {
    throw new Error("Global fetch is unavailable in this runtime.");
  }
  return f.bind(globalThis);
}

async function loadModel(): Promise<tf.LayersModel | null> {
  const url = envModelUrl();
  if (!url) {
    console.warn(
      "[TeachableMachine] EXPO_PUBLIC_TM_MODEL_URL is not set. Set it to your hosted model.json URL.",
    );
    return null;
  }

  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await tf.ready();
        await tf.setBackend("cpu");
        await tf.ready();
        const model = await tf.loadLayersModel(url, { fetchFunc: runtimeFetch() });
        return model;
      } catch (e) {
        console.error("[TeachableMachine] Failed to load model:", e);
        modelPromise = null;
        return null;
      }
    })();
  }
  return modelPromise;
}

function ensureRgb(data: Uint8Array, width: number, height: number): Uint8Array {
  const pixels = width * height;
  if (data.length === pixels * 3) return data;
  if (data.length === pixels * 4) {
    const rgb = new Uint8Array(pixels * 3);
    for (let i = 0, j = 0; i < pixels * 4; i += 4, j += 3) {
      rgb[j] = data[i]!;
      rgb[j + 1] = data[i + 1]!;
      rgb[j + 2] = data[i + 2]!;
    }
    return rgb;
  }
  throw new Error(`Unexpected JPEG channel count: ${data.length} for ${width}x${height}`);
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const ex = logits.map((x) => Math.exp(x - max));
  const s = ex.reduce((a, b) => a + b, 0) || 1;
  return ex.map((e) => e / s);
}

function toProbabilities(raw: number[]): number[] {
  if (!raw.length) return [];
  const sum = raw.reduce((a, b) => a + b, 0);
  const looksLikeProb =
    sum > 0.98 && sum < 1.02 && raw.every((x) => x >= -0.001 && x <= 1.001);
  return looksLikeProb ? raw.map((x) => Math.max(0, Math.min(1, x))) : softmax(raw);
}

function preprocess(rgb: Uint8Array, width: number, height: number): tf.Tensor4D {
  const tensor = tf.tensor3d(rgb, [height, width, 3], "int32");
  const f = tf.cast(tensor, "float32");
  tensor.dispose();
  const norm = normalization();
  const scaled = (norm === "unit" ? f.div(255) : f.div(127.5).sub(1)) as tf.Tensor3D;
  f.dispose();
  const resized = tf.image.resizeBilinear(scaled, [224, 224]);
  scaled.dispose();
  const batched = resized.expandDims(0) as tf.Tensor4D;
  resized.dispose();
  return batched;
}

export type ClassifyResult = {
  result: "clean" | "rework";
  /** Estimated probability of the "clean" class (0–100), for manager review thresholds */
  confidence: number;
  classIndex: number;
};

export async function classifyRoomImage(imageUrl: string): Promise<ClassifyResult> {
  const remote = remoteAiEndpoint();
  if (remote) {
    const response = await runtimeFetch()(remote, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    if (!response.ok) {
      throw new Error(`Remote AI verification failed (${response.status})`);
    }
    const payload = (await response.json()) as {
      result?: "clean" | "rework";
      confidence?: number;
      classIndex?: number;
    };
    if (payload.result !== "clean" && payload.result !== "rework") {
      throw new Error("Remote AI response missing valid result");
    }
    return {
      result: payload.result,
      confidence: typeof payload.confidence === "number" ? Math.max(0, Math.min(100, payload.confidence)) : 0,
      classIndex: typeof payload.classIndex === "number" ? payload.classIndex : -1,
    };
  }

  if (!canUseLocalTfInference()) {
    console.warn(
      "[TeachableMachine] Local TF inference disabled on native. Configure EXPO_PUBLIC_AI_VERIFY_ENDPOINT.",
    );
    return { result: "rework", confidence: 0, classIndex: -1 };
  }

  const model = await loadModel();
  if (!model) {
    return { result: "rework", confidence: 0, classIndex: -1 };
  }

  const response = await runtimeFetch()(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (!isJpeg(buffer)) {
    console.warn(
      "[TeachableMachine] Inference expects JPEG. Re-encode camera output as JPEG or convert uploads.",
    );
    return { result: "rework", confidence: 0, classIndex: -1 };
  }

  const decoded = decodeJpeg(buffer, { useTArray: true });
  const { width, height, data } = decoded;
  if (!data || width < 2 || height < 2) {
    return { result: "rework", confidence: 0, classIndex: -1 };
  }

  const rgb = ensureRgb(data, width, height);
  const input = preprocess(rgb, width, height);
  let prediction: tf.Tensor | null = null;
  let flat: tf.Tensor | null = null;
  try {
    const out = model.predict(input);
    prediction = Array.isArray(out) ? (out[0] as tf.Tensor) : (out as tf.Tensor);
    flat = prediction.reshape([-1]);
    const raw = Array.from(await flat.data());

    const probs = toProbabilities(raw);
    const cleanIdx = cleanClassIndex();
    const cleanProb = probs[cleanIdx] ?? 0;
    const threshold = cleanThreshold();
    const result: "clean" | "rework" = cleanProb >= threshold ? "clean" : "rework";
    const confidence = Math.round(cleanProb * 100);

    let classIndex = 0;
    let best = probs[0] ?? 0;
    for (let i = 1; i < probs.length; i++) {
      if ((probs[i] ?? 0) > best) {
        best = probs[i]!;
        classIndex = i;
      }
    }

    return { result, confidence, classIndex };
  } finally {
    flat?.dispose();
    input.dispose();
    prediction?.dispose();
  }
}

export function resetTeachableModelCache() {
  modelPromise = null;
}
