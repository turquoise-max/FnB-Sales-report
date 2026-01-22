'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-4">
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="테마 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">라이트 모드</SelectItem>
          <SelectItem value="dark">다크 모드</SelectItem>
          <SelectItem value="system">시스템 설정</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="flex items-center gap-2">
        {theme === 'dark' ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
      </div>
    </div>
  );
}
