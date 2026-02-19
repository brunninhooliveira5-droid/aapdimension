import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PBKDF2 with salt - secure password hashing using Web Crypto API
const ITERATIONS = 100000; // OWASP recommended minimum
const SALT_LENGTH = 16;
const HASH_LENGTH = 256; // bits

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
  // Support legacy SHA-256 hashes (no colon separator) for migration
  if (!storedHash.includes(":")) {
    // Legacy SHA-256 verification
    const enc = new TextEncoder().encode(password);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const legacyHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return legacyHash === storedHash;
  }

  // PBKDF2 verification
  const [saltHex, hashHex] = storedHash.split(":");
  const salt = fromHex(saltHex);
  const result = await hashPasswordPBKDF2(password, salt);
  return result.hash === hashHex;
}

async function needsRehash(storedHash: string): Promise<boolean> {
  return !storedHash.includes(":");
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
    if (!password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { hash, salt } = await hashPasswordPBKDF2(password);
    const storedHash = `${salt}:${hash}`;

    const { data: existing } = await supabaseAdmin
      .from("finance_access_passwords")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("finance_access_passwords")
        .update({ password_hash: storedHash })
        .eq("user_id", userId);
    } else {
      await supabaseAdmin
        .from("finance_access_passwords")
        .insert({ user_id: userId, password_hash: storedHash });
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

    const { data } = await supabaseAdmin
      .from("finance_access_passwords")
      .select("password_hash")
      .eq("user_id", userId)
      .single();

    if (!data || !(await verifyPassword(password, data.password_hash))) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Migrate legacy hash to PBKDF2 on successful verification
    if (await needsRehash(data.password_hash)) {
      const { hash, salt } = await hashPasswordPBKDF2(password);
      const newStoredHash = `${salt}:${hash}`;
      await supabaseAdmin
        .from("finance_access_passwords")
        .update({ password_hash: newStoredHash })
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ valid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // RESET password (admin_master only, for a target user)
  if (action === "reset") {
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
