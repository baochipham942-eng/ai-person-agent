import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  classifyPersonRoleKind,
  getTimelineRoleCategory,
  isPrimaryEmploymentRole,
  normalizeEmployerName,
} from '../../lib/person-role-kind';

test('classifies primary employment roles as current-employer candidates', () => {
  assert.equal(
    classifyPersonRoleKind({
      role: 'CEO',
      organizationName: 'OpenAI',
      organizationType: 'company',
    }),
    'employment'
  );

  assert.equal(
    isPrimaryEmploymentRole({
      role: 'Co-founder and CEO',
      organizationName: 'LangChain',
      organizationType: 'company',
    }),
    true
  );
});

test('keeps board, advisor, course, project, and investment roles out of current-employer candidates', () => {
  const cases = [
    {
      role: 'Board Member',
      organizationName: 'Tools for Humanity',
      organizationType: 'company',
      expected: 'board',
    },
    {
      role: 'Director',
      organizationName: 'Federal Reserve Bank of New York',
      organizationType: 'company',
      expected: 'board',
    },
    {
      role: 'Chairman (Worldcoin)',
      organizationName: 'Tools for Humanity',
      organizationType: 'company',
      expected: 'board',
    },
    {
      role: 'Scientific Advisor',
      organizationName: 'Recursion',
      organizationType: 'company',
      expected: 'advisor',
    },
    {
      role: 'Instructor',
      organizationName: 'Coursera',
      organizationType: 'company',
      expected: 'course',
    },
    {
      role: 'Chief Scientist and Principal Investigator',
      organizationName: 'ImageNet',
      organizationType: 'company',
      expected: 'project',
    },
    {
      role: 'AI Consultant',
      organizationName: 'Independent',
      organizationType: 'company',
      expected: 'advisor',
    },
    {
      role: 'Partner',
      organizationName: 'Radical Ventures',
      organizationType: 'company',
      expected: 'investment',
    },
  ] as const;

  for (const item of cases) {
    assert.equal(classifyPersonRoleKind(item), item.expected);
    assert.equal(isPrimaryEmploymentRole(item), false);
    assert.notEqual(getTimelineRoleCategory(item), 'career');
  }
});

test('routes academic and fellowship affiliations away from career timeline', () => {
  assert.equal(
    getTimelineRoleCategory({
      role: 'Professor',
      organizationName: 'Stanford University',
      organizationType: 'university',
    }),
    'education'
  );

  assert.equal(
    classifyPersonRoleKind({
      role: 'Digital Fellow',
      organizationName: 'Stanford Digital Economy Lab',
      organizationType: 'company',
    }),
    'education'
  );
});

test('normalizes parent/subsidiary and local brand aliases for employer grouping', () => {
  assert.equal(normalizeEmployerName('Google'), normalizeEmployerName('Alphabet Inc.'));
  assert.equal(normalizeEmployerName('Google DeepMind'), normalizeEmployerName('Google'));
  assert.equal(normalizeEmployerName('丽泽影业'), normalizeEmployerName('北京天浩丽泽影视文化传媒有限公司'));
});
