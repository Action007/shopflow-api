import { join } from 'path';

export function getUploadDirPath(uploadDir: string): string {
    return join(process.cwd(), uploadDir);
}
