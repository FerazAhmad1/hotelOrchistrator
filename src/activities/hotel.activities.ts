import supplierAService from "../suppliers/supplier-a.service";
import supplierBService from "../suppliers/supplier-b.service";

export async function fetchSupplierA(city: string) {
  return supplierAService.getHotels(city);
}

export async function fetchSupplierB(city: string) {
  return supplierBService.getHotels(city);
}
