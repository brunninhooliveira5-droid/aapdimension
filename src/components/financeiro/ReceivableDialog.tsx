import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReceivableRow {
  id: string;
  client: string;
  description: string;
  category_id: string | null;
  amount: number;
  receipt_method: string | null;
  expected_date: string;
  received_date: string | null;
  status: string;
  notes: string | null;
  installment_number: number | null;
  total_installments: number | null;
}

interface CategoryRow { id: string; name: string; type: string; }

interface Props {
  open: boolean;
  item?: ReceivableRow;
  categories: CategoryRow[];
  onClose: () => void;
  onSaved: () => void;
}

export function ReceivableDialog({ open, item, categories, onClose, onSaved }: Props) {
  const isEdit = !!item;

  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [status, setStatus] = useState("aberto");
  const [receiptMethod, setReceiptMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setClient(item.client);
        setDescription(item.description);
        setCategoryId(item.category_id || "");
        setAmount(String(item.amount));
        setExpectedDate(item.expected_date);
        setReceivedDate(item.received_date || "");
        setStatus(item.status);
        setReceiptMethod(item.receipt_method || "");
        setNotes(item.notes || "");
        setInstallments("1");
      } else {
        setClient(""); setDescription(""); setCategoryId(""); setAmount("");
        setExpectedDate(""); setReceivedDate(""); setStatus("aberto");
        setReceiptMethod(""); setNotes(""); setInstallments("1");
      }
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!client.trim() || !amount || !expectedDate) {
      toast.error("Preencha cliente, valor e data prevista.");
      return;
    }

    setSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    if (isEdit) {
      const { error } = await supabase.from("finance_accounts_receivable").update({
        client: client.trim(),
        description: description.trim(),
        category_id: categoryId || null,
        amount: parseFloat(amount),
        expected_date: expectedDate,
        received_date: receivedDate || null,
        status,
        receipt_method: receiptMethod || null,
        notes: notes || null,
      } as any).eq("id", item!.id);

      if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
      toast.success("Conta atualizada!");
    } else {
      const numInstallments = parseInt(installments) || 1;
      const totalAmount = parseFloat(amount);
      const installmentAmount = Math.round((totalAmount / numInstallments) * 100) / 100;

      if (numInstallments > 1) {
        const { data: parent, error: parentErr } = await supabase.from("finance_accounts_receivable").insert({
          client: client.trim(),
          description: description.trim(),
          category_id: categoryId || null,
          amount: totalAmount,
          expected_date: expectedDate,
          status: "parcelado",
          receipt_method: receiptMethod || null,
          notes: notes || null,
          total_installments: numInstallments,
          created_by: userId,
        } as any).select().single();

        if (parentErr) { toast.error("Erro: " + parentErr.message); setSaving(false); return; }

        const rows = [];
        for (let i = 1; i <= numInstallments; i++) {
          const d = new Date(expectedDate);
          d.setMonth(d.getMonth() + (i - 1));
          rows.push({
            client: client.trim(),
            description: `${description.trim()} - Parcela ${i}/${numInstallments}`,
            category_id: categoryId || null,
            amount: installmentAmount,
            expected_date: d.toISOString().split("T")[0],
            status: "aberto",
            receipt_method: receiptMethod || null,
            parent_id: (parent as any).id,
            installment_number: i,
            total_installments: numInstallments,
            created_by: userId,
          });
        }

        const { error: instErr } = await supabase.from("finance_accounts_receivable").insert(rows as any);
        if (instErr) { toast.error("Erro ao criar parcelas: " + instErr.message); setSaving(false); return; }
        toast.success(`${numInstallments} parcelas criadas!`);
      } else {
        const { error } = await supabase.from("finance_accounts_receivable").insert({
          client: client.trim(),
          description: description.trim(),
          category_id: categoryId || null,
          amount: totalAmount,
          expected_date: expectedDate,
          received_date: receivedDate || null,
          status,
          receipt_method: receiptMethod || null,
          notes: notes || null,
          created_by: userId,
        } as any);

        if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
        toast.success("Conta criada!");
      }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEdit ? "Editar Conta a Receber" : "Nova Conta a Receber"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Cliente *</Label>
              <Input value={client} onChange={e => setClient(e.target.value)} className="bg-accent border-border" placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Descrição / Pedido / OS</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-accent border-border" placeholder="Descrição" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Recebimento</Label>
              <Select value={receiptMethod} onValueChange={setReceiptMethod}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Total (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label>Data Prevista *</Label>
              <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="bg-accent border-border" />
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input type="number" min="1" max="60" value={installments} onChange={e => setInstallments(e.target.value)} className="bg-accent border-border" placeholder="1" />
              </div>
            )}
            {isEdit && (
              <div className="space-y-2">
                <Label>Data Recebimento</Label>
                <Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} className="bg-accent border-border" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="parcelado">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-accent border-border" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-border">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : isEdit ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
