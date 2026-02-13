export interface Machine {
  id: string;
  model: string;
  serialNumber: string;
  installDate: string;
  status: "active" | "maintenance" | "inactive";
  accessories: string[];
  tickets: number;
  maintenances: number;
}

export interface Ticket {
  id: string;
  machineId: string;
  machineName: string;
  type: string;
  description: string;
  status: "aberto" | "em_andamento" | "resolvido";
  createdAt: string;
}

export interface Maintenance {
  id: string;
  machineId: string;
  machineName: string;
  userName: string;
  type: string;
  date: string;
  status: "agendada" | "realizada";
}

export interface Invoice {
  id: string;
  number: number;
  value: number;
  dueDate: string;
  status: "pago" | "em_aberto" | "atrasado";
}

export const machines: Machine[] = [
  { id: "1", model: "Dimension 3015", serialNumber: "DM3015-2024-001", installDate: "2024-03-15", status: "active", accessories: ["SnapTool Pro", "Auto-Focus"], tickets: 2, maintenances: 4 },
  { id: "2", model: "Dimension 2010", serialNumber: "DM2010-2023-047", installDate: "2023-08-22", status: "active", accessories: ["SnapTool"], tickets: 1, maintenances: 6 },
  { id: "3", model: "Dimension 4020", serialNumber: "DM4020-2024-012", installDate: "2024-06-10", status: "maintenance", accessories: ["SnapTool Pro", "Auto-Focus", "Rotary Axis"], tickets: 3, maintenances: 2 },
];

export const tickets: Ticket[] = [
  { id: "T-001", machineId: "1", machineName: "Dimension 3015", type: "Erro de Software", description: "Tela do controlador travando ao iniciar programa G-code", status: "aberto", createdAt: "2026-02-10" },
  { id: "T-002", machineId: "3", machineName: "Dimension 4020", type: "Mecânico", description: "Vibração excessiva no eixo Z durante corte", status: "em_andamento", createdAt: "2026-02-08" },
  { id: "T-003", machineId: "2", machineName: "Dimension 2010", type: "Elétrico", description: "Sensor de porta com defeito intermitente", status: "resolvido", createdAt: "2026-01-25" },
];

export const maintenances: Maintenance[] = [
  { id: "M-001", machineId: "1", machineName: "Dimension 3015", userName: "João Silva", type: "Preventiva", date: "2026-02-20", status: "agendada" },
  { id: "M-002", machineId: "2", machineName: "Dimension 2010", userName: "Carlos Mendes", type: "Calibração", date: "2026-03-05", status: "agendada" },
  { id: "M-003", machineId: "3", machineName: "Dimension 4020", userName: "João Silva", type: "Preventiva", date: "2026-01-15", status: "realizada" },
  { id: "M-004", machineId: "1", machineName: "Dimension 3015", userName: "Ana Costa", type: "Corretiva", date: "2025-12-20", status: "realizada" },
];

export const invoices: Invoice[] = [
  { id: "B-001", number: 1, value: 4500.00, dueDate: "2026-01-15", status: "pago" },
  { id: "B-002", number: 2, value: 4500.00, dueDate: "2026-02-15", status: "em_aberto" },
  { id: "B-003", number: 3, value: 4500.00, dueDate: "2026-03-15", status: "em_aberto" },
  { id: "B-004", number: 4, value: 4500.00, dueDate: "2026-04-15", status: "em_aberto" },
  { id: "B-005", number: 5, value: 4500.00, dueDate: "2026-05-15", status: "em_aberto" },
  { id: "B-006", number: 6, value: 4500.00, dueDate: "2026-06-15", status: "em_aberto" },
];

export const financialSummary = {
  totalContracted: 27000.00,
  totalPaid: 4500.00,
  pending: 22500.00,
  overdue: 0,
  nextDueDate: "2026-02-15",
  nextDueValue: 4500.00,
};
