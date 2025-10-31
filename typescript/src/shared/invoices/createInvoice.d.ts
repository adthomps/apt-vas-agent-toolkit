import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const createInvoiceParameters: (context?: VisaContext) => z.ZodEffects<z.ZodObject<{
    invoice_number: z.ZodString;
    totalAmount: z.ZodString;
    currency: z.ZodString;
    customerName: z.ZodOptional<z.ZodString>;
    customerEmail: z.ZodOptional<z.ZodString>;
    invoiceInformation: z.ZodObject<{
        description: z.ZodString;
        dueDate: z.ZodString;
        sendImmediately: z.ZodBoolean;
        deliveryMode: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        dueDate: string;
        sendImmediately: boolean;
        deliveryMode: string;
    }, {
        description: string;
        dueDate: string;
        sendImmediately: boolean;
        deliveryMode: string;
    }>;
}, "strip", z.ZodTypeAny, {
    invoice_number: string;
    totalAmount: string;
    currency: string;
    invoiceInformation: {
        description: string;
        dueDate: string;
        sendImmediately: boolean;
        deliveryMode: string;
    };
    customerName?: string | undefined;
    customerEmail?: string | undefined;
}, {
    invoice_number: string;
    totalAmount: string;
    currency: string;
    invoiceInformation: {
        description: string;
        dueDate: string;
        sendImmediately: boolean;
        deliveryMode: string;
    };
    customerName?: string | undefined;
    customerEmail?: string | undefined;
}>, {
    invoice_number: string;
    totalAmount: string;
    currency: string;
    invoiceInformation: {
        description: string;
        dueDate: string;
        sendImmediately: boolean;
        deliveryMode: string;
    };
    customerName?: string | undefined;
    customerEmail?: string | undefined;
}, {
    invoice_number: string;
    totalAmount: string;
    currency: string;
    invoiceInformation: {
        description: string;
        dueDate: string;
        sendImmediately: boolean;
        deliveryMode: string;
    };
    customerName?: string | undefined;
    customerEmail?: string | undefined;
}>;
export declare const createInvoicePrompt: (context?: VisaContext) => string;
export declare const createInvoice: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof createInvoiceParameters>>) => Promise<any>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
