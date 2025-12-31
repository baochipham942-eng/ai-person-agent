import { getWikidataEntity } from './wikidata';
import { translateBatch } from '@/lib/ai/translator';

export interface CareerItem {
  type: 'education' | 'career' | 'award';
  title: string;          // School or Company or Award Name
  subtitle?: string;      // Degree or Position
  location?: string;
  startDate?: string;     // ISO Date string
  endDate?: string;       // ISO Date string
  description?: string;
}

/**
 * Fetch career and education history from Wikidata
 */
export async function getPersonCareer(qid: string): Promise<CareerItem[]> {
  try {
    const entity = await getWikidataEntity(qid);
    if (!entity) return [];

    const items: CareerItem[] = [];

    // 1. Education (P69)
    // Note: Ideally we need a SPARQL query to get qualifiers (start time, end time, degree), 
    // but getWikidataEntity currently only returns simple claims.
    // We will need to enhance getWikidataEntity or write a specific SPARQL query here.
    // For now, let's use a specialized SPARQL query.

    const sparql = `
            SELECT ?type ?itemLabel ?roleLabel ?start ?end WHERE {
              BIND(wd:${qid} AS ?person)
              
              {
                # Education (P69)
                ?person p:P69 ?stmt .
                ?stmt ps:P69 ?item .
                OPTIONAL { ?stmt pq:P512 ?role . } # Degree
                OPTIONAL { ?stmt pq:P580 ?start . }
                OPTIONAL { ?stmt pq:P582 ?end . }
                BIND("education" AS ?type)
              }
              UNION
              {
                # Employer (P108)
                ?person p:P108 ?stmt .
                ?stmt ps:P108 ?item .
                OPTIONAL { ?stmt pq:P39 ?role . } # Generic role
                OPTIONAL { ?stmt pq:P1365 ?role . } # Replaces (often implies role)
                OPTIONAL { ?stmt pq:P580 ?start . }
                OPTIONAL { ?stmt pq:P582 ?end . }
                BIND("career" AS ?type)
              }
              UNION
              {
                # Founded by (P112) - Note: This relation is reverse. Person -> Founded -> Org
                # Use P166 (Award) for now, but adding Founder logic is tricky in this simple union.
                # Let's stick to Awards P166 for now as "highlights".
                ?person p:P166 ?stmt .
                ?stmt ps:P166 ?item .
                OPTIONAL { ?stmt pq:P585 ?start . }
                BIND("award" AS ?type)
              }
              UNION
              {
                # Position held (P39) - Critical for "CEO of OpenAI"
                ?person p:P39 ?stmt .
                ?stmt ps:P39 ?item .
                OPTIONAL { ?stmt pq:P642 ?of . } # "of" (e.g. CEO of Google)
                BIND(?of AS ?relatedItem) # We want the label of the organization
                OPTIONAL { ?stmt pq:P580 ?start . }
                OPTIONAL { ?stmt pq:P582 ?end . }
                BIND("career_position" AS ?type)
              }

              # Label service
              SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh". }
            }
            ORDER BY DESC(?start)
        `;

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AiPersonAgent/1.0' }
    });

    if (!response.ok) return [];

    const data = await response.json();

    const seen = new Set<string>();

    for (const binding of data.results.bindings) {
      let title = binding.itemLabel.value;
      let subtitle = binding.roleLabel?.value;

      // Special handling for Position Held (P39) with "of" (P642)
      if (binding.type.value === 'career_position') {
        // If we have "CEO" (item) "of Google" (relatedItem), show:
        // Title: Google (relatedItem)
        // Subtitle: CEO (item)
        const orgName = binding.relatedItemLabel?.value;
        if (orgName) {
          title = orgName;
          subtitle = binding.itemLabel.value;
        }
      }

      // Deduplication key
      const key = `${title}-${subtitle}-${binding.start?.value}`;
      if (seen.has(key)) continue;
      seen.add(key);

      items.push({
        type: binding.type.value,
        title: title,
        subtitle: subtitle,
        startDate: binding.start?.value,
        endDate: binding.end?.value,
      });
    }

    // Translate items to Chinese
    const textsToTranslate: string[] = [];
    items.forEach(item => {
      if (item.title) textsToTranslate.push(item.title);
      if (item.subtitle) textsToTranslate.push(item.subtitle);
    });

    if (textsToTranslate.length > 0) {
      const translated = await translateBatch(textsToTranslate);
      let idx = 0;
      items.forEach(item => {
        if (item.title) item.title = translated[idx++] || item.title;
        if (item.subtitle) item.subtitle = translated[idx++] || item.subtitle;
      });
    }

    return items;

  } catch (error) {
    console.error('Error fetching career data:', error);
    return [];
  }
}
