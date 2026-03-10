import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FilePlus, Settings2, History } from "lucide-react";
import { ReceiptsList } from "@/components/receipts/ReceiptsList";
import { ReceiptForm } from "@/components/receipts/ReceiptForm";
import { ReceiptPdfConfig } from "@/components/receipts/ReceiptPdfConfig";
import { PaymentHistoryTab } from "@/components/receipts/PaymentHistoryTab";
import { useAuth } from "@/contexts/AuthContext";

const allTabs = [
  { value: "list", label: "Comprovantes", icon: ClipboardList, permKey: "comp_lista" },
  { value: "form", label: "Novo Comprovante", icon: FilePlus, permKey: "comp_novo" },
  { value: "history", label: "Histórico", icon: History, permKey: "comp_historico" },
  { value: "pdf-config", label: "Configuração de PDF", icon: Settings2, permKey: "comp_config_pdf" },
];

export default function PaymentReceiptsPage() {
  const [tab, setTab] = useState("list");
  const [editReceiptId, setEditReceiptId] = useState<string | null>(null);
  const { user, getSectionVisibility } = useAuth();
  const isAdmin = user?.role === "admin_master";

  const visibleTabs = allTabs.filter((t) => {
    if (isAdmin) return true;
    return getSectionVisibility(t.permKey) !== "hidden";
  });

  const handleEdit = (id: string) => {
    setEditReceiptId(id);
    setTab("form");
  };

  const handleNew = () => {
    setEditReceiptId(null);
    setTab("form");
  };

  const handleSaved = () => {
    setEditReceiptId(null);
    setTab("list");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comprovante de Pagamento / Recebimento</h1>
        <p className="text-muted-foreground text-sm">Crie e gerencie comprovantes profissionais com assinatura, parcelas e QR Code PIX.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-transparent p-0 gap-1">
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <t.icon className="h-3.5 w-3.5" /> {t.value === "form" && editReceiptId ? "Editar" : t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="list">
          <ReceiptsList onEdit={handleEdit} onNew={handleNew} />
        </TabsContent>
        <TabsContent value="form">
          <ReceiptForm receiptId={editReceiptId} onSaved={handleSaved} onCancel={() => setTab("list")} />
        </TabsContent>
        <TabsContent value="history">
          <PaymentHistoryTab />
        </TabsContent>
        <TabsContent value="pdf-config">
          <ReceiptPdfConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
