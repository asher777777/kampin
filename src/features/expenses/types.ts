export interface Expense {
  id: string;
  ownerId: string;
  expenseType: string;
  amount: number;
  paymentMethod: string;
  purchaseDate: string;
  paymentDate: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseOption {
  id: string;
  ownerId: string;
  type: "expenseType" | "paymentMethod";
  value: string;
}
