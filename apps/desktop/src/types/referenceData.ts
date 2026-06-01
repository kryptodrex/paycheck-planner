export type FederalFilingStatus = 'single' | 'married_filing_jointly';

export interface FederalTaxBracket {
  upTo: number;
  rate: number;
}

export interface USFederalTaxRuleSet {
  taxYear: number;
  source: string;
  sourceLastReviewed: string;
  standardDeduction: Record<FederalFilingStatus, number>;
  brackets: Record<FederalFilingStatus, FederalTaxBracket[]>;
}

export interface FicaRuleSet {
  taxYear: number;
  socialSecurityEmployeeRate: number;
  socialSecurityWageBase: number;
  medicareEmployeeRate: number;
  medicareAdditionalRate: number;
  medicareAdditionalThresholdSingle: number;
  medicareAdditionalThresholdMarried: number;
}

export interface StateTaxBandRule {
  upTo: number;
  rate: number;
}

export interface USStateHeuristicRuleSet {
  taxYear: number;
  source: string;
  bands: StateTaxBandRule[];
}

export type GlossaryCategory =
  | 'pay'
  | 'taxes'
  | 'deductions'
  | 'allocations'
  | 'retirement'
  | 'accounts'
  | 'loans';

export interface GlossaryTerm {
  id: string;
  term: string;
  category: GlossaryCategory;
  shortDefinition: string;
  fullDefinition: string;
  aliases?: string[];
  tags?: string[];
  relatedTermIds?: string[];
}

export interface AppFaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface AppFaqSection {
  id: string;
  title: string;
  description: string;
  searchTerms: string;
  items: AppFaqItem[];
}

export type ReferenceDataPayload = {
  usTaxData: {
    federal: USFederalTaxRuleSet;
    fica: FicaRuleSet;
    stateHeuristic: USStateHeuristicRuleSet;
  };
  glossary: {
    terms: GlossaryTerm[];
    categoryLabels: Record<GlossaryCategory, string>;
  };
  appFaqs: {
    sections: AppFaqSection[];
  };
};

export type ReferenceDataResourceName = 'usTaxData' | 'glossary' | 'appFaqs';

export type ReferenceDataResourceMeta = {
  version: string;
  hash: string;
};

export type ReferenceDataIndexResponse = {
  resources: Record<ReferenceDataResourceName, ReferenceDataResourceMeta>;
};

export type ReferenceDataEnvelope<TData> = {
  version: string;
  hash: string;
  data: TData;
};
