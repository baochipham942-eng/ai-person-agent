import { prisma } from '../lib/db/prisma';


async function main() {
    // 1. Check people with missing timeline start dates
    const peopleWithRoles = await prisma.people.findMany({
        include: {
            roles: {
                include: {
                    organization: true
                }
            }
        }
    });

    console.log('=== 统计数据 ===');
    console.log('总人数:', peopleWithRoles.length);

    let missingStartDate = 0;
    let totalRoles = 0;
    let rolesWithMissingDates: { personName: string; org: string; role: string }[] = [];

    for (const person of peopleWithRoles) {
        for (const role of person.roles) {
            totalRoles++;
            if (!role.startDate) {
                missingStartDate++;
                if (rolesWithMissingDates.length < 20) {
                    rolesWithMissingDates.push({
                        personName: person.name,
                        org: role.organization.name,
                        role: role.role
                    });
                }
            }
        }
    }

    console.log('总角色数:', totalRoles);
    console.log('缺少开始日期的角色数:', missingStartDate);
    if (totalRoles > 0) {
        console.log('缺失比例:', ((missingStartDate / totalRoles) * 100).toFixed(1) + '%');
    }

    console.log('\n示例缺失开始日期的记录（最多20条）:');
    for (const r of rolesWithMissingDates) {
        console.log(`  - ${r.personName}: ${r.role} @ ${r.org}`);
    }

    // 2. Check people with missing whyImportant
    const totalPeople = await prisma.people.count();
    const withWhyImportant = await prisma.people.count({
        where: { whyImportant: { not: null } }
    });
    console.log('\n=== WhyImportant 数据 ===');
    console.log('总人数:', totalPeople);
    console.log('有 whyImportant:', withWhyImportant);
    console.log('无 whyImportant:', totalPeople - withWhyImportant);

    // Sample those without whyImportant
    const withoutWhyImportant = await prisma.people.findMany({
        where: { whyImportant: null },
        select: { name: true },
        take: 10
    });
    console.log('\n示例无 whyImportant 的人物:');
    for (const p of withoutWhyImportant) {
        console.log(`  - ${p.name}`);
    }

    // 3. Check avatar issues
    const people = await prisma.people.findMany({
        select: { id: true, name: true, avatarUrl: true }
    });

    let nullAvatars: string[] = [];
    let wikimediaAvatars: string[] = [];
    let weservAvatars: string[] = [];
    let twitterAvatars: string[] = [];
    let otherAvatars: string[] = [];

    for (const p of people) {
        if (!p.avatarUrl || p.avatarUrl === '') {
            nullAvatars.push(p.name);
        } else if (p.avatarUrl.includes('weserv.nl')) {
            weservAvatars.push(p.name);
        } else if (p.avatarUrl.includes('wikimedia') || p.avatarUrl.includes('wikipedia')) {
            wikimediaAvatars.push(p.name);
        } else if (p.avatarUrl.includes('pbs.twimg.com') || p.avatarUrl.includes('x.com')) {
            twitterAvatars.push(p.name);
        } else {
            otherAvatars.push(p.name);
        }
    }

    console.log('\n=== Avatar 数据 ===');
    console.log('总人数:', people.length);
    console.log('无头像:', nullAvatars.length, nullAvatars.length > 0 ? `(${nullAvatars.slice(0, 5).join(', ')})` : '');
    console.log('Wikimedia 头像:', wikimediaAvatars.length);
    console.log('Twitter 头像:', twitterAvatars.length);
    console.log('Weserv 代理:', weservAvatars.length, weservAvatars.length > 0 ? `(${weservAvatars.slice(0, 5).join(', ')})` : '');
    console.log('其他来源:', otherAvatars.length);

    // 4. Check avatar URL validity (sample check)
    console.log('\n=== 头像 URL 抽查 ===');
    const sampleAvatars = people.filter(p => p.avatarUrl).slice(0, 10);
    for (const p of sampleAvatars) {
        try {
            const resp = await fetch(p.avatarUrl!, { method: 'HEAD' });
            const status = resp.status;
            const contentType = resp.headers.get('content-type');
            const isImage = contentType?.startsWith('image/');
            console.log(`  ${p.name}: ${status} ${isImage ? '✅' : '❌ (非图片类型)'}`);
        } catch (err) {
            console.log(`  ${p.name}: ❌ 网络错误`);
        }
    }

    await prisma.$disconnect();
}

main();
