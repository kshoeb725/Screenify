import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
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

function validatePlan(plan: AnalysisPlan, ctx: { appName: string }): string[] {
  const errors: string[] = [];
  
  if (!plan.slides || !Array.isArray(plan.slides) || plan.slides.length !== 6) {
    errors.push("The plan must contain exactly 6 slides.");
    return errors;
  }

  const prohibitedRegex = /\b(best|guaranteed|guarantee|instantly|instant|perfect|no\.?\s*1|#1|fastest|world-class|world\s+class|guaranteed\s+approval|instant\s+success)\b/i;
  const comparisonRegex = /\b(better than|alternative to|replaces|beats|cheaper than|more advanced than)\b/i;
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E6}-\u{1F1FF}]/u;
  const percentageGuaranteeRegex = /\b(\d+%\s*(guaranteed|increase|boost|more|extra|growth))\b/i;

  const countWords = (str: string) => {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const allHeadlines: string[] = [];
  const allSubheadlines: string[] = [];

  plan.slides.forEach((slide, sIdx) => {
    const slideNum = slide.slideNumber || (sIdx + 1);
    
    if (!["executive", "conversion", "showcase", "enterprise", "growth"].includes(slide.suggestedTemplate)) {
      errors.push(`Slide ${slideNum}: Invalid suggestedTemplate "${slide.suggestedTemplate}".`);
    }
    if (!["modern", "minimal", "gradient", "dark"].includes(slide.suggestedPreset)) {
      errors.push(`Slide ${slideNum}: Invalid suggestedPreset "${slide.suggestedPreset}".`);
    }

    const variants = ["feature", "benefit", "outcome"] as const;
    variants.forEach(variantName => {
      const variant = slide.variants?.[variantName];
      if (!variant) {
        errors.push(`Slide ${slideNum}: Missing variant "${variantName}".`);
        return;
      }

      const { headline, subheadline, features } = variant;

      // 1. Headline constraints (max 6 words)
      const headlineWords = countWords(headline);
      if (headlineWords > 6) {
        errors.push(`Slide ${slideNum} (${variantName}): Headline "${headline}" has ${headlineWords} words. Must be max 6 words.`);
      }

      // 2. Subheadline constraints (max 15 words)
      const subheadlineWords = countWords(subheadline);
      if (subheadlineWords > 15) {
        errors.push(`Slide ${slideNum} (${variantName}): Subheadline "${subheadline}" has ${subheadlineWords} words. Must be max 15 words.`);
      }

      // 3. Feature highlight constraints (Exactly 3, max 5 words each)
      if (!features || !Array.isArray(features) || features.length !== 3) {
        errors.push(`Slide ${slideNum} (${variantName}): Must have exactly 3 feature highlights.`);
      } else {
        features.forEach((feat, fIdx) => {
          const featWords = countWords(feat);
          if (featWords > 5) {
            errors.push(`Slide ${slideNum} (${variantName}) Feature ${fIdx + 1}: "${feat}" has ${featWords} words. Must be max 5 words.`);
          }
          if (prohibitedRegex.test(feat)) {
            errors.push(`Slide ${slideNum} (${variantName}) Feature ${fIdx + 1}: "${feat}" contains prohibited marketing terms.`);
          }
          if (emojiRegex.test(feat)) {
            errors.push(`Slide ${slideNum} (${variantName}) Feature ${fIdx + 1}: "${feat}" contains prohibited emojis.`);
          }
        });
      }

      // 4. Prohibited keywords checks
      if (prohibitedRegex.test(headline)) {
        errors.push(`Slide ${slideNum} (${variantName}): Headline "${headline}" contains prohibited marketing/sales terms.`);
      }
      if (prohibitedRegex.test(subheadline)) {
        errors.push(`Slide ${slideNum} (${variantName}): Subheadline "${subheadline}" contains prohibited marketing/sales terms.`);
      }

      // 5. Competitor comparison checks
      if (comparisonRegex.test(headline)) {
        errors.push(`Slide ${slideNum} (${variantName}): Headline "${headline}" contains prohibited competitor comparisons.`);
      }
      if (comparisonRegex.test(subheadline)) {
        errors.push(`Slide ${slideNum} (${variantName}): Subheadline "${subheadline}" contains prohibited competitor comparisons.`);
      }

      // 6. Emoji checks
      if (emojiRegex.test(headline)) {
        errors.push(`Slide ${slideNum} (${variantName}): Headline "${headline}" contains emojis. Emojis are strictly prohibited.`);
      }
      if (emojiRegex.test(subheadline)) {
        errors.push(`Slide ${slideNum} (${variantName}): Subheadline "${subheadline}" contains emojis. Emojis are strictly prohibited.`);
      }

      // 7. Percentage guarantees checks
      if (percentageGuaranteeRegex.test(headline)) {
        errors.push(`Slide ${slideNum} (${variantName}): Headline "${headline}" contains prohibited percentage growth guarantees.`);
      }
      if (percentageGuaranteeRegex.test(subheadline)) {
        errors.push(`Slide ${slideNum} (${variantName}): Subheadline "${subheadline}" contains prohibited percentage growth guarantees.`);
      }

      if (headline) allHeadlines.push(headline.toLowerCase().trim());
      if (subheadline) allSubheadlines.push(subheadline.toLowerCase().trim());
    });
  });

  // 8. Repetitive wording check (Exact duplicates across slides)
  const findDuplicates = (arr: string[]) => arr.filter((item, index) => arr.indexOf(item) !== index);
  const dupHeadlines = findDuplicates(allHeadlines);
  const dupSubheadlines = findDuplicates(allSubheadlines);
  
  if (dupHeadlines.length > 2) {
    errors.push(`Highly repetitive headlines detected: ${Array.from(new Set(dupHeadlines)).slice(0, 3).join(", ")}`);
  }
  if (dupSubheadlines.length > 2) {
    errors.push(`Highly repetitive subheadlines detected: ${Array.from(new Set(dupSubheadlines)).slice(0, 3).join(", ")}`);
  }

  return errors;
}

function sanitizePlan(plan: AnalysisPlan): AnalysisPlan {
  const countWords = (str: string) => {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const limitWords = (str: string, max: number) => {
    if (!str) return "";
    const words = str.trim().split(/\s+/).filter(Boolean);
    if (words.length <= max) return str;
    return words.slice(0, max).join(" ");
  };

  const cleanText = (text: string): string => {
    if (!text) return "";
    
    // Strip emojis
    let cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E6}-\u{1F1FF}]/gu, "");
    
    // Prohibited words mappings
    const replacements: { pattern: RegExp; replacement: string }[] = [
      { pattern: /\bbest\b/gi, replacement: "premium" },
      { pattern: /\bguaranteed\b/gi, replacement: "designed" },
      { pattern: /\bguarantee\b/gi, replacement: "assurance" },
      { pattern: /\binstantly\b/gi, replacement: "efficiently" },
      { pattern: /\binstant\b/gi, replacement: "quick" },
      { pattern: /\bperfect\b/gi, replacement: "excellent" },
      { pattern: /\bno\.?\s*1\b/gi, replacement: "leading" },
      { pattern: /\b#1\b/gi, replacement: "leading" },
      { pattern: /\bno 1\b/gi, replacement: "leading" },
      { pattern: /\bfastest\b/gi, replacement: "high-speed" },
      { pattern: /\bworld-class\b/gi, replacement: "professional" },
      { pattern: /\bworld\s+class\b/gi, replacement: "professional" },
      { pattern: /\bunlimited\b/gi, replacement: "flexible" },
    ];

    replacements.forEach(({ pattern, replacement }) => {
      cleaned = cleaned.replace(pattern, replacement);
    });

    cleaned = cleaned.replace(/\b(better than|alternative to|replaces|beats|cheaper than)\b/gi, "redefining");
    cleaned = cleaned.replace(/\b\d+%\s*(guaranteed|increase|boost|more|extra|growth)\b/gi, "significant improvement");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    
    return cleaned;
  };

  if (!plan.slides || !Array.isArray(plan.slides)) {
    return plan;
  }

  const defaultTemplates = ["showcase", "executive", "conversion", "enterprise", "growth"];
  const defaultPresets = ["modern", "minimal", "gradient", "dark"];

  plan.slides = plan.slides.map((slide, sIdx) => {
    const slideNum = slide.slideNumber || (sIdx + 1);
    
    const suggestedTemplate = defaultTemplates.includes(slide.suggestedTemplate) 
      ? slide.suggestedTemplate 
      : "showcase";
      
    const suggestedPreset = defaultPresets.includes(slide.suggestedPreset) 
      ? slide.suggestedPreset 
      : "modern";

    const slideRole = slide.role || ["Hook / Hero Benefit", "Problem & Solution", "Key Feature A", "Key Feature B", "Outcome / Social Proof", "Setup & Trust"][sIdx] || "Feature Detail";

    const defaultVariants = {
      feature: { headline: "Core Feature Overview", subheadline: "High-performance store management utility.", features: ["Simple setup", "Reliable sync", "Live tracking"] },
      benefit: { headline: "Streamline Operations", subheadline: "Save time and increase efficiency across your workflow.", features: ["Saves hours weekly", "Optimizes conversion", "Automated rules"] },
      outcome: { headline: "Enhance Store Growth", subheadline: "Drive higher customer engagement and satisfaction.", features: ["Increases interaction", "Elevates revenue", "Improves retention"] }
    };

    const variants = { ...defaultVariants };

    if (slide.variants) {
      (["feature", "benefit", "outcome"] as const).forEach(vName => {
        const originalVariant = slide.variants[vName];
        if (originalVariant) {
          let headline = cleanText(originalVariant.headline || defaultVariants[vName].headline);
          let subheadline = cleanText(originalVariant.subheadline || defaultVariants[vName].subheadline);
          let rawFeatures = Array.isArray(originalVariant.features) ? originalVariant.features : defaultVariants[vName].features;

          headline = limitWords(headline, 6);
          subheadline = limitWords(subheadline, 15);

          if (rawFeatures.length < 3) {
            rawFeatures = [...rawFeatures, ...defaultVariants[vName].features.slice(rawFeatures.length)];
          }
          const features = rawFeatures.slice(0, 3).map((feat, fIdx) => {
            let cleanedFeat = cleanText(feat || defaultVariants[vName].features[fIdx]);
            return limitWords(cleanedFeat, 5);
          });

          variants[vName] = { headline, subheadline, features };
        }
      });
    }

    return {
      ...slide,
      slideNumber: slideNum,
      role: slideRole,
      suggestedTemplate,
      suggestedPreset,
      variants
    };
  });

  return plan;
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
  const basePrompt = `You are a Shopify App Store compliance expert, SaaS copywriter, and AI prompt engineer.
Analyze the uploaded screenshot(s) of a Shopify merchant app and generate a complete, high-converting sequence of 6 App Store screenshots representing a strategic storytelling narrative.

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
- Slide 6: Setup / Integrations / Trust (Shows how easy it is to configure and that it "Works with Shopify", acts as CTA)

--------------------------------------------------
Shopify Compliance & Quality Requirements:
--------------------------------------------------
Your generated copy must strictly adhere to the Shopify App Store content standards.

1. NO POLICY VIOLATIONS & NO MISLEADING CLAIMS:
   - Do NOT write false promises, guaranteed outcomes, or spammy promotional copy.
   - Do NOT use competitor comparisons (e.g. "better than X", "replaces Y") or trademarked competitor names.
   - Do NOT make unsupported performance claims (e.g. "boost sales by 50%", "increase sales by 300% guaranteed"). Avoid percentage metrics unless they are general and non-guaranteed.
   - Do NOT use emojis. Copy must be alphanumeric and contain standard punctuation only.

2. BANNED WORDS (Do NOT use under any circumstances):
   - "best", "guaranteed", "guarantee", "instantly", "instant", "perfect", "no.1", "#1", "no 1", "fastest", "world-class", "world class", "unlimited" (unless factually true, but prefer to avoid completely to prevent violations).

3. SCREENSHOT-DRIVEN CONTEXT (No Hallucinations):
   - Base the copywriting strictly on the uploaded screenshot(s), app name, target audience, and objective.
   - The generated text must reflect actual app functionality. Do NOT make up features that are not visible in the screenshot or described in the objective.
   - If the app context is unclear, generate clean, neutral descriptive copy. Avoid unsupported assumptions.

--------------------------------------------------
Content Constraints & Schema:
--------------------------------------------------
For each slide, you must generate three copywriting variations ("feature", "benefit", "outcome") under these strict rules:

- headline (Headline / CTA Text / Tagline):
  * Maximum 6 words
  * Strong but professional
  * Highlight core value / clear CTA

- subheadline (Subheadline / Marketing Caption / Benefits):
  * Maximum 15 words
  * 1-2 concise sentences explaining practical benefits / value clearly

- features (Feature Callouts / bullet points):
  * Exactly 3 callouts in the array
  * Maximum 5 words per callout
  * Short, readable, and feature-focused

For each slide, also determine:
1. suggestedTemplate:
   - "executive" (best for analytics, tables, dashboard metrics)
   - "conversion" (best for sales badges, revenue trackers, review counts)
   - "showcase" (best for clean UI cards, general layouts, and hero previews)
   - "enterprise" (best for workflow configuration, status grids, security)
   - "growth" (best for speed tests, checkout widgets, direct revenue metrics)
2. suggestedPreset:
   - "modern", "minimal", "gradient", or "dark"

Also evaluate the app's baseline Listing Score (out of 100) and provide short strategic audit feedback (under 40 words per category) conforming to these compliance requirements.

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
      "suggestedTemplate": "showcase",
      "suggestedPreset": "modern",
      "variants": {
        "feature": {
          "headline": "Headline copy",
          "subheadline": "Subheadline copy",
          "features": ["Callout one", "Callout two", "Callout three"]
        },
        "benefit": {
          "headline": "Headline copy",
          "subheadline": "Subheadline copy",
          "features": ["Callout one", "Callout two", "Callout three"]
        },
        "outcome": {
          "headline": "Headline copy",
          "subheadline": "Subheadline copy",
          "features": ["Callout one", "Callout two", "Callout three"]
        }
      }
    }
    // Repeat for slides 2, 3, 4, 5, 6 in order
  ]
}`;

  let attempt = 0;
  const maxAttempts = 3;
  let feedback = "";
  let lastParsedPlan: AnalysisPlan | null = null;

  while (attempt < maxAttempts) {
    attempt++;
    const currentPrompt = attempt === 1 
      ? basePrompt 
      : `${basePrompt}\n\nIMPORTANT: Your previous output failed compliance validation with the following errors. Please correct them in your new response:\n${feedback}`;

    try {
      console.log(`[analyze] Running generation attempt ${attempt} of ${maxAttempts}...`);
      const raw = await analyzeImages(currentPrompt, imageDataUrls);
      const cleaned = extractJSON(raw);
      const parsed: AnalysisPlan = JSON.parse(cleaned);
      lastParsedPlan = parsed;

      const errors = validatePlan(parsed, { appName: ctx.appName });
      if (errors.length === 0) {
        console.log("[analyze] Content generation succeeded compliance validation on attempt " + attempt);
        return parsed;
      }

      feedback = errors.map(err => `- ${err}`).join("\n");
      console.warn(`[analyze] Attempt ${attempt} failed validation:\n${feedback}`);
    } catch (err: any) {
      feedback = `- Exception occurred during generation or parsing: ${err.message || err}`;
      console.error(`[analyze] Attempt ${attempt} caught error:`, err);
    }
  }

  console.warn("[analyze] Failed to generate fully compliant copy after 3 attempts. Executing programmatic sanitizer safety net...");

  // Fallback programmatic sanitization layer
  let finalPlan = lastParsedPlan;
  if (!finalPlan || !finalPlan.slides || finalPlan.slides.length !== 6) {
    // If we have no valid parsed plan, construct a structured default compliant plan
    finalPlan = {
      appName: ctx.appName,
      category: "Store design",
      auditScore: 80,
      auditFeedback: {
        categoryConventions: "The layout adheres well to standard app presentation guidelines.",
        narrativeStrength: "A structured flow walks merchant through core pain points and setup.",
        copyImpact: "Clear features and value highlights establish professional trust."
      },
      slides: Array.from({ length: 6 }).map((_, i) => ({
        slideNumber: i + 1,
        role: ["Hook / Hero Benefit", "Problem & Solution", "Key Feature A", "Key Feature B", "Outcome / Social Proof", "Setup & Trust"][i],
        suggestedTemplate: "showcase",
        suggestedPreset: "modern",
        variants: {
          feature: {
            headline: "Polished Store Solutions",
            subheadline: "Empower your Shopify store with high-performance management utilities.",
            features: ["Simple setup", "Reliable sync", "Live tracking"]
          },
          benefit: {
            headline: "Streamline Operations Today",
            subheadline: "Save time and increase efficiency across your store workflow.",
            features: ["Saves hours weekly", "Optimizes conversion", "Automated rules"]
          },
          outcome: {
            headline: "Enhance Store Growth",
            subheadline: "Drive higher customer engagement and store retention.",
            features: ["Increases interaction", "Elevates revenue", "Improves retention"]
          }
        }
      }))
    };
  }

  return sanitizePlan(finalPlan);
}

async function verifyEmailOwnership(email: string): Promise<boolean> {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return false;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return false;
  }

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) {
    return false;
  }

  const tokenEmail = data.claims.email;
  return tokenEmail?.toLowerCase() === email.toLowerCase();
}

export const generatePromos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    // Access Control: Free tier is limited to 1 generation
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, is_pro")
      .eq("email", data.email)
      .maybeSingle();

    let isPro = profile?.is_pro ?? false;

    if (isPro && profile?.id) {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", profile.id)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        const isExpired = sub.status === "expired" || (sub.current_period_end && new Date(sub.current_period_end) < new Date());
        if (isExpired) {
          console.log(`[generate] Subscription expired for user ${profile.id}. Revoking Pro status.`);
          await supabaseAdmin
            .from("profiles")
            .update({ is_pro: false })
            .eq("id", profile.id);
          isPro = false;
        }
      }
    }

    if (isPro) {
      // If the account has Pro status, verify the user is logged in as the owner of this email
      const isOwner = await verifyEmailOwnership(data.email);
      if (!isOwner) {
        throw new Error("Access denied: You must be logged in to this account to use Pro features.");
      }
    } else {
      const { count, error: countError } = await supabaseAdmin
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("email", data.email);

      if (countError) {
        console.error("[generate] Error counting submissions for limit check:", countError);
      }

      if (count !== null && count >= 1) {
        throw new Error("Free tier generation limit reached. Please upgrade to Pro to unlock unlimited generations.");
      }
    }

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
        screenshot_ref: data.imageDataUrls[0],
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
