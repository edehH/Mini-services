import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070d19] text-white flex flex-col items-center justify-center p-6 text-right dir-rtl font-sans" dir="rtl">
          <div className="w-full max-w-md bg-[#0f172a] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4 shadow-inner">
              <AlertOctagon size={32} />
            </div>
            
            <h1 className="text-xl font-black text-white mb-2">تأمين التطبيق من الأخطاء</h1>
            <p className="text-xs text-white/70 leading-relaxed mb-6">
              حدث خطأ غير متوقع أثناء تشغيل التطبيق. لقد أعدنا تشغيل أداة الحماية لضمان استقرار واجهة التطبيق.
            </p>

            {this.state.error && (
              <div className="w-full bg-red-950/40 border border-red-500/30 text-red-200 text-[11px] font-mono p-3 rounded-xl mb-6 text-left dir-ltr overflow-x-auto max-h-32">
                {this.state.error.message || 'Unknown runtime exception'}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-blue-950 font-black text-sm rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              <span>إعادة تحميل التطبيق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
