import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 간단한 쿼리로 연결 확인
    const { error } = await supabase
      .from('daily_summary')
      .select('sale_date')
      .limit(1);

    if (error) {
      return NextResponse.json({ error: '데이터베이스 연결 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '연결됨' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
