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
    // Inventory tables
    inventoryItems: string;
    inventoryMovements: string;
    inventoryCategories: string;
    inventoryUnits: string;
    inventoryLocations: string;
    inventorySuppliers: string;
    inventoryReservations: string;
    inventoryAlerts: string;
    inventorySettings: string;
    inventorySessions: string;
    inventorySessionItems: string;
    // Production documentation tables
    productionSheets: string;
    productionBomItems: string;
    productionProcessSteps: string;
    productionBomTemplates: string;
    productionProcessTemplates: string;
    productionPdfConfig: string;
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
    inventoryItems: "inventory_items",
    inventoryMovements: "inventory_movements",
    inventoryCategories: "inventory_categories",
    inventoryUnits: "inventory_units",
    inventoryLocations: "inventory_locations",
    inventorySuppliers: "inventory_suppliers",
    inventoryReservations: "inventory_reservations",
    inventoryAlerts: "inventory_alerts",
    inventorySettings: "inventory_settings",
    inventorySessions: "inventory_sessions",
    inventorySessionItems: "inventory_session_items",
    productionSheets: "production_sheets",
    productionBomItems: "production_bom_items",
    productionProcessSteps: "production_process_steps",
    productionBomTemplates: "production_bom_templates",
    productionProcessTemplates: "production_process_templates",
    productionPdfConfig: "production_pdf_config",
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
    inventoryItems: "pc_inventory_items",
    inventoryMovements: "pc_inventory_movements",
    inventoryCategories: "pc_inventory_categories",
    inventoryUnits: "pc_inventory_units",
    inventoryLocations: "pc_inventory_locations",
    inventorySuppliers: "pc_inventory_suppliers",
    inventoryReservations: "pc_inventory_reservations",
    inventoryAlerts: "pc_inventory_alerts",
    inventorySettings: "pc_inventory_settings",
    inventorySessions: "pc_inventory_sessions",
    inventorySessionItems: "pc_inventory_session_items",
    productionSheets: "pc_production_sheets",
    productionBomItems: "pc_production_bom_items",
    productionProcessSteps: "pc_production_process_steps",
    productionBomTemplates: "pc_production_bom_templates",
    productionProcessTemplates: "pc_production_process_templates",
    productionPdfConfig: "pc_production_pdf_config",
  },
  storage: {
    taskFiles: "pc-task-files",
    productionImages: "dimension-production-images",
  },
};

const ModuleContext = createContext<ModuleConfig>(dimensionConfig);

export function ModuleProvider({ config, children }: { config: ModuleConfig; children: ReactNode }) {
  return <ModuleContext.Provider value={config}>{children}</ModuleContext.Provider>;
}

export function useModule() {
  return useContext(ModuleContext);
}
