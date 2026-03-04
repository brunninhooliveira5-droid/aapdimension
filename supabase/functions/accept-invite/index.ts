import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invite_token, user_id } = await req.json();

    if (!invite_token || !user_id) {
      return new Response(JSON.stringify({ error: "Missing invite_token or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch invite
    const { data: invite, error: inviteErr } = await supabase
      .from("account_invites")
      .select("*")
      .eq("invite_token", invite_token)
      .eq("status", "pendente")
      .single();

    if (inviteErr || !invite) {
      return new Response(JSON.stringify({ error: "Convite inválido ou expirado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (new Date(invite.expires_at) < new Date()) {
      await supabase.from("account_invites").update({ status: "expirado" }).eq("id", invite.id);
      return new Response(JSON.stringify({ error: "Convite expirado" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-approve user
    await supabase.from("profiles").update({ approved: true }).eq("id", user_id);

    // Insert into account_members
    const { error: memberErr } = await supabase.from("account_members").insert({
      account_id: invite.account_id,
      user_id,
      role: invite.suggested_role,
      permissions: invite.permissions ?? {},
    });

    if (memberErr) {
      console.error("Error inserting member:", memberErr);
      return new Response(JSON.stringify({ error: "Erro ao adicionar membro" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark invite as accepted
    await supabase.from("account_invites").update({
      status: "aceito",
      accepted_at: new Date().toISOString(),
    }).eq("id", invite.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
