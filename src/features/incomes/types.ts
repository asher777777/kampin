export interface Income {
  id: string;
  ownerId: string;
  clientName: string;
  amount: number;
  paymentType: string;
  receiptType: string;
  kesherUrl?: string; // Can be a URL or a reason why it failed to arrive
  date: string;
  createdAt: string;
  updatedAt: string;
}
