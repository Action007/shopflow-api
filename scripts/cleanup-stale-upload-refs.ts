import { access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { getUploadDirPath } from '../src/upload/constants/upload.constants';

type RecordRef = {
    id: string;
    url: string;
};

type CleanupTarget = {
    name: string;
    findMany: () => Promise<RecordRef[]>;
    clear: (id: string) => Promise<void>;
};

type SummaryRow = {
    scanned: number;
    missing: number;
    cleared: number;
};

const prisma = new PrismaClient();
const hasApply = process.argv.includes('--apply');
const hasDryRun = process.argv.includes('--dry-run');

if (hasApply && hasDryRun) {
    console.error('Cannot pass both --apply and --dry-run.');
    process.exit(1);
}

if (!hasApply && !hasDryRun) {
    console.error('Must pass either --dry-run or --apply.');
    process.exit(1);
}

const uploadDirEnv = process.env.UPLOAD_DIR;

if (!uploadDirEnv) {
    console.error('UPLOAD_DIR environment variable must be set.');
    process.exit(1);
}

const uploadDir = getUploadDirPath(uploadDirEnv);
const isDryRun = hasDryRun;

async function main(): Promise<void> {
    console.log(
        `Running in ${isDryRun ? 'DRY-RUN (no changes will be made)' : 'APPLY (will mutate database)'} mode`,
    );

    const targets: CleanupTarget[] = [
        {
            name: 'User.profileImageUrl',
            findMany: async () => {
                const rows = await prisma.user.findMany({
                    where: {
                        profileImageUrl: { not: null },
                    },
                    select: {
                        id: true,
                        profileImageUrl: true,
                    },
                });

                return rows.map((row) => ({
                    id: row.id,
                    url: row.profileImageUrl as string,
                }));
            },
            clear: async (id: string) => {
                await prisma.user.update({
                    where: { id },
                    data: { profileImageUrl: null },
                });
            },
        },
        {
            name: 'Product.imageUrl',
            findMany: async () => {
                const rows = await prisma.product.findMany({
                    where: {
                        imageUrl: { not: null },
                    },
                    select: {
                        id: true,
                        imageUrl: true,
                    },
                });

                return rows.map((row) => ({
                    id: row.id,
                    url: row.imageUrl as string,
                }));
            },
            clear: async (id: string) => {
                await prisma.product.update({
                    where: { id },
                    data: { imageUrl: null },
                });
            },
        },
    ];

    const summary = new Map<string, SummaryRow>();

    for (const target of targets) {
        const rows = await target.findMany();
        const rowSummary: SummaryRow = {
            scanned: rows.length,
            missing: 0,
            cleared: 0,
        };

        for (const row of rows) {
            const filePath = getStoredFilePath(row.url);

            if (!filePath || (await fileExists(filePath))) {
                continue;
            }

            rowSummary.missing += 1;

            if (isDryRun) {
                console.log(`[dry-run] Would clear ${target.name} for ${row.id}: ${row.url}`);
                continue;
            }

            await target.clear(row.id);
            rowSummary.cleared += 1;
            console.log(`Cleared ${target.name} for ${row.id}: ${row.url}`);
        }

        summary.set(target.name, rowSummary);
    }

    printSummary(summary);
}

function getStoredFilePath(fileUrl: string): string | undefined {
    try {
        const parsedUrl = new URL(fileUrl);

        if (!parsedUrl.pathname.startsWith('/uploads/')) {
            return undefined;
        }

        const fileName = parsedUrl.pathname.slice('/uploads/'.length);

        if (!fileName) {
            return undefined;
        }

        return join(uploadDir, fileName);
    } catch {
        return undefined;
    }
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath, fsConstants.F_OK);
        return true;
    } catch {
        return false;
    }
}

function printSummary(summary: Map<string, SummaryRow>): void {
    console.log(`Mode: ${isDryRun ? '--dry-run' : '--apply'}`);

    for (const [target, row] of summary.entries()) {
        console.log(
            `${target}: scanned=${row.scanned} missing=${row.missing} cleared=${row.cleared}`,
        );
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
