export interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  raw_text?: string;
  whatsapp_from?: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}
