/**
 * Avatar Compression Script
 * 
 * 压缩所有头像到合适的格式和尺寸
 * - 目标格式: WebP (更好的压缩率)
 * - 目标尺寸: 256x256 (足够用于头像显示)
 * - 目标大小: < 50KB
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars');
const TARGET_SIZE = 256; // 256x256 足够用于头像
const MAX_FILE_SIZE = 50 * 1024; // 50KB

interface CompressionResult {
    file: string;
    originalSize: number;
    newSize: number;
    saved: number;
    format: string;
}

async function compressAvatar(filePath: string): Promise<CompressionResult | null> {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath, ext);

    // Skip already processed WebP files that are small
    if (ext === '.webp') {
        const stats = fs.statSync(filePath);
        if (stats.size < MAX_FILE_SIZE) {
            return null;
        }
    }

    // Skip default SVG placeholders
    if (ext === '.svg') {
        return null;
    }

    // Skip manual directory
    if (filePath.includes('/manual/')) {
        return null;
    }

    try {
        const originalStats = fs.statSync(filePath);
        const originalSize = originalStats.size;

        // Read and process image
        const image = sharp(filePath);
        const metadata = await image.metadata();

        // Resize if larger than target
        let processed = image;
        if (metadata.width && metadata.height) {
            if (metadata.width > TARGET_SIZE || metadata.height > TARGET_SIZE) {
                processed = image.resize(TARGET_SIZE, TARGET_SIZE, {
                    fit: 'cover',
                    position: 'center'
                });
            }
        }

        // Convert to WebP with good quality
        const webpBuffer = await processed
            .webp({
                quality: 85,
                effort: 6 // Higher effort = better compression
            })
            .toBuffer();

        // Also try JPEG for comparison (some images compress better as JPEG)
        const jpegBuffer = await processed
            .jpeg({
                quality: 85,
                mozjpeg: true
            })
            .toBuffer();

        // Choose smaller format
        const useWebp = webpBuffer.length <= jpegBuffer.length;
        const finalBuffer = useWebp ? webpBuffer : jpegBuffer;
        const finalExt = useWebp ? '.webp' : '.jpg';

        // Only save if we actually saved space
        if (finalBuffer.length >= originalSize) {
            console.log(`  ⏭️  ${path.basename(filePath)}: Already optimized`);
            return null;
        }

        // Write new file (keep same basename but new extension)
        const newFilePath = path.join(AVATAR_DIR, `${basename}${finalExt}`);
        fs.writeFileSync(newFilePath, finalBuffer);

        // Delete original if extension changed
        if (filePath !== newFilePath) {
            fs.unlinkSync(filePath);
        }

        const saved = originalSize - finalBuffer.length;
        const savedPercent = ((saved / originalSize) * 100).toFixed(1);
        console.log(`  ✅ ${path.basename(filePath)} → ${basename}${finalExt}: ${formatSize(originalSize)} → ${formatSize(finalBuffer.length)} (saved ${savedPercent}%)`);

        return {
            file: basename,
            originalSize,
            newSize: finalBuffer.length,
            saved,
            format: finalExt
        };
    } catch (error) {
        console.error(`  ❌ Error processing ${path.basename(filePath)}:`, error);
        return null;
    }
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

async function main() {
    console.log('🖼️  Avatar Compression Script\n');
    console.log(`📁 Directory: ${AVATAR_DIR}`);
    console.log(`📐 Target size: ${TARGET_SIZE}x${TARGET_SIZE}`);
    console.log(`📦 Max file size: ${formatSize(MAX_FILE_SIZE)}\n`);

    // Get all avatar files
    const files = fs.readdirSync(AVATAR_DIR)
        .filter(f => !fs.statSync(path.join(AVATAR_DIR, f)).isDirectory())
        .filter(f => ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(path.extname(f).toLowerCase()))
        .map(f => path.join(AVATAR_DIR, f));

    console.log(`📊 Found ${files.length} avatar files\n`);

    // First, find large files (> 100KB)
    const largeFiles = files.filter(f => {
        const stats = fs.statSync(f);
        return stats.size > 100 * 1024; // > 100KB
    });

    console.log(`🔍 Found ${largeFiles.length} files > 100KB to compress\n`);

    // Process large files first
    let totalSaved = 0;
    let processedCount = 0;
    const results: CompressionResult[] = [];

    for (const file of largeFiles) {
        const result = await compressAvatar(file);
        if (result) {
            results.push(result);
            totalSaved += result.saved;
            processedCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Processed: ${processedCount} files`);
    console.log(`   Total saved: ${formatSize(totalSaved)}`);

    // Show current directory size
    const dirSize = execSync(`du -sh ${AVATAR_DIR}`).toString().trim();
    console.log(`   Current avatars size: ${dirSize.split('\t')[0]}`);
}

main().catch(console.error);
