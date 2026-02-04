'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Upload, Loader2, HelpCircle } from 'lucide-react';
import { uploadCoupangExcel } from '@/app/actions';
import { Input } from '@/components/ui/input';

export default function CoupangUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadCoupangExcel(formData);
      setResult(res);
      if (res.success) setFile(null);
    } catch (e) {
      setResult({ error: '업로드 중 예상치 못한 오류가 발생했습니다.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-0 pt-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-pink-600">
            <ShoppingBag className="h-5 w-5" />
            쿠팡이츠 정산 내역 업로드
          </CardTitle>
          <CardDescription>쿠팡이츠 포털에서 다운로드한 '지급내역/정산' 엑셀 파일을 업로드하세요.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400" title="다운로드 방법 보기">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="space-y-2">
          <label className="text-sm font-medium">정산 엑셀 파일 선택</label>
          <Input 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
            className="bg-white cursor-pointer"
          />
        </div>
        <Button 
          className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold h-12" 
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              월별 정산 데이터 분석 중...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              쿠팡이츠 데이터 업로드 시작
            </>
          )}
        </Button>
        {result?.success && (
          <p className="text-xs text-green-600 font-medium text-center">{result.success}</p>
        )}
        {result?.error && (
          <p className="text-xs text-red-600 font-medium text-center">{result.error}</p>
        )}
        <p className="text-xs text-muted-foreground italic text-center">
          * 쿠팡이츠 정산 내역 엑셀 파일을 업로드해주세요.
        </p>
      </CardContent>
    </Card>
  );
}
