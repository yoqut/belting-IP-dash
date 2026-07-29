"use client";

import { useEffect, useState } from "react";

/**
 * Qiymatni kechiktirib qaytaradi.
 *
 * Qidiruv inputiga har harf yozilganda minglab yozuvli massivni qayta
 * filterlash/hisoblash zanjiri ishga tushardi. Endi og'ir hisob-kitob
 * faqat foydalanuvchi yozishni to'xtatgandan keyin bajariladi, input esa
 * darhol javob beradi (controlled bo'lib qoladi).
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
