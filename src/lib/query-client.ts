import { QueryClient, isServer } from "@tanstack/react-query";
import { ApiError } from "@/services/api/client";

/**
 * Server-state siyosati.
 *
 * Bu dashboard PBX/CDR ma'lumotlarini ko'rsatadi — ular tez-tez o'zgarmaydi,
 * lekin ancha "og'ir" (bir kunda minglab yozuv). Shuning uchun:
 *  - `staleTime` uzunroq: sana oralig'ini oldinga-orqaga o'zgartirganda qayta
 *    so'rov ketmaydi, kesh ishlatiladi (over-fetching muammosining yechimi);
 *  - fokusda avtomatik refetch o'chirilgan: foydalanuvchi boshqa tabga o'tib
 *    qaytganda 30 soniyalik so'rov qayta boshlanmasligi kerak;
 *  - 4xx xatolarni qayta urinmaymiz — ular vaqtinchalik emas.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000,   // 2 daqiqa "yangi" hisoblanadi
        gcTime: 30 * 60 * 1000,     // keshda 30 daqiqa saqlanadi
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10_000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Serverda har so'rov uchun yangi client, brauzerda — bitta umumiy.
 * Aks holda React suspense paytida client qayta yaratilib, kesh yo'qoladi.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
