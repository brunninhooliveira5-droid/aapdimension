import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categoriaLabels: Record<string, string> = {
  mecanica: "Mecânica", eletrica: "Elétrica", eletronica: "Eletrônica", acabamento: "Acabamento", outro: "Outro"
};
const unidadeOptions = ["un", "m", "kg", "mm", "cm", "L", "pç", "conj"];

interface BomItem {
  id?: string;
  ficha_id: string;
  item_nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  fornecedor: string;
  lead_time_dias: number | null;
  observacao: string;
}

export function BomEditor({ fichaId }: { fichaId: string }) {
  const [items, setItems] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("all");

  const fetchItems = async () => {
    const { data } = await supabase.from("production_bom_items").select("*").eq("ficha_id", fichaId).order("created_at");
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [fichaId]);

  const addItem = () => {
    setItems([...items, {
      ficha_id: fichaId, item_nome: "", categoria: "outro", unidade: "un",
      quantidade: 1, valor_unitario: 0, fornecedor: "", lead_time_dias: null, observacao: ""
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = async (index: number) => {
    const item = items[index];
    if (item.id) {
      await supabase.from("production_bom_items").delete().eq("id", item.id);
    }
    setItems(items.filter((_, i) => i !== index));
    toast.success("Item removido");
  };

  const saveAll = async () => {
    const toInsert = items.filter(i => !i.id).map(({ id, ...rest }) => rest);
    const toUpdate = items.filter(i => i.id);

    if (toInsert.length > 0) {
      const { error } = await supabase.from("production_bom_items").insert(toInsert as any);
      if (error) { toast.error("Erro ao inserir itens"); return; }
    }
    for (const item of toUpdate) {
      const { id, ...rest } = item;
      await supabase.from("production_bom_items").update(rest as any).eq("id", id!);
    }
    toast.success("BOM salva com sucesso");
    fetchItems();
  };

  const total = items.reduce((sum, i) => sum + i.quantidade * i.valor_unitario, 0);
  const displayed = filterCat === "all" ? items : items.filter(i => i.categoria === filterCat);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm">Lista de Materiais (BOM)</CardTitle>
          <div className="flex gap-2">
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(categoriaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Item</Button>
            <Button size="sm" onClick={saveAll}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-center text-muted-foreground py-4">Carregando...</p> : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Item</TableHead>
                    <TableHead className="w-[120px]">Categoria</TableHead>
                    <TableHead className="w-[70px]">Unid.</TableHead>
                    <TableHead className="w-[80px]">Qtd.</TableHead>
                    <TableHead className="w-[100px]">Vlr. Unit.</TableHead>
                    <TableHead className="w-[100px]">Subtotal</TableHead>
                    <TableHead className="w-[120px]">Fornecedor</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((item, idx) => {
                    const realIdx = items.indexOf(item);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="p-1">
                          <Input className="h-8 text-xs" value={item.item_nome} onChange={e => updateItem(realIdx, "item_nome", e.target.value)} placeholder="Nome do item" />
                        </TableCell>
                        <TableCell className="p-1">
                          <Select value={item.categoria} onValueChange={v => updateItem(realIdx, "categoria", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(categoriaLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Select value={item.unidade} onValueChange={v => updateItem(realIdx, "unidade", v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{unidadeOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1">
                          <Input className="h-8 text-xs" type="number" value={item.quantidade} onChange={e => updateItem(realIdx, "quantidade", parseFloat(e.target.value) || 0)} />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input className="h-8 text-xs" type="number" step="0.01" value={item.valor_unitario} onChange={e => updateItem(realIdx, "valor_unitario", parseFloat(e.target.value) || 0)} />
                        </TableCell>
                        <TableCell className="p-1 text-xs font-medium">
                          R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input className="h-8 text-xs" value={item.fornecedor} onChange={e => updateItem(realIdx, "fornecedor", e.target.value)} placeholder="Fornecedor" />
                        </TableCell>
                        <TableCell className="p-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(realIdx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-3 border-t pt-3">
              <p className="text-sm font-bold">Total Geral: <span className="text-primary">R$ {total.toFixed(2)}</span></p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
