import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const listPaymentLinksParameters: (context?: VisaContext) => z.ZodObject<{
    offset: z.ZodNumber;
    limit: z.ZodNumber;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    offset: number;
    limit: number;
    status?: string | undefined;
}, {
    offset: number;
    limit: number;
    status?: string | undefined;
}>;
export declare const listPaymentLinksPrompt: (context?: VisaContext) => string;
export declare const listPaymentLinks: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof listPaymentLinksParameters>>) => Promise<unknown>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
