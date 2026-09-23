export interface Hotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
  supplier: "Supplier A" | "Supplier B";
}
