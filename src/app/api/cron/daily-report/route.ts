import { supabase } from '@/lib/database/supabaseClient';
import { format, subDays } from 'date-fns';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    // 어제 날짜의 매출 데이터 조회
    const { data, error } = await supabase
      .from('daily_summary')
      .select('*')
      .eq('sale_date', yesterdayStr)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const totalSales = data?.total_sales || 0;
    const posSales = data?.pos_sales || 0;
    const manualSales = data?.manual_sales || 0;

    // Slack Webhook URL
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!slackWebhookUrl) {
      return NextResponse.json({ error: 'Slack Webhook URL이 설정되지 않았습니다.' }, { status: 500 });
    }

    // Slack 메시지 생성
    const message = {
      text: `📊 일일 매출 리포트 (${yesterdayStr})`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `📊 일일 매출 리포트`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*날짜:*\n${yesterdayStr}`
            },
            {
              type: 'mrkdwn',
              text: `*총 매출:*\n₩${totalSales.toLocaleString('ko-KR')}`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*POS 매출:*\n₩${posSales.toLocaleString('ko-KR')}`
            },
            {
              type: 'mrkdwn',
              text: `*기타/수기 매출:*\n₩${manualSales.toLocaleString('ko-KR')}`
            }
          ]
        },
        {
          type: 'divider'
        }
      ]
    };

    // Slack으로 메시지 전송
    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!slackResponse.ok) {
      throw new Error('Slack 메시지 전송에 실패했습니다.');
    }

    return NextResponse.json({ success: true, message: '리포트가 성공적으로 전송되었습니다.' });
  } catch (error: any) {
    console.error('Daily report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
