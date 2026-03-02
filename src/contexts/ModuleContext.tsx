import { createContext, useContext, ReactNode } from "react";

export interface ModuleConfig {
  tables: {
    tasks: string;
    taskFiles: string;
    productionCards: string;
    pendencies: string;
    scheduleEvents: string;
    productionItems: string;
    routines: string;
    routineActivations: string;
    routineTemplateFiles: string;
    goals: string;
    goalHistory: string;
  };
  storage: {
    taskFiles: string;
    productionImages: string;
  };
}

export const dimensionConfig: ModuleConfig = {
  tables: {
    tasks: "dimension_tasks",
    taskFiles: "dimension_task_files",
    productionCards: "dimension_production_cards",
    pendencies: "dimension_pendencies",
    scheduleEvents: "dimension_schedule_events",
    productionItems: "dimension_production_items",
    routines: "dimension_routines",
    routineActivations: "dimension_routine_activations",
    routineTemplateFiles: "dimension_routine_template_files",
    goals: "dimension_goals",
    goalHistory: "dimension_goal_history",
  },
  storage: {
    taskFiles: "dimension-task-files",
    productionImages: "dimension-production-images",
  },
};

export const productionControlConfig: ModuleConfig = {
  tables: {
    tasks: "pc_tasks",
    taskFiles: "pc_task_files",
    productionCards: "pc_production_cards",
    pendencies: "pc_pendencies",
    scheduleEvents: "pc_schedule_events",
    productionItems: "pc_production_items",
    routines: "pc_routines",
    routineActivations: "pc_routine_activations",
    routineTemplateFiles: "pc_routine_template_files",
    goals: "pc_goals",
    goalHistory: "pc_goal_history",
  },
  storage: {
    taskFiles: "pc-task-files",
    productionImages: "dimension-production-images", // reuse same bucket for images
  },
};

const ModuleContext = createContext<ModuleConfig>(dimensionConfig);

export function ModuleProvider({ config, children }: { config: ModuleConfig; children: ReactNode }) {
  return <ModuleContext.Provider value={config}>{children}</ModuleContext.Provider>;
}

export function useModule() {
  return useContext(ModuleContext);
}
