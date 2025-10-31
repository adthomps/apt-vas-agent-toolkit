import { VisaContext } from '../types';
import type { Context } from '../configuration';
/**
 * Sets the developer ID in the request object based on the context mode
 * @param requestObj The request object to update
 * @param context The Visa context containing the mode
 * @returns The updated request object
 */
export declare function setDeveloperId(requestObj: any, context: VisaContext): any;
/**
 * Masks personally identifiable information (PII) in a string
 * @param value The string to mask
 * @param maskPosition Position to apply masking (start, end, or random)
 * @returns The masked string
 */
export declare const maskPII: (value: string, maskPosition?: "start" | "end" | "random") => string;
/**
 * Masks customer information in an invoice object
 * @param invoice The invoice object to mask
 * @param context The context
 * @returns The masked invoice object
 */
export declare const maskInvoiceCustomerInfo: (invoice: any, context?: Context) => any;
/**
 * Masks customer information in an array of invoice objects
 * @param invoices The array of invoice objects to mask
 * @param context The context
 * @returns The array of masked invoice objects
 */
export declare const maskInvoicesCustomerInfo: (invoices: any[], context?: Context) => any[];
