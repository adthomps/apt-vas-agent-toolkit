import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const cancelInvoiceParameters: (context?: VisaContext) => z.ZodObject<{
    invoice_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    invoice_id: string;
}, {
    invoice_id: string;
}>;
export declare const cancelInvoicePrompt: (context?: VisaContext) => string;
export declare const cancelInvoice: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof cancelInvoiceParameters>>) => Promise<any>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
