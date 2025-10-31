import { z } from 'zod';
import { VisaContext } from './types';
export type Tool = {
    method: string;
    name: string;
    description: string;
    parameters: z.ZodTypeAny;
    actions: {
        [resource: string]: {
            [action: string]: boolean;
        };
    };
    execute: (visaClient: any, context: VisaContext, params: any) => Promise<any>;
};
export declare function createTools(context: VisaContext): Tool[];
export { createTools as tools };
export default createTools;
