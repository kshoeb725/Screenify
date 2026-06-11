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
  images: { mimeType: string; base64Data: string }[],
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${key}`;
  
  const imageParts = images.map((img) => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.base64Data,
    },
  }));

  const payload: any = {
    contents: [
      {
        parts: [
          { text: prompt },
          ...imageParts,
        ],
      },
    ],
  };

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

async function analyzeImages(prompt: string, imageDataUrls: string[]): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    const parsedImages = imageDataUrls.map(url => parseDataUrl(url));
    const discovered = await getSupportedMultimodalModels(geminiKey);
    const attempts: { version: "v1beta" | "v1"; model: string }[] = [];
    
    if (discovered.length > 0) {
      discovered.forEach(m => {
        attempts.push({ version: "v1beta", model: m });
        attempts.push({ version: "v1", model: m });
      });
    }

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
        console.log(`[Gemini API] Trying model ${attempt.model} on ${attempt.version} with ${parsedImages.length} images...`);
        const responseText = await callGeminiEndpoint(
          geminiKey,
          attempt.model,
          attempt.version,
          prompt,
          parsedImages,
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
                ...imageDataUrls.map((url) => ({
                  type: "image_url",
                  image_url: { url },
                })),
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
  imageDataUrls: z
    .array(
      z.string().min(50).refine((s) => s.startsWith("data:image/"), "Must be an image data URL")
    )
    .min(1)
    .max(6),
  email: z.string().trim().email().max(255),
  appName: z.string().trim().min(1).max(100),
  targetAudience: z.string().trim().min(1).max(300),
  objective: z.string().trim().min(1).max(500),
  palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(8).optional().default([]),
  backgroundStyle: z.string().trim().max(200).optional().default(""),
});

type SlideVariantCopy = {
  headline: string;
  subheadline: string;
  features: string[];
};

type SlideData = {
  slideNumber: number;
  role: string;
  suggestedTemplate: "executive" | "conversion" | "showcase" | "enterprise" | "growth";
  suggestedPreset: "modern" | "minimal" | "gradient" | "dark";
  variants: {
    feature: SlideVariantCopy;
    benefit: SlideVariantCopy;
    outcome: SlideVariantCopy;
  };
};

type AnalysisPlan = {
  appName: string;
  category: string;
  auditScore: number;
  auditFeedback: {
    categoryConventions: string;
    narrativeStrength: string;
    copyImpact: string;
  };
  slides: SlideData[];
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
  imageDataUrls: string[],
  ctx: {
    appName: string;
    targetAudience: string;
    objective: string;
    palette: string[];
    backgroundStyle: string;
  },
): Promise<AnalysisPlan> {
  const prompt = `You are a Shopify App Store conversion marketing strategist. Analyze the uploaded screenshot(s) of a Shopify merchant app and generate a complete, high-converting sequence of 6 App Store screenshots representing a strategic storytelling narrative.

Context:
- App Name: ${ctx.appName}
- Target Audience: ${ctx.targetAudience}
- Objective: ${ctx.objective}

We are designing exactly 6 screenshots in sequence:
- Slide 1: Hook / Hero Benefit (Scroll stopper, focuses on the primary value proposition)
- Slide 2: Problem & Solution (A visual setup of the merchant pain point and the app's answer)
- Slide 3: Key Feature A (Deep-dive into the first key interactive element)
- Slide 4: Key Feature B (Deep-dive into the second key feature or integration)
- Slide 5: Outcome / Social Proof (Focuses on metrics, growth, conversion increase, or reviews)
- Slide 6: Setup / Integrations / Trust (Shows how easy it is to configure and that it "Works with Shopify")

For each slide, perform these operations:
1. Determine which visual template suits it best:
   - "executive" (best for analytics, tables, dashboard metrics)
   - "conversion" (best for sales badges, revenue trackers, review counts)
   - "showcase" (best for clean UI cards, general layouts, and hero previews)
   - "enterprise" (best for workflow configuration, status grids, security)
   - "growth" (best for speed tests, checkout widgets, direct revenue metrics)
2. Select the optimal color preset: "modern", "minimal", "gradient", or "dark".
3. Write three distinct copywriting variations (strictly alphanumeric, max 6 words for headlines, max 15 words for subheadlines, and exactly 3 feature highlights of max 5 words each. Do NOT use emojis):
   - "feature" (emphasizes *what* it does)
   - "benefit" (emphasizes *how* it saves time or increases sales)
   - "outcome" (emphasizes *results/success metrics*)

Also evaluate the app's baseline Listing Score (out of 100) and provide short strategic audit feedback (under 40 words per category).

Return ONLY valid JSON with this exact schema:
{
  "appName": "${ctx.appName}",
  "category": "app category (e.g. Marketing, Store design, Orders and shipping)",
  "auditScore": 85,
  "auditFeedback": {
    "categoryConventions": "Critique of how well this aligns with standard app store layouts.",
    "narrativeStrength": "Critique of the screenshot sequence flow and storytelling.",
    "copyImpact": "Critique of headline effectiveness and value focus."
  },
  "slides": [
    {
      "slideNumber": 1,
      "role": "Hook / Hero Benefit",
      "suggestedTemplate": "showcase | executive | conversion | enterprise | growth",
      "suggestedPreset": "modern | minimal | gradient | dark",
      "variants": {
        "feature": {
          "headline": "Headline (max 6 words)",
          "subheadline": "Subheadline (max 15 words)",
          "features": ["highlight 1 (max 5 words)", "highlight 2", "highlight 3"]
        },
        "benefit": {
          "headline": "Headline (max 6 words)",
          "subheadline": "Subheadline (max 15 words)",
          "features": ["highlight 1 (max 5 words)", "highlight 2", "highlight 3"]
        },
        "outcome": {
          "headline": "Headline (max 6 words)",
          "subheadline": "Subheadline (max 15 words)",
          "features": ["highlight 1 (max 5 words)", "highlight 2", "highlight 3"]
        }
      }
    }
    // ... Repeat for slides 2, 3, 4, 5, 6 in order
  ]
}`;

  const raw = await analyzeImages(prompt, imageDataUrls);
  const cleaned = extractJSON(raw);
  let parsed: AnalysisPlan;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Malformed plan JSON. Raw:", raw.slice(0, 1000));
    throw new Error("AI returned malformed JSON plan. Please retry.");
  }

  // Ensure slides array exists and contains all 6 slides
  if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length !== 6) {
    parsed.slides = Array.from({ length: 6 }).map((_, i) => ({
      slideNumber: i + 1,
      role: ["Hook / Hero Benefit", "Problem & Solution", "Key Feature A", "Key Feature B", "Outcome / Social Proof", "Setup & Trust"][i],
      suggestedTemplate: "showcase",
      suggestedPreset: "modern",
      variants: {
        feature: {
          headline: "Professional Store Solutions",
          subheadline: "Empower your Shopify store with high-performance management utilities.",
          features: ["Easy Setup", "Real-Time Sync", "Full Analytics"]
        },
        benefit: {
          headline: "Boost Sales and Save Time",
          subheadline: "Empower your Shopify store with high-performance management utilities.",
          features: ["Save Hours Weekly", "Increase Conversions", "Automated Logic"]
        },
        outcome: {
          headline: "Increase Installs and Growth",
          subheadline: "Empower your Shopify store with high-performance management utilities.",
          features: ["Double Installs", "Grow Store Revenue", "Higher Reviews"]
        }
      }
    }));
  }

  return parsed;
}

export const generatePromos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const plan = await analyze(data.imageDataUrls, {
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
        screenshot_ref: data.imageDataUrls[0].slice(0, 80) + "… (and " + (data.imageDataUrls.length - 1) + " more)",
        generated_images: JSON.stringify(plan.slides),
        palette: data.palette,
        background_style: data.backgroundStyle,
      });
    } catch (err) {
      console.error("Failed to persist submission:", err);
    }

    return {
      appName: plan.appName,
      category: plan.category,
      auditScore: plan.auditScore,
      auditFeedback: plan.auditFeedback,
      slides: plan.slides,
    };
  });
