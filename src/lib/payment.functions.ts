import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const initPaymentSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sessionId = crypto.randomUUID();

    // Insert pending payment record in Supabase
    await supabaseAdmin.from("payments").insert({
      session_id: sessionId,
      status: "pending",
      customer_email: data.email,
    });

    const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
    const productId = process.env.DODO_PAYMENTS_PRODUCT_ID?.trim();

    // If API key or product ID is missing, fall back to Demo Mode
    if (!apiKey || !productId) {
      console.log("[payments] DODO_PAYMENTS_API_KEY or PRODUCT_ID missing. Launching in Demo Mode.");
      return { sessionId, checkoutUrl: null, demo: true, setupError: null };
    }

    try {
      const isLive = apiKey.startsWith("live_") || process.env.NODE_ENV === "production";
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
