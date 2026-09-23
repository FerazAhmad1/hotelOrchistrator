import { HotelSupplier } from "./hotel-supplier.interface";
import { Hotel } from "../types/hotel";

class SupplierBService implements HotelSupplier {
  async getHotels(city: string): Promise<Hotel[]> {
    // Mock supplier API
    if (city.toLowerCase() !== "delhi") {
      return [];
    }

    return [
      {
        hotelId: "b1",
        name: "Holtin",
        price: 5340,
        city,
        commissionPct: 20,
        supplier: "Supplier B",
      },
      {
        hotelId: "b2",
        name: "Radison",
        price: 6200,
        city,
        commissionPct: 15,
        supplier: "Supplier B",
      },
      {
        hotelId: "b3",
        name: "Leela",
        price: 6800,
        city,
        commissionPct: 18,
        supplier: "Supplier B",
      },
    ];
  }
}
const supplierBService = new SupplierBService();

export default supplierBService;
