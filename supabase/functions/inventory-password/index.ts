import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 256;

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function hashPasswordPBKDF2(password: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const useSalt = salt ?? crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const enc = new TextEncoder().encode(password);
  const keyMaterial = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: useSalt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    HASH_LENGTH
  );
  return { hash: toHex(new Uint8Array(bits)), salt: toHex(useSalt) };
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash.includes(":")) {
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const legacyHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return legacyHash === storedHash;
  }
  const [saltHex, hashHex] = storedHash.split(":");
  const salt = fromHex(saltHex);
  const result = await hashPasswordPBKDF2(password, salt);
  return result.hash === hashHex;
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
  const { action, password, login_password, table } = body;

  // Determine which table to use (dimension vs pc module)
  const passwordTable = table === "pc" ? "pc_inventory_access_passwords" : "inventory_access_passwords";

  // CHECK if password exists
  if (action === "check") {
    const { data } = await supabaseAdmin
      .from(passwordTable)
      .select("id")
      .eq("user_id", userId)
      .single();
    return new Response(JSON.stringify({ has_password: !!data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // SET password (first time)
  if (action === "set") {
    if (!password || password.length < 4) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 4 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already has password
    const { data: existing } = await supabaseAdmin
      .from(passwordTable)
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Senha já cadastrada. Use a opção de alterar senha." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { hash, salt } = await hashPasswordPBKDF2(password);
    const storedHash = `${salt}:${hash}`;

    await supabaseAdmin
      .from(passwordTable)
      .insert({ user_id: userId, password_hash: storedHash });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // VERIFY inventory password
  if (action === "verify") {
    if (!password) {
      return new Response(
        JSON.stringify({ error: "Senha obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data } = await supabaseAdmin
      .from(passwordTable)
      .select("password_hash")
      .eq("user_id", userId)
      .single();

    if (!data || !(await verifyPassword(password, data.password_hash))) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // CHANGE password (requires login password for auth)
  if (action === "change") {
    if (!login_password || !password) {
      return new Response(
        JSON.stringify({ error: "Senha de login e nova senha obrigatórias" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 4) {
      return new Response(
        JSON.stringify({ error: "Nova senha deve ter pelo menos 4 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify login password via GoTrue
    const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!userInfo?.user?.email) {
      return new Response(JSON.stringify({ error: "Erro ao buscar usuário" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gotrue = `${supabaseUrl}/auth/v1/token?grant_type=password`;
    const verifyRes = await fetch(gotrue, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": supabaseAnonKey },
      body: JSON.stringify({ email: userInfo.user.email, password: login_password }),
    });

    if (!verifyRes.ok) {
      return new Response(JSON.stringify({ error: "Senha de login incorreta" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update inventory password
    const { hash, salt } = await hashPasswordPBKDF2(password);
    const storedHash = `${salt}:${hash}`;

    const { data: existing } = await supabaseAdmin
      .from(passwordTable)
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from(passwordTable)
        .update({ password_hash: storedHash, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } else {
      await supabaseAdmin
        .from(passwordTable)
        .insert({ user_id: userId, password_hash: storedHash });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Ação inválida" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
