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

// ─── Lemon Squeezy webhook handler ───────────────────────────────────────────

async function handleLemonWebhook(request: Request): Promise<Response> {
  const webhookSecret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] LEMON_SQUEEZY_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature");

  if (!signature) {
    return new Response("Missing X-Signature header", { status: 401 });
  }

  // Verify HMAC-SHA256 signature
  const digest = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(digest, "utf8"), Buffer.from(signature, "utf8"))) {
      return new Response("Invalid signature", { status: 401 });
    }
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const eventName: string = payload.meta?.event_name ?? "";
  const sessionId: string | undefined = payload.meta?.custom_data?.session_id;

  if (!sessionId) {
    console.warn("[webhook] No session_id in custom_data — ignoring event:", eventName);
    return new Response("Missing session_id", { status: 400 });
  }

  const orderId = String(payload.data?.id ?? "");
  const customerEmail: string = payload.data?.attributes?.user_email ?? "";

  let newStatus: string | null = null;
  switch (eventName) {
    case "order_created":
      newStatus = "paid";
      break;
    case "order_refunded":
      newStatus = "refunded";
      break;
    case "subscription_payment_failed":
      newStatus = "failed";
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
      lemon_squeezy_order_id: orderId,
      customer_email: customerEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (error) {
    console.error("[webhook] DB update failed:", error);
    return new Response("DB update failed", { status: 500 });
  }

  console.log(`[webhook] Payment ${sessionId} → ${newStatus} (order ${orderId})`);
  return new Response("OK", { status: 200 });
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // Intercept Lemon Squeezy webhook before TanStack router
    if (url.pathname === "/api/lemon-webhook" && request.method === "POST") {
      try {
        return await handleLemonWebhook(request);
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
