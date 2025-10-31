import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const getPaymentLinkParameters: (context?: VisaContext) => z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const getPaymentLinkPrompt: (context?: VisaContext) => string;
export declare const getPaymentLink: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof getPaymentLinkParameters>>) => Promise<unknown>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
