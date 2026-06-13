import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// ─── Dodo Payments Webhook Verification ──────────────────────────────────────

function verifyDodoWebhook(
  rawBody: string,
  id: string,
  timestamp: string,
  signatureHeader: string,
  secretKey: string
): boolean {
  if (!id || !timestamp || !signatureHeader || !secretKey) {
    return false;
  }

  // Construct signed content
  const signedContent = `${id}.${timestamp}.${rawBody}`;

  // Decode Dodo webhook secret key (which is base64 encoded, optionally prefixed with 'whsec_')
  const cleanKey = secretKey.startsWith("whsec_") ? secretKey.substring(6) : secretKey;
  let secretBuffer: Buffer;
  try {
    secretBuffer = Buffer.from(cleanKey, "base64");
  } catch (err) {
    console.error("[webhook] Failed to decode webhook key from base64:", err);
    return false;
  }

  // Compute expected signature in base64
  const computedSig = createHmac("sha256", secretBuffer)
    .update(signedContent)
    .digest("base64");

  const computedSigBuffer = Buffer.from(computedSig, "utf8");

  // Match against signatures in the header (space-separated, e.g., "v1,sig1 v1,sig2")
  const signatures = signatureHeader.split(" ");
  for (const sig of signatures) {
    const parts = sig.split(",");
    if (parts.length === 2 && parts[0] === "v1") {
      const headerSigValue = parts[1];
      const headerSigBuffer = Buffer.from(headerSigValue, "utf8");

      try {
        if (
          headerSigBuffer.length === computedSigBuffer.length &&
          timingSafeEqual(headerSigBuffer, computedSigBuffer)
        ) {
          return true;
        }
      } catch (e) {
        // Continue checking other signatures
      }
    }
  }

  return false;
}

async function handleDodoWebhook(request: Request): Promise<Response> {
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookSecret) {
    console.error("[webhook] DODO_PAYMENTS_WEBHOOK_KEY not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const rawBody = await request.text();
  
  // Retrieve Standard Webhook headers
  const webhookId = request.headers.get("webhook-id") || "";
  const webhookTimestamp = request.headers.get("webhook-timestamp") || "";
  const webhookSignature = request.headers.get("webhook-signature") || "";

  if (!webhookSignature) {
    return new Response("Missing signature header", { status: 401 });
  }

  const isVerified = verifyDodoWebhook(
    rawBody,
    webhookId,
    webhookTimestamp,
    webhookSignature,
    webhookSecret
  );

  if (!isVerified) {
    console.error("[webhook] Signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const eventType: string = payload.type ?? "";
  const data = payload.data;
  const sessionId: string | undefined = data?.metadata?.session_id;

  if (!sessionId) {
    console.warn("[webhook] No session_id in metadata — ignoring event:", eventType);
    return new Response("Missing session_id", { status: 200 });
  }

  const orderId = String(data?.id ?? "");
  const customerEmail: string = data?.customer?.email || data?.customer_email || "";

  let newStatus: string | null = null;
  switch (eventType) {
    case "payment.succeeded":
      newStatus = "paid";
      break;
    case "payment.failed":
      newStatus = "failed";
      break;
    case "refund.succeeded":
      newStatus = "refunded";
      break;
    default:
      return new Response("Event ignored", { status: 200 });
  }

  // Update payment record in Supabase
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;
  const db = createClient(supabaseUrl, supabaseKey);

  const { error } = await db
    .from("payments")
    .update({
      status: newStatus,
      lemon_squeezy_order_id: orderId, // Reuse existing table column for Dodo payment ID
      customer_email: customerEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (error) {
    console.error("[webhook] DB update failed:", error);
    return new Response("DB update failed", { status: 500 });
  }

  console.log(`[webhook] Dodo Payment ${sessionId} → ${newStatus} (payment ${orderId})`);
  return new Response("OK", { status: 200 });
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Intercept Dodo Payments webhook before TanStack router
    if (url.pathname === "/api/dodo-webhook" && request.method === "POST") {
      try {
        return await handleDodoWebhook(request);
      } catch (err) {
        console.error("[webhook] Unhandled error:", err);
        return new Response("Internal error", { status: 500 });
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
