'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Upload, Loader2 } from 'lucide-react';
import { uploadSingleCoupangFile } from '@/app/actions';
import { Input } from '@/components/ui/input';
import HelpModal from '@/components/common/HelpModal';

export default function CoupangUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(Date.now()); // 파일 입력을 초기화하기 위한 키
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
      setInputKey(Date.now()); // 파일 입력 초기화
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
        <HelpModal 
          title="쿠팡이츠 정산파일 다운로드"
          description="쿠팡이츠 사장님 포털에서 정확한 정산 엑셀을 다운로드하세요."
          steps={[
            {
              title: "쿠팡이츠 포털 로그인",
              description: "쿠팡이츠 사장님 포털(웹)에 접속하여 로그인합니다."
            },
            {
              title: "매출 관리 메뉴 선택",
              description: "'매출 관리' > '매출내역서 다운로드' 버튼을 클릭합니다."
            },
            {
              title: "엑셀 파일 다운로드",
              description: "조회할 월을 '월별 선택'에서 선택한 후 하단의 '다운로드' 버튼을 클릭합니다."
            },
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        <div className="space-y-2">
          <label className="text-sm font-medium">정산 엑셀 파일 선택 (다중 선택 가능)</label>
          <Input 
            key={inputKey}
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
