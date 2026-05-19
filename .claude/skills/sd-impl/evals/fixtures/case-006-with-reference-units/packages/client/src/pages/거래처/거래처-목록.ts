// §4.1 거래처 목록 (이미 풀구현)
import type { Customer } from "../../../../server/src/models/거래처";
import { loadCustomers } from "../../../../server/src/data-access/거래처-접근";

export class CustomerListPage {
  customers: Customer[] = [];

  async onInit() {
    this.customers = await loadCustomers();
  }
}
