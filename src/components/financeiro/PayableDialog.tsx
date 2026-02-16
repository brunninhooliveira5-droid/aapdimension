import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface PayableRow {
  id: string;
  supplier: string;
  description: string;
  category_id: string | null;
  cost_center: string | null;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  payment_method: string | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  notes: string | null;
  installment_number: number | null;
  total_installments: number | null;
}

interface CategoryRow { id: string; name: string; type: string; }

interface Props {
  open: boolean;
  item?: PayableRow;
  categories: CategoryRow[];
  onClose: () => void;
  onSaved: () => void;
}

export function PayableDialog({ open, item, categories, onClose, onSaved }: Props) {
  const isEdit = !!item;

  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [status, setStatus] = useState("aberto");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState("");
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState("1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setSupplier(item.supplier);
        setDescription(item.description);
        setCategoryId(item.category_id || "");
        setCostCenter(item.cost_center || "");
        setAmount(String(item.amount));
        setDueDate(item.due_date);
        setPaymentDate(item.payment_date || "");
        setStatus(item.status);
        setPaymentMethod(item.payment_method || "");
        setIsRecurring(item.is_recurring);
        setRecurrencePeriod(item.recurrence_period || "");
        setNotes(item.notes || "");
        setInstallments("1");
      } else {
        setSupplier(""); setDescription(""); setCategoryId(""); setCostCenter("");
        setAmount(""); setDueDate(""); setPaymentDate(""); setStatus("aberto");
        setPaymentMethod(""); setIsRecurring(false); setRecurrencePeriod("");
        setNotes(""); setInstallments("1");
      }
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!supplier.trim() || !amount || !dueDate) {
      toast.error("Preencha fornecedor, valor e data de vencimento.");
      return;
    }

    setSaving(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    if (isEdit) {
      const { error } = await supabase.from("finance_accounts_payable").update({
        supplier: supplier.trim(),
        description: description.trim(),
        category_id: categoryId || null,
        cost_center: costCenter || null,
        amount: parseFloat(amount),
        due_date: dueDate,
        payment_date: paymentDate || null,
        status,
        payment_method: paymentMethod || null,
        is_recurring: isRecurring,
        recurrence_period: isRecurring ? recurrencePeriod || null : null,
        notes: notes || null,
      } as any).eq("id", item!.id);

      if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
      toast.success("Conta atualizada!");
    } else {
      const numInstallments = parseInt(installments) || 1;
      const totalAmount = parseFloat(amount);
      const installmentAmount = Math.round((totalAmount / numInstallments) * 100) / 100;

      if (numInstallments > 1) {
        // Create parent + installments
        const { data: parent, error: parentErr } = await supabase.from("finance_accounts_payable").insert({
          supplier: supplier.trim(),
          description: description.trim(),
          category_id: categoryId || null,
          cost_center: costCenter || null,
          amount: totalAmount,
          due_date: dueDate,
          status: "parcelado",
          payment_method: paymentMethod || null,
          is_recurring: isRecurring,
          recurrence_period: isRecurring ? recurrencePeriod || null : null,
          notes: notes || null,
          total_installments: numInstallments,
          created_by: userId,
        } as any).select().single();

        if (parentErr) { toast.error("Erro: " + parentErr.message); setSaving(false); return; }

        const rows = [];
        for (let i = 1; i <= numInstallments; i++) {
          const d = new Date(dueDate);
          d.setMonth(d.getMonth() + (i - 1));
          rows.push({
            supplier: supplier.trim(),
            description: `${description.trim()} - Parcela ${i}/${numInstallments}`,
            category_id: categoryId || null,
            cost_center: costCenter || null,
            amount: installmentAmount,
            due_date: d.toISOString().split("T")[0],
            status: "aberto",
            payment_method: paymentMethod || null,
            parent_id: (parent as any).id,
            installment_number: i,
            total_installments: numInstallments,
            created_by: userId,
          });
        }

        const { error: instErr } = await supabase.from("finance_accounts_payable").insert(rows as any);
        if (instErr) { toast.error("Erro ao criar parcelas: " + instErr.message); setSaving(false); return; }
        toast.success(`${numInstallments} parcelas criadas!`);
      } else {
        const { error } = await supabase.from("finance_accounts_payable").insert({
          supplier: supplier.trim(),
          description: description.trim(),
          category_id: categoryId || null,
          cost_center: costCenter || null,
          amount: totalAmount,
          due_date: dueDate,
          payment_date: paymentDate || null,
          status,
          payment_method: paymentMethod || null,
          is_recurring: isRecurring,
          recurrence_period: isRecurring ? recurrencePeriod || null : null,
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
          <DialogTitle className="text-foreground">{isEdit ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Fornecedor *</Label>
              <Input value={supplier} onChange={e => setSupplier(e.target.value)} className="bg-accent border-border" placeholder="Nome do fornecedor" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="bg-accent border-border" placeholder="Descrição da conta" />
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
              <Label>Centro de Custo</Label>
              <Input value={costCenter} onChange={e => setCostCenter(e.target.value)} className="bg-accent border-border" placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label>Valor Total (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="bg-accent border-border" />
            </div>
            <div className="space-y-2">
              <Label>Vencimento *</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-accent border-border" />
            </div>
            {!isEdit && (
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input type="number" min="1" max="60" value={installments} onChange={e => setInstallments(e.target.value)} className="bg-accent border-border" placeholder="1" />
              </div>
            )}
            {isEdit && (
              <div className="space-y-2">
                <Label>Data Pagamento</Label>
                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="bg-accent border-border" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-accent border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="parcelado">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(v) => setIsRecurring(!!v)} />
            <Label htmlFor="recurring" className="cursor-pointer">Recorrente</Label>
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Periodicidade</Label>
              <Select value={recurrencePeriod} onValueChange={setRecurrencePeriod}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
