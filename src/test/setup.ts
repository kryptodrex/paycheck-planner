import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { beforeEach, expect } from 'vitest';
import { installLocalStorageMock, localStorageMock } from './localStorageMock';

expect.extend(toHaveNoViolations);

installLocalStorageMock();

beforeEach(() => {
	localStorageMock.clear();
});
