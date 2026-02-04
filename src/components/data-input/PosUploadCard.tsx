'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { uploadSingleExcelFile } from '@/app/actions';
import { FileUp, HelpCircle } from 'lucide-react';

export default function FileUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage({ type: 'error', text: '파일을 선택해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const result = await uploadSingleExcelFile(formData);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          console.error(result.error);
        }
      } catch (err) {
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

    setLoading(false);
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-0 pt-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-blue-600">
            <FileUp className="h-5 w-5" />
            POS 매출 업로드
          </CardTitle>
          <CardDescription>POS 시스템의 '일자별/상품별 매출 현황' 엑셀 파일을 업로드하세요.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="text-slate-400" title="다운로드 방법 보기">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="space-y-2">
          <label htmlFor="file-upload" className="text-sm font-medium">엑셀 파일 선택 (다중 선택 가능)</label>
          <Input 
            id="file-upload" 
            type="file" 
            accept=".xlsx, .xls" 
            multiple 
            onChange={handleFileChange} 
            disabled={loading} 
            className="bg-white cursor-pointer" 
          />
          {files.length > 0 && (
            <p className="text-xs text-blue-600 font-medium">
              선택된 파일: {files.length}개
            </p>
          )}
        </div>
        <Button onClick={handleUpload} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12" disabled={loading || files.length === 0}>
          {loading ? '데이터 분석 및 저장 중...' : `${files.length}개 엑셀 업로드 및 처리 시작`}
        </Button>
        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
