import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const sendInvoiceParameters: (context?: VisaContext) => z.ZodObject<{
    invoice_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    invoice_id: string;
}, {
    invoice_id: string;
}>;
export declare const sendInvoicePrompt: (context?: VisaContext) => string;
export declare const sendInvoice: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof sendInvoiceParameters>>) => Promise<any>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
