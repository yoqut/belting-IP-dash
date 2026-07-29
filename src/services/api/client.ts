/**
 * Markazlashgan HTTP client.
 *
 * Axios o'rniga native `fetch` ishlatiladi: bu Next.js App Router loyihasi bo'lgani
 * uchun barcha so'rovlar o'z origin'imizdagi `/api/*` route'larga ketadi —
 * baseURL, auth header yoki CORS bilan ovora bo'lish shart emas. Axios beradigan
 * yagona real foyda — interceptorlar — bu yerda `request()` ning o'zida amalga
 * oshirilgan (xatoni normallashtirish, timeout, JSON parse).
 */

/** Barcha API xatolari shu tipda normallashtiriladi. */
export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }

  /** So'rov bekor qilinganmi (React Query buni xato deb hisoblamasligi kerak). */
  static isAbort(e: unknown): boolean {
    return e instanceof Error && e.name === "AbortError";
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  /** Millisekundda. `0` — timeout yo'q. Standart: 60s. */
  timeout?: number;
  method?: "GET" | "POST";
  body?: unknown;
}

const DEFAULT_TIMEOUT = 60_000;

/**
 * Tashqi `signal` (React Query'dan) va ichki timeout signalini birlashtiradi.
 * `AbortSignal.any` Node 20+ va barcha zamonaviy brauzerlarda mavjud.
 */
function withTimeout(signal: AbortSignal | undefined, timeout: number): {
  signal: AbortSignal | undefined;
  cleanup: () => void;
} {
  if (!timeout) return { signal, cleanup: () => {} };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException("Timeout", "AbortError")), timeout);
  const cleanup = () => clearTimeout(timer);

  if (!signal) return { signal: ctrl.signal, cleanup };
  return { signal: AbortSignal.any([signal, ctrl.signal]), cleanup };
}

/**
 * Bitta JSON so'rov. Muvaffaqiyatsizlikda HAR DOIM `ApiError` uloqtiradi,
 * shuning uchun chaqiruvchi tomonda `res.ok` tekshirish takrorlanmaydi.
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeout = DEFAULT_TIMEOUT } = options;
  const { signal, cleanup } = withTimeout(options.signal, timeout);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    cleanup();
    if (ApiError.isAbort(e)) throw e; // bekor qilish — React Query o'zi hal qiladi
    throw new ApiError("Tarmoq xatosi — serverga ulanib bo'lmadi", 0, e);
  }
  cleanup();

  // API route'larimiz doim JSON qaytaradi, lekin proxy/gateway HTML qaytarishi mumkin.
  let data: unknown;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(
      res.ok ? "Serverdan noto'g'ri javob keldi" : `Server xatosi (${res.status})`,
      res.status,
      text.slice(0, 200),
    );
  }

  const errorMessage = extractError(data);
  if (!res.ok || errorMessage) {
    throw new ApiError(errorMessage ?? `So'rov bajarilmadi (${res.status})`, res.status, data);
  }

  return data as T;
}

/** Backend `{ error: "..." }` ko'rinishida ham xato qaytaradi (HTTP 200 bilan). */
function extractError(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === "string" && err) return err;
  }
  return null;
}

/** Foydalanuvchiga ko'rsatish uchun xato matni. */
export function toErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Noma'lum xato";
}
