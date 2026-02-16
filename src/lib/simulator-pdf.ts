/**
 * ══════════════════════════════════════════════════════
 * MÓDULO DE GERAÇÃO DE PDF — SIMULADOR DE DECISÃO
 * ══════════════════════════════════════════════════════
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (v: number) =>
  `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtSigned = (v: number) =>
  `${v < 0 ? "- " : ""}R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const SLATE_800: [number, number, number] = [30, 41, 59];
const SLATE_100: [number, number, number] = [241, 245, 249];
const SLATE_400: [number, number, number] = [148, 163, 184];
const GREEN: [number, number, number] = [16, 185, 129];
const BLUE: [number, number, number] = [59, 130, 246];
const RED: [number, number, number] = [239, 68, 68];

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  doc.setFillColor(...SLATE_800);
  doc.rect(0, 0, pw, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const now = new Date();
  doc.text(
    `Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    margin, 20
  );
  doc.text(subtitle, pw - margin, 20, { align: "right" });
}

function addFooter(doc: jsPDF, label: string) {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 14;
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(...SLATE_100);
    doc.rect(0, ph - 10, pw, 10, "F");
    doc.setTextColor(...SLATE_400);
    doc.setFontSize(7);
    doc.text(`Relatório gerado automaticamente — ${label}`, margin, ph - 4);
    doc.text(`Página ${i}/${total}`, pw - margin, ph - 4, { align: "right" });
  }
}

function drawLineChart(
  doc: jsPDF,
  datasets: { data: number[]; color: [number, number, number]; label: string }[],
  labels: string[],
  x: number, y: number, w: number, h: number,
  title: string
) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  doc.setTextColor(...SLATE_400);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(title, x + 4, y + 6);

  const allVals = datasets.flatMap(d => d.data);
  const maxVal = Math.max(...allVals, 0);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  const pX = x + 4;
  const pW = w - 8;
  const pY = y + 12;
  const pH = h - 22;

  // Zero line
  if (minVal < 0) {
    const zY = pY + pH - ((0 - minVal) / range) * pH;
    doc.setDrawColor(...SLATE_400);
    doc.setLineDashPattern([1, 1], 0);
    doc.setLineWidth(0.15);
    doc.line(pX, zY, pX + pW, zY);
    doc.setLineDashPattern([], 0);
  }

  // Data lines
  datasets.forEach(ds => {
    doc.setDrawColor(...ds.color);
    doc.setLineWidth(0.5);
    for (let i = 1; i < ds.data.length; i++) {
      const x1 = pX + ((i - 1) / (ds.data.length - 1)) * pW;
      const x2 = pX + (i / (ds.data.length - 1)) * pW;
      const y1 = pY + pH - ((ds.data[i - 1] - minVal) / range) * pH;
      const y2 = pY + pH - ((ds.data[i] - minVal) / range) * pH;
      doc.line(x1, y1, x2, y2);
    }
  });

  // Legend
  let lx = pX;
  const ly = y + h - 4;
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  datasets.forEach(ds => {
    doc.setFillColor(...ds.color);
    doc.rect(lx, ly - 1.5, 4, 1.5, "F");
    lx += 5;
    doc.setTextColor(...ds.color);
    doc.text(ds.label, lx, ly);
    lx += doc.getTextWidth(ds.label) + 4;
  });

  // Axis labels
  doc.setFontSize(5);
  doc.setTextColor(...SLATE_400);
  doc.text(fmtSigned(maxVal), pX, pY + 2);
  doc.text(fmtSigned(minVal), pX, pY + pH + 3);
  if (labels.length > 0) {
    doc.text(labels[0], pX, pY + pH + 6);
    doc.text(labels[labels.length - 1], pX + pW, pY + pH + 6, { align: "right" });
  }
}

function downloadPdf(doc: jsPDF, filename: string) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== SCENARIO SIMULATOR PDF ==========
export interface ScenarioPdfData {
  currentRevenue: number;
  currentExpense: number;
  months: number;
  revenueGrowth: { optimistic: number; realistic: number; pessimistic: number };
  expenseGrowth: { optimistic: number; realistic: number; pessimistic: number };
  projectionData: { mes: string; balOtimista: number; balRealista: number; balPessimista: number }[];
}

export function generateScenarioPdf(data: ScenarioPdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pw = doc.internal.pageSize.getWidth();

  addHeader(doc, "Simulação de Cenários", `Projeção de ${data.months} meses`);
  let y = 36;

  // Parameters card
  doc.setFillColor(...SLATE_100);
  doc.roundedRect(margin, y, pw - margin * 2, 22, 2, 2, "F");
  doc.setTextColor(...SLATE_800);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Parâmetros", margin + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Receita Atual: ${fmt(data.currentRevenue)}/mês`, margin + 4, y + 11);
  doc.text(`Despesa Atual: ${fmt(data.currentExpense)}/mês`, margin + 70, y + 11);
  doc.text(`Saldo Atual: ${fmtSigned(data.currentRevenue - data.currentExpense)}/mês`, margin + 136, y + 11);
  doc.text(
    `Cresc. Receita: Otim ${data.revenueGrowth.optimistic}% | Real ${data.revenueGrowth.realistic}% | Pess ${data.revenueGrowth.pessimistic}%`,
    margin + 4, y + 17
  );
  doc.text(
    `Cresc. Despesa: Otim ${data.expenseGrowth.optimistic}% | Real ${data.expenseGrowth.realistic}% | Pess ${data.expenseGrowth.pessimistic}%`,
    margin + 100, y + 17
  );

  y += 28;

  // Summary cards
  const last = data.projectionData[data.projectionData.length - 1];
  const cardW = (pw - margin * 2 - 8) / 3;
  const scenarios = [
    { label: "Otimista", value: last?.balOtimista ?? 0, color: GREEN },
    { label: "Realista", value: last?.balRealista ?? 0, color: BLUE },
    { label: "Pessimista", value: last?.balPessimista ?? 0, color: RED },
  ];
  scenarios.forEach((s, i) => {
    const cx = margin + i * (cardW + 4);
    doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    doc.roundedRect(cx, y, cardW, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`${s.label} (Mês ${data.months})`, cx + 4, y + 5);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(fmtSigned(s.value), cx + 4, y + 13);
  });

  y += 22;

  // Chart
  const chartH = 50;
  drawLineChart(
    doc,
    [
      { data: data.projectionData.map(d => d.balOtimista), color: GREEN, label: "Otimista" },
      { data: data.projectionData.map(d => d.balRealista), color: BLUE, label: "Realista" },
      { data: data.projectionData.map(d => d.balPessimista), color: RED, label: "Pessimista" },
    ],
    data.projectionData.map(d => d.mes),
    margin, y, pw - margin * 2, chartH,
    "Projeção de Saldo Mensal"
  );

  y += chartH + 6;

  // Table
  doc.setTextColor(...SLATE_800);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento Mensal", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Mês", "Otimista", "Realista", "Pessimista"]],
    body: data.projectionData.map(d => [
      d.mes,
      fmtSigned(d.balOtimista),
      fmtSigned(d.balRealista),
      fmtSigned(d.balPessimista),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: SLATE_800, textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: SLATE_100 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right", textColor: GREEN },
      2: { halign: "right", textColor: BLUE },
      3: { halign: "right", textColor: RED },
    },
  });

  addFooter(doc, "Simulação de Cenários");
  const now = new Date();
  downloadPdf(doc, `simulacao-cenarios-${now.toISOString().split("T")[0]}.pdf`);
}

// ========== INVESTMENT ANALYSIS PDF ==========
export interface InvestmentPdfData {
  investmentCost: number;
  monthlyReturn: number;
  monthlyCost: number;
  analysisPeriod: number;
  discountRate: number;
  paybackMonths: number;
  roi: number;
  npv: number;
  netMonthly: number;
  totalReturn: number;
  cashflowData: { mes: string; fluxo: number; retorno: number }[];
}

export function generateInvestmentPdf(data: InvestmentPdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pw = doc.internal.pageSize.getWidth();

  addHeader(doc, "Análise de Investimento", `Período de ${data.analysisPeriod} meses`);
  let y = 36;

  // Parameters
  doc.setFillColor(...SLATE_100);
  doc.roundedRect(margin, y, pw - margin * 2, 16, 2, 2, "F");
  doc.setTextColor(...SLATE_800);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Parâmetros", margin + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Investimento: ${fmt(data.investmentCost)}`, margin + 4, y + 11);
  doc.text(`Retorno/mês: ${fmt(data.monthlyReturn)}`, margin + 50, y + 11);
  doc.text(`Custo/mês: ${fmt(data.monthlyCost)}`, margin + 96, y + 11);
  doc.text(`Taxa Desc.: ${data.discountRate}%/mês`, margin + 136, y + 11);

  y += 22;

  // KPI cards
  const cardW = (pw - margin * 2 - 12) / 4;
  const kpis = [
    { label: "Payback", value: data.paybackMonths === Infinity ? "—" : `${data.paybackMonths} meses`, color: SLATE_800 },
    { label: "ROI", value: `${data.roi}%`, color: data.roi >= 0 ? GREEN : RED },
    { label: "VPL (NPV)", value: fmtSigned(data.npv), color: data.npv >= 0 ? GREEN : RED },
    { label: "Lucro Líquido/mês", value: fmtSigned(data.netMonthly), color: data.netMonthly >= 0 ? GREEN : RED },
  ];
  kpis.forEach((k, i) => {
    const cx = margin + i * (cardW + 4);
    doc.setFillColor(...SLATE_100);
    doc.roundedRect(cx, y, cardW, 18, 2, 2, "F");
    doc.setTextColor(...SLATE_400);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(k.label, cx + 3, y + 6);
    doc.setTextColor(...k.color);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, cx + 3, y + 14);
  });

  y += 24;

  // Chart
  const chartH = 50;
  drawLineChart(
    doc,
    [{ data: data.cashflowData.map(d => d.fluxo), color: BLUE, label: "Fluxo Acumulado" }],
    data.cashflowData.map(d => d.mes),
    margin, y, pw - margin * 2, chartH,
    "Fluxo de Caixa Acumulado"
  );

  y += chartH + 6;

  // Table
  doc.setTextColor(...SLATE_800);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento Mensal", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Mês", "Retorno Líquido", "Acumulado"]],
    body: data.cashflowData.map(d => [
      d.mes,
      fmtSigned(d.retorno),
      fmtSigned(d.fluxo),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: SLATE_800, textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: SLATE_100 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right", textColor: GREEN },
      2: { halign: "right" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 2) {
        const val = data.cashflowData[hookData.row.index]?.fluxo ?? 0;
        hookData.cell.styles.textColor = val >= 0 ? GREEN : RED;
      }
    },
  });

  addFooter(doc, "Análise de Investimento");
  const now = new Date();
  downloadPdf(doc, `analise-investimento-${now.toISOString().split("T")[0]}.pdf`);
}

// ========== CASHFLOW PROJECTION PDF ==========
export interface CashFlowProjectionPdfData {
  initialBalance: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  projMonths: number;
  inflowVariation: number;
  outflowVariation: number;
  projData: { mes: string; entradas: number; saidas: number; saldo: number }[];
}

export function generateCashFlowProjectionPdf(data: CashFlowProjectionPdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pw = doc.internal.pageSize.getWidth();

  addHeader(doc, "Projeção de Fluxo de Caixa", `${data.projMonths} meses`);
  let y = 36;

  // Parameters
  doc.setFillColor(...SLATE_100);
  doc.roundedRect(margin, y, pw - margin * 2, 16, 2, 2, "F");
  doc.setTextColor(...SLATE_800);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Parâmetros", margin + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Saldo Inicial: ${fmt(data.initialBalance)}`, margin + 4, y + 11);
  doc.text(`Entradas/mês: ${fmt(data.monthlyInflow)}`, margin + 50, y + 11);
  doc.text(`Saídas/mês: ${fmt(data.monthlyOutflow)}`, margin + 96, y + 11);
  doc.text(`Var. Entrada: ±${data.inflowVariation}%`, margin + 142, y + 11);

  y += 22;

  // Summary
  const lastItem = data.projData[data.projData.length - 1];
  const totalIn = data.projData.reduce((s, d) => s + d.entradas, 0);
  const totalOut = data.projData.reduce((s, d) => s + d.saidas, 0);

  const cardW = (pw - margin * 2 - 8) / 3;
  const cards = [
    { label: "Total Entradas", value: fmt(totalIn), color: GREEN },
    { label: "Total Saídas", value: fmt(totalOut), color: RED },
    { label: `Saldo Final (Mês ${data.projMonths})`, value: fmtSigned(lastItem?.saldo ?? 0), color: (lastItem?.saldo ?? 0) >= 0 ? GREEN : RED },
  ];
  cards.forEach((c, i) => {
    const cx = margin + i * (cardW + 4);
    doc.setFillColor(...SLATE_100);
    doc.roundedRect(cx, y, cardW, 18, 2, 2, "F");
    doc.setTextColor(...SLATE_400);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(c.label, cx + 3, y + 6);
    doc.setTextColor(...c.color);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(c.value, cx + 3, y + 14);
  });

  y += 24;

  // Bar chart approximation (drawn as stacked rectangles)
  const chartH = 50;
  const chartW = pw - margin * 2;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, chartW, chartH, 2, 2, "F");
  doc.setTextColor(...SLATE_400);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Entradas vs Saídas", margin + 4, y + 6);

  if (data.projData.length > 0) {
    const maxBar = Math.max(...data.projData.map(d => Math.max(d.entradas, d.saidas)));
    const barAreaX = margin + 4;
    const barAreaW = chartW - 8;
    const barAreaY = y + 10;
    const barAreaH = chartH - 16;
    const groupW = barAreaW / data.projData.length;
    const barW = groupW * 0.35;

    data.projData.forEach((d, i) => {
      const gx = barAreaX + i * groupW;
      const hIn = maxBar > 0 ? (d.entradas / maxBar) * barAreaH : 0;
      const hOut = maxBar > 0 ? (d.saidas / maxBar) * barAreaH : 0;
      doc.setFillColor(...GREEN);
      doc.rect(gx + 1, barAreaY + barAreaH - hIn, barW, hIn, "F");
      doc.setFillColor(...RED);
      doc.rect(gx + barW + 2, barAreaY + barAreaH - hOut, barW, hOut, "F");
    });

    // X-axis labels
    doc.setFontSize(4);
    doc.setTextColor(...SLATE_400);
    data.projData.forEach((d, i) => {
      const gx = barAreaX + i * groupW + groupW / 2;
      doc.text(d.mes.replace("Mês ", "M"), gx, barAreaY + barAreaH + 4, { align: "center" });
    });
  }

  // Legend
  let lx = margin + 4;
  const ly = y + chartH - 3;
  doc.setFontSize(5);
  doc.setFillColor(...GREEN);
  doc.rect(lx, ly - 1.5, 4, 1.5, "F");
  lx += 5;
  doc.setTextColor(...GREEN);
  doc.text("Entradas", lx, ly);
  lx += 18;
  doc.setFillColor(...RED);
  doc.rect(lx, ly - 1.5, 4, 1.5, "F");
  lx += 5;
  doc.setTextColor(...RED);
  doc.text("Saídas", lx, ly);

  y += chartH + 4;

  // Balance line chart
  const chartH2 = 35;
  drawLineChart(
    doc,
    [{ data: data.projData.map(d => d.saldo), color: BLUE, label: "Saldo" }],
    data.projData.map(d => d.mes),
    margin, y, chartW, chartH2,
    "Evolução do Saldo"
  );

  y += chartH2 + 6;

  // Table
  doc.setTextColor(...SLATE_800);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Detalhamento Mensal", margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Mês", "Entradas", "Saídas", "Saldo"]],
    body: data.projData.map(d => [
      d.mes,
      fmt(d.entradas),
      fmt(d.saidas),
      fmtSigned(d.saldo),
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: SLATE_800, textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: SLATE_100 },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "right", textColor: GREEN },
      2: { halign: "right", textColor: RED },
      3: { halign: "right" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 3) {
        const val = data.projData[hookData.row.index]?.saldo ?? 0;
        hookData.cell.styles.textColor = val >= 0 ? GREEN : RED;
      }
    },
  });

  addFooter(doc, "Projeção de Fluxo de Caixa");
  const now = new Date();
  downloadPdf(doc, `projecao-fluxo-caixa-${now.toISOString().split("T")[0]}.pdf`);
}
