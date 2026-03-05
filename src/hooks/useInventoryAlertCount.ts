import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInventoryAlertCount(itemsTable: string, movementsTable: string) {
  return useQuery({
    queryKey: [itemsTable, "alert-count"],
    queryFn: async () => {
      const { data: items } = await supabase
        .from(itemsTable as any)
        .select("id, current_quantity, min_quantity")
        .eq("is_active", true);
      if (!items) return 0;

      let count = 0;
      for (const item of items as any[]) {
        const qty = Number(item.current_quantity);
        const min = Number(item.min_quantity);
        if (qty === 0 || (min > 0 && qty <= min)) count++;
      }
      return count;
    },
    refetchInterval: 60000,
  });
}
