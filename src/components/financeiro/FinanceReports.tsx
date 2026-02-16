import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileText, Table as TableIcon, BarChart3, CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PayableRow {
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  category_id: string | null;
  supplier: string;
  description: string;
}

interface ReceivableRow {
  amount: number;
  expected_date: string;
  received_date: string | null;
  status: string;
  category_id: string | null;
  client: string;
  description: string;
}

interface CategoryRow { id: string; name: string; type: string; }

const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const getMonthKey = (dateStr: string | null) => dateStr ? dateStr.substring(0, 7) : null;

const getMonthLabel = (key: string) => {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

export function FinanceReports() {
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodMode, setPeriodMode] = useState<"preset" | "custom">("preset");
  const [months, setMonths] = useState("6");
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    d.setDate(1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<"dre" | "comparison">("dre");

  useEffect(() => {
    const fetch = async () => {
      const [{ data: p }, { data: r }, { data: c }] = await Promise.all([
        supabase.from("finance_accounts_payable").select("amount, due_date, payment_date, status, category_id, supplier, description"),
        supabase.from("finance_accounts_receivable").select("amount, expected_date, received_date, status, category_id, client, description"),
        supabase.from("finance_categories").select("id, name, type").eq("is_active", true).order("sort_order"),
      ]);
      setPayables((p as PayableRow[]) ?? []);
      setReceivables((r as ReceivableRow[]) ?? []);
      setCategories((c as CategoryRow[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  // Generate month keys for selected range
  const monthKeys = useMemo(() => {
    const keys: string[] = [];
    if (periodMode === "preset") {
      const n = Number(months);
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    } else if (startDate && endDate) {
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      while (current <= end) {
        keys.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
        current.setMonth(current.getMonth() + 1);
      }
    }
    return keys;
  }, [periodMode, months, startDate, endDate]);

  const periodLabel = useMemo(() => {
    if (periodMode === "preset") return `últimos ${months} meses`;
    if (startDate && endDate) {
      return `${format(startDate, "dd/MM/yyyy")} a ${format(endDate, "dd/MM/yyyy")}`;
    }
    return "período customizado";
  }, [periodMode, months, startDate, endDate]);

  // Monthly aggregations
  const monthlyData = useMemo(() => {
    return monthKeys.map(key => {
      const receitas = receivables
        .filter(r => r.status === "recebido" && getMonthKey(r.received_date) === key)
        .reduce((s, r) => s + Number(r.amount), 0);

      const despesas = payables
        .filter(p => p.status === "pago" && getMonthKey(p.payment_date) === key)
        .reduce((s, p) => s + Number(p.amount), 0);

      return { key, label: getMonthLabel(key), receitas, despesas, resultado: receitas - despesas };
    });
  }, [monthKeys, payables, receivables]);

  // DRE - Simplified Income Statement
  const dre = useMemo(() => {
    const totalReceitas = monthlyData.reduce((s, m) => s + m.receitas, 0);
    const totalDespesas = monthlyData.reduce((s, m) => s + m.despesas, 0);

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    payables
      .filter(p => p.status === "pago" && monthKeys.some(k => getMonthKey(p.payment_date) === k))
      .forEach(p => {
        const cat = categories.find(c => c.id === p.category_id);
        const name = cat?.name || "Sem Categoria";
        expensesByCategory[name] = (expensesByCategory[name] || 0) + Number(p.amount);
      });

    // Group revenues by category
    const revenuesByCategory: Record<string, number> = {};
    receivables
      .filter(r => r.status === "recebido" && monthKeys.some(k => getMonthKey(r.received_date) === k))
      .forEach(r => {
        const cat = categories.find(c => c.id === r.category_id);
        const name = cat?.name || "Sem Categoria";
        revenuesByCategory[name] = (revenuesByCategory[name] || 0) + Number(r.amount);
      });

    return {
      totalReceitas,
      totalDespesas,
      resultado: totalReceitas - totalDespesas,
      margin: totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0,
      revenuesByCategory: Object.entries(revenuesByCategory).sort((a, b) => b[1] - a[1]),
      expensesByCategory: Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]),
    };
  }, [monthlyData, payables, receivables, categories, monthKeys]);

  // Export CSV
  const exportCSV = () => {
    if (view === "dre") {
      const lines = [
        "DRE Simplificado",
        `Período: ${periodLabel}`,
        "",
        "RECEITAS",
        ...dre.revenuesByCategory.map(([name, val]) => `${name};${val.toFixed(2)}`),
        `Total Receitas;${dre.totalReceitas.toFixed(2)}`,
        "",
        "DESPESAS",
        ...dre.expensesByCategory.map(([name, val]) => `${name};${val.toFixed(2)}`),
        `Total Despesas;${dre.totalDespesas.toFixed(2)}`,
        "",
        `Resultado Líquido;${dre.resultado.toFixed(2)}`,
        `Margem (%);${dre.margin.toFixed(1)}`,
      ];
      downloadFile(lines.join("\n"), `dre-${periodLabel.replace(/\//g, "-")}.csv`, "text/csv;charset=utf-8;");
    } else {
      const header = ["Mês", "Receitas", "Despesas", "Resultado"].join(";");
      const rows = monthlyData.map(m => [m.label, m.receitas.toFixed(2), m.despesas.toFixed(2), m.resultado.toFixed(2)].join(";"));
      const totals = [
        "TOTAL",
        monthlyData.reduce((s, m) => s + m.receitas, 0).toFixed(2),
        monthlyData.reduce((s, m) => s + m.despesas, 0).toFixed(2),
        monthlyData.reduce((s, m) => s + m.resultado, 0).toFixed(2),
      ].join(";");
      downloadFile([header, ...rows, "", totals].join("\n"), `comparativo-${periodLabel.replace(/\//g, "-")}.csv`, "text/csv;charset=utf-8;");
    }
  };

  // Export PDF (simple text-based using jsPDF)
  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.text(view === "dre" ? "DRE Simplificado" : "Comparativo Mensal", pageW / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel}`, pageW / 2, 28, { align: "center" });

    if (view === "dre") {
      let y = 38;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RECEITAS", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Categoria", "Valor (R$)"]],
        body: [
          ...dre.revenuesByCategory.map(([name, val]) => [name, fmt(val)]),
          [{ content: "Total Receitas", styles: { fontStyle: "bold" } }, { content: fmt(dre.totalReceitas), styles: { fontStyle: "bold" } }],
        ],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 85] },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.text("DESPESAS", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Categoria", "Valor (R$)"]],
        body: [
          ...dre.expensesByCategory.map(([name, val]) => [name, fmt(val)]),
          [{ content: "Total Despesas", styles: { fontStyle: "bold" } }, { content: fmt(dre.totalDespesas), styles: { fontStyle: "bold" } }],
        ],
        theme: "grid",
        headStyles: { fillColor: [185, 60, 60] },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      const resultColor = dre.resultado >= 0 ? [0, 128, 0] : [200, 0, 0];
      doc.setTextColor(resultColor[0], resultColor[1], resultColor[2]);
      doc.text(`Resultado Líquido: ${fmt(dre.resultado)}`, 14, y);
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Margem: ${dre.margin.toFixed(1)}%`, 14, y + 7);
    } else {
      autoTable(doc, {
        startY: 36,
        head: [["Mês", "Receitas (R$)", "Despesas (R$)", "Resultado (R$)"]],
        body: [
          ...monthlyData.map(m => [m.label, fmt(m.receitas), fmt(m.despesas), fmt(m.resultado)]),
          [
            { content: "TOTAL", styles: { fontStyle: "bold" } },
            { content: fmt(monthlyData.reduce((s, m) => s + m.receitas, 0)), styles: { fontStyle: "bold" } },
            { content: fmt(monthlyData.reduce((s, m) => s + m.despesas, 0)), styles: { fontStyle: "bold" } },
            { content: fmt(monthlyData.reduce((s, m) => s + m.resultado, 0)), styles: { fontStyle: "bold" } },
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [40, 60, 90] },
        margin: { left: 14, right: 14 },
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, doc.internal.pageSize.getHeight() - 10);

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = view === "dre" ? `dre-${periodLabel.replace(/\//g, "-")}.pdf` : `comparativo-${periodLabel.replace(/\//g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob(["\uFEFF" + content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm py-8 text-center">Carregando relatórios...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex gap-1 bg-accent/50 rounded-lg border border-border p-1">
          <Button
            variant={view === "dre" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => setView("dre")}
          >
            <FileText className="w-4 h-4" /> DRE
          </Button>
          <Button
            variant={view === "comparison" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => setView("comparison")}
          >
            <BarChart3 className="w-4 h-4" /> Comparativo
          </Button>
        </div>

        <div className="flex gap-1 bg-accent/50 rounded-lg border border-border p-1">
          <Button
            variant={periodMode === "preset" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriodMode("preset")}
          >
            Predefinido
          </Button>
          <Button
            variant={periodMode === "custom" ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriodMode("custom")}
          >
            Personalizado
          </Button>
        </div>

        {periodMode === "preset" ? (
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-[140px] bg-accent border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal gap-1.5", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal gap-1.5", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
            <TableIcon className="w-4 h-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPDF}>
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      {view === "dre" ? (
        /* DRE View */
        <div className="space-y-4">
          {/* Revenue Section */}
          <div className="gradient-card rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-accent/20">
              <h3 className="text-sm font-semibold text-foreground">📈 Receitas</h3>
            </div>
            <div className="divide-y divide-border/50">
              {dre.revenuesByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma receita no período.</p>
              ) : (
                <>
                  {dre.revenuesByCategory.map(([name, val]) => (
                    <div key={name} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">{name}</span>
                      <span className="text-sm font-medium text-foreground">{fmt(val)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-accent/10">
                    <span className="text-sm font-semibold text-foreground">Total Receitas</span>
                    <span className="text-sm font-bold text-emerald-400">{fmt(dre.totalReceitas)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Expenses Section */}
          <div className="gradient-card rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-accent/20">
              <h3 className="text-sm font-semibold text-foreground">📉 Despesas</h3>
            </div>
            <div className="divide-y divide-border/50">
              {dre.expensesByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma despesa no período.</p>
              ) : (
                <>
                  {dre.expensesByCategory.map(([name, val]) => (
                    <div key={name} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">{name}</span>
                      <span className="text-sm font-medium text-foreground">{fmt(val)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-accent/10">
                    <span className="text-sm font-semibold text-foreground">Total Despesas</span>
                    <span className="text-sm font-bold text-red-400">{fmt(dre.totalDespesas)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Result */}
          <div className={`gradient-card rounded-lg border p-5 ${dre.resultado >= 0 ? "border-emerald-500/30" : "border-red-500/30"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                <p className={`text-2xl font-bold ${dre.resultado >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmt(dre.resultado)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Margem</p>
                <p className={`text-lg font-semibold ${dre.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {dre.margin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Comparison View */
        <div className="space-y-4">
          {/* Chart */}
          <div className="gradient-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Receitas vs Despesas — {periodLabel}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => fmt(value)}
                />
                <Legend />
                <Bar dataKey="receitas" fill="hsl(var(--chart-2))" name="Receitas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="hsl(var(--chart-5))" name="Despesas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="gradient-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Mês</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Receitas</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Despesas</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Resultado</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {monthlyData.map(m => {
                    const margin = m.receitas > 0 ? ((m.resultado / m.receitas) * 100) : 0;
                    return (
                      <tr key={m.key} className="hover:bg-accent/20 transition-colors">
                        <td className="p-3 font-medium text-foreground capitalize">{m.label}</td>
                        <td className="p-3 text-right text-emerald-400 font-medium">{fmt(m.receitas)}</td>
                        <td className="p-3 text-right text-red-400 font-medium">{fmt(m.despesas)}</td>
                        <td className={`p-3 text-right font-semibold ${m.resultado >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {fmt(m.resultado)}
                        </td>
                        <td className={`p-3 text-right ${margin >= 0 ? "text-muted-foreground" : "text-red-400"}`}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-accent/20">
                    <td className="p-3 font-bold text-foreground">TOTAL</td>
                    <td className="p-3 text-right font-bold text-emerald-400">
                      {fmt(monthlyData.reduce((s, m) => s + m.receitas, 0))}
                    </td>
                    <td className="p-3 text-right font-bold text-red-400">
                      {fmt(monthlyData.reduce((s, m) => s + m.despesas, 0))}
                    </td>
                    <td className={`p-3 text-right font-bold ${monthlyData.reduce((s, m) => s + m.resultado, 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmt(monthlyData.reduce((s, m) => s + m.resultado, 0))}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {(() => {
                        const totalR = monthlyData.reduce((s, m) => s + m.receitas, 0);
                        const totalRes = monthlyData.reduce((s, m) => s + m.resultado, 0);
                        return totalR > 0 ? ((totalRes / totalR) * 100).toFixed(1) + "%" : "—";
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
