import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json();
  const { action, password, target_user_id } = body;

  // CHECK if user has a password set
  if (action === "check") {
    const { data } = await supabaseAdmin
      .from("finance_access_passwords")
      .select("id")
      .eq("user_id", userId)
      .single();

    return new Response(JSON.stringify({ has_password: !!data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SET password (first time or update)
  if (action === "set") {
    if (!password || password.length < 4) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 4 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hash = await hashPassword(password);
    const { data: existing } = await supabaseAdmin
      .from("finance_access_passwords")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("finance_access_passwords")
        .update({ password_hash: hash })
        .eq("user_id", userId);
    } else {
      await supabaseAdmin
        .from("finance_access_passwords")
        .insert({ user_id: userId, password_hash: hash });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // VERIFY password
  if (action === "verify") {
    if (!password) {
      return new Response(
        JSON.stringify({ error: "Senha obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hash = await hashPassword(password);
    const { data } = await supabaseAdmin
      .from("finance_access_passwords")
      .select("password_hash")
      .eq("user_id", userId)
      .single();

    if (!data || data.password_hash !== hash) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // RESET password (admin_master only, for a target user)
  if (action === "reset") {
    // Check if caller is admin_master
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role !== "admin_master") {
      return new Response(JSON.stringify({ error: "Apenas o Admin Master pode resetar senhas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "target_user_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete the password so user must create a new one
    await supabaseAdmin
      .from("finance_access_passwords")
      .delete()
      .eq("user_id", target_user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Ação inválida" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
