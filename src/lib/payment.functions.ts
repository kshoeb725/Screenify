import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initPaymentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sessionId = crypto.randomUUID();
    const userId = context.userId;

    // Insert pending payment record in Supabase
    await supabaseAdmin.from("payments").insert({
      session_id: sessionId,
      status: "pending",
      payment_status: "pending",
      customer_email: data.email,
      user_id: userId,
    });

    const apiKey = (process.env.DODO_API_KEY || process.env.DODO_PAYMENTS_API_KEY)?.trim();
    const productId = (process.env.DODO_PLAN_ID || process.env.DODO_PAYMENTS_PRODUCT_ID)?.trim();

    // If API key or product ID is missing, fall back to Demo Mode
    if (!apiKey || !productId) {
      console.log("[payments] DODO_API_KEY or PLAN_ID missing. Launching in Demo Mode.");
      return { sessionId, checkoutUrl: null, demo: true, setupError: null };
    }

    try {
      const isLive = process.env.DODO_ENVIRONMENT === "live_mode" || apiKey.startsWith("live_");
      const dodoBaseUrl = isLive ? "https://live.dodopayments.com" : "https://test.dodopayments.com";
      const appUrl = process.env.APP_URL?.trim() || "http://localhost:3000";

      const response = await fetch(`${dodoBaseUrl}/checkouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          product_cart: [
            {
              product_id: productId,
              quantity: 1,
            },
          ],
          customer: {
            email: data.email,
          },
          metadata: {
            session_id: sessionId,
            user_id: userId,
          },
          return_url: `${appUrl}/dashboard?session_id=${sessionId}`,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[payments] Dodo Payments API failed:", errText);
        throw new Error(`Dodo Payments API error: ${errText || response.statusText}`);
      }

      const resBody = await response.json();
      return { sessionId, checkoutUrl: resBody.checkout_url, demo: false, setupError: null };
    } catch (e: any) {
      console.error("[payments] Error initiating Dodo Payments session:", e);
      return {
        sessionId,
        checkoutUrl: null,
        demo: false,
        setupError: e instanceof Error ? e.message : "Failed to initiate Dodo Payments checkout session.",
      };
    }
  });

export const getPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("status")
      .eq("session_id", data.sessionId)
      .single();

    return { status: (payment?.status as string) ?? "pending" };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ subscriptionId: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { subscriptionId } = data;

    // 1. Fetch subscription from our database to verify it belongs to this user
    const { data: sub, error: fetchError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("dodo_subscription_id", subscriptionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError || !sub) {
      console.error("[payments] Subscription not found or access denied:", fetchError);
      return { success: false, error: "Subscription not found or access denied." };
    }

    const apiKey = (process.env.DODO_API_KEY || process.env.DODO_PAYMENTS_API_KEY)?.trim();
    if (!apiKey) {
      // Demo Mode fallback for cancellation
      console.log("[payments] DODO_API_KEY missing. Simulating cancellation in Demo Mode.");
      
      // Update local subscription to cancelled
      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("dodo_subscription_id", subscriptionId);

      return { success: true, demo: true };
    }

    try {
      const isLive = process.env.DODO_ENVIRONMENT === "live_mode" || apiKey.startsWith("live_");
      const dodoBaseUrl = isLive ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

      // Call Dodo PATCH endpoint to schedule cancellation at next billing date
      const response = await fetch(`${dodoBaseUrl}/subscriptions/${subscriptionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          cancel_at_next_billing_date: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[payments] Dodo cancel API failed:", errText);
        throw new Error(`Dodo API error: ${errText || response.statusText}`);
      }

      // Update local subscription to cancelled
      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("dodo_subscription_id", subscriptionId);

      return { success: true, demo: false };
    } catch (e: any) {
      console.error("[payments] Error cancelling Dodo subscription:", e);
      return { success: false, error: e.message || "Failed to cancel subscription." };
    }
  });
