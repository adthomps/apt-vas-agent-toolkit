import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const createPaymentLinkParameters: (context?: VisaContext) => z.ZodObject<{
    linkType: z.ZodString;
    purchaseNumber: z.ZodString;
    currency: z.ZodString;
    totalAmount: z.ZodOptional<z.ZodString>;
    requestPhone: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    requestShipping: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    clientReferenceCode: z.ZodOptional<z.ZodString>;
    lineItems: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    currency: string;
    linkType: string;
    purchaseNumber: string;
    requestPhone: boolean;
    requestShipping: boolean;
    lineItems: {
        productName: string;
        quantity: string;
        unitPrice: string;
        productSKU?: string | undefined;
        productDescription?: string | undefined;
    }[];
    totalAmount?: string | undefined;
    clientReferenceCode?: string | undefined;
}, {
    currency: string;
    linkType: string;
    purchaseNumber: string;
    lineItems: {
        productName: string;
        quantity: string;
        unitPrice: string;
        productSKU?: string | undefined;
        productDescription?: string | undefined;
    }[];
    totalAmount?: string | undefined;
    requestPhone?: boolean | undefined;
    requestShipping?: boolean | undefined;
    clientReferenceCode?: string | undefined;
}>;
export declare const createPaymentLinkPrompt: (context?: VisaContext) => string;
export declare const createPaymentLink: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof createPaymentLinkParameters>>) => Promise<any>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
