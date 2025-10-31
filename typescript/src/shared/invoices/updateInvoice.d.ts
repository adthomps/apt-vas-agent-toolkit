import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const updateInvoicePrompt: (context?: VisaContext) => string;
export declare const updateInvoice: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof updateInvoiceParameters>>) => Promise<any>;
export declare const updateInvoiceParameters: (context?: VisaContext) => z.ZodObject<{
    id: z.ZodString;
    customerInformation: z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email?: string | undefined;
        name?: string | undefined;
    }, {
        email?: string | undefined;
        name?: string | undefined;
    }>;
    invoiceInformation: z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        dueDate: z.ZodOptional<z.ZodString>;
        allowPartialPayments: z.ZodOptional<z.ZodBoolean>;
        deliveryMode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        dueDate?: string | undefined;
        deliveryMode?: string | undefined;
        allowPartialPayments?: boolean | undefined;
    }, {
        description?: string | undefined;
        dueDate?: string | undefined;
        deliveryMode?: string | undefined;
        allowPartialPayments?: boolean | undefined;
    }>;
    orderInformation: z.ZodObject<{
        amountDetails: z.ZodObject<{
            totalAmount: z.ZodString;
            currency: z.ZodString;
            discountAmount: z.ZodOptional<z.ZodString>;
            discountPercent: z.ZodOptional<z.ZodNumber>;
            subAmount: z.ZodOptional<z.ZodNumber>;
            minimumPartialAmount: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            totalAmount: string;
            currency: string;
            discountAmount?: string | undefined;
            discountPercent?: number | undefined;
            subAmount?: number | undefined;
            minimumPartialAmount?: number | undefined;
        }, {
            totalAmount: string;
            currency: string;
            discountAmount?: string | undefined;
            discountPercent?: number | undefined;
            subAmount?: number | undefined;
            minimumPartialAmount?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        amountDetails: {
            totalAmount: string;
            currency: string;
            discountAmount?: string | undefined;
            discountPercent?: number | undefined;
            subAmount?: number | undefined;
            minimumPartialAmount?: number | undefined;
        };
    }, {
        amountDetails: {
            totalAmount: string;
            currency: string;
            discountAmount?: string | undefined;
            discountPercent?: number | undefined;
            subAmount?: number | undefined;
            minimumPartialAmount?: number | undefined;
        };
    }>;
}, "strip", z.ZodTypeAny, {
    invoiceInformation: {
        description?: string | undefined;
        dueDate?: string | undefined;
        deliveryMode?: string | undefined;
        allowPartialPayments?: boolean | undefined;
    };
    id: string;
    customerInformation: {
        email?: string | undefined;
        name?: string | undefined;
    };
    orderInformation: {
        amountDetails: {
            totalAmount: string;
            currency: string;
            discountAmount?: string | undefined;
            discountPercent?: number | undefined;
            subAmount?: number | undefined;
            minimumPartialAmount?: number | undefined;
        };
    };
}, {
    invoiceInformation: {
        description?: string | undefined;
        dueDate?: string | undefined;
        deliveryMode?: string | undefined;
        allowPartialPayments?: boolean | undefined;
    };
    id: string;
    customerInformation: {
        email?: string | undefined;
        name?: string | undefined;
    };
    orderInformation: {
        amountDetails: {
            totalAmount: string;
            currency: string;
            discountAmount?: string | undefined;
            discountPercent?: number | undefined;
            subAmount?: number | undefined;
            minimumPartialAmount?: number | undefined;
        };
    };
}>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
