import { getWikidataEntity } from './wikidata';

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
                # Education
                ?person p:P69 ?stmt .
                ?stmt ps:P69 ?item .
                OPTIONAL { ?stmt pq:P512 ?role . } # Academic Degree
                OPTIONAL { ?stmt pq:P580 ?start . }
                OPTIONAL { ?stmt pq:P582 ?end . }
                BIND("education" AS ?type)
              }
              UNION
              {
                # Employer
                ?person p:P108 ?stmt .
                ?stmt ps:P108 ?item .
                OPTIONAL { ?stmt pq:P39 ?role . } # Position held
                OPTIONAL { ?stmt pq:P580 ?start . }
                OPTIONAL { ?stmt pq:P582 ?end . }
                BIND("career" AS ?type)
              }
              UNION
              {
                # Awards
                ?person p:P166 ?stmt .
                ?stmt ps:P166 ?item .
                OPTIONAL { ?stmt pq:P585 ?start . } # Point in time
                BIND("award" AS ?type)
              }
              
              SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,en". }
            }
            ORDER BY DESC(?start)
        `;

        const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'AiPersonAgent/1.0' }
        });

        if (!response.ok) return [];

        const data = await response.json();

        for (const binding of data.results.bindings) {
            items.push({
                type: binding.type.value,
                title: binding.itemLabel.value,
                subtitle: binding.roleLabel?.value,
                startDate: binding.start?.value,
                endDate: binding.end?.value,
            });
        }

        return items;

    } catch (error) {
        console.error('Error fetching career data:', error);
        return [];
    }
}
