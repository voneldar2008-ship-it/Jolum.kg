import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  X,
  Info,
  RotateCcw,
} from 'lucide-react';
import { Language } from '../types/transit';
import { createTranslator } from '../i18n';
import { QrCodeGraphic, generatePrintableQrPng } from './QrCodeGraphic';
import { normalizeCustomShareUrl, ShareUrlResolution } from '../utils/share';

interface ShareQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolution: ShareUrlResolution;
  customUrl: string;
  onSetCustomUrl: (url: string) => void;
  lang: Language;
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  isOpen,
  onClose,
  resolution,
  customUrl,
  onSetCustomUrl,
  lang,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [urlInput, setUrlInput] = useState(customUrl);
  const [urlError, setUrlError] = useState<string | null>(null);

  const { t } = createTranslator(lang);

  useEffect(() => {
    setUrlInput(customUrl);
    setUrlError(null);
  }, [customUrl, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resolution.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback
      const el = document.createElement('textarea');
      el.value = resolution.url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t('appName')} — ${t('cityShort')}`,
          text: t('shareQr.subtitle'),
          url: resolution.url,
        });
        return;
      } catch {
        // User cancelled or share unsupported; fall back to copy
      }
    }
    await handleCopy();
  };

  const handleDownloadPng = async () => {
    setDownloading(true);
    try {
      const pngDataUrl = await generatePrintableQrPng(
        resolution.url,
        `${t('appName')} · ${t('cityShort')}`,
        t('shareQr.scanInstruction'),
        t('shareQr.printPosterSubtitle')
      );
      const link = document.createElement('a');
      link.href = pngDataUrl;
      link.download = 'jolum-manas-qr.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onSetCustomUrl('');
      setUrlError(null);
      return;
    }
    const normalized = normalizeCustomShareUrl(trimmed);
    if (!normalized) {
      setUrlError(t('shareQr.invalidUrl'));
      return;
    }
    setUrlError(null);
    onSetCustomUrl(normalized);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 dark:bg-slate-950/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-qr-modal-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="share-qr-modal-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100 truncate"
              >
                {t('shareQr.title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t('shareQr.subtitle')}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* QR Frame (white quiet-zone preserved for reliable scanning) */}
          <div className="flex flex-col items-center text-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <QrCodeGraphic
                value={resolution.url}
                size={208}
                label={`${t('shareQr.title')} — ${resolution.url}`}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('shareQr.scanInstruction')}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              {t('shareQr.printNote')}
            </p>
          </div>

          {/* Localhost fallback notice when running on local dev server */}
          {resolution.isLocalPreview && resolution.source !== 'custom' && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200">
              <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{t('shareQr.localNotice')}</span>
            </div>
          )}

          {/* Resolved Target URL Display */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              {t('shareQr.publicUrlLabel')}
            </span>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
              <a
                href={resolution.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs font-mono text-sky-700 dark:text-sky-400 hover:underline truncate"
                title={resolution.url}
              >
                {resolution.url}
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-300 transition-colors shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300">{t('shareQr.copiedBtn')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('shareQr.copyBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Primary Action Buttons (cleanly spaced grid so they never collide) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{t('shareQr.downloadBtn')}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>{copied ? t('shareQr.copiedBtn') : t('shareQr.shareBtn')}</span>
            </button>
          </div>

          <a
            href={resolution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>{t('shareQr.openSiteBtn')}</span>
          </a>

          {/* Optional Custom Domain Input */}
          <form onSubmit={handleApplyCustomUrl} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                placeholder={t('shareQr.customUrlPlaceholder')}
                aria-label={t('shareQr.customUrlPlaceholder')}
                className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-300 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 rounded-xl transition-colors shrink-0"
              >
                {t('shareQr.applyUrl')}
              </button>
              {customUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    setUrlError(null);
                    onSetCustomUrl('');
                  }}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0"
                  title={t('shareQr.resetUrl')}
                  aria-label={t('shareQr.resetUrl')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {urlError && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{urlError}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};
