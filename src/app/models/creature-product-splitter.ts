export interface PlayerInput {
  id: number; // Unique ID for tracking in @for loops
  name: string;
  log: string;
}

export interface FinancialResult {
  name: string;
  originalBalance: number;
  productValueDeducted: number;
  finalLiquidBalance: number;
}

export interface TransferInstruction {
  from: string;
  to: string;
  amount: number;
  item?: string;
}

export interface LootResult {
  totalLoot: { name: string; amount: number }[];
  totalValue: number;
  remainder: { name: string; amount: number }[];
  groupedItemInstructions: GroupedItemTransfer[];
  goldInstructions: TransferInstruction[];
  financials: FinancialResult[];
  partyBalance: number;
}
export interface GroupedItemTransfer {
  from: string;
  to: string;
  items: { name: string; amount: number }[];
}
