import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Copy,
  Download,
  Lock,
  Mail,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
  ArrowRight,
  CreditCard,
  Smartphone,
  Building2,
  QrCode,
  Loader2,
} from 'lucide-react';
import { formatINR } from './shared';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export interface PaymentItem {
  id: string;
  name: string;
  amount: number;
  type: 'plan' | 'product' | 'invoice';
  interval?: string;
  invoiceId?: string;
  initialSuccess?: boolean;
}

interface FakePaymentModalProps {
  item: PaymentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (item: PaymentItem) => void;
}

type PaymentMethodType = 'card' | 'upi' | 'netbanking';

const POPULAR_BANKS = [
  { id: 'hdfc', name: 'HDFC Bank' },
  { id: 'sbi', name: 'State Bank of India' },
  { id: 'icici', name: 'ICICI Bank' },
  { id: 'axis', name: 'Axis Bank' },
];

const formatISTDateTime = (date = new Date()) => {
  return (
    date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST'
  );
};

export const FakePaymentModal: React.FC<FakePaymentModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success: showToastSuccess, error: showToastError } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);

  // Defaults as specified in requirements
  const activeItem: PaymentItem = item ?? {
    id: 'weekly-plan',
    name: 'Weekly Plan',
    amount: 299,
    type: 'plan',
    interval: 'week',
  };

  const [method, setMethod] = useState<PaymentMethodType>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(Boolean(item?.initialSuccess));
  const [txnId, setTxnId] = useState('TXN-990798');
  const [copied, setCopied] = useState(false);
  const [paidAt] = useState(() => formatISTDateTime());

  // Form states
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState('Brightloop Customer');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [upiId, setUpiId] = useState('customer@okhdfc');
  const [selectedBank, setSelectedBank] = useState('hdfc');

  // Confetti when entering success view (respecting prefers-reduced-motion)
  useEffect(() => {
    if (isSuccess && isOpen) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#10B981', '#059669', '#34D399', '#6EE7B7'],
          disableForReducedMotion: true,
        });
      }
    }
  }, [isSuccess, isOpen]);

  // Accessibility: Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, isSuccess]);

  if (!isOpen) return null;

  const handleAutofillDemo = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardHolder('Brightloop Customer');
    setExpiry('12/28');
    setCvv('789');
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Gateway processing delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Record invoice payment if applicable
      if (activeItem.invoiceId) {
        try {
          await api.recordPayment({
            invoiceId: activeItem.invoiceId,
            paymentMethod: method === 'card' ? 'card' : method === 'upi' ? 'upi' : 'bank_transfer',
            amount: activeItem.amount,
          });
        } catch (err: any) {
          console.warn('Backend payment record warning:', err);
        }
      }

      const generatedTxnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      setTxnId(generatedTxnId);
      setIsProcessing(false);
      setIsSuccess(true);

      showToastSuccess('Payment Successful', `Transaction ${generatedTxnId} confirmed.`);
      if (onSuccess) {
        onSuccess(activeItem);
      }
    } catch (err: any) {
      setIsProcessing(false);
      showToastError('Payment Failed', err.message || 'Payment could not be processed.');
    }
  };

  const handleCopyTxn = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txnId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadReceipt = () => {
    showToastSuccess('Receipt Downloaded', `Receipt for ${txnId} saved.`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'Payment Receipt',
          text: `Payment of ${formatINR(activeItem.amount)} for ${activeItem.name} confirmed (${txnId}).`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      handleCopyTxn();
      showToastSuccess('Receipt link copied', 'Details copied to your clipboard.');
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setIsProcessing(false);
    onClose();
  };

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex sm:items-center items-end justify-center sm:p-4 p-0 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* Blurred Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window: Centered desktop, 440px max, 24px radius, mobile bottom-sheet */}
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 0, scale: 0.95, y: 20 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.95, y: 20 }
          }
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="relative w-full max-w-[440px] bg-white dark:bg-slate-900 sm:rounded-[24px] rounded-t-[24px] rounded-b-none sm:rounded-b-[24px] shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden z-10 font-sans focus:outline-hidden"
        >
          {/* Slim Emerald Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 dark:from-emerald-800 dark:via-emerald-700 dark:to-teal-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-4 h-4 text-emerald-100 shrink-0" />
              <span id="payment-modal-title" className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                Secure Payment Gateway
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close dialog"
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5">
            {!isSuccess ? (
              /* Checkout Form Step */
              <>
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                      {activeItem.type === 'plan'
                        ? 'Subscription Plan'
                        : activeItem.type === 'invoice'
                        ? 'Invoice Payment'
                        : 'Product Purchase'}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1 truncate">
                      {activeItem.name}
                    </h4>
                    {activeItem.interval && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        Billed per {activeItem.interval}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Total Amount</span>
                    <span className="block text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tracking-tight tabular-nums">
                      {formatINR(activeItem.amount)}
                    </span>
                  </div>
                </div>

                {/* Method selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMethod('upi')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                        method === 'upi'
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 mb-1 text-emerald-600 dark:text-emerald-400" />
                      UPI / QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('card')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                        method === 'card'
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mb-1 text-emerald-600 dark:text-emerald-400" />
                      Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('netbanking')}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                        method === 'netbanking'
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Building2 className="w-5 h-5 mb-1 text-emerald-600 dark:text-emerald-400" />
                      Net Banking
                    </button>
                  </div>
                </div>

                <form onSubmit={handlePay} className="space-y-4">
                  {method === 'upi' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          UPI ID / Virtual Payment Address
                        </label>
                        <input
                          type="text"
                          required
                          value={upiId}
                          onChange={e => setUpiId(e.target.value)}
                          placeholder="username@okhdfc"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-hidden focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-sans"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-center flex flex-col items-center">
                        <QrCode className="w-14 h-14 text-slate-700 dark:text-slate-300 mb-1.5" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Scan QR Code via PhonePe / GPay / Paytm
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Instant simulated confirmation</span>
                      </div>
                    </div>
                  )}

                  {method === 'card' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Demo card</span>
                        <button
                          type="button"
                          onClick={handleAutofillDemo}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Auto-fill Demo
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          placeholder="4242 4242 4242 4242"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono tabular-nums"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Expiry
                          </label>
                          <input
                            type="text"
                            required
                            value={expiry}
                            onChange={e => setExpiry(e.target.value)}
                            placeholder="MM/YY"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            CVV
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            value={cvv}
                            onChange={e => setCvv(e.target.value)}
                            placeholder="123"
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono tabular-nums"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={e => setCardHolder(e.target.value)}
                          placeholder="Name as on card"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-hidden focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  )}

                  {method === 'netbanking' && (
                    <div className="space-y-3">
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Select Bank
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {POPULAR_BANKS.map(bank => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedBank(bank.id)}
                            className={`p-3 text-left rounded-xl border text-xs font-medium transition-all ${
                              selectedBank === bank.id
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {bank.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full h-[52px] rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authorizing Payment...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Pay {formatINR(activeItem.amount)} Securely
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Redesigned "Payment Successful" View */
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                {/* Hero: Animated check icon (draw-in stroke + spring pop) */}
                <div className="text-center pt-2">
                  <motion.div
                    initial={prefersReducedMotion ? { scale: 1 } : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 280 }}
                    className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-600/10 mb-3"
                  >
                    <svg
                      className="w-8 h-8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <motion.path
                        d="M5 13l4 4L19 7"
                        initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
                      />
                    </svg>
                  </motion.div>

                  <h4 className="text-base font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                    Payment Successful
                  </h4>

                  {/* Focal Point: Large bold numerals ₹299.00 with "Paid via UPI" below */}
                  <div className="mt-1">
                    <p className="text-4xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white font-sans">
                      {formatINR(activeItem.amount)}
                    </p>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Paid via {method === 'upi' ? 'UPI' : method === 'card' ? 'Card' : 'Net Banking'}
                    </p>
                  </div>
                </div>

                {/* Receipt Card with Dashed Dividers */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 divide-y divide-dashed divide-slate-200 dark:divide-slate-700 text-xs">
                  {/* Transaction ID with Copy Button */}
                  <div className="pb-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Transaction ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {txnId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTxn}
                        aria-label="Copy Transaction ID"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Item */}
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Item</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {activeItem.name}
                    </span>
                  </div>

                  {/* Date & Time (IST) */}
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Date & Time (IST)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {paidAt}
                    </span>
                  </div>

                  {/* Payment Mode */}
                  <div className="py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Mode</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {method === 'upi' ? 'UPI' : method === 'card' ? 'Credit / Debit Card' : 'Net Banking'}
                    </span>
                  </div>

                  {/* Status Pill */}
                  <div className="pt-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Status</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Completed
                    </span>
                  </div>
                </div>

                {/* Primary Button: 52px full-width emerald with arrow slide on hover */}
                <div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="group w-full h-[52px] rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Return to Portal</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-1.5" />
                  </button>

                  {/* Ghost Buttons: Download receipt and Share */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadReceipt}
                      className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Download receipt
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors active:scale-95 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      Share
                    </button>
                  </div>
                </div>

                {/* Footer Note */}
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 pt-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  Confirmation sent to your email.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
