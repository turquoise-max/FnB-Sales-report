import { supabase } from './supabaseClient';
import { updateDailySummary } from '../app/actions';

async function migrate() {
    console.log('재집계 시작...');
    const { data: summaries } = await supabase.from('daily_summary').select('sale_date');
    if (!summaries) return;

    for (const s of summaries) {
        console.log(`${s.sale_date} 데이터 처리 중...`);
        await updateDailySummary(s.sale_date);
    }
    console.log('재집계 완료!');
}

migrate().catch(console.error);
