/**
 * 补充缺失的职业时间线开始日期 - 改进版
 * 
 * 改进策略：
 * 1. 优先使用 Wikidata QID 精确匹配
 * 2. 使用英文名进行模糊匹配（忽略大小写、空格差异）
 * 3. 对于无法匹配的，记录详细日志以便后续处理
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { fetchRawCareerData, RawCareerData } from '../../lib/datasources/career';

/**
 * 规范化名称用于匹配
 */
function normalizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // 移除特殊字符
        .replace(/\s+/g, ' ')    // 规范化空格
        .trim();
}

/**
 * 计算两个字符串的相似度 (简单的包含检查)
 */
function isSimilar(a: string, b: string): boolean {
    const normA = normalizeName(a);
    const normB = normalizeName(b);

    // 完全匹配
    if (normA === normB) return true;

    // 一个包含另一个
    if (normA.includes(normB) || normB.includes(normA)) return true;

    // 检查关键词重叠 (至少50%的词匹配)
    const wordsA = normA.split(' ');
    const wordsB = normB.split(' ');
    const matchingWords = wordsA.filter(w => wordsB.includes(w) && w.length > 2);

    return matchingWords.length >= Math.min(wordsA.length, wordsB.length) * 0.5;
}

/**
 * 在 Wikidata 数据中查找最佳匹配
 */
function findBestMatch(
    orgName: string,
    orgQid: string | null,
    wikidataCareer: RawCareerData[]
): RawCareerData | null {
    // 1. 优先使用 QID 精确匹配
    if (orgQid && !orgQid.startsWith('no-qid-')) {
        const qidMatch = wikidataCareer.find(w => w.orgQid === orgQid);
        if (qidMatch) return qidMatch;
    }

    // 2. 使用英文名模糊匹配
    const nameMatch = wikidataCareer.find(w => isSimilar(w.orgName, orgName));
    if (nameMatch) return nameMatch;

    return null;
}

async function main() {
    console.log('=== 开始补充时间线开始日期 (改进版) ===\n');

    // 1. 找出所有缺少开始日期的记录，按人物分组
    const missingStartDateRoles = await prisma.personRole.findMany({
        where: { startDate: null },
        include: {
            person: { select: { id: true, name: true, qid: true } },
            organization: { select: { id: true, name: true, nameZh: true, wikidataQid: true } }
        }
    });

    console.log(`共有 ${missingStartDateRoles.length} 条记录缺少开始日期`);

    // 按人物分组
    const byPerson = new Map<string, typeof missingStartDateRoles>();
    for (const role of missingStartDateRoles) {
        const personId = role.personId;
        if (!byPerson.has(personId)) {
            byPerson.set(personId, []);
        }
        byPerson.get(personId)!.push(role);
    }

    console.log(`涉及 ${byPerson.size} 个人物\n`);

    let updatedCount = 0;
    let matchedByQid = 0;
    let matchedByName = 0;
    let noWikidataData = 0;
    let noMatch = 0;

    const unmatchedDetails: { person: string; org: string; orgQid: string | null }[] = [];

    // 2. 对每个人重新查询 Wikidata
    for (const [personId, roles] of byPerson) {
        const person = roles[0].person;
        console.log(`\n处理: ${person.name} (${person.qid})`);
        console.log(`  缺失日期的角色数: ${roles.length}`);

        // 跳过非 Wikidata QID 的人物
        if (person.qid.startsWith('BAIKE_') || person.qid.includes('PLACEHOLDER')) {
            console.log(`  ⚠️ 非 Wikidata 人物，跳过`);
            noWikidataData++;
            continue;
        }

        try {
            // 重新从 Wikidata 获取职业数据
            const wikidataCareer = await fetchRawCareerData(person.qid);

            if (wikidataCareer.length === 0) {
                console.log(`  ⚠️ Wikidata 无职业数据`);
                noWikidataData++;
                continue;
            }

            console.log(`  从 Wikidata 获取到 ${wikidataCareer.length} 条记录:`);
            wikidataCareer.slice(0, 5).forEach(w => {
                console.log(`    - ${w.orgName} (${w.orgQid || 'no-qid'}) [${w.startDate || 'no-date'}]`);
            });
            if (wikidataCareer.length > 5) {
                console.log(`    ... 还有 ${wikidataCareer.length - 5} 条`);
            }

            // 3. 尝试匹配并更新
            for (const role of roles) {
                const orgName = role.organization.name;
                const orgQid = role.organization.wikidataQid;

                const match = findBestMatch(orgName, orgQid, wikidataCareer);

                if (match && match.startDate) {
                    const startDate = new Date(match.startDate);
                    if (!isNaN(startDate.getTime())) {
                        // 更新 PersonRole
                        await prisma.personRole.update({
                            where: { id: role.id },
                            data: {
                                startDate,
                                endDate: match.endDate ? new Date(match.endDate) : undefined
                            }
                        });

                        // 如果 Organization 没有 QID，尝试补上（但忽略唯一约束冲突）
                        if (match.orgQid && (!orgQid || orgQid.startsWith('no-qid-'))) {
                            try {
                                // 检查是否已有其他组织使用此 QID
                                const existingOrg = await prisma.organization.findUnique({
                                    where: { wikidataQid: match.orgQid }
                                });
                                if (!existingOrg) {
                                    await prisma.organization.update({
                                        where: { id: role.organization.id },
                                        data: { wikidataQid: match.orgQid }
                                    });
                                    console.log(`  ✅ 更新 + 补充 QID: ${orgName} -> ${match.startDate} (QID: ${match.orgQid})`);
                                } else {
                                    console.log(`  ✅ 更新: ${orgName} -> ${match.startDate} (QID ${match.orgQid} 已存在于 ${existingOrg.name})`);
                                }
                            } catch {
                                console.log(`  ✅ 更新: ${orgName} -> ${match.startDate}`);
                            }
                        } else {
                            console.log(`  ✅ 更新: ${orgName} -> ${match.startDate}`);
                        }

                        updatedCount++;
                        if (orgQid && !orgQid.startsWith('no-qid-')) {
                            matchedByQid++;
                        } else {
                            matchedByName++;
                        }
                    }
                } else if (match) {
                    console.log(`  ⚠️ 匹配但无日期: ${orgName} -> ${match.orgName}`);
                    noMatch++;
                } else {
                    console.log(`  ❌ 未找到匹配: ${orgName} (DB QID: ${orgQid || 'none'})`);
                    noMatch++;
                    unmatchedDetails.push({
                        person: person.name,
                        org: orgName,
                        orgQid
                    });
                }
            }

            // 避免请求过快
            await new Promise(r => setTimeout(r, 300));

        } catch (error) {
            console.error(`  ❌ 处理失败:`, error);
        }
    }

    console.log('\n=== 统计 ===');
    console.log(`更新成功: ${updatedCount} 条`);
    console.log(`  - 通过 QID 匹配: ${matchedByQid}`);
    console.log(`  - 通过名称匹配: ${matchedByName}`);
    console.log(`无 Wikidata 数据: ${noWikidataData} 个人物`);
    console.log(`未能匹配: ${noMatch} 条`);

    // 重新统计
    const remaining = await prisma.personRole.count({ where: { startDate: null } });
    console.log(`\n剩余缺失开始日期: ${remaining} 条`);

    // 输出未匹配详情 (前20条)
    if (unmatchedDetails.length > 0) {
        console.log('\n未匹配详情 (前20条):');
        unmatchedDetails.slice(0, 20).forEach(d => {
            console.log(`  ${d.person}: ${d.org} (DB QID: ${d.orgQid || 'none'})`);
        });
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('脚本失败:', e);
    process.exit(1);
});
