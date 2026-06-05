import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function buildCheckoutUrl(rawValue: string, sessionId: string, email: string) {
  const trimmed = rawValue.trim();
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(normalized);

  if (!url.hostname.endsWith(".lemonsqueezy.com") || !url.pathname.startsWith("/checkout/buy/")) {
    throw new Error(
      "LEMON_SQUEEZY_CHECKOUT_URL must be a shareable Lemon Squeezy checkout link like https://your-store.lemonsqueezy.com/checkout/buy/VARIANT_ID.",
    );
  }

  url.searchParams.set("checkout[custom][session_id]", sessionId);
  url.searchParams.set("checkout[email]", email);
  return url;
}

async function assertCheckoutIsReachable(url: URL) {
  const response = await fetch(url.toString(), { method: "GET", redirect: "manual" });
  if (response.status === 404) {
    throw new Error(
      "The configured Lemon Squeezy checkout link returns 404. Copy a fresh Share → Hosted checkout link for the active product variant and update LEMON_SQUEEZY_CHECKOUT_URL.",
    );
  }
  if (response.status >= 400) {
    throw new Error(`Lemon Squeezy checkout is not reachable right now (${response.status}).`);
  }
}

export const initPaymentSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sessionId = crypto.randomUUID();

    await supabaseAdmin.from("payments").insert({
      session_id: sessionId,
      status: "pending",
      customer_email: data.email,
    });

    const checkoutUrlRaw = process.env.LEMON_SQUEEZY_CHECKOUT_URL?.trim();
    if (!checkoutUrlRaw) {
      return { sessionId, checkoutUrl: null, demo: true, setupError: null };
    }

    try {
      const url = buildCheckoutUrl(checkoutUrlRaw, sessionId, data.email);
      await assertCheckoutIsReachable(url);
      return { sessionId, checkoutUrl: url.toString(), demo: false, setupError: null };
    } catch (e) {
      console.error("Invalid Lemon Squeezy checkout URL:", e);
      return {
        sessionId,
        checkoutUrl: null,
        demo: false,
        setupError:
          e instanceof Error
            ? e.message
            : "LEMON_SQUEEZY_CHECKOUT_URL is not a valid Lemon Squeezy checkout URL.",
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
      .select("status, lemon_squeezy_order_id")
      .eq("session_id", data.sessionId)
      .single();

    return { status: (payment?.status as string) ?? "pending" };
  });
