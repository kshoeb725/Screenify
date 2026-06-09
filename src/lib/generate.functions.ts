import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image format. Must be a valid data URL.");
  }
  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

let discoveredModelsCache: string[] | null = null;

async function getSupportedMultimodalModels(key: string): Promise<string[]> {
  if (discoveredModelsCache && discoveredModelsCache.length > 0) {
    console.log("[Gemini API] Using cached compatible models:", discoveredModelsCache);
    return discoveredModelsCache;
  }
  try {
    console.log("[Gemini API] Querying ListModels for dynamic model discovery...");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
    if (!res.ok) {
      console.warn(`[Gemini API] ListModels failed with status ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!data.models) {
      console.warn("[Gemini API] ListModels returned empty models array");
      return [];
    }

    const models = data.models
      .filter((m: any) => {
        const supportsGenerate = m.supportedGenerationMethods?.includes("generateContent");
        const name = m.name?.toLowerCase() || "";
        const isMultimodal = name.includes("flash") || name.includes("pro") || name.includes("vision") || name.includes("2.") || name.includes("3.");
        return supportsGenerate && isMultimodal;
      })
      .map((m: any) => m.name.replace(/^models\//, ""));

    console.log("[Gemini API] Discovered compatible models:", models);
    discoveredModelsCache = models;
    return models;
  } catch (err) {
    console.warn("[Gemini API] Error during model discovery, falling back to static list:", err);
    return [];
  }
}

async function callGeminiEndpoint(
  key: string,
  modelName: string,
  version: "v1beta" | "v1",
  prompt: string,
  mimeType: string,
  base64Data: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${key}`;
  const payload: any = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
  };

  // v1beta supports responseMimeType
  if (version === "v1beta") {
    payload.generationConfig = {
      responseMimeType: "application/json",
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Status ${res.status}: ${text}`);
  }

  const result = await res.json();
  const textOutput = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error("Empty response parts from model.");
  }
  return textOutput;
}

async function analyzeImage(prompt: string, imageDataUrl: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    const { mimeType, base64Data } = parseDataUrl(imageDataUrl);

    // 1. Try to dynamically discover supported models from the user's key
    const discovered = await getSupportedMultimodalModels(geminiKey);
    
    // 2. Build the attempt list prioritizing discovered models
    const attempts: { version: "v1beta" | "v1"; model: string }[] = [];
    
    if (discovered.length > 0) {
      // Prioritize discovered flash models in v1beta for JSON output, then v1
      discovered.forEach(m => {
        attempts.push({ version: "v1beta", model: m });
        attempts.push({ version: "v1", model: m });
      });
    }

    // Static fallback models in case discovery failed or returned incomplete models
    const fallbackModels = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-flash-latest",
      "gemini-2.0-flash",
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro",
      "gemini-1.5-pro-latest"
    ];

    fallbackModels.forEach(m => {
      if (!attempts.some(a => a.model === m)) {
        attempts.push({ version: "v1beta", model: m });
        attempts.push({ version: "v1", model: m });
      }
    });

    let lastError: Error | null = null;
    for (const attempt of attempts) {
      try {
        console.log(`[Gemini API] Trying model ${attempt.model} on ${attempt.version}...`);
        const responseText = await callGeminiEndpoint(
          geminiKey,
          attempt.model,
          attempt.version,
          prompt,
          mimeType,
          base64Data,
        );
        console.log(`[Gemini API] Success with model ${attempt.model} on ${attempt.version}!`);
        return responseText;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Gemini API] Model ${attempt.model} on ${attempt.version} failed: ${msg}`);
        lastError = err instanceof Error ? err : new Error(msg);
      }
    }
    throw new Error(`Gemini API failed all model/version attempts. Last error details: ${lastError?.message}`);
  } else if (openaiKey) {
    const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
    let res: Response;
    try {
      res = await fetch(OPENAI_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      throw new Error(`Network error contacting OpenAI: ${err instanceof Error ? err.message : "unknown"}`);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 300)}`);
    }

    const result = await res.json();
    return result?.choices?.[0]?.message?.content ?? "";
  } else {
    throw new Error("No API key configured. Please set GEMINI_API_KEY or OPENAI_API_KEY in your .env file.");
  }
}

const InputSchema = z.object({
  imageDataUrl: z
    .string()
    .min(50)
    .refine((s) => s.startsWith("data:image/"), "Must be an image data URL"),
  email: z.string().trim().email().max(255),
  appName: z.string().trim().min(1).max(100),
  targetAudience: z.string().trim().min(1).max(300),
  objective: z.string().trim().min(1).max(500),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(8).optional().default([]),
  backgroundStyle: z.string().trim().max(200).optional().default(""),
});

type AnalysisPlan = {
  appName: string;
  category: string;
  suggestedTemplate: "executive" | "conversion" | "showcase" | "enterprise" | "growth";
  detectedFeatures: string[];
  variants: {
    feature: { headline: string; subheadline: string; features: string[] };
    benefit: { headline: string; subheadline: string; features: string[] };
    outcome: { headline: string; subheadline: string; features: string[] };
  };
};

function extractJSON(raw: string): string {
  let s = raw.replace(/^```json\s*/im, "").replace(/^```\s*/im, "").replace(/```\s*$/im, "").trim();
  if (!s.startsWith("{") && !s.startsWith("[")) {
    const o = s.indexOf("{");
    const a = s.indexOf("[");
    const isArr = a !== -1 && (o === -1 || a < o);
    const start = isArr ? a : o;
    const end = isArr ? s.lastIndexOf("]") : s.lastIndexOf("}");
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
  }
  return s;
}

async function analyze(
  imageDataUrl: string,
  ctx: {
    appName: string;
    targetAudience: string;
    objective: string;
    palette: string[];
    backgroundStyle: string;
  },
): Promise<AnalysisPlan> {
  const prompt = `You are a Shopify App Store marketing expert. Analyze the uploaded screenshot of a Shopify merchant app and generate professional, high-converting SaaS marketing copy, identify features, and select the best layout template.

Context:
- App Name: ${ctx.appName}
- Target Audience: ${ctx.targetAudience}
- Objective: ${ctx.objective}

Look closely at the uploaded screenshot:
1. Identify the app's primary category (e.g., Analytics, Inventory, Marketing, Operations, Customer Service, etc.).
2. Determine which template style suits the screenshot best:
   - "executive" (best for analytics, reporting, professional SaaS dashboards)
   - "conversion" (best for marketing, sales boosting, popups, discounts, conversions)
   - "showcase" (best for product showcases, general utility, clean interfaces)
   - "enterprise" (best for inventory, operations, workflows, multi-location, security)
   - "growth" (best for SEO, speed, Shopify growth, checkout customization, revenue boosters)
3. Detect up to 4 key features visible in the UI (e.g., "sales chart", "product table", "settings sync", "email template builder").
4. Create 3 distinct marketing copy variations using powerful, trending, and highly professional SaaS keywords (e.g., "Accelerate", "Automate", "Streamline", "Scale", "Maximized"). Do NOT use any emojis (like 🚀, ⚡, 📈, etc.) in the headlines, subheadlines, or features. All text must be purely alphanumeric with standard punctuation:
   - "feature": Feature-focused copy (emphasizes *what* it does, e.g., "Track Inventory Across Every Location")
   - "benefit": Benefit-focused copy (emphasizes *how* it helps the merchant, e.g., "Save Time with Automated Inventory Updates")
   - "outcome": Outcome-focused copy (emphasizes *results/success metrics*, e.g., "Reduce Stock Errors and Improve Accuracy")
   Ensure each variation has:
   - a headline (max 6 words)
   - a subheadline (max 15 words)
   - 3 short feature highlights (max 5 words each)

Return ONLY valid JSON (no markdown, no prose) with this exact schema:
{
  "appName": "${ctx.appName}",
  "category": "one-word or two-word category",
  "suggestedTemplate": "executive | conversion | showcase | enterprise | growth",
  "detectedFeatures": ["feature 1", "feature 2", "feature 3"],
  "variants": {
    "feature": {
      "headline": "Feature-focused headline (max 6 words, no emojis)",
      "subheadline": "Supporting subheadline (max 15 words, no emojis)",
      "features": ["feature 1 (no emojis)", "feature 2 (no emojis)", "feature 3 (no emojis)"]
    },
    "benefit": {
      "headline": "Benefit-focused headline (max 6 words, no emojis)",
      "subheadline": "Supporting subheadline (max 15 words, no emojis)",
      "features": ["benefit 1 (no emojis)", "benefit 2 (no emojis)", "benefit 3 (no emojis)"]
    },
    "outcome": {
      "headline": "Outcome-focused headline (max 6 words, no emojis)",
      "subheadline": "Supporting subheadline (max 15 words, no emojis)",
      "features": ["outcome 1 (no emojis)", "outcome 2 (no emojis)", "outcome 3 (no emojis)"]
    }
  }
}`;

  const raw = await analyzeImage(prompt, imageDataUrl);
  const cleaned = extractJSON(raw);
  let parsed: AnalysisPlan;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Malformed plan JSON. Raw:", raw.slice(0, 800));
    throw new Error("AI returned malformed plan. Please retry.");
  }

  // Set default values / fallbacks if keys are missing
  if (!parsed.suggestedTemplate) parsed.suggestedTemplate = "showcase";
  if (!parsed.detectedFeatures) parsed.detectedFeatures = [];

  if (!parsed.variants || !parsed.variants.feature || !parsed.variants.benefit || !parsed.variants.outcome) {
    const backupCopy = {
      headline: "Professional Merchant Tools",
      subheadline: "Empower your Shopify store with high-performance management utilities.",
      features: ["Easy to Setup", "Real-Time Updates", "Seamless Integration"]
    };
    parsed.variants = {
      feature: parsed.variants?.feature || backupCopy,
      benefit: parsed.variants?.benefit || backupCopy,
      outcome: parsed.variants?.outcome || backupCopy
    };
  }

  return parsed;
}

export const generatePromos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const plan = await analyze(data.imageDataUrl, {
      appName: data.appName,
      targetAudience: data.targetAudience,
      objective: data.objective,
      palette: data.palette,
      backgroundStyle: data.backgroundStyle,
    });

    try {
      await supabaseAdmin.from("submissions").insert({
        email: data.email,
        app_name: data.appName,
        target_audience: data.targetAudience,
        objective: data.objective,
        screenshot_ref: data.imageDataUrl.slice(0, 80) + "…",
        generated_images: JSON.stringify(plan.variants),
        palette: data.palette,
        background_style: data.backgroundStyle,
      });
    } catch (err) {
      console.error("Failed to persist submission:", err);
    }

    return {
      appName: plan.appName,
      category: plan.category,
      suggestedTemplate: plan.suggestedTemplate,
      detectedFeatures: plan.detectedFeatures,
      variants: plan.variants,
    };
  });
