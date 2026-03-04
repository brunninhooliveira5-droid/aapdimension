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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate caller is authenticated and is client_admin or admin_master
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin_master or client_admin
    const { data: callerRole } = await supabase.from("user_roles").select("role").eq("user_id", caller.id).single();
    const isAdminMaster = callerRole?.role === "admin_master";

    let callerAccountId: string | null = null;
    if (!isAdminMaster) {
      const { data: membership } = await supabase
        .from("account_members")
        .select("account_id, role")
        .eq("user_id", caller.id)
        .eq("is_active", true)
        .single();

      if (!membership || membership.role !== "client_admin") {
        return new Response(JSON.stringify({ error: "Sem permissão para criar membros" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerAccountId = membership.account_id;
    }

    const { name, email, password, account_id, member_role, permissions } = await req.json();

    if (!name || !email || !password || !account_id || !member_role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: name, email, password, account_id, member_role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure caller can only add to their own account
    if (!isAdminMaster && callerAccountId !== account_id) {
      return new Response(JSON.stringify({ error: "Não é possível adicionar membros a outra conta" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create auth user
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "operador" },
    });

    if (createErr) {
      const msg = createErr.message.includes("already been registered")
        ? "Este e-mail já está cadastrado no sistema"
        : createErr.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // 2. Approve the profile (trigger already created it)
    await supabase.from("profiles").update({ approved: true }).eq("id", userId);

    // 3. Insert account_member
    const { error: memberErr } = await supabase.from("account_members").insert({
      account_id,
      user_id: userId,
      role: member_role,
      permissions: permissions ?? {},
    });

    if (memberErr) {
      console.error("Error inserting member:", memberErr);
      return new Response(JSON.stringify({ error: "Erro ao vincular membro à conta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
