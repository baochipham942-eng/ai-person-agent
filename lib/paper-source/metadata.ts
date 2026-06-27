import type { PaperSourceRecord } from './types';
import { cleanOpenAlexAuthorId } from './openalex';
import {
  asRecord,
  cleanText,
  normalizeAuthorNameKey,
  readString,
} from './utils';

export function paperAbstractFromText(text: string | null | undefined): string {
  const cleaned = cleanText(text || '');
  return cleaned || '这条 OpenAlex 论文资料暂时没有摘要。';
}

export function paperAbstract(source: PaperSourceRecord, metadata: Record<string, unknown>): string {
  return paperAbstractFromText(readString(metadata.abstract) || source.text);
}

export function readPaperAuthorEntries(metadata: Record<string, unknown>): Array<{ name: string; openalexId: string | null }> {
  const authors = metadata.authors;
  const entries: Array<{ name: string; openalexId: string | null }> = [];

  if (Array.isArray(authors)) {
    entries.push(...authors.map(author => {
      if (typeof author === 'string') return { name: author.trim(), openalexId: null };
      const record = asRecord(author);
      const nestedAuthor = asRecord(record.author);
      const name = (
        readString(record.display_name)
        || readString(record.name)
        || readString(record.authorName)
        || readString(nestedAuthor.display_name)
        || readString(nestedAuthor.name)
        || ''
      );
      return {
        name,
        openalexId: cleanOpenAlexAuthorId(
          readString(record.openalexAuthorId)
          || readString(record.openalexId)
          || readString(nestedAuthor.id)
          || readString(nestedAuthor.openalexId),
        ),
      };
    }).filter(author => author.name));
  }

  entries.push(...readTargetEntityNames(metadata, ['person', 'people', 'author']).map(name => ({ name, openalexId: null })));

  const seen = new Set<string>();
  return entries.filter(author => {
    const key = `${normalizeAuthorNameKey(author.name)}:${author.openalexId || ''}`;
    if (!key.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function readPaperAuthorNames(metadata: Record<string, unknown>): string[] {
  return [...new Set(readPaperAuthorEntries(metadata).map(author => author.name).filter(Boolean))];
}

export function readPaperOrganizationNames(metadata: Record<string, unknown>): string[] {
  const names: string[] = [];
  const organizations = metadata.organizations;
  if (Array.isArray(organizations)) {
    names.push(...organizations.map(item => {
      if (typeof item === 'string') return item;
      const record = asRecord(item);
      return readString(record.display_name)
        || readString(record.name)
        || readString(record.label)
        || '';
    }).filter(Boolean));
  }

  names.push(...readTargetEntityNames(metadata, ['organization', 'org', 'institution']));

  const authors = metadata.authors;
  if (!Array.isArray(authors)) return [...new Set(names.map(cleanOrganizationName).filter(Boolean))].slice(0, 20);
  for (const author of authors) {
    const record = asRecord(author);
    const rawAffiliations = [
      record.affiliations,
      record.institutions,
      record.raw_affiliation_strings,
      record.rawAffiliationStrings,
    ];
    for (const value of rawAffiliations) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (typeof item === 'string') {
          names.push(item);
          continue;
        }
        const affiliation = asRecord(item);
        const institution = asRecord(affiliation.institution);
        const displayName = readString(affiliation.display_name)
          || readString(affiliation.name)
          || readString(institution.display_name)
          || readString(institution.name);
        if (displayName) names.push(displayName);
      }
    }
  }

  return [...new Set(names.map(cleanOrganizationName).filter(Boolean))].slice(0, 20);
}

export function readTargetEntityNames(metadata: Record<string, unknown>, acceptedTypes: string[]): string[] {
  const targetEntities = metadata.targetEntities;
  if (!Array.isArray(targetEntities)) return [];
  const typeSet = new Set(acceptedTypes.map(type => type.toLowerCase()));
  return targetEntities.map(entity => {
    const record = asRecord(entity);
    const type = readString(record.type)?.toLowerCase();
    if (!type || !typeSet.has(type)) return '';
    return readString(record.label)
      || readString(record.name)
      || readString(record.display_name)
      || '';
  }).filter(Boolean);
}

export function cleanOrganizationName(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\.$/, '').trim();
}
