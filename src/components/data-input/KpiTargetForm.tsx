'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Target, Save, Loader2 } from 'lucide-react';
import { saveKpiTarget, getKpiTarget } from '@/app/actions';

export default function KpiTargetForm() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [target, setTarget] = useState<string>('0');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 월 변경 시 기존 목표 가져오기
  useEffect(() => {
    async function fetchTarget() {
      setFetching(true);
      const val = await getKpiTarget(month);
      setTarget(String(val));
      setFetching(false);
    }
    fetchTarget();
  }, [month]);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    const result = await saveKpiTarget(month, parseInt(target, 10) || 0);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: result.success! });
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-2 text-blue-600 mb-1">
          <Target className="h-5 w-5" />
          <CardTitle className="text-xl font-bold">월 매출 목표 설정</CardTitle>
        </div>
        <CardDescription>각 월별 목표 매출액을 설정하여 달성률을 관리하세요.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">대상 월</label>
            <Input 
              type="month" 
              value={month} 
              onChange={(e) => setMonth(e.target.value)} 
              disabled={loading || fetching}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">목표 매출액 (₩)</label>
            <Input 
              type="number" 
              value={target} 
              onChange={(e) => setTarget(e.target.value)} 
              disabled={loading || fetching}
              placeholder="0"
              className="bg-white font-bold text-blue-600"
            />
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12" 
          disabled={loading || fetching}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          목표 설정 저장하기
        </Button>
        {message && (
          <p className={`text-sm font-medium text-center ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}