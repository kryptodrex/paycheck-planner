import { describe, expect, it } from 'vitest'
import { PACKAGE_NAME } from './index'

describe('package template', () => {
  it('exposes its name', () => {
    expect(PACKAGE_NAME).toContain('@paycheck-planner/')
  })
})
