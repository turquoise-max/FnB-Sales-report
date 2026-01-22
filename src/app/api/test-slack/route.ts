import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!slackWebhookUrl) {
      return NextResponse.json(
        { error: 'Slack Webhook URL이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const testMessage = {
      text: '🧪 테스트 메시지',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 F&B 대시보드 테스트 메시지',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Slack 연동이 정상적으로 작동하고 있습니다! ✅'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `전송 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
            }
          ]
        }
      ]
    };

    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage),
    });

    if (!slackResponse.ok) {
      throw new Error('Slack 메시지 전송에 실패했습니다.');
    }

    return NextResponse.json({ success: true, message: '테스트 메시지가 전송되었습니다.' });
  } catch (error: any) {
    console.error('Slack test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
