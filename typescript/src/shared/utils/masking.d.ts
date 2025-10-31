import type { Context } from '../configuration';
export declare const maskPII: (value: string, maskPosition?: "start" | "end" | "random") => string;
/**
 * Masks customer information in an invoice object
 */
export declare const maskInvoiceCustomerInfo: (invoice: any, context?: Context) => any;
/**
 * Masks customer information in an array of invoice objects
 */
export declare const maskInvoicesCustomerInfo: (invoices: any[], context?: Context) => any[];
