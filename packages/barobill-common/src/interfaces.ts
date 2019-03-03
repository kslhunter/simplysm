import {DateOnly, DateTime} from "@simplysm/common";

export interface IBarobillServiceGetCardLogParam {
  brn: string;
  userId: string;
  cardNumber: string;
  doneAtDate: DateOnly;
  itemLengthPerPage: number;
  page: number;
}

export interface IBarobillServiceGetCardLogResult {
  totalCount: number;
  pageCount: number;
  items: IBarobillServiceGetCardLogResultItem[];
}

export interface IBarobillServiceGetCardLogResultItem {
  cardNumber: string;
  approvalNumber: string;
  storeName: string | undefined;
  amount: number;
  tax: number;
  doneAtDateTime: DateTime;
  approvalType: string | undefined;
}

export interface IBarobillServiceGetAccountLogParam {
  brn: string;
  userId: string;
  accountNumber: string;
  doneAtDate: DateOnly;
  itemLengthPerPage: number;
  page: number;
}

export interface IBarobillServiceGetAccountLogResult {
  totalCount: number;
  pageCount: number;
  items: IBarobillServiceGetAccountLogResultItem[];
}

export interface IBarobillServiceGetAccountLogResultItem {
  key: string;
  accountNumber: string;
  type: "입금" | "출금";
  amount: number;
  doneAtDateTime: DateTime;
  content: string | undefined;
  transType: string | undefined;
}

export interface IBarobillServiceGetCardLogListParam {
  brn: string;
  userId: string;
  cardNumbers: string[];
  fromDoneAtDate: DateOnly;
  toDoneAtDate: DateOnly;
}

export interface IBarobillServiceGetAccountLogListParam {
  brn: string;
  userId: string;
  accountNumbers: string[];
  fromDoneAtDate: DateOnly;
  toDoneAtDate: DateOnly;
}

export interface IBarobillServiceGetTaxInvoiceLogParam {
  type: "매입" | "매출";
  taxType: "과세" | "면세";
  brn: string;
  userId: string;
  dateType: "발행일자" | "작성일자";
  doneAtDate: DateOnly;
  itemLengthPerPage: number;
  page: number;
}

export interface IBarobillServiceGetTaxInvoiceLogResult {
  totalCount: number;
  pageCount: number;
  items: IBarobillServiceGetTaxInvoiceLogResultItem[];
}

export interface IBarobillServiceGetTaxInvoiceLogResultItem {
  type: "매입" | "매출";
  title: string;
  ntsApprovalNumber: string;
  issueDateTime: DateTime;
  writeDate: DateOnly;
  targetName: string;
  amount: number;
  tax: number;
  totalAmount: number;
}

export interface IBarobillServiceGetTaxInvoiceLogListParam {
  brn: string;
  userId: string;
  dateType: "발행일자" | "작성일자";
  fromDoneAtDate: DateOnly;
  toDoneAtDate: DateOnly;
}