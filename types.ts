export interface Transaction {
  date: string;
  description: string;
  amount: number;
}

export interface DebitTransaction extends Transaction {
  category: string;
}

export interface CategorySummary {
  category: string;
  totalAmount: number;
}

export interface ExpenseSummary {
  totalCredit: number;
  totalDebit: number;
  creditTransactions: Transaction[];
  debitTransactions: DebitTransaction[];
  debitSummary: CategorySummary[];
}

export enum ModalType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}