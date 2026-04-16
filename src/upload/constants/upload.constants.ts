import { join } from 'path';

export const UPLOAD_DIR_NAME = process.env.UPLOAD_DIR ?? 'uploads';
export const UPLOAD_DIR = join(process.cwd(), UPLOAD_DIR_NAME);
