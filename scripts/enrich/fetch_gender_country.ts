
/**
 * 从 Wikidata 获取性别和国籍信息，更新现有人物
 */

import 'dotenv/config';
import { prisma } from './lib/db/prisma';
import { searchWikidata, getWikidataEntity } from './lib/datasources/wikidata';

// Wikidata API for claims
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

interface GenderCountryInfo {
    gender?: string;  // "male", "female", "other"
    country?: string; // ISO 3166-1 alpha-2 code
}

// Wikidata gender QIDs -> our values
const GENDER_MAP: Record<string, string> = {
    'Q6581097': 'male',    // male
    'Q6581072': 'female',  // female
    'Q1097630': 'other',   // intersex
    'Q48270': 'other',     // non-binary
    'Q1052281': 'other',   // transgender female
    'Q2449503': 'other',   // transgender male
};

// Common country QIDs -> ISO codes
const COUNTRY_MAP: Record<string, string> = {
    'Q148': 'CN',      // China
    'Q30': 'US',       // USA
    'Q145': 'GB',      // UK
    'Q142': 'FR',      // France
    'Q183': 'DE',      // Germany
    'Q17': 'JP',       // Japan
    'Q884': 'KR',      // South Korea
    'Q16': 'CA',       // Canada
    'Q408': 'AU',      // Australia
    'Q668': 'IN',      // India
    'Q155': 'BR',      // Brazil
    'Q38': 'IT',       // Italy
    'Q29': 'ES',       // Spain
    'Q159': 'RU',      // Russia
    'Q801': 'IL',      // Israel
    'Q36': 'PL',       // Poland
    'Q55': 'NL',       // Netherlands
    'Q39': 'CH',       // Switzerland
    'Q40': 'AT',       // Austria
    'Q37': 'LT',       // Lithuania
    'Q34': 'SE',       // Sweden
    'Q35': 'DK',       // Denmark
    'Q40362': 'TW',    // Taiwan
    'Q15180': 'RU',    // Soviet Union -> Russia
};

async function fetchGenderCountryFromWikidata(qid: string): Promise<GenderCountryInfo> {
    try {
        const params = new URLSearchParams({
            action: 'wbgetentities',
            ids: qid,
            props: 'claims',
            format: 'json',
            origin: '*',
        });

        const response = await fetch(`${WIKIDATA_API}?${params}`, {
            headers: {
                'User-Agent': 'AI-Person-Agent/1.0',
            },
        });

        const data = await response.json();
        const entity = data.entities?.[qid];
        if (!entity) return {};

        const result: GenderCountryInfo = {};

        // P21 = sex or gender
        const genderClaim = entity.claims?.P21?.[0]?.mainsnak?.datavalue?.value?.id;
        if (genderClaim && GENDER_MAP[genderClaim]) {
            result.gender = GENDER_MAP[genderClaim];
        }

        // P27 = country of citizenship
        const countryClaim = entity.claims?.P27?.[0]?.mainsnak?.datavalue?.value?.id;
        if (countryClaim && COUNTRY_MAP[countryClaim]) {
            result.country = COUNTRY_MAP[countryClaim];
        }

        return result;
    } catch (error) {
        console.error(`Error fetching ${qid}:`, error);
        return {};
    }
}

async function main() {
    console.log('=== 从 Wikidata 获取性别和国籍 ===\n');

    // 获取有 Wikidata QID 的人物
    const people = await prisma.people.findMany({
        where: {
            qid: {
                startsWith: 'Q'
            },
            // 只处理还没有这些信息的人
            OR: [
                { gender: null },
                { country: null }
            ]
        },
        select: {
            id: true,
            name: true,
            qid: true,
            gender: true,
            country: true,
        }
    });

    console.log(`找到 ${people.length} 人需要更新\n`);

    let updated = 0;
    let failed = 0;

    for (const person of people) {
        console.log(`[${updated + failed + 1}/${people.length}] ${person.name} (${person.qid})`);

        const info = await fetchGenderCountryFromWikidata(person.qid);

        if (info.gender || info.country) {
            const updateData: Record<string, string> = {};
            if (info.gender && !person.gender) {
                updateData.gender = info.gender;
            }
            if (info.country && !person.country) {
                updateData.country = info.country;
            }

            if (Object.keys(updateData).length > 0) {
                await prisma.people.update({
                    where: { id: person.id },
                    data: updateData
                });
                console.log(`  ✅ Updated: gender=${info.gender || '-'}, country=${info.country || '-'}`);
                updated++;
            } else {
                console.log(`  - No new info to update`);
            }
        } else {
            console.log(`  ❌ No gender/country found`);
            failed++;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 200));
    }

    // 处理非 Wikidata QID 的人物 (主要是中国人物，使用百度百科添加的)
    console.log('\n=== 处理非 Wikidata 人物 (推测) ===\n');

    const localPeople = await prisma.people.findMany({
        where: {
            NOT: {
                qid: {
                    startsWith: 'Q'
                }
            },
            country: null
        },
        select: {
            id: true,
            name: true,
            qid: true,
        }
    });

    for (const person of localPeople) {
        // 如果名字有中文字符，假设是中国人
        if (/[\u4e00-\u9fa5]/.test(person.name)) {
            await prisma.people.update({
                where: { id: person.id },
                data: { country: 'CN' }
            });
            console.log(`  ${person.name}: 设置为 CN (根据中文名推断)`);
            updated++;
        }
    }

    console.log(`\n=== 完成 ===`);
    console.log(`更新: ${updated}`);
    console.log(`失败/无数据: ${failed}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
