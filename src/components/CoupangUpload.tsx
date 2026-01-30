'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Upload, Loader2 } from 'lucide-react';
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
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">쿠팡이츠 매출 업로드</CardTitle>
        <ShoppingBag className="h-5 w-5 text-pink-500" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">정산 엑셀 파일 선택</label>
          <Input 
            type="file" 
            accept=".xlsx,.xls" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
          />
        </div>
        <Button 
          className="w-full bg-pink-500 hover:bg-pink-600 text-white" 
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              쿠팡이츠 데이터 업로드
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
