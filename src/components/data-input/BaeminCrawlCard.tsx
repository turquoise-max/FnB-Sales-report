'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { crawlBaeminData } from '@/app/actions';
import { CloudDownload, HelpCircle } from 'lucide-react';

export default function BaeminUpload() {
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCrawl = async () => {
    if (!saleDate) {
      setMessage({ type: 'error', text: '수집할 날짜를 선택해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await crawlBaeminData(saleDate);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.success! });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '수집 중 예상치 못한 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-0 pt-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-teal-600">
            <CloudDownload className="h-5 w-5" />
            배달의민족 자동 수집
          </CardTitle>
          <CardDescription>배민 사장님광장 로그인 후 실시간 주문 내역을 가져옵니다.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400" title="수집 가이드 보기">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="space-y-2">
          <label htmlFor="baemin-date" className="text-sm font-medium">수집 기준일</label>
          <Input
            id="baemin-date"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            disabled={loading}
            className="bg-white"
          />
        </div>
        <Button 
          onClick={handleCrawl} 
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12" 
          disabled={loading}
        >
          {loading ? '배민 사장님광장 접속 중...' : '배민 데이터 자동 수집 시작'}
        </Button>
        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {message.text}
          </p>
        )}
        <p className="text-xs text-muted-foreground italic">
          * 클릭 시 브라우저가 실행되어 자동으로 배민 사장님광장에 로그인 후 데이터를 수집합니다.
        </p>
      </CardContent>
    </Card>
  );
}
