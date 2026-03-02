import { DollarSign, AlertTriangle } from "lucide-react";

interface InvoiceBasic {
  amount: number;
  due_date: string;
}

interface Props {
  isAdmin: boolean;
  openInvoices: InvoiceBasic[];
  overdueInvoices: InvoiceBasic[];
}

export function FinancialStatusWidget({ isAdmin, openInvoices, overdueInvoices }: Props) {
  if (isAdmin || openInvoices.length === 0) return null;

  const nextDueInvoice = openInvoices.reduce((a, b) => a.due_date < b.due_date ? a : b);

  return (
    <div className={`rounded-lg border p-4 flex items-center justify-between flex-wrap gap-3 ${
      overdueInvoices.length > 0
        ? "border-destructive/50 bg-destructive/10"
        : "border-primary/30 bg-primary/5"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          overdueInvoices.length > 0 ? "bg-destructive/20" : "bg-primary/20"
        }`}>
          {overdueInvoices.length > 0
            ? <AlertTriangle className="w-5 h-5 text-destructive" />
            : <DollarSign className="w-5 h-5 text-primary" />
          }
        </div>
        <div>
          {overdueInvoices.length > 0 ? (
            <>
              <p className="text-sm font-semibold text-destructive">
                Você possui {overdueInvoices.length} parcela{overdueInvoices.length > 1 ? "s" : ""} em atraso
              </p>
              <p className="text-xs text-destructive/80">
                Total em atraso: R$ {overdueInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-primary">Pagamento em dia ✓</p>
              <p className="text-xs text-muted-foreground">
                Próxima fatura: {new Date(nextDueInvoice.due_date).toLocaleDateString("pt-BR")}
                {` — R$ ${nextDueInvoice.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </p>
            </>
          )}
        </div>
      </div>
      {overdueInvoices.length > 0 && (
        <p className="text-lg font-bold text-destructive">
          R$ {overdueInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  );
}
