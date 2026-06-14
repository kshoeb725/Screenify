import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./integrations/supabase/client.server";

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
  const webhookSecret = process.env.DODO_WEBHOOK_SECRET || process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookSecret) {
    console.error("[webhook] DODO_WEBHOOK_SECRET or DODO_PAYMENTS_WEBHOOK_KEY not configured");
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

  // Check event idempotency first
  const { data: existingEvent } = await supabaseAdmin
    .from("webhook_events")
    .select("processed, error")
    .eq("event_id", webhookId)
    .maybeSingle();

  if (existingEvent) {
    if (existingEvent.processed) {
      console.log(`[webhook] Event ${webhookId} already processed.`);
      return new Response("Event already processed", { status: 200 });
    }
    console.warn(`[webhook] Event ${webhookId} exists but not processed. Retrying.`);
  } else {
    // Log new webhook event in db
    await supabaseAdmin
      .from("webhook_events")
      .insert({
        event_id: webhookId,
        event_type: eventType,
        payload: payload,
        processed: false
      });
  }

  let userId = data?.metadata?.user_id || payload.data?.metadata?.user_id;
  const customerEmail: string = data?.customer?.email || data?.customer_email || payload.data?.customer?.email || "";

  if (!userId && customerEmail) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();
    
    if (profile) {
      userId = profile.id;
    }
  }

  try {
    if (eventType.startsWith("subscription.")) {
      const subId = data?.subscription_id || data?.id;
      const customerId = data?.customer_id;
      const subStatus = data?.status || "active";
      const planName = data?.plan_name || "Pro Plan";
      const billingCycle = "monthly";
      const currentPeriodStart = data?.current_period_start || new Date().toISOString();
      const currentPeriodEnd = data?.next_billing_date || data?.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (!subId) {
        throw new Error("Missing subscription_id in payload");
      }

      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .upsert({
          user_id: userId || null,
          dodo_customer_id: customerId,
          dodo_subscription_id: subId,
          plan_name: planName,
          billing_cycle: billingCycle,
          status: subStatus,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: "dodo_subscription_id" });

      if (subError) {
        throw new Error(`Failed to upsert subscription: ${subError.message}`);
      }

      // Sync Pro status to user profile
      if (subStatus === "active" || subStatus === "renewed") {
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({ is_pro: true, dodo_customer_id: customerId })
            .eq("id", userId);
        }
      } else if (subStatus === "expired" || subStatus === "cancelled") {
        const hasExpired = subStatus === "expired" || new Date(currentPeriodEnd) <= new Date();
        if (hasExpired && userId) {
          // Verify no other active subscriptions
          const { data: otherSubs } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "active");

          if (!otherSubs || otherSubs.length === 0) {
            await supabaseAdmin
              .from("profiles")
              .update({ is_pro: false })
              .eq("id", userId);
          }
        }
      }

    } else if (eventType.startsWith("payment.")) {
      const paymentId = data?.payment_id || data?.id;
      const amount = data?.amount ? (data.amount / 100) : null;
      const currency = data?.currency || "USD";
      const payStatus = data?.status || "pending";
      const payMethod = data?.payment_method || "card";
      const txRef = data?.transaction_reference || data?.receipt_url || "";

      const dbPaymentUpdate: any = {
        payment_status: payStatus,
        status: payStatus === "succeeded" ? "paid" : payStatus,
        amount,
        currency,
        payment_method: payMethod,
        transaction_reference: txRef,
        dodo_payment_id: paymentId,
        customer_email: customerEmail,
        updated_at: new Date().toISOString(),
      };

      if (userId) {
        dbPaymentUpdate.user_id = userId;
      }

      // Try updating via session_id, or insert new if session_id not found
      let payError = true;
      if (sessionId) {
        const { error } = await supabaseAdmin
          .from("payments")
          .update(dbPaymentUpdate)
          .eq("session_id", sessionId);
        if (!error) payError = false;
      }

      if (payError) {
        console.warn("[webhook] Payment update failed by session_id. Creating new payment record.");
        await supabaseAdmin
          .from("payments")
          .insert({
            user_id: userId || null,
            session_id: sessionId || `pay_${paymentId}`,
            amount,
            currency,
            status: payStatus === "succeeded" ? "paid" : payStatus,
            payment_status: payStatus,
            payment_method: payMethod,
            transaction_reference: txRef,
            customer_email: customerEmail,
            dodo_payment_id: paymentId,
          });
      }

      if (payStatus === "succeeded" || payStatus === "paid") {
        if (userId) {
          await supabaseAdmin
            .from("profiles")
            .update({ is_pro: true })
            .eq("id", userId);
        }
      }

    } else if (eventType.startsWith("refund.")) {
      const paymentId = data?.payment_id || data?.id;
      const refundStatus = data?.status || "succeeded";

      if (refundStatus === "succeeded" || refundStatus === "completed") {
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .update({
            payment_status: "refunded",
            status: "refunded",
            updated_at: new Date().toISOString(),
          })
          .eq("dodo_payment_id", paymentId)
          .select("user_id")
          .maybeSingle();

        if (payment?.user_id) {
          const { data: otherSubs } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("user_id", payment.user_id)
            .eq("status", "active");

          if (!otherSubs || otherSubs.length === 0) {
            await supabaseAdmin
              .from("profiles")
              .update({ is_pro: false })
              .eq("id", payment.user_id);
          }
        }
      }
    }

    // Mark event as processed
    await supabaseAdmin
      .from("webhook_events")
      .update({ processed: true })
      .eq("event_id", webhookId);

    console.log(`[webhook] Processed event ${eventType} successfully.`);
    return new Response("OK", { status: 200 });

  } catch (err: any) {
    console.error("[webhook] Error processing event:", err);
    await supabaseAdmin
      .from("webhook_events")
      .update({ error: err.message || "Unknown error" })
      .eq("event_id", webhookId);

    return new Response(`Processing error: ${err.message}`, { status: 500 });
  }
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
