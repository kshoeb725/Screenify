import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

// Server function to sign up a user and automatically confirm their email.
export const adminSignUpUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      fullName: z.string().min(1),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { email, password, fullName } = data;

    // Create user using Supabase Admin Auth API with email_confirm set to true
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
      },
    });

    if (error) {
      console.error("Error creating user via admin:", error);
      throw new Error(error.message || "Failed to create account.");
    }

    return { success: true, userId: authData.user?.id };
  });

// Server function to reset a user's password directly without email validation.
export const adminResetPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { email, password } = data;

    // 1. Find the user by email
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing users:", listError);
      throw new Error(listError.message || "Failed to fetch user list.");
    }

    const user = listData.users.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      throw new Error("No user found with this email address.");
    }

    // 2. Update their password directly using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      console.error("Error updating user password:", updateError);
      throw new Error(updateError.message || "Failed to reset password.");
    }

    return { success: true };
  });

// Server function to verify login credentials and return precise error messages.
export const verifyLoginCredentials = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      email: z.string().email(),
      password: z.string(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { email, password } = data;

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Supabase URL or Publishable key not configured on server.");
    }

    // 1. Check if user exists by email
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing users for verification:", listError);
      throw new Error("Failed to search user database.");
    }

    const user = listData.users.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      throw new Error("Email does not exist. Sign up");
    }

    // 2. Authenticate the user to verify password
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error: authError } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      throw new Error("Invalid or wrong password");
    }

    return { success: true };
  });
