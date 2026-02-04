import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR').format(amount);
};

/**
 * 어떤 환경(서버/클라이언트)에서도 일관된 한국 시간(KST) Date 객체를 반환합니다.
 */
export const getKSTDate = (date: Date = new Date()) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  const kstOffset = 9 * 60 * 60 * 1000;
  return new Date(utc + kstOffset);
};
