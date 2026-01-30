import * as dotenv from 'dotenv';
import path from 'path';

// .env.local 로드 (Supabase 설정 등) - 가장 먼저 실행
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import { runBaeminCrawler } from './baemin-crawler';

async function test() {
    const targetDate = '2025-12-08';
    console.log(`[Test] Starting crawler for ${targetDate}...`);
    const result = await runBaeminCrawler(targetDate);
    console.log('[Test] Result:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
