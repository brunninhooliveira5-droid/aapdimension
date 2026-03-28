import { useState, useEffect, useCallback } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrainingModuleManager } from "./training/TrainingModuleManager";
import { TrainingLessonManager } from "./training/TrainingLessonManager";
import type { TrainingModule, TrainingLesson, TrainingMaterial, TrainingProgressRow } from "./training/TrainingTypes";

interface Props {
  equipmentId: string;
}

export const EquipmentTrainingsSection = ({ equipmentId }: Props) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin_master";

  const [showDialog, setShowDialog] = useState(false);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [progress, setProgress] = useState<TrainingProgressRow[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [modRes, lessRes, matRes, progRes] = await Promise.all([
      (supabase as any).from("training_modules").select("*").eq("equipment_id", equipmentId).order("sort_order"),
      (supabase as any).from("training_lessons").select("*").order("sort_order"),
      (supabase as any).from("training_materials").select("*").order("created_at"),
      (supabase as any).from("training_progress").select("*").eq("equipment_id", equipmentId),
    ]);
    setModules(modRes.data ?? []);
    setLessons(lessRes.data ?? []);
    setMaterials(matRes.data ?? []);
    setProgress(progRes.data ?? []);
    setLoading(false);
  }, [equipmentId]);

  const openDialog = () => {
    setShowDialog(true);
    fetchAll();
  };

  // Filter active modules/lessons for non-admins
  const visibleModules = isAdmin ? modules : modules.filter(m => m.is_active);

  const moduleLessonCounts: Record<string, { total: number; watched: number }> = {};
  visibleModules.forEach(mod => {
    const modLessons = lessons.filter(l => l.module_id === mod.id && (isAdmin || l.is_active));
    const watched = modLessons.filter(l => progress.some(p => p.lesson_id === l.id && p.watched)).length;
    moduleLessonCounts[mod.id] = { total: modLessons.length, watched };
  });

  const totalLessons = Object.values(moduleLessonCounts).reduce((s, c) => s + c.total, 0);
  const totalWatched = Object.values(moduleLessonCounts).reduce((s, c) => s + c.watched, 0);
  const overallProgress = totalLessons > 0 ? Math.round((totalWatched / totalLessons) * 100) : 0;

  const selectedModule = visibleModules.find(m => m.id === selectedModuleId);
  const selectedLessons = selectedModule ? lessons.filter(l => l.module_id === selectedModule.id && (isAdmin || l.is_active)) : [];
  const selectedMaterials = selectedModule ? materials.filter(m => m.module_id === selectedModule.id || selectedLessons.some(l => l.id === m.lesson_id)) : [];

  return (
    <>
      <div className="gradient-card rounded-lg border border-border p-5 cursor-pointer hover:border-primary/50 transition-colors" onClick={openDialog}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Treinamentos</h3>
            <p className="text-xs text-muted-foreground">
              {totalLessons > 0 ? `${totalWatched}/${totalLessons} aulas • ${overallProgress}%` : "Clique para gerenciar treinamentos"}
            </p>
          </div>
          {totalLessons > 0 && (
            <div className="w-16">
              <Progress value={overallProgress} className="h-1.5" />
            </div>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> Portal de Treinamentos
            </DialogTitle>
            {totalLessons > 0 && (
              <div className="flex items-center gap-3 pt-1">
                <Progress value={overallProgress} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground shrink-0">{totalWatched}/{totalLessons} aulas ({overallProgress}%)</span>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
                {/* Left: Modules */}
                <div className="space-y-2">
                  <TrainingModuleManager
                    equipmentId={equipmentId}
                    modules={visibleModules}
                    onModulesChange={fetchAll}
                    selectedModuleId={selectedModuleId}
                    onSelectModule={setSelectedModuleId}
                    isAdmin={isAdmin}
                    moduleLessonCounts={moduleLessonCounts}
                  />
                </div>

                {/* Right: Lessons */}
                <div className="border-l border-border pl-4 min-h-[200px]">
                  {selectedModule ? (
                    <TrainingLessonManager
                      module={selectedModule}
                      lessons={selectedLessons}
                      materials={selectedMaterials}
                      progress={progress}
                      equipmentId={equipmentId}
                      isAdmin={isAdmin}
                      onDataChange={fetchAll}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Selecione um módulo para ver as aulas
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
