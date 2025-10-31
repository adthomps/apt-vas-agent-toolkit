import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const updatePaymentLinkParameters: (context?: VisaContext) => z.ZodObject<{
    id: z.ZodString;
    linkType: z.ZodOptional<z.ZodString>;
    purchaseNumber: z.ZodOptional<z.ZodString>;
    currency: z.ZodOptional<z.ZodString>;
    totalAmount: z.ZodOptional<z.ZodString>;
    requestPhone: z.ZodOptional<z.ZodBoolean>;
    requestShipping: z.ZodOptional<z.ZodBoolean>;
    clientReferenceCode: z.ZodOptional<z.ZodString>;
    lineItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        productName: z.ZodString;
        productSKU: z.ZodOptional<z.ZodString>;
        productDescription: z.ZodOptional<z.ZodString>;
        quantity: z.ZodString;
        unitPrice: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        productName: string;
        quantity: string;
        unitPrice: string;
        productSKU?: string | undefined;
        productDescription?: string | undefined;
    }, {
        productName: string;
        quantity: string;
        unitPrice: string;
        productSKU?: string | undefined;
        productDescription?: string | undefined;
    }>, "many">>;
    expirationDays: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    totalAmount?: string | undefined;
    currency?: string | undefined;
    linkType?: string | undefined;
    purchaseNumber?: string | undefined;
    requestPhone?: boolean | undefined;
    requestShipping?: boolean | undefined;
    clientReferenceCode?: string | undefined;
    lineItems?: {
        productName: string;
        quantity: string;
        unitPrice: string;
        productSKU?: string | undefined;
        productDescription?: string | undefined;
    }[] | undefined;
    expirationDays?: number | undefined;
}, {
    id: string;
    totalAmount?: string | undefined;
    currency?: string | undefined;
    linkType?: string | undefined;
    purchaseNumber?: string | undefined;
    requestPhone?: boolean | undefined;
    requestShipping?: boolean | undefined;
    clientReferenceCode?: string | undefined;
    lineItems?: {
        productName: string;
        quantity: string;
        unitPrice: string;
        productSKU?: string | undefined;
        productDescription?: string | undefined;
    }[] | undefined;
    expirationDays?: number | undefined;
}>;
export declare const updatePaymentLinkPrompt: (context?: VisaContext) => string;
export declare const updatePaymentLink: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof updatePaymentLinkParameters>>) => Promise<unknown>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
