import { useState, useEffect, useRef } from "react";
import { DollarSign, TrendingUp, Clock, AlertTriangle, Download, Plus, Upload, User, ChevronLeft, Trash2, CalendarDays } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProfileOption {
  id: string;
  name: string;
  email: string;
}

interface InvoiceRow {
  id: string;
  user_id: string;
  amount: number;
  due_date: string;
  installment: number;
  total_installments: number;
  status: string;
  payment_date: string | null;
}

interface InvoiceFile {
  id: string;
  invoice_id: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

const Financial = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master" || user?.role === "admin";

  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceFiles, setInvoiceFiles] = useState<InvoiceFile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Add user dialog
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addInstallments, setAddInstallments] = useState("");
  const [addFirstDueDate, setAddFirstDueDate] = useState("");

  // Upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: profilesData }, { data: invoicesData }, { data: filesData }] = await Promise.all([
      supabase.from("profiles").select("id, name, email").eq("approved", true),
      supabase.from("invoices").select("*").order("due_date", { ascending: true }),
      supabase.from("invoice_files").select("*"),
    ]);
    setProfiles(profilesData ?? []);
    setInvoices((invoicesData as InvoiceRow[]) ?? []);
    setInvoiceFiles((filesData as InvoiceFile[]) ?? []);
  };

  // Users that have invoices
  const usersWithInvoices = [...new Set(invoices.map(i => i.user_id))];
  const userList = profiles.filter(p => usersWithInvoices.includes(p.id));

  const selectedUser = profiles.find(p => p.id === selectedUserId);
  const userInvoices = invoices.filter(i => i.user_id === selectedUserId);

  // Summary
  const totalContracted = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = invoices.filter(i => i.status === "pago").reduce((s, i) => s + Number(i.amount), 0);
  const totalOpen = invoices.filter(i => i.status === "em_aberto").reduce((s, i) => s + Number(i.amount), 0);
  const today = new Date().toISOString().split("T")[0];
  const totalOverdue = invoices.filter(i => i.status === "em_aberto" && i.due_date < today).reduce((s, i) => s + Number(i.amount), 0);

  const handleAddUser = async () => {
    if (!addUserId || !addAmount || !addInstallments || !addFirstDueDate) {
      toast.error("Preencha todos os campos.");
      return;
    }
    const amount = parseFloat(addAmount);
    const totalInst = parseInt(addInstallments);
    if (isNaN(amount) || amount <= 0 || isNaN(totalInst) || totalInst < 1) {
      toast.error("Valores inválidos.");
      return;
    }
    const installmentAmount = Math.round((amount / totalInst) * 100) / 100;

    const rows = [];
    for (let i = 1; i <= totalInst; i++) {
      const dueDate = new Date(addFirstDueDate);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      rows.push({
        user_id: addUserId,
        amount: installmentAmount,
        installment: i,
        total_installments: totalInst,
        due_date: dueDate.toISOString().split("T")[0],
      });
    }

    const { error } = await supabase.from("invoices").insert(rows as any);
    if (error) {
      toast.error("Erro ao criar parcelas: " + error.message);
      return;
    }
    toast.success(`${totalInst} parcelas criadas!`);
    setShowAddUserDialog(false);
    setAddUserId("");
    setAddAmount("");
    setAddInstallments("");
    setAddFirstDueDate("");
    fetchData();
  };

  const handleChangeStatus = async (invoiceId: string, newStatus: string) => {
    const paymentDate = newStatus === "pago" ? new Date().toISOString().split("T")[0] : null;
    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus, payment_date: paymentDate } as any)
      .eq("id", invoiceId);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: newStatus, payment_date: paymentDate } : i));
    toast.success("Status atualizado!");
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingInvoiceId) return;

    const filePath = `${uploadingInvoiceId}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("invoice-files").upload(filePath, file);
    if (uploadErr) {
      toast.error("Erro ao enviar: " + uploadErr.message);
      return;
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await supabase
      .from("invoice_files")
      .insert({ invoice_id: uploadingInvoiceId, file_name: file.name, file_path: filePath, uploaded_by: userId } as any)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao registrar: " + error.message);
      return;
    }
    setInvoiceFiles(prev => [...prev, data as InvoiceFile]);
    toast.success("Arquivo enviado!");
    setUploadingInvoiceId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (fileId: string, filePath: string) => {
    await supabase.storage.from("invoice-files").remove([filePath]);
    await supabase.from("invoice_files").delete().eq("id", fileId);
    setInvoiceFiles(prev => prev.filter(f => f.id !== fileId));
    toast.success("Arquivo removido.");
  };

  const getFileUrl = (filePath: string) => {
    const { data } = supabase.storage.from("invoice-files").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    // Delete files first
    const files = invoiceFiles.filter(f => f.invoice_id === invoiceId);
    if (files.length > 0) {
      await supabase.storage.from("invoice-files").remove(files.map(f => f.file_path));
      await supabase.from("invoice_files").delete().in("id", files.map(f => f.id));
    }
    const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    setInvoices(prev => prev.filter(i => i.id !== invoiceId));
    setInvoiceFiles(prev => prev.filter(f => f.invoice_id !== invoiceId));
    toast.success("Parcela excluída!");
  };

  // Download signed URL for private bucket
  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("invoice-files").createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link de download.");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumo financeiro e parcelas</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Contratado" value={`R$ ${totalContracted.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} />
        <StatCard title="Total Pago" value={`R$ ${totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={TrendingUp} variant="highlight" />
        <StatCard title="Em Aberto" value={`R$ ${totalOpen.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={Clock} variant="warning" />
        <StatCard title="Em Atraso" value={`R$ ${totalOverdue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={AlertTriangle} variant={totalOverdue > 0 ? "danger" : "default"} />
      </div>

      {/* User list or User detail */}
      {selectedUserId ? (
        /* User Detail: Installments */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => setSelectedUserId(null)}>
              <ChevronLeft className="w-4 h-4" /> Voltar
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{selectedUser?.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedUser?.email}</p>
            </div>
          </div>

          <div className="gradient-card rounded-lg border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Parcelas ({userInvoices.length})
              </h3>
            </div>
            <div className="divide-y divide-border/50">
              {userInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Nenhuma parcela cadastrada.</p>
              ) : (
                userInvoices.map(inv => {
                  const files = invoiceFiles.filter(f => f.invoice_id === inv.id);
                  return (
                    <div key={inv.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-mono font-semibold text-foreground">
                            {inv.installment}/{inv.total_installments}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            R$ {Number(inv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarDays className="w-3.5 h-3.5" />
                            Venc. {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                          </div>
                          {inv.payment_date && (
                            <span className="text-xs text-muted-foreground">
                              Pago em {new Date(inv.payment_date).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin ? (
                            <Select value={inv.status} onValueChange={(val) => handleChangeStatus(inv.id, val)}>
                              <SelectTrigger className="h-7 text-xs bg-accent border-border w-auto min-w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="em_aberto">Em Aberto</SelectItem>
                                <SelectItem value="pago">Pago</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusBadge status={inv.status} />
                          )}
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-foreground">Excluir Parcela</AlertDialogTitle>
                                  <AlertDialogDescription>Tem certeza que deseja excluir esta parcela e seus arquivos?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteInvoice(inv.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>

                      {/* Files */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {files.map(f => (
                          <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent/50 border border-border text-xs">
                            <span className="text-foreground truncate max-w-[150px]">{f.file_name}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-primary hover:text-primary/80" onClick={() => handleDownload(f.file_path, f.file_name)}>
                              <Download className="w-3 h-3" />
                            </Button>
                            {isAdmin && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteFile(f.id, f.file_path)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-border"
                            onClick={() => {
                              setUploadingInvoiceId(inv.id);
                              fileInputRef.current?.click();
                            }}
                          >
                            <Upload className="w-3 h-3" /> PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* User List */
        <div className="gradient-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Usuários</h3>
            {isAdmin && (
              <Button size="sm" className="gap-1.5" onClick={() => setShowAddUserDialog(true)}>
                <Plus className="w-3.5 h-3.5" /> Adicionar Usuário
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {userList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuário com parcelas cadastradas.</p>
            ) : (
              userList.map(u => {
                const uInvoices = invoices.filter(i => i.user_id === u.id);
                const paid = uInvoices.filter(i => i.status === "pago").length;
                const total = uInvoices.length;
                const totalAmount = uInvoices.reduce((s, i) => s + Number(i.amount), 0);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-accent/50 cursor-pointer hover:bg-accent/80 transition-colors"
                    onClick={() => setSelectedUserId(u.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary hover:underline">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">{paid}/{total} pagas</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUploadFile} />

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Usuário ao Financeiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground">Usuário *</Label>
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger className="bg-accent border-border"><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Valor Total (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={addAmount} onChange={e => setAddAmount(e.target.value)} className="bg-accent border-border" placeholder="Ex: 50000.00" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Número de Parcelas *</Label>
              <Input type="number" min="1" value={addInstallments} onChange={e => setAddInstallments(e.target.value)} className="bg-accent border-border" placeholder="Ex: 12" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Data do 1º Vencimento *</Label>
              <Input type="date" value={addFirstDueDate} onChange={e => setAddFirstDueDate(e.target.value)} className="bg-accent border-border" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleAddUser}>Criar Parcelas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Financial;
