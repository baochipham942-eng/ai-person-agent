/**
 * 数据问题审计脚本
 * 检查三个问题的现状：whyImportant、时间线日期、头像
 */

import 'dotenv/config';
import { prisma } from '../lib/db/prisma';


async function auditWhyImportant() {
    console.log('\n=== WhyImportant 审计 ===');

    const total = await prisma.people.count();
    const withWhyImportant = await prisma.people.count({
        where: { whyImportant: { not: null } }
    });
    const withoutWhyImportant = total - withWhyImportant;

    console.log(`总人数: ${total}`);
    console.log(`有 whyImportant: ${withWhyImportant} (${(withWhyImportant / total * 100).toFixed(1)}%)`);
    console.log(`缺少 whyImportant: ${withoutWhyImportant} (${(withoutWhyImportant / total * 100).toFixed(1)}%)`);

    // 列出缺失的人
    if (withoutWhyImportant > 0) {
        const missing = await prisma.people.findMany({
            where: { whyImportant: null },
            select: { name: true },
            take: 10
        });
        console.log('\n缺失 whyImportant 的人物（最多10个）:');
        missing.forEach(p => console.log(`  - ${p.name}`));
        if (withoutWhyImportant > 10) {
            console.log(`  ... 还有 ${withoutWhyImportant - 10} 人`);
        }
    }

    return { total, withWhyImportant, withoutWhyImportant };
}

async function auditTimelineDates() {
    console.log('\n=== 时间线日期审计 ===');

    const totalRoles = await prisma.personRole.count();
    const withStartDate = await prisma.personRole.count({
        where: { startDate: { not: null } }
    });
    const withoutStartDate = totalRoles - withStartDate;

    console.log(`总角色数: ${totalRoles}`);
    console.log(`有开始日期: ${withStartDate} (${totalRoles > 0 ? (withStartDate / totalRoles * 100).toFixed(1) : 0}%)`);
    console.log(`缺少开始日期: ${withoutStartDate} (${totalRoles > 0 ? (withoutStartDate / totalRoles * 100).toFixed(1) : 0}%)`);

    // 抽样查看缺失日期的记录
    if (withoutStartDate > 0) {
        const missingDates = await prisma.personRole.findMany({
            where: { startDate: null },
            include: {
                person: { select: { name: true } },
                organization: { select: { name: true, nameZh: true } }
            },
            take: 10
        });

        console.log('\n缺失开始日期的记录（最多10个）:');
        missingDates.forEach(r => {
            const orgName = r.organization.nameZh || r.organization.name;
            console.log(`  - ${r.person.name}: ${r.roleZh || r.role} @ ${orgName}`);
        });
        if (withoutStartDate > 10) {
            console.log(`  ... 还有 ${withoutStartDate - 10} 条记录`);
        }
    }

    return { totalRoles, withStartDate, withoutStartDate };
}

async function auditAvatars() {
    console.log('\n=== 头像审计 ===');

    const people = await prisma.people.findMany({
        select: { id: true, name: true, avatarUrl: true }
    });

    const total = people.length;
    const nullAvatars: string[] = [];
    const wikimediaAvatars: string[] = [];
    const twitterAvatars: string[] = [];
    const weservAvatars: string[] = [];
    const otherAvatars: string[] = [];

    for (const p of people) {
        if (!p.avatarUrl || p.avatarUrl === '') {
            nullAvatars.push(p.name);
        } else if (p.avatarUrl.includes('wikimedia') || p.avatarUrl.includes('wikipedia')) {
            wikimediaAvatars.push(p.name);
        } else if (p.avatarUrl.includes('pbs.twimg.com')) {
            twitterAvatars.push(p.name);
        } else if (p.avatarUrl.includes('weserv.nl') || p.avatarUrl.includes('unavatar')) {
            weservAvatars.push(p.name);
        } else {
            otherAvatars.push(p.name);
        }
    }

    console.log(`总人数: ${total}`);
    console.log(`无头像 (null): ${nullAvatars.length}`);
    console.log(`Wikimedia 头像: ${wikimediaAvatars.length}`);
    console.log(`Twitter 头像: ${twitterAvatars.length}`);
    console.log(`Weserv/Unavatar 代理: ${weservAvatars.length}`);
    console.log(`其他来源: ${otherAvatars.length}`);

    if (nullAvatars.length > 0) {
        console.log('\n无头像的人物:');
        nullAvatars.slice(0, 10).forEach(name => console.log(`  - ${name}`));
        if (nullAvatars.length > 10) {
            console.log(`  ... 还有 ${nullAvatars.length - 10} 人`);
        }
    }

    // 抽样检测头像可用性
    console.log('\n--- 头像可用性抽样检测 ---');
    const samplesToCheck = people.filter(p => p.avatarUrl).slice(0, 15);

    let accessible = 0;
    let broken = 0;
    const brokenAvatars: { name: string; url: string; reason: string }[] = [];

    for (const p of samplesToCheck) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const resp = await fetch(p.avatarUrl!, {
                method: 'HEAD',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const contentType = resp.headers.get('content-type') || '';
            const isImage = contentType.startsWith('image/');

            if (resp.ok && isImage) {
                accessible++;
                console.log(`  ✅ ${p.name}`);
            } else {
                broken++;
                brokenAvatars.push({
                    name: p.name,
                    url: p.avatarUrl!.substring(0, 60) + '...',
                    reason: resp.ok ? `非图片类型: ${contentType}` : `HTTP ${resp.status}`
                });
                console.log(`  ❌ ${p.name}: ${resp.ok ? '非图片类型' : 'HTTP ' + resp.status}`);
            }
        } catch (err: any) {
            broken++;
            brokenAvatars.push({
                name: p.name,
                url: p.avatarUrl!.substring(0, 60) + '...',
                reason: err.name === 'AbortError' ? '超时' : '网络错误'
            });
            console.log(`  ❌ ${p.name}: ${err.name === 'AbortError' ? '超时' : '网络错误'}`);
        }
    }

    console.log(`\n抽样结果: ${accessible}/${samplesToCheck.length} 可访问`);

    return {
        total,
        nullAvatars: nullAvatars.length,
        wikimediaAvatars: wikimediaAvatars.length,
        twitterAvatars: twitterAvatars.length,
        weservAvatars: weservAvatars.length,
        brokenAvatars
    };
}

async function main() {
    console.log('===========================================');
    console.log('       AI Person Agent 数据审计报告');
    console.log('===========================================');

    const whyImportantStats = await auditWhyImportant();
    const timelineStats = await auditTimelineDates();
    const avatarStats = await auditAvatars();

    console.log('\n===========================================');
    console.log('                 总  结');
    console.log('===========================================');
    console.log(`\n1. WhyImportant 问题: ${whyImportantStats.withoutWhyImportant} 人缺失`);
    console.log(`2. 时间线日期问题: ${timelineStats.withoutStartDate} 条记录缺少开始日期`);
    console.log(`3. 头像问题: ${avatarStats.nullAvatars} 人无头像，${avatarStats.brokenAvatars.length} 个抽样检测失败`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('审计失败:', e);
    process.exit(1);
});
