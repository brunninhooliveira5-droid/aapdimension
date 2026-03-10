import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FilePlus, Settings2, History } from "lucide-react";
import { ReceiptsList } from "@/components/receipts/ReceiptsList";
import { ReceiptForm } from "@/components/receipts/ReceiptForm";
import { ReceiptPdfConfig } from "@/components/receipts/ReceiptPdfConfig";
import { PaymentHistoryTab } from "@/components/receipts/PaymentHistoryTab";

export default function PaymentReceiptsPage() {
  const [tab, setTab] = useState("list");
  const [editReceiptId, setEditReceiptId] = useState<string | null>(null);

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
          <TabsTrigger value="list" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="h-3.5 w-3.5" /> Comprovantes
          </TabsTrigger>
          <TabsTrigger value="form" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FilePlus className="h-3.5 w-3.5" /> {editReceiptId ? "Editar" : "Novo Comprovante"}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="pdf-config" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings2 className="h-3.5 w-3.5" /> Configuração de PDF
          </TabsTrigger>
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
