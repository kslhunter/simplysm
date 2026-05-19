import type { Customer } from "../models/거래처";

export async function loadCustomers(): Promise<Customer[]> {
  // 등록일 내림차순
  return [];
}

export async function insertCustomer(
  input: Omit<Customer, "id" | "createdAt">,
): Promise<Customer> {
  throw new Error("stub");
}
