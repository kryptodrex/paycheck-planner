import { beforeEach, describe, expect, it } from 'vitest';
import { clearRegistry, getRegisteredModules } from '../searchRegistry';
import { initializeSearchModules } from './index';

describe('searchModules initialization', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('registers all expected core modules', () => {
    initializeSearchModules();

    const moduleIds = getRegisteredModules().map((module) => module.id).sort();
    expect(moduleIds).toEqual([
      'accounts',
      'bills',
      'key-metrics',
      'loans',
      'other-income',
      'pay-breakdown',
      'pay-settings',
      'pre-tax-deductions',
      'quick-actions',
      'savings',
      'settings',
      'taxes',
    ]);
  });

  it('is idempotent when called multiple times', () => {
    initializeSearchModules();
    initializeSearchModules();

    const moduleIds = getRegisteredModules().map((module) => module.id).sort();
    expect(moduleIds).toEqual([
      'accounts',
      'bills',
      'key-metrics',
      'loans',
      'other-income',
      'pay-breakdown',
      'pay-settings',
      'pre-tax-deductions',
      'quick-actions',
      'savings',
      'settings',
      'taxes',
    ]);
  });
});
