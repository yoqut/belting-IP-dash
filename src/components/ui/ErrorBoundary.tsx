"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  /** Standart fallback o'rniga o'z UI'ingiz. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Render paytidagi xatolarni ushlaydi va butun sahifa oq ekranga aylanishini
 * oldini oladi. React'da error boundary faqat class komponent bo'la oladi.
 *
 * Diqqat: bu tarmoq xatolarini USHLAMAYDI — ular React Query'ning `error`
 * holatida qaytadi va `ErrorAlert` orqali ko'rsatiladi.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-slate-950">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-slate-100">Kutilmagan xato yuz berdi</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 break-words">{error.message}</p>
          </div>
          <button
            onClick={this.reset}
            className="w-full py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }
}
