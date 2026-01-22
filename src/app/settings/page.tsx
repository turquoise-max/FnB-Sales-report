'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CheckCircle, XCircle, Send } from 'lucide-react';

export default function SettingsPage() {
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackMessage, setSlackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Supabase 연결 상태 확인
  const checkDatabaseConnection = async () => {
    setDbStatus('checking');
    try {
      const response = await fetch('/api/check-db');
      if (response.ok) {
        setDbStatus('connected');
      } else {
        setDbStatus('error');
      }
    } catch (error) {
      setDbStatus('error');
    }
  };

  // Slack 테스트 메시지 전송
  const sendTestSlackMessage = async () => {
    setSlackTesting(true);
    setSlackMessage(null);

    try {
      const response = await fetch('/api/test-slack', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSlackMessage({ type: 'success', text: '테스트 메시지가 성공적으로 전송되었습니다!' });
      } else {
        setSlackMessage({ type: 'error', text: data.error || '메시지 전송에 실패했습니다.' });
      }
    } catch (error) {
      setSlackMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setSlackTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">설정</h1>

      <div className="space-y-6">
        {/* 테마 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>테마 설정</CardTitle>
            <CardDescription>
              대시보드의 테마를 변경할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* 데이터베이스 연결 상태 */}
        <Card>
          <CardHeader>
            <CardTitle>데이터베이스 연결 상태</CardTitle>
            <CardDescription>
              Supabase 데이터베이스 연결 상태를 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {dbStatus === 'connected' && (
                  <>
                    <CheckCircle className="text-green-500" size={24} />
                    <span className="text-green-600 font-medium">연결됨</span>
                  </>
                )}
                {dbStatus === 'error' && (
                  <>
                    <XCircle className="text-red-500" size={24} />
                    <span className="text-red-600 font-medium">연결 실패</span>
                  </>
                )}
                {dbStatus === 'checking' && (
                  <span className="text-gray-500">확인 중...</span>
                )}
              </div>
              <Button onClick={checkDatabaseConnection} variant="outline">
                연결 확인
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              데이터베이스 설정은 서버 환경 변수로 관리됩니다.
            </p>
          </CardContent>
        </Card>

        {/* Slack 연동 */}
        <Card>
          <CardHeader>
            <CardTitle>Slack 연동</CardTitle>
            <CardDescription>
              일일 매출 리포트를 Slack으로 전송합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Slack Webhook URL은 서버 환경 변수(.env.local)에서 관리됩니다.
                  테스트 메시지를 전송하여 연동 상태를 확인하세요.
                </p>
                <Button 
                  onClick={sendTestSlackMessage} 
                  disabled={slackTesting}
                  className="w-full sm:w-auto"
                >
                  <Send size={16} className="mr-2" />
                  {slackTesting ? '전송 중...' : '테스트 메시지 전송'}
                </Button>
              </div>

              {slackMessage && (
                <div
                  className={`p-4 rounded-lg ${
                    slackMessage.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  }`}
                >
                  {slackMessage.text}
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">자동 리포트 설정</h4>
                <p className="text-sm text-gray-600">
                  매일 오전 9시에 자동으로 전일 매출 리포트가 전송됩니다.
                  <br />
                  Vercel Cron Jobs 설정: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">vercel.json</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 환경 변수 안내 */}
        <Card>
          <CardHeader>
            <CardTitle>환경 변수 관리</CardTitle>
            <CardDescription>
              보안을 위해 모든 API 키와 중요 정보는 서버 환경 변수로 관리됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="font-medium">필요한 환경 변수:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li><code>NEXT_PUBLIC_SUPABASE_URL</code> - Supabase 프로젝트 URL</li>
                <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> - Supabase Anonymous Key</li>
                <li><code>SLACK_WEBHOOK_URL</code> - Slack Webhook URL</li>
              </ul>
              <p className="text-gray-500 mt-4">
                로컬 환경: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">.env.local</code> 파일<br />
                프로덕션: Vercel 대시보드 → Settings → Environment Variables
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
