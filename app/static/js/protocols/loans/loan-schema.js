import { decodeJsonMultimapEntry } from "../../core/multimap.js";

export const VDXF_LOAN_OFFER = "iMey7Y2idT6dt7jJvRiPXgtYcfAaKCQbHz"; // make.vrsc::contract.loan.offer
export const VDXF_LOAN_REQUEST = "iF7Ax6QpdwvTTqDJpNzDXVj1GpUSQX6vH5"; // make.vrsc::contract.loan.request
export const VDXF_LOAN_MATCH = "iKVShS5o56BLn8BpysrmfvUJbWCrgyio8U"; // make.vrsc::contract.loan.match
export const VDXF_LOAN_STATUS = "iRzM96sNYj95mUiJebzBnFwirjfws2q6o4"; // make.vrsc::contract.loan.status
export const VDXF_LOAN_HISTORY = "i5qBwi3KWXfyo1UKuUBC3yyq67JagVennW"; // make.vrsc::contract.loan.history
export const VDXF_LOAN_DECLINE = "iEgciB3u2GwTxzShQR4eFhtj4k8Zv6frNb"; // make.vrsc::contract.loan.decline
export const VDXF_OPTION_OFFER = "i5L8vkz9xsnM8yEDiXzPbP4Kix3SnJSsv5"; // make.vrsc::contract.option.offer

export const VDXF_LOAN_OFFER_KEYS = [VDXF_LOAN_OFFER];
export const VDXF_LOAN_REQUEST_KEYS = [VDXF_LOAN_REQUEST];
export const VDXF_LOAN_MATCH_KEYS = [VDXF_LOAN_MATCH];
export const VDXF_LOAN_STATUS_KEYS = [VDXF_LOAN_STATUS];
export const VDXF_LOAN_HISTORY_KEYS = [VDXF_LOAN_HISTORY];
export const VDXF_LOAN_DECLINE_KEYS = [VDXF_LOAN_DECLINE];

export const VDXF = {
  [VDXF_LOAN_OFFER]: { slug: "loan.offer", label: "Loan offer" },
  [VDXF_LOAN_REQUEST]: { slug: "loan.request", label: "Loan request" },
  [VDXF_LOAN_MATCH]: { slug: "loan.match", label: "Loan match" },
  [VDXF_LOAN_STATUS]: { slug: "loan.status", label: "Loan active" },
  [VDXF_LOAN_HISTORY]: { slug: "loan.history", label: "Loan settled" },
  [VDXF_LOAN_DECLINE]: { slug: "loan.decline", label: "Loan declined" },
  [VDXF_OPTION_OFFER]: { slug: "option.offer", label: "Option offer" },
};

export function decodeMultimapEntry(entry) {
  return decodeJsonMultimapEntry(entry);
}
