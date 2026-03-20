import type { SearchResultAction } from '../planSearch';
import type { SearchActionContext } from '../searchRegistry';

export function formatSearchCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function incrementRequestKey(
  setter: SearchActionContext['setBillsSearchRequestKey'] | SearchActionContext['setLoansSearchRequestKey'] | SearchActionContext['setSavingsSearchRequestKey'] | SearchActionContext['setTaxSearchOpenSettingsRequestKey'],
): void {
  setter?.((prev) => (typeof prev === 'number' ? prev + 1 : 1));
}

export function createTypedActionHandler<TType extends SearchResultAction['type']>(
  expectedType: TType,
  handler: (action: Extract<SearchResultAction, { type: TType }>, context: SearchActionContext) => void,
): (action: SearchResultAction, context: SearchActionContext) => void {
  return (action: SearchResultAction, context: SearchActionContext) => {
    if (action.type !== expectedType) {
      return;
    }

    handler(action as Extract<SearchResultAction, { type: TType }>, context);
  };
}
