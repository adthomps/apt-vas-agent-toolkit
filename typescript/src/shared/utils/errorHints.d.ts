type AnyObject = Record<string, any>;
export declare function inferSuggestionFromApi(payload: {
    status?: number;
    message?: string;
    responseText?: string;
    responseBody?: any;
    context?: 'invoice' | 'paymentLink';
}): string | undefined;
export declare function withSuggestion<T extends AnyObject>(err: T, context: 'invoice' | 'paymentLink'): T & {
    suggestion?: string;
};
export {};
