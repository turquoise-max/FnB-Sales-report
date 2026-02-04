'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Upload, Loader2, HelpCircle } from 'lucide-react';
import { uploadSingleCoupangFile } from '@/app/actions';
import { Input } from '@/components/ui/input';

export default function CoupangUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setMessage(null);

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await uploadSingleCoupangFile(formData);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
          console.error(res.error);
        }
      } catch (e) {
        failCount++;
      }
    }

    if (failCount === 0) {
      setMessage({ type: 'success', text: `${successCount}개 파일 업로드 완료!` });
      setFiles([]);
    } else {
      setMessage({ 
        type: successCount > 0 ? 'success' : 'error', 
        text: `${successCount}개 성공, ${failCount}개 실패. 콘솔을 확인하세요.` 
      });
    }
    setUploading(false);
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
          <label className="text-sm font-medium">정산 엑셀 파일 선택 (다중 선택 가능)</label>
          <Input 
            type="file" 
            accept=".xlsx,.xls" 
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            disabled={uploading}
            className="bg-white cursor-pointer"
          />
          {files.length > 0 && (
            <p className="text-xs text-pink-600 font-medium">
              선택된 파일: {files.length}개
            </p>
          )}
        </div>
        <Button 
          className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold h-12" 
          disabled={files.length === 0 || uploading}
          onClick={handleUpload}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              정산 데이터 일괄 분석 중...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {files.length}개 엑셀 업로드 시작
            </>
          )}
        </Button>
        {message && (
          <p className={`text-xs font-medium text-center ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}
        <p className="text-xs text-muted-foreground italic text-center">
          * 쿠팡이츠 정산 내역 엑셀 파일을 업로드해주세요.
        </p>
      </CardContent>
    </Card>
  );
}
