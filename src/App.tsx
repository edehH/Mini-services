import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Lock, 
  ArrowRight, 
  UserPlus, 
  Trash2, 
  X,
  Delete,
  User,
  ScanEye,
  Ban,
  Plus,
  Fingerprint,
  Wallet,
  Navigation,
  ChevronLeft,
  Edit3,
  Check,
  Coins,
  CreditCard,
  Bell,
  Sparkles,
  Smile,
  AlertTriangle,
  AlertOctagon,
  Settings,
  Camera,
  Upload,
  RotateCcw,
  ShieldAlert,
  Clock,
  ShieldCheck,
  MessageSquareX,
  Award,
  Filter,
  KeyRound
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Rider, Trip, ArchiveRecord, WorkDay, AppState, Expense, DriverWarning, DriverClassification } from './types';
import { 
  COMMISSION_RATE, 
  DEBT_LIMIT, 
  VAULT_PIN, 
  MASTER_DEV_PHONE,
  EXEMPT_GREETINGS,
  TROLLING_GREETINGS
} from './constants';
import deliveryBg from './assets/images/delivery_background_1784115585299.jpg';
import logoImg from './assets/images/mini_services_logo_1784115600569.jpg';

const extractBase64 = (dataUrl: string) => {
  const defaultMime = 'image/jpeg';
  if (!dataUrl || typeof dataUrl !== 'string') return { mimeType: defaultMime, data: '' };
  if (dataUrl.includes(';base64,')) {
    const parts = dataUrl.split(';base64,');
    const mime = parts[0].split(':')[1] || defaultMime;
    const cleanData = parts[1].trim().replace(/[\n\r\s]/g, '');
    return { mimeType: mime, data: cleanData };
  }
  return { mimeType: defaultMime, data: dataUrl.split(',').pop()?.trim().replace(/[\n\r\s]/g, '') || '' };
};

const ClassificationBadge: React.FC<{ classification?: DriverClassification; isBanned?: boolean }> = ({ classification, isBanned }) => {
  if (isBanned) {
    return (
      <span className="inline-flex items-center gap-1 bg-red-100 text-red-950 border border-red-300 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm" style={{ color: '#450a0a', backgroundColor: '#fee2e2' }}>
        <AlertOctagon size={12} className="text-red-700" style={{ color: '#b91c1c' }} /> موقوف مؤقتاً
      </span>
    );
  }
  
  switch (classification) {
    case 'ممتاز':
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full" style={{ color: '#064e3b', backgroundColor: '#d1fae5' }}>
          🌟 ممتاز
        </span>
      );
    case 'جيد جداً':
      return (
        <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-950 border border-sky-300 text-[11px] font-black px-2.5 py-0.5 rounded-full" style={{ color: '#0c4a6e', backgroundColor: '#e0f2fe' }}>
          👍 جيد جداً
        </span>
      );
    case 'تحت الملاحظة':
      return (
        <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-950 border border-amber-400 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm" style={{ color: '#451a03', backgroundColor: '#fde68a' }}>
          ⚠️ تحت الملاحظة
        </span>
      );
    case 'مخالف':
      return (
        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-950 border border-rose-300 text-[11px] font-black px-2.5 py-0.5 rounded-full" style={{ color: '#4c0519', backgroundColor: '#ffe4e6' }}>
          🚫 مخالف
        </span>
      );
    case 'موقوف مؤقتاً':
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-950 border border-red-300 text-[11px] font-black px-2.5 py-0.5 rounded-full" style={{ color: '#450a0a', backgroundColor: '#fee2e2' }}>
          🔴 موقوف مؤقتاً
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] font-black px-2.5 py-0.5 rounded-full" style={{ color: '#064e3b', backgroundColor: '#d1fae5' }}>
          🟢 جيد
        </span>
      );
  }
};

const CurrencyDisplay: React.FC<{ value: number | string, isOwner?: boolean, className?: string }> = ({ value, isOwner = false, className = "" }) => {
  let val = Number(value);
  // Strictly enforce exact accurate decimals for Dah (22261016)
  const formattedValue = isOwner ? val.toFixed(2) : Math.floor(val).toString();
  return (
    <span className={`font-bold ${className}`}>
      {formattedValue}
      <span className="text-[0.6em] mr-1 opacity-70">أوقية</span>
    </span>
  );
};

const DEFAULT_INITIAL_RIDERS: Rider[] = [];

const App: React.FC = () => {
  const [view, setView] = useState<AppState>(AppState.SPLASH);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [archive, setArchive] = useState<ArchiveRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddRider, setShowAddRider] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeGreeting, setActiveGreeting] = useState('');
  const autoScanTimerRef = useRef<number | null>(null);

  // Rider photo & camera state for add driver feature
  const [riderPhoto, setRiderPhoto] = useState<string | null>(null);
  const [isRiderCameraActive, setIsRiderCameraActive] = useState(false);
  const addRiderVideoRef = useRef<HTMLVideoElement>(null);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');

  // Invoice sharing and option modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceText, setInvoiceText] = useState('');
  const [invoiceRider, setInvoiceRider] = useState<Rider | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Billing and charging states
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingRider, setBillingRider] = useState<Rider | null>(null);
  const [chargeAmount, setChargeAmount] = useState('');
  const [billingSuccess, setBillingSuccess] = useState(false);

  // Trip editing states
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editOrigin, setEditOrigin] = useState('');
  const [editDest, setEditDest] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const [showNotifications, setShowNotifications] = useState(false);

  // Warning, Suspension & Driver Classification states
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningTargetRider, setWarningTargetRider] = useState<Rider | null>(null);
  const [warningType, setWarningType] = useState<'suspension' | 'warning' | 'note' | 'delete'>('suspension');
  const [warningDurationHours, setWarningDurationHours] = useState<number>(24);
  const [customHoursInput, setCustomHoursInput] = useState<string>('24');
  const [warningReasonText, setWarningReasonText] = useState<string>('');
  const [targetClassification, setTargetClassification] = useState<DriverClassification>('موقوف مؤقتاً');

  // Security PIN protection for warning/suspension/classification
  const SECURITY_PIN = '5672';
  const [showSecurityPinModal, setShowSecurityPinModal] = useState(false);
  const [securityPinInput, setSecurityPinInput] = useState('');
  const [securityPinError, setSecurityPinError] = useState('');
  const [pendingProtectedAction, setPendingProtectedAction] = useState<(() => void) | null>(null);

  const requestSecurityPin = (action: () => void) => {
    setSecurityPinInput('');
    setSecurityPinError('');
    setPendingProtectedAction(() => action);
    setShowSecurityPinModal(true);
  };

  const handleVerifySecurityPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (securityPinInput === SECURITY_PIN) {
      setShowSecurityPinModal(false);
      const action = pendingProtectedAction;
      setPendingProtectedAction(null);
      setSecurityPinInput('');
      setSecurityPinError('');
      if (action) {
        action();
      }
    } else {
      setSecurityPinError('رمز الأمان غير صحيح! يرجى المحاولة مرة أخرى.');
    }
  };

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Classification filter on dashboard
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');

  const [showBgSettings, setShowBgSettings] = useState(false);
  const [customBgImage, setCustomBgImage] = useState<string | null>(() => {
    return localStorage.getItem('custom_bg_image') || null;
  });
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomBgImage(result);
        localStorage.setItem('custom_bg_image', result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetBgImage = () => {
    setCustomBgImage(null);
    localStorage.removeItem('custom_bg_image');
    if (bgFileInputRef.current) {
      bgFileInputRef.current.value = '';
    }
  };

  const activeBg = customBgImage || deliveryBg;

  const [bgFit, setBgFit] = useState<'stretch' | 'contain' | 'cover'>(() => {
    return (localStorage.getItem('bg_fit') as any) || 'stretch';
  });
  const [bgPadding, setBgPadding] = useState<number>(() => {
    return Number(localStorage.getItem('bg_padding') || '0');
  });
  const [bgBorderRadius, setBgBorderRadius] = useState<number>(() => {
    return Number(localStorage.getItem('bg_border_radius') || '0');
  });
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    return Number(localStorage.getItem('bg_opacity') || '100');
  });
  const [overlayOpacity, setOverlayOpacity] = useState<number>(() => {
    return Number(localStorage.getItem('bg_overlay_opacity') || '75');
  });

  useEffect(() => {
    localStorage.setItem('bg_fit', bgFit);
    localStorage.setItem('bg_padding', String(bgPadding));
    localStorage.setItem('bg_border_radius', String(bgBorderRadius));
    localStorage.setItem('bg_opacity', String(bgOpacity));
    localStorage.setItem('bg_overlay_opacity', String(overlayOpacity));
  }, [bgFit, bgPadding, bgBorderRadius, bgOpacity, overlayOpacity]);

  const getRiderStatus = (rider: Rider) => {
    const now = Date.now();
    const isBanned = !!(rider.banUntil && rider.banUntil > now);
    let timeLeftText = '';
    
    if (isBanned && rider.banUntil) {
      const diffMs = rider.banUntil - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours >= 24) {
        const days = Math.floor(diffHours / 24);
        const remHours = diffHours % 24;
        timeLeftText = `${days} يوم و ${remHours} ساعة`;
      } else if (diffHours > 0) {
        timeLeftText = `${diffHours} ساعة و ${diffMins} دقيقة`;
      } else {
        timeLeftText = `${diffMins} دقيقة`;
      }
    }

    let classification: DriverClassification = rider.classification || 'جيد';
    if (isBanned) {
      classification = 'موقوف مؤقتاً';
    } else if (rider.banUntil && rider.banUntil <= now && rider.classification === 'موقوف مؤقتاً') {
      classification = 'جيد'; // Automatic return upon expiration!
    }

    const activeWarning = (rider.warnings || []).find(w => w.type === 'suspension' && w.expiresAt && w.expiresAt > now);

    return {
      isBanned,
      timeLeftText,
      classification,
      activeWarning,
      banExpiresAtFormatted: rider.banUntil ? new Date(rider.banUntil).toLocaleString('ar-MR', { dateStyle: 'short', timeStyle: 'short' }) : null
    };
  };

  const touchRiderActivity = (riderId: string) => {
    const now = Date.now();
    setRiders(prev => (prev || []).map(r => r.id === riderId ? { ...r, lastActivityAt: now } : r));
  };

  const getRiderLastActivity = (r: Rider): number => {
    let latest = r.lastActivityAt || 0;
    if (r.currentTrips && r.currentTrips.length > 0) {
      for (const trip of r.currentTrips) {
        if (trip.timestamp && trip.timestamp > latest) {
          latest = trip.timestamp;
        }
      }
    }
    if (r.warnings && r.warnings.length > 0) {
      for (const w of r.warnings) {
        if (w.createdAt && w.createdAt > latest) {
          latest = w.createdAt;
        }
      }
    }
    return latest;
  };

  const handleApplyWarningOrSuspension = () => {
    if (!warningTargetRider) return;

    if (warningType === 'delete') {
      setConfirmConfig({
        title: 'تأكيد حذف السائق نهائياً',
        message: `⚠️ تحذير شديد الخطورة:\n\nهل أنت متأكد تماماً من حذف الكابتن (${warningTargetRider.name}) برقم الهاتف (${warningTargetRider.phone}) نهائياً من النظام ومسح كافة سجلاته ورحلاته؟\n\n• لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.`,
        confirmText: 'نعم، حذف السائق نهائياً',
        cancelText: 'إلغاء التراجع',
        isDanger: true,
        onConfirm: () => {
          setRiders(prev => (prev || []).filter(r => r.id !== warningTargetRider.id));
          setShowConfirmModal(false);
          setShowWarningModal(false);
          if (selectedRiderId === warningTargetRider.id) {
            setSelectedRiderId(null);
            setView(AppState.DASHBOARD);
          }
        }
      });
      setShowConfirmModal(true);
      return;
    }

    if (!warningReasonText.trim()) {
      alert("يرجى كتابة سبب التنبيه أو التعليق الموجه للسائق.");
      return;
    }

    const duration = warningType === 'suspension' ? Number(customHoursInput) || warningDurationHours : 0;
    const expiresAt = warningType === 'suspension' ? Date.now() + (duration * 3600 * 1000) : undefined;
    const expiryFormatted = expiresAt ? new Date(expiresAt).toLocaleString('ar-MR', { dateStyle: 'medium', timeStyle: 'short' }) : '';

    let actionTitle = '';
    let confirmMsg = '';

    if (warningType === 'suspension') {
      actionTitle = 'تأكيد فرض تعليق وحظر مؤقت';
      confirmMsg = `تأكيد الإجراء الإداري:\n\nهل أنت متأكد من فرض تعليق وحظر مؤقت على الكابتن (${warningTargetRider.name}) لمدة [${duration} ساعة]؟\n\n• السبب: "${warningReasonText.trim()}"\n• تاريخ الانتهاء التلقائي: ${expiryFormatted}\n\nتنبيه للنظام: قبل انتهاء هذه المدة لن يستطيع الكابتن استقبال رحلات جديدة أو الرسائل، وستتم إعادة تفعيل حسابه تلقائياً وبشكل طبيعي فور انتهاء الوقت.`;
    } else if (warningType === 'warning') {
      actionTitle = 'تأكيد إصدار تنبيه رسمي';
      confirmMsg = `هل أنت متأكد من توجيه تنبيه رسمي للكابتن (${warningTargetRider.name}) مع تعديل تصنيفه إلى [${targetClassification}]؟\n\n• نص التنبيه: "${warningReasonText.trim()}"`;
    } else {
      actionTitle = 'تأكيد تسجيل ملاحظة إدارية';
      confirmMsg = `هل أنت متأكد من تسجيل الملاحظة الإدارية للكابتن (${warningTargetRider.name})؟\n\n• الملاحظة: "${warningReasonText.trim()}"`;
    }

    setConfirmConfig({
      title: actionTitle,
      message: confirmMsg,
      confirmText: 'نعم، أؤكد وأطبق الإجراء',
      cancelText: 'تراجع وإلغاء',
      isDanger: warningType === 'suspension',
      onConfirm: () => {
        const newWarning: DriverWarning = {
          id: crypto.randomUUID(),
          type: warningType,
          text: warningReasonText.trim(),
          durationHours: duration,
          createdAt: Date.now(),
          expiresAt: expiresAt,
          active: true,
          createdBy: 'الإدارة'
        };

        setRiders(prev => prev.map(r => {
          if (r.id === warningTargetRider.id) {
            return {
              ...r,
              lastActivityAt: Date.now(),
              warnings: [newWarning, ...(r.warnings || [])],
              banUntil: warningType === 'suspension' ? expiresAt : r.banUntil,
              classification: warningType === 'suspension' ? 'موقوف مؤقتاً' : targetClassification
            };
          }
          return r;
        }));

        setShowConfirmModal(false);
        setShowWarningModal(false);
        setWarningReasonText('');
      }
    });

    setShowConfirmModal(true);
  };

  const handleUnbanRider = (rider: Rider) => {
    setConfirmConfig({
      title: 'تأكيد إلغاء الحظر وتفعيل الكابتن',
      message: `هل أنت متأكد من إلغاء التعليق/الحظر المطبق على الكابتن (${rider.name}) واستعادة حسابه بنشاط كامل فوراً؟`,
      confirmText: 'نعم، فك الحظر الآن',
      cancelText: 'إلغاء',
      isDanger: false,
      onConfirm: () => {
        setRiders(prev => prev.map(r => {
          if (r.id === rider.id) {
            return {
              ...r,
              lastActivityAt: Date.now(),
              banUntil: undefined,
              classification: 'جيد'
            };
          }
          return r;
        }));
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const balanceNotifications = useMemo(() => {
    const list: any[] = [];
    (riders || []).forEach(rider => {
      const currentCommission = (rider.currentTrips || []).reduce((sum, t) => sum + ((t.grossPrice || 0) * COMMISSION_RATE), 0);
      const prepaidBalance = rider.prepaidBalance || 0;
      const netBalance = prepaidBalance - currentCommission;

      if (netBalance < 50) {
        if (netBalance >= 0) {
          list.push({
            id: `warning-${rider.id}`,
            riderId: rider.id,
            riderName: rider.name,
            balance: netBalance,
            type: 'warning',
            title: 'تنبيه لطيف: اقتراب رصيد الحساب من الصفر',
            mood: 'ودود ولطيف 🌸',
            message: `أهلاً كابتن ${rider.name} العزيز! نود تذكيرك بلطف بأن رصيدك الحالي هو (${Math.floor(netBalance)} أوقية) ويقترب من الصفر 🚗. نرجو منك التكرم بشحن رصيدك في أقرب فرصة لتستمر رحلاتك بكل سهولة وتوفيق. نتمنى لك يوماً سعيداً ومليئاً بالرزق! ✨`,
            colorClass: 'from-amber-500/10 to-amber-600/5 border-amber-500/30 text-amber-200',
            iconClass: 'text-amber-400 bg-amber-400/10',
            buttonColor: 'bg-amber-500 hover:bg-amber-600'
          });
        } else if (netBalance < 0 && netBalance > -DEBT_LIMIT) {
          list.push({
            id: `danger-${rider.id}`,
            riderId: rider.id,
            riderName: rider.name,
            balance: netBalance,
            type: 'danger',
            title: 'تنبيه جاد: حساب مالي بالسالب',
            mood: 'جاد ومنبّه ⚠️',
            message: `تنبيه مالي هام كابتن ${rider.name}: رصيد حسابك الحالي أصبح بالسالب وقيمته (${Math.floor(netBalance)} أوقية) ⚠️. يرجى المبادرة بتسوية المديونية وشحن الرصيد في أقرب وقت لضمان استمرار عمل الحساب واستقبال الطلبات دون عوائق. شكراً لتفهمك وتعاونك الدائم معنا.`,
            colorClass: 'from-orange-500/10 to-orange-600/5 border-orange-500/30 text-orange-200',
            iconClass: 'text-orange-400 bg-orange-400/10',
            buttonColor: 'bg-orange-500 hover:bg-orange-600'
          });
        } else if (netBalance <= -DEBT_LIMIT) {
          list.push({
            id: `critical-${rider.id}`,
            riderId: rider.id,
            riderName: rider.name,
            balance: netBalance,
            type: 'critical',
            title: 'تحذير عاجل: مديونية حرجة جداً',
            mood: 'حازم وتحذيري عاجل 🚨',
            message: `🚨 تحذير مالي عاجل كابتن ${rider.name}: لقد تجاوزت الحد الأقصى للمديونية المسموح بها بكثير، ورصيدك الحالي هو (${Math.floor(netBalance)} أوقية)! حسابك الآن مهدد بالإيقاف الفوري والمؤقت. يجب عليك سداد المديونية وشحن الحساب فوراً لتفادي حظر الحساب واستئناف العمل.`,
            colorClass: 'from-rose-500/15 to-rose-600/5 border-rose-500/30 text-rose-200 animate-pulse',
            iconClass: 'text-rose-400 bg-rose-400/10',
            buttonColor: 'bg-rose-500 hover:bg-rose-600'
          });
        }
      }
    });
    return list;
  }, [riders]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const savedRiders = localStorage.getItem('tawsila_riders');
      const savedArchive = localStorage.getItem('tawsila_archive');
      const savedExpenses = localStorage.getItem('tawsila_expenses');
      if (savedRiders) {
        const parsed = JSON.parse(savedRiders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRiders(parsed);
        } else {
          setRiders(DEFAULT_INITIAL_RIDERS);
        }
      } else {
        setRiders(DEFAULT_INITIAL_RIDERS);
      }
      if (savedArchive) setArchive(JSON.parse(savedArchive));
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
    } catch (e) { 
      console.error("Data load failed", e); 
      setRiders(DEFAULT_INITIAL_RIDERS);
    }

    try {
      NativeBiometric.isAvailable().then((result) => {
        if (result?.isAvailable) setBiometricsAvailable(true);
      }).catch(() => setBiometricsAvailable(false));
    } catch {
      setBiometricsAvailable(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tawsila_riders', JSON.stringify(riders));
    localStorage.setItem('tawsila_archive', JSON.stringify(archive));
    localStorage.setItem('tawsila_expenses', JSON.stringify(expenses));
  }, [riders, archive, expenses]);

  const isProtectedRider = (r?: Rider | null | { name: string; phone?: string }) => {
    if (!r) return false;
    const phoneClean = r.phone?.replace(/\s/g, '') || '';
    return phoneClean.includes(MASTER_DEV_PHONE) || r.name === "الديه";
  };

  const filteredRiders = useMemo(() => {
    const list = (riders || []).filter(r => !r.isSuspended).filter(r => {
      const status = getRiderStatus(r);
      if (classificationFilter !== 'ALL') {
        if (classificationFilter === 'موقوف مؤقتاً') {
          if (!status.isBanned) return false;
        } else {
          if (status.classification !== classificationFilter) return false;
        }
      }
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        r.name.toLowerCase().includes(query) || 
        r.phone.includes(query)
      );
    });

    // Sort by most recent activity timestamp (WhatsApp style)
    return [...list].sort((a, b) => getRiderLastActivity(b) - getRiderLastActivity(a));
  }, [riders, searchQuery, classificationFilter]);

  const totalCommissions = useMemo(() => {
    return (archive || []).reduce((acc, riderRecord) => {
      const daySum = (riderRecord.workDays || []).reduce((sum, day) => sum + (day.totalCommission || 0), 0);
      return acc + daySum;
    }, 0);
  }, [archive]);

  const totalExpenses = useMemo(() => (expenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0), [expenses]);
  const netAvailableProfit = totalCommissions - totalExpenses;

  const selectedRider = (riders || []).find(r => r.id === selectedRiderId);
  const isOwner = isProtectedRider(selectedRider);

  const startScanner = async () => {
    setView(AppState.SCANNER);
    setIsIdentifying(false);
    setIsSuccess(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
      autoScanTimerRef.current = window.setInterval(performFaceRecognition, 4000);
    } catch (err) { 
      setView(AppState.DASHBOARD);
    }
  };

  const stopScanner = () => {
    if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setView(AppState.DASHBOARD);
  };

  const startRiderCamera = async () => {
    setIsRiderCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }
      });
      setTimeout(() => {
        if (addRiderVideoRef.current) {
          addRiderVideoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.error("Failed to start rider camera", err);
      setIsRiderCameraActive(false);
      alert("تعذر تشغيل الكاميرا. يرجى التحقق من صلاحيات الكاميرا أو استخدام خيار رفع الصورة.");
    }
  };

  const stopRiderCamera = () => {
    if (addRiderVideoRef.current?.srcObject) {
      (addRiderVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      addRiderVideoRef.current.srcObject = null;
    }
    setIsRiderCameraActive(false);
  };

  const captureRiderPhoto = () => {
    if (!addRiderVideoRef.current) return;
    const video = addRiderVideoRef.current;
    
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth, video.videoHeight) || 400;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
      const base64Img = canvas.toDataURL('image/jpeg', 0.85);
      setRiderPhoto(base64Img);
    }
    stopRiderCamera();
  };

  const performFaceRecognition = async () => {
    if (isIdentifying || isSuccess || !videoRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || videoRef.current.videoWidth === 0) return;
    canvas.width = 512;
    canvas.height = (videoRef.current.videoHeight / videoRef.current.videoWidth) * 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const liveFrameData = canvas.toDataURL('image/jpeg', 0.6);
    const { mimeType: liveMime, data: liveBase64 } = extractBase64(liveFrameData);
    if (!liveBase64) return;
    const ridersWithPhotos = (riders || []).filter(r => r.photo);
    if (ridersWithPhotos.length === 0) return;
    setIsIdentifying(true);
    try {
      const apiKey = process.env?.API_KEY || (import.meta as any)?.env?.VITE_GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      const parts: any[] = [];
      ridersWithPhotos.forEach(r => {
        const { mimeType: rMime, data: rBase64 } = extractBase64(r.photo!);
        if (rBase64) {
          parts.push({ inlineData: { data: rBase64, mimeType: rMime } });
          parts.push({ text: `ID: ${r.id}` });
        }
      });
      parts.push({ inlineData: { data: liveBase64, mimeType: liveMime } });
      parts.push({ text: `Identify ID or 'NONE'.` });
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: { parts } 
      });
      const responseText = (response.text || '').trim();
      const match = (riders || []).find(r => responseText.includes(r.id));
      if (match) {
        const matrix = isProtectedRider(match) ? EXEMPT_GREETINGS : TROLLING_GREETINGS;
        setActiveGreeting(matrix[Math.floor(Math.random() * matrix.length)].replace("[Name]", match.name));
        setIsSuccess(true);
        setSelectedRiderId(match.id);
        setTimeout(() => { stopScanner(); setView(AppState.RIDER_DETAILS); }, 2500);
      }
    } catch (e) { console.error(e); } finally { setIsIdentifying(false); }
  };

  const handleBiometricUnlock = async () => {
    try {
      if (biometricsAvailable) {
        await NativeBiometric.verifyIdentity({
          reason: "استخدم البصمة لفتح الخزينة",
          title: "تأكيد الهوية",
          subtitle: "خزينة الشركة",
          description: "يرجى لمس حساس البصمة للمتابعة"
        });
        setView(AppState.VAULT_PORTAL);
      } else {
        setView(AppState.VAULT_LOCK);
      }
    } catch (e) { setView(AppState.VAULT_LOCK); }
  };

  const openInvoiceModal = (rider: Rider) => {
    const trips = (rider.currentTrips || []);
    const totalGross = trips.reduce((s, t) => s + (t.grossPrice || 0), 0);
    const totalComm = totalGross * COMMISSION_RATE;
    const isOwnerAcc = isProtectedRider(rider);
    const prepaid = rider.prepaidBalance || 0;
    const remaining = prepaid - totalComm;
    
    let table = `*🧾 كشف الحساب المالي للكابتن:* ${rider.name}\n`;
    table += `📅 *التاريخ:* ${new Date().toLocaleDateString('ar-MR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    table += `---------------------------\n`;
    table += `📍 *الرحلات المسجلة في هذه الفترة:* \n`;
    if (trips.length === 0) {
      table += `لا توجد رحلات مسجلة حالياً.\n`;
    } else {
      trips.forEach((t, index) => {
        const c = (t.grossPrice || 0) * COMMISSION_RATE;
        table += `${index + 1}. من *${t.origin}* إلى *${t.destination}*\n`;
        table += `   💵 السعر: ${t.grossPrice} أوقية | عمولة الشركة (15%): ${isOwnerAcc ? c.toFixed(2) : Math.floor(c)} أوقية\n`;
      });
    }
    table += `---------------------------\n`;
    table += `💰 *إجمالي قيمة العمل:* ${totalGross} أوقية\n`;
    table += `---------------------------\n`;
    table += `📊 *تفاصيل حركة الحساب المالي:* \n`;
    table += `📥 *الرصيد المشحون مسبقاً:* ${isOwnerAcc ? prepaid.toFixed(2) : Math.floor(prepaid)} أوقية\n`;
    table += `💸 *إجمالي عمولة الرحلات المخصومة:* ${isOwnerAcc ? totalComm.toFixed(2) : Math.floor(totalComm)} أوقية\n`;
    table += `---------------------------\n`;
    if (remaining >= 0) {
      table += `✅ *الرصيد المتبقي في حسابكم:* ${isOwnerAcc ? remaining.toFixed(2) : Math.floor(remaining)} أوقية\n`;
      table += `حسابكم مغطى بالكامل، شكراً لكم! 👍✨\n`;
    } else {
      table += `⚠️ *الرصيد غير كافٍ. المديونية المتبقية:* ${isOwnerAcc ? Math.abs(remaining).toFixed(2) : Math.floor(Math.abs(remaining))} أوقية\n`;
      table += `يرجى شحن الحساب لتغطية المديونية المتبقية.\n`;
    }
    table += `---------------------------\n`;
    table += `نشكركم على تعاونكم الدائم ونتمنى لكم رحلات موفقة! 🚗✨`;
    
    setInvoiceText(table);
    setInvoiceRider(rider);
    setShowInvoiceModal(true);
    setCopySuccess(false);
  };

  const handleSettleAndArchive = (rider: Rider) => {
    const trips = (rider.currentTrips || []);
    if (trips.length === 0) return;
    const totalGross = trips.reduce((s, t) => s + (t.grossPrice || 0), 0);
    const totalComm = totalGross * COMMISSION_RATE;
    
    const newWorkDay: WorkDay = {
      id: crypto.randomUUID(),
      date: new Date().toLocaleDateString('ar-MR'),
      trips: [...trips],
      totalGross: totalGross,
      totalCommission: totalComm,
      settledAt: Date.now()
    };

    setArchive(prev => {
      const existingRecordIndex = (prev || []).findIndex(a => a.riderId === rider.id);
      if (existingRecordIndex > -1) {
        const updated = [...prev];
        updated[existingRecordIndex] = {
          ...updated[existingRecordIndex],
          workDays: [...(updated[existingRecordIndex].workDays || []), newWorkDay]
        };
        return updated;
      } else {
        return [
          ...(prev || []),
          {
            riderId: rider.id,
            riderName: rider.name,
            workDays: [newWorkDay]
          }
        ];
      }
    });

    setRiders(prev => (prev || []).map(r => r.id === rider.id ? { 
      ...r, 
      lastActivityAt: Date.now(),
      prepaidBalance: Math.max(0, (r.prepaidBalance || 0) - totalComm),
      currentTrips: [] 
    } : r));
    setShowInvoiceModal(false);
    setView(AppState.DASHBOARD);
  };

  // Views Implementation
  const SplashView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8 view-transition relative z-10">
      <div className="bg-slate-950/60 backdrop-blur-md p-8 sm:p-10 rounded-[3rem] border border-white/20 shadow-2xl flex flex-col items-center max-w-sm w-full mx-auto">
        <div className="w-44 h-44 sm:w-52 sm:h-52 bg-white/10 rounded-[3.5rem] border border-white/25 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-md overflow-hidden p-3 animate-pulse">
           <div className="w-full h-full bg-white/95 rounded-[2.8rem] flex items-center justify-center shadow-inner overflow-hidden relative">
              <img 
                src={logoImg} 
                alt="Mini Services Logo" 
                className="w-full h-full object-cover z-10 relative" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 flex items-center justify-center bg-blue-900/10 text-blue-950 font-black text-6xl" style={{ color: '#1e3a8a' }}>
                M
              </div>
           </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-8 tracking-wide drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] text-center">ميني سرفيس</h1>
        
        <button 
          onClick={() => setView(AppState.DASHBOARD)}
          className="w-full py-4 px-6 bg-white rounded-full font-black text-xl shadow-[0_15px_35px_rgba(0,0,0,0.4)] hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-white/80 cursor-pointer"
          style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
        >
          <Fingerprint size={28} className="stroke-[2.5]" style={{ color: '#0f172a' }} />
          <span className="font-black text-xl" style={{ color: '#0f172a' }}>دخول</span>
        </button>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="min-h-screen flex flex-col pb-24 safe-area-pt pt-6 view-transition">
      <div className="px-6 md:px-8 max-w-4xl mx-auto w-full">
        <header className="flex justify-between items-center mb-8">
          <div className="flex gap-3">
            <button 
              onClick={startScanner} 
              className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full border border-white/20 flex items-center justify-center active:scale-90 shadow-xl backdrop-blur-md transition-all" 
              title="التعرف بالوجه"
            >
              <ScanEye size={26} className="text-white" />
            </button>
            <button 
              onClick={() => setShowBgSettings(true)} 
              className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full border border-white/20 flex items-center justify-center active:scale-90 shadow-xl backdrop-blur-md transition-all" 
              title="إعدادات مظهر الخلفية"
            >
              <Settings size={24} className="text-white" />
            </button>
            <button 
              onClick={() => setShowNotifications(true)} 
              className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full border border-white/20 flex items-center justify-center active:scale-90 shadow-xl backdrop-blur-md relative transition-all" 
              title="مركز الإشعارات والمزاج المالي"
            >
              <Bell size={24} className="text-white" />
              {balanceNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center animate-bounce border-2 border-slate-900 shadow-md">
                  {balanceNotifications.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">ميني سرفيس</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80 drop-shadow-md">MINI-SERVICES</span>
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
            </div>
          </div>

          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900/60 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden border-2 border-white/40 p-1 backdrop-blur-md">
             <div className="w-full h-full bg-white/95 rounded-xl flex items-center justify-center shadow-inner overflow-hidden relative">
                <img 
                  src={logoImg} 
                  alt="Mini Services Logo" 
                  className="w-full h-full object-cover z-10 relative" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute inset-0 flex items-center justify-center bg-blue-900/10 text-blue-950 font-black text-xl">
                  M
                </div>
             </div>
          </div>
        </header>

        <div className="relative mb-5">
          <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500" size={22} />
          <input 
            type="text" 
            placeholder="ابحث عن اسم السائق أو الرقم.." 
            className="w-full rounded-full py-4 sm:py-5 pr-14 pl-6 text-slate-900 font-black placeholder:text-slate-500/80 outline-none bg-white/95 focus:bg-white transition-all shadow-2xl border border-white/40 text-right" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>

        {/* Classification Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none" dir="rtl">
          <span className="text-white font-black text-xs shrink-0 flex items-center gap-1 pl-1 drop-shadow-md">
            <Filter size={14} className="text-white" style={{ color: '#ffffff' }} /> التصنيف:
          </span>
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'ممتاز', label: '🌟 ممتاز' },
            { id: 'جيد جداً', label: '👍 جيد جداً' },
            { id: 'جيد', label: '🟢 جيد' },
            { id: 'تحت الملاحظة', label: '⚠️ تحت الملاحظة' },
            { id: 'موقوف مؤقتاً', label: '🔴 موقوف مؤقتاً' },
            { id: 'مخالف', label: '🚫 مخالف' }
          ].map(tab => {
            const isActive = classificationFilter === tab.id;
            let activeStyle: React.CSSProperties = { color: '#020617', backgroundColor: '#ffffff' };
            let activeClass = 'bg-white text-slate-950 font-bold text-xs whitespace-nowrap shadow-lg scale-105 border border-white';
            
            if (isActive) {
              if (tab.id === 'تحت الملاحظة') {
                activeClass = 'bg-amber-400 text-slate-950 font-black text-xs whitespace-nowrap shadow-lg scale-105 border border-amber-300';
                activeStyle = { color: '#020617', backgroundColor: '#fbbf24' };
              } else if (tab.id === 'موقوف مؤقتاً') {
                activeClass = 'bg-rose-500 text-white font-black text-xs whitespace-nowrap shadow-lg scale-105 border border-rose-400';
                activeStyle = { color: '#ffffff', backgroundColor: '#f43f5e' };
              } else if (tab.id === 'مخالف') {
                activeClass = 'bg-red-600 text-white font-black text-xs whitespace-nowrap shadow-lg scale-105 border border-red-500';
                activeStyle = { color: '#ffffff', backgroundColor: '#dc2626' };
              } else if (tab.id === 'ممتاز') {
                activeClass = 'bg-emerald-400 text-slate-950 font-black text-xs whitespace-nowrap shadow-lg scale-105 border border-emerald-300';
                activeStyle = { color: '#020617', backgroundColor: '#34d399' };
              } else if (tab.id === 'جيد جداً') {
                activeClass = 'bg-sky-400 text-slate-950 font-black text-xs whitespace-nowrap shadow-lg scale-105 border border-sky-300';
                activeStyle = { color: '#020617', backgroundColor: '#38bdf8' };
              } else if (tab.id === 'جيد') {
                activeClass = 'bg-emerald-500 text-slate-950 font-black text-xs whitespace-nowrap shadow-lg scale-105 border border-emerald-400';
                activeStyle = { color: '#020617', backgroundColor: '#10b981' };
              }
            }

            return (
              <button
                key={tab.id}
                onClick={() => setClassificationFilter(tab.id)}
                style={isActive ? activeStyle : { color: '#ffffff', backgroundColor: 'rgba(15, 23, 42, 0.8)' }}
                className={`px-3.5 py-1.5 rounded-full shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? activeClass
                    : 'bg-slate-900/80 hover:bg-slate-900/95 text-white border border-white/20 backdrop-blur-md font-medium text-xs whitespace-nowrap shadow-md'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {filteredRiders.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-3xl border border-white/20 text-white/80 backdrop-blur-md shadow-xl">
              <p className="font-bold text-base">لا يوجد سائقون في هذه الفئة أو البحث.</p>
            </div>
          ) : (
            filteredRiders.map((rider) => {
              const currentCommission = (rider.currentTrips || []).reduce((sum, t) => sum + ((t.grossPrice || 0) * COMMISSION_RATE), 0);
              const prepaidBalance = rider.prepaidBalance || 0;
              const netBalance = prepaidBalance - currentCommission;
              const debt = netBalance < 0 ? Math.abs(netBalance) : 0;
              const isCritical = debt >= DEBT_LIMIT;
              const initials = rider.name.split(' ').map(n => n[0]).join('').slice(0, 2);
              const isOwnerAcc = isProtectedRider(rider);
              const status = getRiderStatus(rider);
              
              return (
                <div 
                  key={rider.id} 
                  onClick={() => { 
                    touchRiderActivity(rider.id); 
                    setSelectedRiderId(rider.id); 
                    setView(AppState.RIDER_DETAILS); 
                  }} 
                  className={`rider-card hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden ${
                    status.isBanned ? 'border-2 border-red-500/50 bg-red-950/20' : ''
                  }`}
                >
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          touchRiderActivity(rider.id);
                          setBillingRider(rider);
                          setShowBillingModal(true);
                        }} 
                        className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-full active:scale-90 transition-all shadow-sm flex items-center justify-center"
                        title="الفوترة والشحن"
                      >
                        <Coins size={20} />
                      </button>
                      
                      <div className="debt-inset">
                        <p className="text-[10px] font-black text-blue-900/40 mb-1 tracking-tight">
                          {netBalance >= 0 ? "الرصيد" : "المديونية"}
                        </p>
                        <p className={`text-2xl font-black leading-none ${netBalance >= 0 ? "text-emerald-600" : "text-blue-900"}`}>
                          <CurrencyDisplay value={Math.abs(netBalance)} isOwner={isOwnerAcc} />
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-4">
                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-2 mb-1">
                          <ClassificationBadge classification={status.classification} isBanned={status.isBanned} />
                          <h3 className="font-black text-2xl text-blue-900 tracking-tight">{rider.name}</h3>
                        </div>

                        {status.isBanned ? (
                          <div className="flex items-center gap-1 text-[11px] font-black text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full mt-1">
                            <Clock size={12} />
                            <span>متبقي تعليق: {status.timeLeftText}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 text-blue-900/40 font-bold text-xs">
                            <span>{rider.phone}</span>
                            <Navigation size={12} className="rotate-45" />
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-black border-4 border-white shadow-lg overflow-hidden ${
                          status.isBanned ? 'bg-red-600 text-white' : isCritical ? 'bg-orange-500 text-white' : 'bg-orange-400 text-white'
                        }`}>
                          {rider.photo ? <img src={rider.photo} className="w-full h-full object-cover" /> : initials}
                        </div>
                        {status.isBanned && (
                          <div className="absolute -bottom-1 -right-1 bg-red-600 text-white rounded-full p-1 border-2 border-white shadow-md">
                            <Ban size={12} />
                          </div>
                        )}
                      </div>
                    </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="fixed bottom-10 left-10 flex flex-col gap-4 z-50">
        <button 
          onClick={handleBiometricUnlock} 
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-2xl flex items-center justify-center border-2 border-slate-200 active:scale-90 transition-transform cursor-pointer"
          style={{ backgroundColor: '#ffffff' }}
          title="قفل Vault"
        >
          <Lock size={26} className="text-slate-900 stroke-[2.5]" style={{ color: '#0f172a' }} />
        </button>
        <button 
          onClick={() => {
            setNewRiderName('');
            setNewRiderPhone('');
            setRiderPhoto(null);
            setIsRiderCameraActive(false);
            setShowAddRider(true);
          }} 
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white shadow-2xl flex items-center justify-center border-2 border-slate-200 active:scale-90 transition-transform cursor-pointer"
          style={{ backgroundColor: '#ffffff' }}
          title="إضافة سائق جديد"
        >
          <UserPlus size={26} className="text-slate-900 stroke-[2.5]" style={{ color: '#0f172a' }} />
        </button>
      </div>
    </div>
  );

  const VaultPortalView = () => (
    <div className="min-h-screen flex flex-col pb-24 safe-area-pt pt-6 view-transition relative z-10">
       <div className="px-6 md:px-8 max-w-lg mx-auto w-full">
         <header className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-black text-white tracking-tighter">الخزينة</h2>
            <button onClick={() => setView(AppState.DASHBOARD)} className="w-14 h-14 bg-white/10 text-white rounded-full border border-white/20 flex items-center justify-center shadow-lg active:scale-90 backdrop-blur-md">
              <ArrowRight size={28} />
            </button>
         </header>

         <div className="bg-[#121826]/90 p-10 rounded-[3rem] mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4 text-white/40">
               <Wallet size={20} />
               <span className="text-xs font-bold uppercase tracking-widest">إجمالي الأرباح المتراكمة</span>
            </div>
            
            <div className="flex items-baseline gap-4 mb-10">
               <h3 className="text-6xl font-black text-white leading-none">
                  <CurrencyDisplay value={netAvailableProfit} isOwner={true} />
               </h3>
               <div className="w-3 h-3 bg-sky-400 rounded-sm mb-1 animate-pulse" />
            </div>

            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
               <div className="bg-sky-400 h-full w-[45%] rounded-full shadow-[0_0_20px_rgba(56,189,248,0.7)]" />
            </div>
         </div>
       </div>
    </div>
  );

  const RiderDetails = () => {
    if (!selectedRider) return null;
    const [origin, setOrigin] = useState('');
    const [dest, setDest] = useState('');
    const [price, setPrice] = useState('');
    const isOwnerAcc = isProtectedRider(selectedRider);
    const trips = (selectedRider.currentTrips || []);
    const rawTotalComm = trips.reduce((s, t) => s + ((t.grossPrice || 0) * COMMISSION_RATE), 0);
    const totalGross = trips.reduce((s, t) => s + (t.grossPrice || 0), 0);
    const status = getRiderStatus(selectedRider);
    
    return (
      <div className="min-h-screen flex flex-col pb-64 safe-area-pt pt-6 view-transition relative z-10">
        <div className="px-4 md:px-8 max-w-4xl mx-auto w-full">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={() => setView(AppState.DASHBOARD)} className="w-12 h-12 bg-white/10 text-white rounded-full border border-white/20 active:scale-90 flex items-center justify-center backdrop-blur-md">
              <ChevronLeft size={24} />
            </button>
            <div className="text-right flex-1 flex items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">{selectedRider.name}</h2>
              <ClassificationBadge classification={status.classification} isBanned={status.isBanned} />
            </div>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <button 
                onClick={() => {
                  requestSecurityPin(() => {
                    setWarningTargetRider(selectedRider);
                    setWarningReasonText('');
                    setWarningType('suspension');
                    setWarningDurationHours(24);
                    setCustomHoursInput('24');
                    setTargetClassification(selectedRider.classification || 'جيد');
                    setShowWarningModal(true);
                  });
                }} 
                className="px-3.5 sm:px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center gap-1.5 text-xs sm:text-sm"
                title="إصدار تنبيه، حظر مؤقت، أو تغيير التصنيف"
              >
                <ShieldAlert size={16} />
                <span>تنبيه وتصنيف</span>
              </button>
              <button 
                onClick={() => {
                  setBillingRider(selectedRider);
                  setShowBillingModal(true);
                }} 
                className="px-3.5 sm:px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center gap-1.5 text-xs sm:text-sm"
              >
                <Coins size={16} />
                <span>شحن الحساب</span>
              </button>
              <button 
                onClick={() => openInvoiceModal(selectedRider)} 
                className="px-3.5 sm:px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all text-xs sm:text-sm"
              >
                فاتورة
              </button>
            </div>
          </header>

          {/* Active Temporary Suspension Banner */}
          {status.isBanned && (
            <div className="bg-red-950/80 border-2 border-red-500/50 p-5 rounded-[2.5rem] mb-8 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-right" dir="rtl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 text-red-400 rounded-full border border-red-500/30 shrink-0">
                  <AlertOctagon size={28} />
                </div>
                <div>
                  <h4 className="font-black text-lg text-red-300">هذا الحساب موقوف / محظور مؤقتاً حالياً</h4>
                  <p className="text-xs text-red-200/80 font-bold mt-0.5">
                    متبقي على الانتهاء والعودة التلقائية: <span className="text-white underline">{status.timeLeftText}</span> ({status.banExpiresAtFormatted})
                  </p>
                  {status.activeWarning?.text && (
                    <p className="text-xs text-red-200/90 italic mt-1 bg-red-900/40 p-2 rounded-xl border border-red-500/20">
                      سبب التعليق: "{status.activeWarning.text}"
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => requestSecurityPin(() => handleUnbanRider(selectedRider))}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 whitespace-nowrap flex items-center gap-1.5 shrink-0"
              >
                <ShieldCheck size={16} />
                <span>فك الحظر وتفعيل الحساب الآن</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/95 p-5 rounded-[2rem] text-right shadow-xl">
               <p className="text-[10px] font-black text-blue-900/40 uppercase tracking-tighter">إجمالي العمل</p>
               <p className="text-2xl font-black text-blue-900"><CurrencyDisplay value={totalGross} isOwner={isOwnerAcc} /></p>
            </div>
            <div className="bg-white/10 p-5 rounded-[2rem] text-right shadow-xl border border-white/10 backdrop-blur-xl">
               <p className="text-[10px] font-black text-white/40 uppercase tracking-tighter">العمولة (15%)</p>
               <p className="text-2xl font-black text-sky-400"><CurrencyDisplay value={rawTotalComm} isOwner={isOwnerAcc} /></p>
            </div>
            <div className="bg-white/95 p-5 rounded-[2rem] text-right shadow-xl">
               <p className="text-[10px] font-black text-blue-900/40 uppercase tracking-tighter">الرصيد المشحون</p>
               <p className="text-2xl font-black text-emerald-600">
                 <CurrencyDisplay value={selectedRider.prepaidBalance || 0} isOwner={isOwnerAcc} />
               </p>
            </div>
            <div className="bg-white/10 p-5 rounded-[2rem] text-right shadow-xl border border-white/10 backdrop-blur-xl">
               <p className="text-[10px] font-black text-white/40 uppercase tracking-tighter">
                 {(selectedRider.prepaidBalance || 0) >= rawTotalComm ? "رصيد متبقي" : "المديونية الصافية"}
               </p>
               <p className={`text-2xl font-black ${ (selectedRider.prepaidBalance || 0) >= rawTotalComm ? "text-emerald-400" : "text-orange-400" }`}>
                 <CurrencyDisplay value={Math.abs((selectedRider.prepaidBalance || 0) - rawTotalComm)} isOwner={isOwnerAcc} />
               </p>
            </div>
          </div>

          {/* Form to Register Trip */}
          <div className="bg-white/10 border border-white/10 p-6 sm:p-8 rounded-[3rem] mb-10 shadow-2xl backdrop-blur-xl">
            <div className="space-y-5">
               {status.isBanned && (
                 <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 text-center text-red-200 text-xs font-bold flex items-center justify-center gap-2">
                   <AlertTriangle size={16} className="text-red-400" />
                   <span>تنبيه: الكابتن موقوف مؤقتاً ({status.timeLeftText}). لا يمكنه تلقي إشعارات حتى انتهاء المدة.</span>
                 </div>
               )}

               <div className="flex flex-col sm:flex-row gap-4">
                  {/* From input - Right side in RTL */}
                  <div className="flex-1 flex flex-col gap-1.5 text-right">
                     <label className="text-white/60 text-xs font-bold mr-1">من أين (نقطة الانطلاق):</label>
                     <input 
                        placeholder="من أين.." 
                        className="w-full rounded-2xl p-4 text-right font-bold text-blue-900 bg-white border-none outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-all" 
                        value={origin} 
                        onChange={(e) => setOrigin(e.target.value)} 
                     />
                  </div>
                  {/* To input - Left side in RTL */}
                  <div className="flex-1 flex flex-col gap-1.5 text-right">
                     <label className="text-white/60 text-xs font-bold mr-1">إلى أين (الوجهة):</label>
                     <input 
                        placeholder="إلى أين.." 
                        className="w-full rounded-2xl p-4 text-right font-bold text-blue-900 bg-white border-none outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-all" 
                        value={dest} 
                        onChange={(e) => setDest(e.target.value)} 
                     />
                  </div>
               </div>
               
               <div className="flex flex-col gap-1.5 text-right">
                  <label className="text-white/60 text-xs font-bold mr-1">المبلغ (بالأوقية):</label>
                  <input 
                     type="number" 
                     placeholder="المبلغ.." 
                     className="w-full rounded-2xl p-4 sm:p-6 text-right font-black text-2xl sm:text-4xl text-blue-900 bg-white border-none outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-all" 
                     value={price} 
                     onChange={(e) => setPrice(e.target.value)} 
                  />
               </div>

               <button onClick={() => { 
                 if(origin && dest && price) { 
                   const doAddTrip = () => {
                     const p = Number(price);
                     const commission = p * COMMISSION_RATE;
                     const now = Date.now();
                     setRiders(prev => (prev || []).map(r => r.id === selectedRider.id ? { 
                       ...r, 
                       lastActivityAt: now,
                       currentTrips: [...(r.currentTrips || []), { id: crypto.randomUUID(), origin, destination: dest, grossPrice: p, commission, timestamp: now }] 
                     } : r));
                     setOrigin(''); setDest(''); setPrice('');
                   };

                   if (status.isBanned) {
                     setConfirmConfig({
                       title: 'تأكيد إضافة رحلة لكابتن موقوف',
                       message: `تنبيه: الكابتن (${selectedRider.name}) موقوف مؤقتاً حالياً بموجب قرار إداري ينتهي خلال [${status.timeLeftText}].\n\nهل أنت متأكد من تسجيل هذه الرحلة له رغم التوقيف الحالي؟`,
                       confirmText: 'نعم، أضف الرحلة بقرار إداري',
                       cancelText: 'إلغاء',
                       isDanger: true,
                       onConfirm: () => {
                         doAddTrip();
                         setShowConfirmModal(false);
                       }
                     });
                     setShowConfirmModal(true);
                   } else {
                     doAddTrip();
                   }
                 }
               }} className="w-full py-4 sm:py-5 bg-white text-blue-900 rounded-full font-black text-xl shadow-2xl active:scale-95 transition-all border-b-4 border-blue-100">تسجيل الرحلة</button>
            </div>
          </div>

          {/* List of Registered Trips for this Rider */}
          <div className="mb-10">
            <h3 className="text-xl font-black text-white mb-4 text-right">الرحلات المسجلة في الفاتورة الحالية</h3>
            {trips.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center backdrop-blur-md">
                <p className="text-white/40 font-bold">لا توجد رحلات مسجلة حالياً لهذه الفاتورة.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map((t, index) => {
                  const comm = (t.grossPrice || 0) * COMMISSION_RATE;
                  const isEditing = editingTripId === t.id;

                  return (
                    <div key={t.id} className="bg-white/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg text-blue-900 border border-white/50">
                      {isEditing ? (
                        <div className="w-full flex flex-col gap-3 text-right">
                          <div className="flex justify-between items-center pb-2 border-b border-blue-900/10">
                            <span className="font-bold text-sm text-blue-950">تعديل رحلة #{index + 1}</span>
                            <span className="text-xs text-blue-900/50">تاريخ ثابت: {new Date(t.timestamp).toLocaleTimeString('ar-MR', {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-blue-900/60 mr-1">من أين:</label>
                              <input 
                                type="text"
                                value={editOrigin}
                                onChange={(e) => setEditOrigin(e.target.value)}
                                className="w-full rounded-xl p-2.5 text-right font-bold text-blue-900 bg-white border border-blue-900/20 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-blue-900/60 mr-1">إلى أين:</label>
                              <input 
                                type="text"
                                value={editDest}
                                onChange={(e) => setEditDest(e.target.value)}
                                className="w-full rounded-xl p-2.5 text-right font-bold text-blue-900 bg-white border border-blue-900/20 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-blue-900/60 mr-1">المبلغ (بالأوقية):</label>
                            <input 
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-full rounded-xl p-2.5 text-right font-black text-blue-900 bg-white border border-blue-900/20 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                            />
                          </div>

                          <div className="flex gap-2 justify-end mt-2">
                            <button 
                              onClick={() => setEditingTripId(null)}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all active:scale-95"
                            >
                              إلغاء
                            </button>
                            <button 
                              onClick={() => {
                                if (editOrigin && editDest && editPrice) {
                                  const p = Number(editPrice);
                                  const commission = p * COMMISSION_RATE;
                                  setRiders(prev => (prev || []).map(r => r.id === selectedRider.id ? {
                                    ...r,
                                    currentTrips: (r.currentTrips || []).map(trip => trip.id === t.id ? {
                                      ...trip,
                                      origin: editOrigin,
                                      destination: editDest,
                                      grossPrice: p,
                                      commission
                                    } : trip)
                                  } : r));
                                  setEditingTripId(null);
                                }
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center gap-1 shadow-md"
                            >
                              <Check size={14} />
                              <span>حفظ</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Actions: Edit and Delete buttons on the left */}
                          <div className="flex gap-2 items-center justify-start">
                            <button 
                              onClick={() => {
                                setEditingTripId(t.id);
                                setEditOrigin(t.origin || '');
                                setEditDest(t.destination || '');
                                setEditPrice(String(t.grossPrice || ''));
                              }}
                              className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full active:scale-90 transition-all shadow-sm"
                              title="تعديل الرحلة"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('هل أنت متأكد من حذف هذه الرحلة؟')) {
                                  setRiders(prev => (prev || []).map(r => r.id === selectedRider.id ? { ...r, currentTrips: (r.currentTrips || []).filter(trip => trip.id !== t.id) } : r));
                                }
                              }}
                              className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-full active:scale-90 transition-all shadow-sm"
                              title="حذف الرحلة"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          {/* Trip Details on the right */}
                          <div className="flex-1 text-right">
                            <div className="flex justify-end gap-2 items-center mb-1 flex-wrap">
                              <span className="font-black text-lg">{t.destination}</span>
                              <span className="text-blue-900/40 text-xs">←</span>
                              <span className="font-black text-lg">{t.origin}</span>
                              <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">#{index + 1}</span>
                            </div>
                            <p className="text-xs text-blue-900/60 font-bold">
                              السعر: {t.grossPrice} أوقية | عمولة الشركة: {isOwnerAcc ? comm.toFixed(2) : Math.floor(comm)} أوقية
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warnings & Disciplinary Notes History */}
          <div className="mb-10">
            <h3 className="text-xl font-black text-white mb-4 text-right flex items-center justify-end gap-2">
              <ShieldAlert size={20} className="text-amber-400" />
              <span>سجل التنبيهات والتعليقات الإدارية</span>
            </h3>
            {(!selectedRider.warnings || selectedRider.warnings.length === 0) ? (
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 text-center backdrop-blur-md">
                <p className="text-white/40 font-bold text-sm">سجل السائق نظيف ولا توجد عليه أي تنبيهات أو تعليقات سابقة. 👍</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedRider.warnings.map((warn) => {
                  const isSuspension = warn.type === 'suspension';
                  const isExpired = warn.expiresAt && Date.now() >= warn.expiresAt;

                  return (
                    <div 
                      key={warn.id} 
                      className={`p-4 rounded-2xl border text-right backdrop-blur-md flex flex-col gap-2 ${
                        isSuspension 
                          ? isExpired 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-red-500/15 border-red-500/40 text-red-100'
                          : 'bg-white/5 border-white/10 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="text-[10px] font-bold opacity-60">
                          {new Date(warn.createdAt).toLocaleString('ar-MR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        <div className="flex items-center gap-2">
                          {isSuspension && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isExpired ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/30 text-red-200'
                            }`}>
                              {isExpired ? 'حظر منتهي (عائد تلقائياً)' : `حظر نشط (${warn.durationHours} ساعة)`}
                            </span>
                          )}
                          <span className="font-black text-xs">
                            {warn.type === 'suspension' ? '🔴 حظر وتعليق' : warn.type === 'warning' ? '🟡 تنبيه رسمي' : '💬 ملاحظة إدارية'}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm font-bold leading-relaxed whitespace-pre-line">
                        "{warn.text}"
                      </p>

                      {warn.expiresAt && (
                        <p className="text-[11px] opacity-70 font-medium">
                          تاريخ الانتهاء التلقائي: {new Date(warn.expiresAt).toLocaleString('ar-MR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ScannerView = () => (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col items-center justify-center p-6 view-transition">
      <div className="absolute top-8 left-8"><button onClick={stopScanner} className="p-4 bg-white/10 text-white rounded-2xl border border-white/20 backdrop-blur-md active:scale-90"><X size={24} /></button></div>
      <div className="relative w-full max-w-sm aspect-square rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-[0_0_100px_rgba(0,0,0,1)]">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-64 h-64 border-2 rounded-full transition-all duration-500 ${isSuccess ? 'border-blue-500 scale-110' : 'border-white/30 animate-pulse'}`} />
        </div>
      </div>
      <div className="mt-12 text-center max-w-xs">{isSuccess ? <p className="text-white font-black text-xl leading-relaxed animate-in fade-in zoom-in">{activeGreeting}</p> : <p className="text-white/50 font-bold animate-pulse tracking-widest">جاري التعرف على الوجه...</p>}</div>
    </div>
  );

  const VaultLockView = () => (
    <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 view-transition">
      <div className="mb-10 text-center">
        <div className={`w-20 h-20 bg-white/10 flex items-center justify-center rounded-3xl border border-white/20 mb-6 mx-auto ${pinError ? 'animate-shake' : ''}`}><Lock size={32} className="text-white"/></div>
        <div className="flex gap-4 h-4 justify-center">
          {[0, 1, 2, 3].map(i => <div key={i} className={`w-3 h-3 rounded-full border transition-all ${pinInput.length > i ? 'bg-white scale-125 shadow-[0_0_10px_white]' : 'border-white/30'}`} />)}
        </div>
      </div>
      <h2 className="text-2xl font-black text-white mb-8 tracking-tighter">بوابة الخزينة</h2>
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map(val => (
          <button key={val.toString()} onClick={() => { 
            if (val === 'C') setPinInput(''); 
            else if (val === 'DEL') setPinInput(p => p.slice(0, -1)); 
            else {
              const newInput = pinInput + val;
              if (newInput.length <= 4) {
                setPinInput(newInput);
                if (newInput.length === 4) {
                   if (newInput === VAULT_PIN) { setView(AppState.VAULT_PORTAL); setPinInput(''); }
                   else { setPinError(true); setTimeout(() => { setPinError(false); setPinInput(''); }, 600); }
                }
              }
            }
          }} className="w-full aspect-square bg-white/10 rounded-2xl flex items-center justify-center text-xl font-bold text-white active:bg-white/20 border border-white/5 shadow-md backdrop-blur-md">
            {val === 'DEL' ? <Delete size={20} /> : val}
          </button>
        ))}
        <button onClick={() => setView(AppState.DASHBOARD)} className="col-span-3 py-4 text-white/40 font-bold text-sm">إلغاء</button>
      </div>
    </div>
  );

  const renderView = () => {
    switch(view) {
      case AppState.SPLASH: return <SplashView />;
      case AppState.DASHBOARD: return <Dashboard />;
      case AppState.RIDER_DETAILS: return <RiderDetails />;
      case AppState.SCANNER: return <ScannerView />;
      case AppState.VAULT_LOCK: return <VaultLockView />;
      case AppState.VAULT_PORTAL: return <VaultPortalView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-950">
      {/* Background image covering the full screen behind content with customized fit and corner settings */}
      <div 
        className="fixed inset-0 z-0 bg-no-repeat transition-all duration-300" 
        style={{ 
          backgroundImage: `url(${activeBg})`,
          backgroundSize: bgFit === 'stretch' ? '100% 100%' : bgFit === 'contain' ? 'contain' : 'cover',
          backgroundPosition: 'center',
          padding: `${bgPadding}px`,
          margin: `${bgPadding}px`,
          borderRadius: `${bgBorderRadius}px`,
          opacity: bgOpacity / 100,
        }}
      />
      {/* Semi-transparent dark overlay to make text and cards contrast beautifully and remain highly readable */}
      <div 
        className="fixed inset-0 z-0 bg-gradient-to-b from-slate-950/65 via-slate-900/85 to-slate-950/95 pointer-events-none transition-all duration-300" 
        style={{
          opacity: overlayOpacity / 100
        }}
      />

      {/* Actual App Content */}
      <div className="relative z-10 w-full min-h-screen">
        {renderView()}
      </div>
      {showAddRider && (
        <div className="fixed inset-0 z-[800] bg-black/70 flex items-center justify-center p-6 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-[3rem] p-8 sm:p-10 relative shadow-[0_25px_60px_rgba(0,0,0,0.5)] my-8">
            <h3 className="text-2xl font-black text-blue-900 mb-6 text-right tracking-tight">إضافة سائق جديد</h3>
            
            {/* Camera / Photo Section */}
            <div className="mb-6 flex flex-col items-center">
              {isRiderCameraActive ? (
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg bg-black flex items-center justify-center animate-pulse">
                  <video 
                    ref={addRiderVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]" 
                  />
                  <div className="absolute inset-0 border-2 border-white/20 rounded-full pointer-events-none" />
                </div>
              ) : (
                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-blue-100 shadow-lg bg-slate-100 flex items-center justify-center group">
                  {riderPhoto ? (
                    <img 
                      src={riderPhoto} 
                      alt="صورة السائق" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <User size={64} className="text-slate-300" />
                  )}
                  
                  {riderPhoto && (
                    <button 
                      type="button"
                      onClick={() => setRiderPhoto(null)}
                      className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-md active:scale-90 transition-transform"
                      title="حذف الصورة"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Camera Actions */}
              <div className="mt-4 flex gap-2 w-full justify-center">
                {isRiderCameraActive ? (
                  <>
                    <button
                      type="button"
                      onClick={captureRiderPhoto}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Camera size={14} />
                      <span>التقاط الصورة</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopRiderCamera}
                      className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold text-xs active:scale-95 transition-all"
                    >
                      إلغاء الكاميرا
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startRiderCamera}
                      className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera size={14} />
                      <span>التقاط بالكاميرا</span>
                    </button>

                    <label className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs active:scale-95 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer">
                      <Upload size={14} />
                      <span>رفع صورة</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setRiderPhoto(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-blue-900/60 text-xs font-bold mr-1">الاسم الكامل للسائق:</label>
                <input 
                  id="new-rider-name" 
                  placeholder="الاسم الكامل.." 
                  className="w-full rounded-2xl p-4 text-right font-bold text-blue-900 bg-blue-50/50 border border-blue-100 outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-all" 
                  value={newRiderName}
                  onChange={(e) => setNewRiderName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-blue-900/60 text-xs font-bold mr-1">رقم هاتف السائق:</label>
                <input 
                  id="new-rider-phone" 
                  placeholder="رقم الهاتف.." 
                  className="w-full rounded-2xl p-4 text-right font-bold text-blue-900 bg-blue-50/50 border border-blue-100 outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-all" 
                  value={newRiderPhone}
                  onChange={(e) => setNewRiderPhone(e.target.value)}
                />
              </div>

              <button 
                onClick={() => {
                  if (!newRiderName || !newRiderPhone) {
                    alert("يرجى ملء كافة الحقول المطلوبة (الاسم الكامل ورقم الهاتف) لتسجيل السائق.");
                    return;
                  }

                  const cleanedPhone = newRiderPhone.trim().replace(/\s/g, '');
                  const finalName = cleanedPhone === '22261016' ? 'العبقري' : newRiderName.trim();

                  const doAddRider = () => {
                    setRiders(prev => [...(prev || []), { 
                      id: crypto.randomUUID(), 
                      name: finalName, 
                      phone: newRiderPhone.trim(), 
                      currentTrips: [],
                      photo: riderPhoto || undefined,
                      lastActivityAt: Date.now()
                    }]);
                    stopRiderCamera();
                    setShowAddRider(false);
                    setShowConfirmModal(false);
                  };

                  if (!riderPhoto) {
                    // Photo bypassed / skipped
                    setConfirmConfig({
                      title: "تأكيد التجاوز بدون صورة",
                      message: `لم تقم بإضافة أو التقاط صورة شخصية للسائق (${finalName}). هل أنت متأكد من التجاوز بدون صورة وتثبيت السائق؟`,
                      confirmText: "نعم، متأكد (تثبيت بدون صورة)",
                      cancelText: "تراجع / التقاط صورة",
                      isDanger: false,
                      onConfirm: () => {
                        setTimeout(() => {
                          setConfirmConfig({
                            title: "تأكيد تثبيت السائق",
                            message: `هل أنت متأكد من تثبيت السائق (${finalName}) برقم الهاتف (${newRiderPhone.trim()}) في النظام؟`,
                            confirmText: "تأكيد التثبيت النهائي",
                            cancelText: "إلغاء",
                            isDanger: false,
                            onConfirm: () => {
                              doAddRider();
                            }
                          });
                          setShowConfirmModal(true);
                        }, 100);
                      }
                    });
                    setShowConfirmModal(true);
                  } else {
                    // Photo provided
                    setConfirmConfig({
                      title: "تأكيد تثبيت السائق",
                      message: `هل أنت متأكد من تثبيت السائق (${finalName}) برقم الهاتف (${newRiderPhone.trim()}) في النظام؟`,
                      confirmText: "تأكيد التثبيت",
                      cancelText: "تراجع",
                      isDanger: false,
                      onConfirm: () => {
                        doAddRider();
                      }
                    });
                    setShowConfirmModal(true);
                  }
                }} 
                className="w-full py-4 bg-blue-600 text-white rounded-full font-black text-lg shadow-xl active:scale-95 transition-all border-b-4 border-blue-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus size={22} />
                <span>تثبيت السائق الجديد</span>
              </button>
              
              <button 
                onClick={() => {
                  stopRiderCamera();
                  setShowAddRider(false);
                }} 
                className="w-full py-2 text-blue-900/40 hover:text-blue-900/60 font-bold transition-colors"
              >
                إلغاء التثبيت
              </button>
            </div>
          </div>
        </div>
      )}
      {showInvoiceModal && invoiceRider && (
        <div className="fixed inset-0 z-[900] bg-black/80 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0f172a] text-white rounded-[2.5rem] border border-white/10 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <button 
                onClick={() => setShowInvoiceModal(false)} 
                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-right">خيارات فاتورة {invoiceRider.name}</h3>
            </div>

            {/* Body / Preview */}
            <div className="flex-1 overflow-y-auto mb-6 space-y-4">
              <p className="text-sm font-bold text-white/60 text-right mb-2">معاينة نص الفاتورة المجهز:</p>
              <div className="bg-blue-950/40 border border-blue-500/20 rounded-2xl p-4 text-right font-mono text-sm leading-relaxed whitespace-pre-wrap select-all max-h-60 overflow-y-auto text-blue-100 shadow-inner">
                {invoiceText}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Button: Direct chat with driver */}
              <button 
                onClick={() => {
                  touchRiderActivity(invoiceRider.id);
                  const cleanPhone = invoiceRider.phone.replace(/\s/g, '');
                  const formattedPhone = cleanPhone.length === 8 ? `222${cleanPhone}` : cleanPhone;
                  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(invoiceText)}`;
                  window.open(url, '_blank');
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-2xl font-black text-md sm:text-lg flex items-center justify-center gap-3 shadow-lg transition-all"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.298 1.448 5.355 1.449 5.483 0 9.944-4.461 9.947-9.948.002-2.657-1.01-5.155-2.852-6.997C17.203 1.816 14.704.804 12.01.803c-5.488 0-9.949 4.462-9.952 9.949-.001 2.083.547 4.11 1.586 5.91l-.974 3.556 3.64-.955c1.603.874 3.23 1.341 4.737 1.341zm11.234-8.311c-.307-.154-1.82-.898-2.102-.1-1.282.435-2.26 1.012-2.852.1-.307-.154-1.218-.485-2.316-1.465-.853-.761-1.43-1.7-1.597-1.983-.168-.283-.018-.435.122-.574.126-.125.28-.323.42-.484.14-.162.186-.277.28-.462.093-.185.047-.347-.024-.5-.07-.154-.63-1.517-.863-2.079-.227-.547-.457-.473-.63-.482-.164-.008-.353-.01-.542-.01s-.497.071-.757.348c-.26.277-1.002.977-1.002 2.384 0 1.407 1.023 2.766 1.167 2.956.143.19 2.012 3.072 4.876 4.31.682.294 1.214.47 1.63.601.685.217 1.307.186 1.8.113.55-.082 1.82-.744 2.078-1.462.258-.718.258-1.332.181-1.462-.077-.13-.284-.207-.591-.361z" />
                </svg>
                مراسلة الكابتن عبر الواتساب مباشرة
              </button>

              {/* Button: General whatsapp sharing */}
              <button 
                onClick={() => {
                  touchRiderActivity(invoiceRider.id);
                  const url = `whatsapp://send?text=${encodeURIComponent(invoiceText)}`;
                  window.location.href = url;
                }}
                className="w-full py-4 bg-sky-600 hover:bg-sky-500 active:scale-98 text-white rounded-2xl font-black text-md sm:text-lg flex items-center justify-center gap-3 shadow-lg transition-all"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.55 4.117 1.514 5.86L.057 24l6.302-1.654c1.7.914 3.636 1.43 5.641 1.43 6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.84 0-3.61-.466-5.174-1.349l-.372-.212-3.842 1.007.126-3.834-.233-.37C1.597 15.71 1 13.9 1 12 1 5.935 5.935 1 12 1s11 4.935 11 11-4.935 11-11 11z" />
                </svg>
                مشاركة عبر واتساب العام
              </button>

              {/* Button: Copy invoice text */}
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(invoiceText);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
                className={`w-full py-4 rounded-2xl font-black text-md sm:text-lg flex items-center justify-center gap-3 shadow-lg transition-all ${copySuccess ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/15 text-white'}`}
              >
                <span>{copySuccess ? 'تم نسخ الفاتورة بنجاح!' : 'نسخ نص الفاتورة للذاكرة'}</span>
              </button>

              {/* Settle and Clear Trips Button */}
              {invoiceRider.currentTrips && invoiceRider.currentTrips.length > 0 && (
                <button 
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من تصفية حساب هذا الكابتن وترحيل الرحلات إلى الأرشيف؟')) {
                      handleSettleAndArchive(invoiceRider);
                    }
                  }}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-500 active:scale-98 text-white rounded-2xl font-black text-md sm:text-lg flex items-center justify-center gap-3 shadow-lg transition-all mt-4 border-b-4 border-orange-800"
                >
                  تسوية وتصفية الحساب (ترحيل للأرشيف)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {showBillingModal && billingRider && (
        <div className="fixed inset-0 z-[850] bg-black/80 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md overflow-y-auto text-right" dir="rtl">
          <div className="w-full max-w-md bg-[#0f172a] text-white rounded-[3rem] border border-white/10 p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
              <button 
                onClick={() => {
                  setShowBillingModal(false);
                  setBillingRider(null);
                  setChargeAmount('');
                }} 
                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
              <div className="text-right">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">إدارة الحساب والشحن</h3>
                <p className="text-xs text-white/50 font-bold mt-1">{billingRider.name}</p>
              </div>
            </div>

            {/* Current Financial Status Info */}
            <div className="space-y-4 mb-8">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                <span className="text-emerald-400 font-black text-xl">
                  <CurrencyDisplay value={billingRider.prepaidBalance || 0} isOwner={isProtectedRider(billingRider)} />
                </span>
                <span className="text-sm font-bold text-white/60">الرصيد المشحون الحالي:</span>
              </div>

              {billingRider.currentTrips && billingRider.currentTrips.length > 0 && (
                <>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                    <span className="text-sky-400 font-black text-xl">
                      <CurrencyDisplay 
                        value={(billingRider.currentTrips || []).reduce((s, t) => s + ((t.grossPrice || 0) * COMMISSION_RATE), 0)} 
                        isOwner={isProtectedRider(billingRider)} 
                      />
                    </span>
                    <span className="text-sm font-bold text-white/60">عمولة الرحلات الحالية:</span>
                  </div>

                  {(() => {
                    const curComm = (billingRider.currentTrips || []).reduce((s, t) => s + ((t.grossPrice || 0) * COMMISSION_RATE), 0);
                    const bal = (billingRider.prepaidBalance || 0) - curComm;
                    return (
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                        <span className={`font-black text-xl ${bal >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                          <CurrencyDisplay value={Math.abs(bal)} isOwner={isProtectedRider(billingRider)} />
                        </span>
                        <span className="text-sm font-bold text-white/60">
                          {bal >= 0 ? 'الرصيد الصافي المتبقي:' : 'المديونية الصافية المستحقة:'}
                        </span>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Success Feedback */}
            {billingSuccess && (
              <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl p-4 text-center text-sm font-bold animate-pulse mb-6">
                ✓ تم شحن الحساب بنجاح وتحديث الرصيد!
              </div>
            )}

            {/* Charge Input Form */}
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-white/60 text-xs font-bold mr-1">مبلغ الشحن (أوقية):</label>
                <input 
                  type="number"
                  placeholder="أدخل مبلغ الشحن مسبقاً.."
                  className="w-full rounded-2xl p-4 sm:p-5 text-right font-black text-2xl text-blue-900 bg-white border-none outline-none shadow-inner focus:ring-2 focus:ring-blue-400 transition-all"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                />
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setChargeAmount(String(preset))}
                    className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-xs active:scale-95 transition-all"
                  >
                    +{preset}
                  </button>
                ))}
              </div>

              {/* Action Button */}
              <button 
                onClick={() => {
                  const amt = Number(chargeAmount);
                  if (amt > 0) {
                    const now = Date.now();
                    setRiders(prev => (prev || []).map(r => r.id === billingRider.id ? { 
                      ...r, 
                      lastActivityAt: now,
                      prepaidBalance: (r.prepaidBalance || 0) + amt 
                    } : r));
                    
                    setBillingRider(prev => prev ? {
                      ...prev,
                      prepaidBalance: (prev.prepaidBalance || 0) + amt
                    } : null);
                    
                    setChargeAmount('');
                    setBillingSuccess(true);
                    setTimeout(() => setBillingSuccess(false), 3000);
                  }
                }} 
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-black text-lg shadow-xl active:scale-95 transition-all border-b-4 border-emerald-800 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                <span>إتمام شحن الحساب</span>
              </button>

              {/* Close Button */}
              <button 
                onClick={() => {
                  setShowBillingModal(false);
                  setBillingRider(null);
                  setChargeAmount('');
                }} 
                className="w-full py-2 text-white/40 hover:text-white/60 font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}
      {showNotifications && (
        <div className="fixed inset-0 z-[850] bg-black/85 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md overflow-y-auto text-right" dir="rtl">
          <div className="w-full max-w-lg bg-[#0f172a] text-white rounded-[3rem] border border-white/10 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <button 
                onClick={() => setShowNotifications(false)} 
                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
              <div className="text-right">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 justify-end">
                  <span className="bg-blue-500/10 text-blue-400 p-1.5 rounded-lg"><Bell size={18} /></span>
                  مركز التنبيهات الذكي
                </h3>
                <p className="text-xs text-white/50 font-bold mt-1">يتغير أسلوب التنبيه وصيغته تلقائياً حسب الرصيد المالي لكل سائق</p>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1 pl-1">
              {balanceNotifications.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <Smile className="mx-auto mb-4 opacity-50" size={48} />
                  <p className="font-bold text-lg">كل الحسابات المالية مستقرة وبحالة ممتازة! 👍</p>
                  <p className="text-xs mt-1">لا توجد مديونيات أو رصيد منخفض حالياً.</p>
                </div>
              ) : (
                balanceNotifications.map((notif) => {
                  const isCritical = notif.type === 'critical';
                  const isWarning = notif.type === 'warning';
                  const isDanger = notif.type === 'danger';
                  
                  return (
                    <div 
                      key={notif.id} 
                      className={`rounded-2xl p-5 border bg-gradient-to-br ${notif.colorClass} transition-all`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-black px-3 py-1 bg-white/5 rounded-full flex items-center gap-1">
                          {isWarning && <Smile size={14} className="text-amber-400" />}
                          {isDanger && <AlertTriangle size={14} className="text-orange-400" />}
                          {isCritical && <AlertOctagon size={14} className="text-rose-400 animate-pulse" />}
                          <span className="text-white/70">المزاج:</span>
                          <span className="font-black text-white">{notif.mood}</span>
                        </span>
                        
                        <div className="text-right">
                          <h4 className="font-black text-white text-md">{notif.riderName}</h4>
                          <span className={`text-xs font-bold ${isCritical ? 'text-rose-400' : isDanger ? 'text-orange-400' : 'text-amber-400'}`}>
                            الرصيد: {Math.floor(notif.balance)} أوقية
                          </span>
                        </div>
                      </div>

                      <p className="text-sm leading-relaxed text-right text-slate-100 whitespace-pre-line mb-4 font-medium">
                        {notif.message}
                      </p>

                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const r = riders.find(x => x.id === notif.riderId);
                            if (r) {
                              setBillingRider(r);
                              setShowBillingModal(true);
                              setShowNotifications(false);
                            }
                          }}
                          className={`px-4 py-2 rounded-xl text-white font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 ${notif.buttonColor}`}
                        >
                          <Coins size={14} />
                          <span>شحن الرصيد لتغيير المزاج</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions / Close */}
            <button 
              onClick={() => setShowNotifications(false)} 
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-md transition-all text-center border border-white/5"
            >
              إغلاق المركز
            </button>
            
          </div>
        </div>
      )}
      {showBgSettings && (
        <div className="fixed inset-0 z-[850] bg-black/85 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md overflow-y-auto text-right" dir="rtl">
          <div className="w-full max-w-lg bg-[#0f172a] text-white rounded-[3rem] border border-white/10 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <button 
                onClick={() => setShowBgSettings(false)} 
                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
              <div className="text-right">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 justify-end">
                  <span className="bg-blue-500/10 text-blue-400 p-1.5 rounded-lg"><Settings size={18} /></span>
                  إعدادات مظهر الخلفية
                </h3>
                <p className="text-xs text-white/50 font-bold mt-1">اضبط تفاصيل تمدد وقياس وأبعاد صورة الخلفية الخاصة بك</p>
              </div>
            </div>

            {/* Settings Fields */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 pl-1 mb-6">
              
              {/* Custom Image Picker Section */}
              <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between">
                  {customBgImage ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-emerald-500/30">
                      <Check size={12} /> خلفية مخصصة مفعلة
                    </span>
                  ) : (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-bold border border-blue-500/30">
                      الخلفية الافتراضية
                    </span>
                  )}
                  <label className="text-sm font-black text-white/90 block">تغيير صورة الخلفية من الجهاز:</label>
                </div>

                {/* Preview Thumbnail */}
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-white/20 shadow-inner group bg-black/40 flex items-center justify-center">
                  <img 
                    src={activeBg} 
                    alt="معاينة الخلفية" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
                    <span className="text-[11px] font-bold text-white/80 bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-sm">
                      {customBgImage ? 'صورة مخصصة من الاستوديو' : 'الخلفية الرسمية للتطبيق'}
                    </span>
                    {customBgImage && (
                      <button
                        onClick={handleResetBgImage}
                        className="text-xs bg-red-500/80 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all active:scale-95 shadow-md"
                      >
                        <Trash2 size={13} /> إزالة
                      </button>
                    )}
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={bgFileInputRef}
                  onChange={handleBgFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => bgFileInputRef.current?.click()}
                    className="w-full py-3 bg-blue-600/30 hover:bg-blue-600/50 active:scale-95 text-blue-300 border border-blue-500/40 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Upload size={16} /> اختيار صورة من المعرض / الجهاز
                  </button>
                  {customBgImage && (
                    <button
                      onClick={handleResetBgImage}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white/70 border border-white/10 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={16} /> استعادة الخلفية الافتراضية
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-white/40">يمكنك إضافة اختيار صورة واحدة خاصة بك يدوياً من استوديو الجهاز أو ذاكرة الهاتف وتغيير مظهر التطبيق بالكامل.</p>
              </div>

              {/* 1. Fit Type */}
              <div className="space-y-2">
                <label className="text-sm font-black text-white/80 block">طريقة ملاءمة وقياس الصورة:</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setBgFit('stretch')}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                      bgFit === 'stretch' 
                        ? 'bg-blue-600/20 border-blue-500 text-white' 
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-black text-sm flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${bgFit === 'stretch' ? 'border-blue-400' : 'border-white/30'}`}>
                        {bgFit === 'stretch' && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                      </span>
                      تمديد كامل ليناسب زوايا الشاشة (بدون أي قص) 🌟
                    </span>
                    <span className="text-xs text-white/50 mr-5">
                      يضبط حدود الصورة تلقائياً لتغطي الشاشة بالكامل وبدقة متناهية مهما كان شكل الصورة مربعاً أو مستطيلاً دون قص أي جزء منها. (موصى به)
                    </span>
                  </button>

                  <button
                    onClick={() => setBgFit('cover')}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                      bgFit === 'cover' 
                        ? 'bg-blue-600/20 border-blue-500 text-white' 
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-black text-sm flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${bgFit === 'cover' ? 'border-blue-400' : 'border-white/30'}`}>
                        {bgFit === 'cover' && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                      </span>
                      تعبئة وتغطية الشاشة (قد يتم قص الأطراف)
                    </span>
                    <span className="text-xs text-white/50 mr-5">
                      يحافظ على النسبة المئوية لأبعاد الصورة ولكن قد يقطع بعض الحواف الجانبية لتعبئة المساحة.
                    </span>
                  </button>

                  <button
                    onClick={() => setBgFit('contain')}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                      bgFit === 'contain' 
                        ? 'bg-blue-600/20 border-blue-500 text-white' 
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-black text-sm flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${bgFit === 'contain' ? 'border-blue-400' : 'border-white/30'}`}>
                        {bgFit === 'contain' && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                      </span>
                      احتواء كامل بداخل الشاشة
                    </span>
                    <span className="text-xs text-white/50 mr-5">
                      يعرض الصورة بأكملها داخل الشاشة مع الحفاظ على مقاييسها الأصلية ودون أي تمديد أو قص.
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Margin Distance */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-blue-400">{bgPadding} بكسل</span>
                  <label className="text-sm font-black text-white/80 block">المسافة والبعد عن حواف الشاشة:</label>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="40" 
                  value={bgPadding} 
                  onChange={(e) => setBgPadding(Number(e.target.value))}
                  className="w-full accent-blue-500 bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-white/40">اسحب الشريط لضبط المباعدة والمسافة الفاصلة من حواف وزوايا هاتفك لعرض الصورة بحجم مخصص.</p>
              </div>

              {/* 3. Corner Radius */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-blue-400">{bgBorderRadius} بكسل</span>
                  <label className="text-sm font-black text-white/80 block">تدوير زوايا صورة الخلفية:</label>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="60" 
                  value={bgBorderRadius} 
                  onChange={(e) => setBgBorderRadius(Number(e.target.value))}
                  className="w-full accent-blue-500 bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-white/40">تحكم بمدى انحناء وتدوير زوايا حدود الخلفية لتطابق شكل الشاشات الحديثة المنحنية.</p>
              </div>

              {/* 4. Background Opacity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-blue-400">{bgOpacity}%</span>
                  <label className="text-sm font-black text-white/80 block">شفافية ووضوح الصورة:</label>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  value={bgOpacity} 
                  onChange={(e) => setBgOpacity(Number(e.target.value))}
                  className="w-full accent-blue-500 bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 5. Overlay Opacity */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-blue-400">{overlayOpacity}%</span>
                  <label className="text-sm font-black text-white/80 block">تعتيم طبقة الحماية الداكنة للنصوص:</label>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={overlayOpacity} 
                  onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                  className="w-full accent-blue-500 bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-white/40">تزيد هذه الطبقة من وضوح وقراءة النصوص والأرقام فوق الخلفيات المضيئة والساطعة.</p>
              </div>

            </div>

            {/* Actions / Close */}
            <button 
              onClick={() => setShowBgSettings(false)} 
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl font-black text-md transition-all text-center shadow-lg"
            >
              حفظ وتطبيق المظهر الجديد
            </button>
            
          </div>
        </div>
      )}

      {/* Driver Warning & Temporary Suspension Modal */}
      {showWarningModal && warningTargetRider && (
        <div className="fixed inset-0 z-[860] bg-black/85 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md overflow-y-auto text-right" dir="rtl">
          <div className="w-full max-w-lg bg-[#0f172a] text-white rounded-[2.5rem] border border-white/10 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <button 
                onClick={() => setShowWarningModal(false)} 
                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
              <div className="text-right">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2 justify-end">
                  <span className="bg-amber-500/10 text-amber-400 p-1.5 rounded-lg"><ShieldAlert size={20} /></span>
                  إدارة التنبيهات والحظر والتصنيف
                </h3>
                <p className="text-xs text-white/60 font-bold mt-1">الكابتن: <span className="text-amber-300 underline">{warningTargetRider.name}</span> ({warningTargetRider.phone})</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1 pl-1 mb-6">
              
              {/* Type Selection Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => { setWarningType('suspension'); setTargetClassification('موقوف مؤقتاً'); }}
                  className={`py-3 rounded-xl font-black text-xs transition-all flex flex-col items-center gap-1 ${
                    warningType === 'suspension' ? 'bg-red-600 text-white shadow-lg scale-105' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Ban size={16} />
                  <span>توقيف وحظر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWarningType('warning')}
                  className={`py-3 rounded-xl font-black text-xs transition-all flex flex-col items-center gap-1 ${
                    warningType === 'warning' ? 'bg-amber-600 text-white shadow-lg scale-105' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <AlertTriangle size={16} />
                  <span>تنبيه رسمي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWarningType('note')}
                  className={`py-3 rounded-xl font-black text-xs transition-all flex flex-col items-center gap-1 ${
                    warningType === 'note' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Award size={16} />
                  <span>تعديل التصنيف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWarningType('delete')}
                  className={`py-3 rounded-xl font-black text-xs transition-all flex flex-col items-center gap-1 ${
                    warningType === 'delete' ? 'bg-rose-700 text-white shadow-lg scale-105' : 'text-rose-400/80 hover:text-rose-300'
                  }`}
                >
                  <Trash2 size={16} />
                  <span>حذف السائق</span>
                </button>
              </div>

              {/* Deletion Warning Box (if type === 'delete') */}
              {warningType === 'delete' && (
                <div className="space-y-3 bg-rose-950/50 p-5 rounded-2xl border border-rose-500/40 text-right animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                    <Trash2 size={20} />
                    <span>حذف السائق نهائياً من القائمة والتصنيف</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed font-medium">
                    سيتم مسح الكابتن (<span className="font-bold underline">{warningTargetRider.name}</span>) نهائياً من قاعدة البيانات، بالإضافة لمسح كافة الرحلات المفتوحة والسجلات المرتبطة به.
                  </p>
                  <div className="p-3 bg-black/40 rounded-xl border border-rose-500/20 text-[11px] text-rose-300 font-bold">
                    ⚠️ ملحوظة: هذا الزر محمي داخل قائمة إدارة التصنيف ولن يظهر على القوائم العامة لمنع الحذف بالخطأ.
                  </div>
                </div>
              )}

              {/* Suspension Duration Options (if type === 'suspension') */}
              {warningType === 'suspension' && (
                <div className="space-y-3 bg-red-950/40 p-4 rounded-2xl border border-red-500/30">
                  <label className="text-xs font-black text-red-200 block flex items-center gap-1.5">
                    <Clock size={15} />
                    <span>حدد مدة الحظر والتعليق المؤقت (بالساعات):</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { hours: 12, label: '12 ساعة' },
                      { hours: 24, label: '24 ساعة (يوم)' },
                      { hours: 48, label: '48 ساعة (يومان)' },
                      { hours: 72, label: '72 ساعة (3 أيام)' },
                      { hours: 168, label: 'أسبوع (7 أيام)' },
                      { hours: 720, label: 'شهر (30 يوماً)' }
                    ].map(item => (
                      <button
                        key={item.hours}
                        type="button"
                        onClick={() => {
                          setWarningDurationHours(item.hours);
                          setCustomHoursInput(String(item.hours));
                        }}
                        className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all border ${
                          Number(customHoursInput) === item.hours
                            ? 'bg-red-600 text-white border-red-400 shadow-md'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-white/60 block mb-1">أو أدخل مدة مخصصة بالساعات:</label>
                    <input 
                      type="number"
                      min="1"
                      value={customHoursInput}
                      onChange={(e) => setCustomHoursInput(e.target.value)}
                      placeholder="عدد الساعات.."
                      className="w-full rounded-xl p-3 text-right font-black text-white bg-black/40 border border-white/20 outline-none focus:border-red-400"
                    />
                  </div>

                  <p className="text-[10px] text-red-300/80 leading-relaxed">
                    ✨ بعد انقضاء مدة ({customHoursInput || warningDurationHours}) ساعة، سيعود الكابتن تلقائياً وفي نفس اللحظة للعمل وإمكانية إسناد الرحلات دون الحاجة لأي تدقّل من الإدارة.
                  </p>
                </div>
              )}

              {/* Driver Classification Selector (hide during deletion) */}
              {warningType !== 'delete' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/80 block">تصنيف الكابتن في النظام:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'ممتاز', label: '🌟 ممتاز' },
                      { id: 'جيد جداً', label: '👍 جيد جداً' },
                      { id: 'جيد', label: '🟢 جيد' },
                      { id: 'تحت الملاحظة', label: '⚠️ تحت الملاحظة' },
                      { id: 'موقوف مؤقتاً', label: '🔴 موقوف مؤقتاً' },
                      { id: 'مخالف', label: '🚫 مخالف' }
                    ].map(cls => (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setTargetClassification(cls.id as DriverClassification)}
                        className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all border ${
                          targetClassification === cls.id
                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {cls.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment / Reason text area (hide during deletion) */}
              {warningType !== 'delete' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-white/80 block">
                    {warningType === 'suspension' ? 'سبب التوقيف والتعليق الإداري:' : warningType === 'warning' ? 'نص التنبيه الرسمي الموجه للسائق:' : 'الملاحظة الإدارية:'}
                  </label>
                  <textarea 
                    rows={3}
                    value={warningReasonText}
                    onChange={(e) => setWarningReasonText(e.target.value)}
                    placeholder="اكتب التفاصيل والملاحظات هنا.."
                    className="w-full rounded-2xl p-4 text-right font-medium text-sm text-white bg-white/5 border border-white/20 outline-none focus:border-amber-400 transition-all"
                  />
                </div>
              )}

            </div>

            {/* Submit Action Button */}
            <button
              onClick={handleApplyWarningOrSuspension}
              className={`w-full py-4 rounded-2xl font-black text-md transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                warningType === 'delete'
                  ? 'bg-rose-700 hover:bg-rose-600 text-white border-b-4 border-rose-900'
                  : warningType === 'suspension' 
                    ? 'bg-red-600 hover:bg-red-500 text-white' 
                    : warningType === 'warning' 
                      ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {warningType === 'delete' ? <Trash2 size={20} /> : <Check size={20} />}
              <span>{warningType === 'delete' ? 'حذف السائق نهائياً' : 'متابعة وتطبيق الإجراء'}</span>
            </button>

          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmConfig && (
        <div className="fixed inset-0 z-[900] bg-black/85 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md text-right" dir="rtl">
          <div className="w-full max-w-md bg-[#0f172a] text-white rounded-[2.5rem] border border-white/20 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-5 mx-auto">
              <ShieldAlert size={36} />
            </div>

            <h3 className="text-xl font-black text-center text-white mb-3">
              {confirmConfig.title}
            </h3>

            <p className="text-sm font-medium text-white/80 leading-relaxed text-right mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 whitespace-pre-line">
              {confirmConfig.message}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all active:scale-95 border border-white/10"
              >
                {confirmConfig.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmConfig.onConfirm}
                className={`py-3.5 font-black text-xs rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5 ${
                  confirmConfig.isDanger ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Check size={16} />
                <span>{confirmConfig.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security PIN Code Modal (Protected with PIN: 5672) */}
      {showSecurityPinModal && (
        <div className="fixed inset-0 z-[950] bg-black/90 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md text-right" dir="rtl">
          <div className="w-full max-w-sm bg-[#0f172a] text-white rounded-[2.5rem] border border-amber-500/30 p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mb-4 shadow-inner">
              <Lock size={32} />
            </div>

            <h3 className="text-xl font-black text-white mb-1 tracking-tight flex items-center gap-2">
              <span>رمز أمان الإدارة</span>
              <KeyRound size={18} className="text-amber-400" />
            </h3>

            <p className="text-xs font-bold text-white/70 leading-relaxed mb-6">
              هذا الإجراء محمي. يرجى إدخال رمز الأمان المكون من 4 أرقام لتعديل حالة الكابتن أو تصنيفه.
            </p>

            {/* PIN Dots Display */}
            <div className="flex items-center justify-center gap-3 mb-6" dir="ltr">
              {[0, 1, 2, 3].map((idx) => {
                const filled = securityPinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${
                      filled 
                        ? 'border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                        : 'border-white/20 bg-white/5 text-white/30'
                    }`}
                  >
                    {filled ? '●' : '—'}
                  </div>
                );
              })}
            </div>

            {securityPinError && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold p-3 rounded-xl mb-4 w-full">
                {securityPinError}
              </div>
            )}

            {/* Custom On-screen Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full mb-6" dir="ltr">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (securityPinInput.length < 4) {
                      const updated = securityPinInput + num;
                      setSecurityPinInput(updated);
                      setSecurityPinError('');
                    }
                  }}
                  className="py-3.5 bg-white/10 hover:bg-white/20 active:bg-amber-500/30 text-white font-black text-xl rounded-2xl border border-white/10 transition-all active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSecurityPinInput('');
                  setSecurityPinError('');
                }}
                className="py-3.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs rounded-2xl border border-red-500/30 transition-all active:scale-95 flex items-center justify-center"
              >
                مسح
              </button>
              <button
                type="button"
                onClick={() => {
                  if (securityPinInput.length < 4) {
                    const updated = securityPinInput + '0';
                    setSecurityPinInput(updated);
                    setSecurityPinError('');
                  }
                }}
                className="py-3.5 bg-white/10 hover:bg-white/20 active:bg-amber-500/30 text-white font-black text-xl rounded-2xl border border-white/10 transition-all active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  if (securityPinInput.length > 0) {
                    setSecurityPinInput(prev => prev.slice(0, -1));
                    setSecurityPinError('');
                  }
                }}
                className="py-3.5 bg-white/10 hover:bg-white/20 text-white/70 font-bold text-xs rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center justify-center"
              >
                ⌫
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setShowSecurityPinModal(false);
                  setSecurityPinInput('');
                  setSecurityPinError('');
                  setPendingProtectedAction(null);
                }}
                className="py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all active:scale-95 border border-white/10"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleVerifySecurityPin()}
                className="py-3.5 bg-amber-500 hover:bg-amber-400 text-blue-950 font-black text-xs rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check size={16} />
                <span>تأكيد الرمز</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default App;