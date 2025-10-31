import type { CoreTool } from 'ai';
import { z } from 'zod';
import VisaAcceptanceAPI from '../shared/api';
export default function VisaAcceptanceTool(visaAcceptanceAPI: VisaAcceptanceAPI, method: string, description: string, schema: z.ZodObject<any, any, any, any, {
    [x: string]: any;
}>): CoreTool;
