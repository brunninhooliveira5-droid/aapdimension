import { supabase } from "@/integrations/supabase/client";

export interface BreakEvenInputs {
  totalDespesasFixas: number;
  saldoCaixa: number;
  receitaMensal: number;
  despesaVariavel: number;
}

export interface BreakEvenMetrics extends BreakEvenInputs {
  despesaTotal: number;
  margemContribuicao: number;
  percentFixoReceita: number;
  percentTotalReceita: number;
  coberturaCaixa: number;
  mesesCobertura: number;
  lucroOperacional: number;
  pontoEquilibrio: number;
  percentAtingido: number;
  status: "positivo" | "atencao" | "critico";
}

export async function getBreakEvenMetrics(): Promise<BreakEvenMetrics> {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [
    { data: fixedExp },
    { data: paidRec },
    { data: paidPay },
    { data: recLast3 },
    { data: paidThisMonth },
  ] = await Promise.all([
    supabase.from("finance_fixed_expenses").select("monthly_value").eq("is_active", true),
    supabase.from("finance_accounts_receivable").select("amount").eq("status", "recebido"),
    supabase.from("finance_accounts_payable").select("amount").eq("status", "pago"),
    supabase
      .from("finance_accounts_receivable")
      .select("amount")
      .eq("status", "recebido")
      .gte("received_date", threeMonthsAgoStr),
    supabase
      .from("finance_accounts_payable")
      .select("amount, payment_date")
      .eq("status", "pago")
      .gte("payment_date", monthStart)
      .lte("payment_date", monthEnd),
  ]);

  const totalDespesasFixas = (fixedExp ?? []).reduce((s, f) => s + Number(f.monthly_value), 0);
  const totalRecebido = (paidRec ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalPago = (paidPay ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const saldoCaixa = totalRecebido - totalPago;

  const somaRec3m = (recLast3 ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const receitaMensal = somaRec3m / 3;

  const pagoMesAtual = (paidThisMonth ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const despesaVariavel = Math.max(0, pagoMesAtual - totalDespesasFixas);

  return computeBreakEven({ totalDespesasFixas, saldoCaixa, receitaMensal, despesaVariavel });
}

export function computeBreakEven(inputs: BreakEvenInputs): BreakEvenMetrics {
  const { totalDespesasFixas, saldoCaixa, receitaMensal, despesaVariavel } = inputs;

  const despesaTotal = totalDespesasFixas + despesaVariavel;
  const margemContribuicao = receitaMensal - despesaVariavel;
  const percentFixoReceita = receitaMensal > 0 ? (totalDespesasFixas / receitaMensal) * 100 : 0;
  const percentTotalReceita = receitaMensal > 0 ? (despesaTotal / receitaMensal) * 100 : 0;
  const coberturaCaixa = totalDespesasFixas > 0 ? saldoCaixa / totalDespesasFixas : 0;
  const mesesCobertura = Math.floor(coberturaCaixa);
  const lucroOperacional = receitaMensal - despesaTotal;

  let pontoEquilibrio: number;
  if (margemContribuicao > 0) {
    const razaoMargem = margemContribuicao / receitaMensal;
    pontoEquilibrio = totalDespesasFixas / razaoMargem;
  } else {
    pontoEquilibrio = totalDespesasFixas + despesaVariavel;
  }

  const percentAtingido =
    pontoEquilibrio > 0 ? Math.min((receitaMensal / pontoEquilibrio) * 100, 200) : 0;

  let status: "positivo" | "atencao" | "critico";
  if (percentTotalReceita <= 70) {
    status = "positivo";
  } else if (percentTotalReceita <= 90) {
    status = "atencao";
  } else {
    status = "critico";
  }

  return {
    ...inputs,
    despesaTotal,
    margemContribuicao,
    percentFixoReceita,
    percentTotalReceita,
    coberturaCaixa,
    mesesCobertura,
    lucroOperacional,
    pontoEquilibrio,
    percentAtingido,
    status,
  };
}
