import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Film, Plus, FileText, Wallet, ChevronDown, Search, Calendar,
  Building2, User, CreditCard, Smartphone, Banknote, FileCheck, Trash2,
  X, Paperclip, ArrowUpRight, ArrowDownRight, Clapperboard,
  TrendingUp, Hash, Briefcase, CheckCircle2, Clock, AlertCircle,
  Image as ImageIcon, FileIcon, Receipt, ArrowLeft, Sun, Moon,
  RefreshCw, Pencil, FolderOpen,
  ExternalLink, Loader2, CloudOff, Cloud, Settings, Check, Palette, Mail
} from 'lucide-react';


// ============================================================
// STORAGE SHIM — supports both window.storage (Claude artifact)
// and localStorage (deployed environment). Keeps API identical.
// ============================================================
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    async get(key) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? null : { key, value: v, shared: false };
      } catch (e) { return null; }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return { key, value, shared: false };
      } catch (e) { return null; }
    },
    async delete(key) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true, shared: false };
      } catch (e) { return null; }
    },
    async list() { return { keys: Object.keys(localStorage) }; },
  };
}


// ============================================================
// WHITE LABEL: Change these to rebrand the app
// ============================================================
const BRAND = {
  name: 'CineLedger',
  tagline: 'Accounts for the silver screen',
  copyright: 'BrandEpic',
  author: 'Aang',
};

const DEPARTMENTS = [
  { name: 'Direction',        color: 'var(--brand-1)', emoji: '🎬' },
  { name: 'Production',       color: '#2563EB', emoji: '🎥' },
  { name: 'Cinematography',   color: 'var(--brand-2)', emoji: '📷' },
  { name: 'Art & Design',     color: '#DB2777', emoji: '🎨' },
  { name: 'Costume',          color: '#C026D3', emoji: '👗' },
  { name: 'Makeup & Hair',    color: '#E11D48', emoji: '💄' },
  { name: 'Sound',            color: '#4F46E5', emoji: '🎵' },
  { name: 'Editing',          color: '#0D9488', emoji: '✂️' },
  { name: 'VFX',              color: '#7C3AED', emoji: '✨' },
  { name: 'Music',            color: 'var(--brand-3)', emoji: '🎼' },
  { name: 'Lighting',         color: '#CA8A04', emoji: '💡' },
  { name: 'Stunts',           color: '#DC2626', emoji: '🤸' },
  { name: 'Locations',        color: '#16A34A', emoji: '📍' },
  { name: 'Catering',         color: '#65A30D', emoji: '🍽️' },
  { name: 'Transport',        color: '#0891B2', emoji: '🚐' },
  { name: 'Post-Production',  color: '#059669', emoji: '🎞️' },
  { name: 'Marketing & PR',   color: '#F97316', emoji: '📣' },
  { name: 'Miscellaneous',    color: '#64748B', emoji: '📦' },
];

const PAYMENT_MODES = [
  { value: 'cash',   label: 'Cash',         icon: Banknote,   needs: [] },
  { value: 'cheque', label: 'Cheque',       icon: FileCheck,  needs: ['chequeNo', 'bank'] },
  { value: 'gpay',   label: 'GPay',         icon: Smartphone, needs: ['txnId'] },
  { value: 'upi',    label: 'UPI',          icon: Smartphone, needs: ['upiId', 'txnId'] },
  { value: 'neft',   label: 'NEFT / RTGS',  icon: Building2,  needs: ['utr', 'bank'] },
  { value: 'card',   label: 'Card',         icon: CreditCard, needs: ['cardLast4'] },
];

const STATUSES = [
  { value: 'paid',     label: 'Paid',     color: '#16A34A', icon: CheckCircle2 },
  { value: 'pending',  label: 'Pending',  color: '#CA8A04', icon: Clock },
  { value: 'approved', label: 'Approved', color: '#2563EB', icon: AlertCircle },
];

const PROJECT_COLORS = [
  'var(--brand-1)', '#2563EB', 'var(--brand-2)', '#16A34A',
  '#7C3AED', 'var(--brand-3)', '#0891B2', '#DC2626',
  '#0D9488', '#C026D3', '#65A30D', '#4F46E5',
];

// ============================================================
// GOOGLE DRIVE INTEGRATION
// ----------------------------------------------------------------
// Talks to a Google Apps Script Web App that you deploy yourself.
// See cine-ledger-apps-script.gs in this folder for the script
// code. The Apps Script handles all Drive + Sheets operations and
// maintains a "CineLedger Config" sheet as the source of truth.
// ============================================================
const DRIVE_PARENT_FOLDER_ID = '1Q-eSFalmrtrzZVh0Ukgrl08S9RT8bF2G';
// Seed value for the Apps Script URL. Set to '' if you don't want a default.
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOB0FXVnajr8wU1YOKZAewXWOZPxJjqQbxXW9sMExgjCSykK8iKg99vw0-zN9K2hQV-A/exec';

// ============================================================
// AUTHORIZED ADMIN CREDENTIALS (hard-coded soft gate)
// Only this identity gains access to the app + admin features
// (gear icon, project enable/disable, etc.).
// ============================================================
const ADMIN_EMAIL = 'neurolooom@gmail.com';
const ADMIN_PIN   = '3397';

// Demo mode — bypasses login for pitches. Uses in-memory sample data;
// no real Drive sync, no admin gear.
const DEMO_USER = { email: 'demo@cineledger.app', role: 'demo' };

// ============================================================
// COLOR PALETTES
// Each palette redefines 4 brand color CSS variables. Users pick
// one via the palette picker; selection persists in storage.
// ============================================================
const PALETTES = [
  { id: 'cinema',  name: 'Cinema',  c1: '#E11D74', c2: '#EA580C', c3: '#D97706', c4: '#7C3AED' },
  { id: 'noir',    name: 'Noir',    c1: '#0F172A', c2: '#475569', c3: '#DC2626', c4: '#CA8A04' },
  { id: 'indie',   name: 'Indie',   c1: '#0D9488', c2: '#22C55E', c3: '#F472B6', c4: '#A78BFA' },
  { id: 'studio',  name: 'Studio',  c1: '#4F46E5', c2: '#0EA5E9', c3: '#06B6D4', c4: '#8B5CF6' },
  { id: 'forest',  name: 'Forest',  c1: '#059669', c2: '#14B8A6', c3: '#65A30D', c4: '#84CC16' },
  { id: 'sunset',  name: 'Sunset',  c1: '#DC2626', c2: '#F97316', c3: '#EAB308', c4: '#EC4899' },
  { id: 'royal',   name: 'Royal',   c1: '#7E22CE', c2: '#A855F7', c3: '#EC4899', c4: '#D97706' },
  { id: 'ocean',   name: 'Ocean',   c1: '#1E40AF', c2: '#2563EB', c3: '#06B6D4', c4: '#10B981' },
  { id: 'vintage', name: 'Vintage', c1: '#854D0E', c2: '#92400E', c3: '#A16207', c4: '#C2410C' },
  { id: 'mono',    name: 'Mono',    c1: '#1E293B', c2: '#475569', c3: '#64748B', c4: '#94A3B8' },
  { id: 'vibrant', name: 'Vibrant', c1: '#EC4899', c2: '#3B82F6', c3: '#84CC16', c4: '#F97316' },
  { id: 'pastel',  name: 'Pastel',  c1: '#F472B6', c2: '#FB923C', c3: '#34D399', c4: '#A78BFA' },
];
const DEFAULT_PALETTE_ID = 'cinema';

function getPalette(id) {
  return PALETTES.find(p => p.id === id) || PALETTES[0];
}

// Demo seed data — projects, bills, parties. Loaded fresh each demo session.
function getDemoSeed() {
  const now = new Date();
  const daysAgo = (n) => {
    const d = new Date(now); d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const projects = [
    { id: 'demo-p1', name: 'Untitled Feature 2026', prefix: 'UF26', color: 'var(--brand-1)', notes: 'Director: R. Menon · Producer: BrandEpic', enabled: true, createdAt: new Date().toISOString(), driveStatus: 'synced', driveFolderId: 'demo', driveFolderUrl: '#', driveSheetId: 'demo', driveSheetUrl: '#', driveSyncedAt: new Date().toISOString(), driveError: null, billCounter: 7 },
    { id: 'demo-p2', name: 'Music Video — Last Take', prefix: 'LTKV', color: '#16A34A', notes: 'Artist: Anaya · 3-day shoot', enabled: true, createdAt: new Date().toISOString(), driveStatus: 'synced', driveFolderId: 'demo', driveFolderUrl: '#', driveSheetId: 'demo', driveSheetUrl: '#', driveSyncedAt: new Date().toISOString(), driveError: null, billCounter: 4 },
    { id: 'demo-p3', name: 'Brand Film — Indigo', prefix: 'INDG', color: '#2563EB', notes: 'Client: Indigo Co · 30s + 15s cutdown', enabled: true, createdAt: new Date().toISOString(), driveStatus: 'pending', driveFolderId: null, driveFolderUrl: null, driveSheetId: null, driveSheetUrl: null, driveSyncedAt: null, driveError: null, billCounter: 0 },
  ];
  const bills = [
    // Untitled Feature 2026
    { id: 'demo-b1', project: 'Untitled Feature 2026', date: daysAgo(2),  billNumber: 'UF26-0001', department: 'Costume',  category: 'Designer Fee',     paidBy: 'BrandEpic Production', paidTo: 'A. Mehrotra',   amount: 85000, paymentMode: 'neft',  utr: 'UTRX9182',     status: 'paid',    approvedBy: 'R. Menon',   description: 'Lead designer week 3 fee', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b2', project: 'Untitled Feature 2026', date: daysAgo(4),  billNumber: 'UF26-0002', department: 'Camera',   category: 'Rental',           paidBy: 'BrandEpic Production', paidTo: 'Cinerent Studios', amount: 142000, paymentMode: 'cheque', chequeNo: 'CHQ-44521', bank: 'HDFC', status: 'paid',    approvedBy: 'R. Menon',   description: 'ARRI Alexa Mini LF — 5-day package', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b3', project: 'Untitled Feature 2026', date: daysAgo(6),  billNumber: 'UF26-0003', department: 'Catering', category: 'Daily Meals',      paidBy: 'BrandEpic Production', paidTo: 'Sangeetha Caterers', amount: 38500, paymentMode: 'upi',   upiId: 'sangeetha@okhdfc', status: 'paid',    approvedBy: 'P. Iyer',  description: '85 crew × 3 meals (Day 12)', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b4', project: 'Untitled Feature 2026', date: daysAgo(7),  billNumber: 'UF26-0004', department: 'Lighting', category: 'Gaffer Fee',       paidBy: 'BrandEpic Production', paidTo: 'K. Subramanian', amount: 65000, paymentMode: 'gpay',  upiId: '9845xxxx@oksbi', status: 'paid',    approvedBy: 'R. Menon',  description: 'Gaffer wages — Week 2', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b5', project: 'Untitled Feature 2026', date: daysAgo(9),  billNumber: 'UF26-0005', department: 'Art',      category: 'Props',            paidBy: 'A. Mehrotra',          paidTo: 'Bombay Props Co', amount: 24200, paymentMode: 'cash',  status: 'pending', approvedBy: '',           description: 'Period props for Act 2', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b6', project: 'Untitled Feature 2026', date: daysAgo(12), billNumber: 'UF26-0006', department: 'Sound',    category: 'Boom Operator',    paidBy: 'BrandEpic Production', paidTo: 'M. Nair',       amount: 42000, paymentMode: 'neft',  utr: 'UTRY7732',     status: 'paid',    approvedBy: 'R. Menon',   description: '14-day shoot fee', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b7', project: 'Untitled Feature 2026', date: daysAgo(15), billNumber: 'UF26-0007', department: 'Transport',category: 'Driver wages',     paidBy: 'BrandEpic Production', paidTo: 'Sri Travels',   amount: 56800, paymentMode: 'neft',  utr: 'UTRZ4419',     status: 'approved', approvedBy: 'P. Iyer',  description: '2 vans × 14 days', attachments: [], createdAt: new Date().toISOString() },
    // Music Video — Last Take
    { id: 'demo-b8',  project: 'Music Video — Last Take', date: daysAgo(1),  billNumber: 'LTKV-0001', department: 'Camera',    category: 'DOP Fee',          paidBy: 'BrandEpic Production', paidTo: 'S. Sharma',    amount: 120000, paymentMode: 'neft', utr: 'UTRMV0001', status: 'paid',    approvedBy: 'Anaya',  description: 'DOP — 3-day shoot', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b9',  project: 'Music Video — Last Take', date: daysAgo(3),  billNumber: 'LTKV-0002', department: 'Costume',   category: 'Stylist',          paidBy: 'BrandEpic Production', paidTo: 'P. Kapoor',    amount: 45000, paymentMode: 'upi',  upiId: 'pk@okicici', status: 'paid',    approvedBy: 'Anaya',  description: 'Wardrobe + on-set styling', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b10', project: 'Music Video — Last Take', date: daysAgo(5),  billNumber: 'LTKV-0003', department: 'Catering',  category: 'Daily Meals',      paidBy: 'BrandEpic Production', paidTo: 'Sangeetha Caterers', amount: 18000, paymentMode: 'upi', upiId: 'sangeetha@okhdfc', status: 'paid', approvedBy: 'Anaya', description: '32 crew × 3 days', attachments: [], createdAt: new Date().toISOString() },
    { id: 'demo-b11', project: 'Music Video — Last Take', date: daysAgo(6),  billNumber: 'LTKV-0004', department: 'Lighting',  category: 'Equipment',        paidBy: 'BrandEpic Production', paidTo: 'Cinerent Studios', amount: 88500, paymentMode: 'cheque', chequeNo: 'CHQ-44600', bank: 'HDFC', status: 'pending', approvedBy: '', description: '5K + HMI rental', attachments: [], createdAt: new Date().toISOString() },
  ];
  const parties = [
    { id: 'demo-pa1', name: 'BrandEpic Production' },
    { id: 'demo-pa2', name: 'A. Mehrotra' },
    { id: 'demo-pa3', name: 'Cinerent Studios' },
    { id: 'demo-pa4', name: 'Sangeetha Caterers' },
    { id: 'demo-pa5', name: 'K. Subramanian' },
    { id: 'demo-pa6', name: 'Bombay Props Co' },
    { id: 'demo-pa7', name: 'M. Nair' },
    { id: 'demo-pa8', name: 'Sri Travels' },
    { id: 'demo-pa9', name: 'S. Sharma' },
    { id: 'demo-pa10', name: 'P. Kapoor' },
    { id: 'demo-pa11', name: 'R. Menon' },
    { id: 'demo-pa12', name: 'P. Iyer' },
    { id: 'demo-pa13', name: 'Anaya' },
  ];
  return { projects, bills, parties };
}

function LoginScreen({ onLogin, onStartDemo, onCancel, theme, toggleTheme }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErr('');
    setBusy(true);
    // Slight delay so the button feels responsive
    setTimeout(() => {
      const r = onLogin(email, pin);
      setBusy(false);
      if (!r.ok) setErr(r.error || 'Login failed');
    }, 120);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative">
      {/* Theme toggle pinned top-right even on login screen */}
      <div className="absolute top-4 right-4">
        <ThemeToggle theme={theme} onClick={toggleTheme} />
      </div>

      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4"
          style={{ background: 'linear-gradient(135deg, var(--brand-1) 0%, var(--brand-2) 50%, var(--brand-3) 100%)' }}
        >
          <Clapperboard className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <h1
          className="text-4xl sm:text-5xl leading-none"
          style={{ fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.02em', color: 'var(--text)' }}
        >
          CineLedger
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Accounts for the silver screen</p>
      </div>

      {/* Login card */}
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border p-6 sm:p-7"
        style={{ background: 'var(--surface-elevated)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
          Sign in
        </div>
        <h2 className="text-2xl mb-5" style={{ fontFamily: '"Bebas Neue", sans-serif', color: 'var(--text)' }}>
          Admin Access
        </h2>

        <label className="block text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>
          Email
        </label>
        <input
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoFocus
          className={inputBaseClasses + ' mb-4'}
          style={inputStyle}
        />

        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>
            PIN
          </label>
          <button
            type="button"
            onClick={() => setShowPin(s => !s)}
            className="text-[10px] uppercase tracking-wider font-bold transition hover:opacity-80"
            style={{ color: 'var(--text-3)' }}
          >
            {showPin ? '◉ Hide' : '○ Show'}
          </button>
        </div>
        <input
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          autoComplete="current-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="••••"
          maxLength={12}
          className={inputBaseClasses + ' mb-4'}
          style={{ ...inputStyle, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: showPin ? '0.1em' : '0.2em' }}
        />

        {err && (
          <div
            className="mb-4 px-3 py-2 rounded-lg text-xs flex items-start gap-2"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#B91C1C' }}
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !email || !pin}
          className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--brand-3), var(--brand-2), var(--brand-1))' }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
          {busy ? 'Verifying…' : 'Sign In'}
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-4)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Demo mode button */}
        <button
          type="button"
          onClick={onStartDemo}
          className="w-full py-3 rounded-xl font-bold text-sm transition border-2 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
          style={{
            background: 'transparent',
            borderColor: 'var(--border-strong)',
            color: 'var(--text)',
          }}
        >
          <Clapperboard className="w-4 h-4" />
          Try Demo
        </button>

        <div className="mt-3 text-[11px] text-center leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Explore CineLedger with sample data — no login needed.
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 w-full py-2 rounded-lg text-xs font-semibold transition"
            style={{ color: 'var(--text-3)' }}
          >
            ← Back to demo
          </button>
        )}
      </form>

      <div className="mt-6 text-[11px]" style={{ color: 'var(--text-4)' }}>
        © 2026 <span style={{ color: 'var(--brand-1)', fontWeight: 700 }}>BrandEpic</span> by <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>Aang</span>
      </div>
    </div>
  );
}

// Palette picker — Office-style quadrant circles in a grid.
// Each circle shows the 4 brand colors of a palette. Selected one
// gets a checkmark badge.
function PalettePicker({ current, onChange, columns = 6 }) {
  return (
    <div
      className="grid gap-2.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {PALETTES.map(p => {
        const selected = current === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            title={p.name}
            className="relative aspect-square rounded-xl transition-all hover:scale-110 active:scale-95"
            style={{
              padding: '4px',
              background: selected ? 'var(--surface-3)' : 'transparent',
              border: selected ? '1px solid var(--border-strong)' : '1px solid transparent',
            }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden border"
              style={{ borderColor: selected ? 'var(--text)' : 'var(--border)' }}
            >
              <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                <div style={{ background: p.c1 }} />
                <div style={{ background: p.c2 }} />
                <div style={{ background: p.c4 }} />
                <div style={{ background: p.c3 }} />
              </div>
            </div>
            {selected && (
              <div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-md"
                style={{ background: '#2563EB' }}
              >
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Banner shown while a demo session is active
function DemoBanner({ onSignIn, onExit, onContact }) {
  return (
    <div
      className="px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-white text-xs sm:text-sm"
      style={{
        background: 'linear-gradient(90deg, var(--brand-1) 0%, var(--brand-2) 50%, var(--brand-3) 100%)',
        fontWeight: 600,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Clapperboard className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">
          <span className="font-bold tracking-wider mr-2">DEMO MODE</span>
          <span className="hidden sm:inline opacity-90">Sample data · changes are session-only · no Drive sync</span>
          <span className="sm:hidden opacity-90">Sample data, session-only</span>
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onContact && (
          <button
            onClick={onContact}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition flex items-center gap-1"
            style={{ background: 'rgba(0,0,0,0.25)', color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.25)'}
          >
            <Mail className="w-3 h-3" />
            <span className="hidden sm:inline">Contact Us</span>
            <span className="sm:hidden">Contact</span>
          </button>
        )}
        {onSignIn && (
          <button
            onClick={onSignIn}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition"
            style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--brand-1)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#ffffff'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CONTACT US MODAL
// Lead-capture form for demo viewers. Posts to the Apps Script
// `submitLead` action, which appends to a Leads tab in the Config sheet.
// ============================================================
// Country codes for the contact form. Curated for the markets a cine
// production might care about; "+91 IN" lands first since that's home base.
const CONTACT_COUNTRY_CODES = [
  { code: '+91',  label: 'IN' },
  { code: '+1',   label: 'US' },
  { code: '+44',  label: 'UK' },
  { code: '+971', label: 'AE' },
  { code: '+65',  label: 'SG' },
  { code: '+61',  label: 'AU' },
  { code: '+49',  label: 'DE' },
  { code: '+33',  label: 'FR' },
  { code: '+81',  label: 'JP' },
  { code: '+86',  label: 'CN' },
  { code: '+82',  label: 'KR' },
  { code: '+880', label: 'BD' },
  { code: '+94',  label: 'LK' },
  { code: '+977', label: 'NP' },
  { code: '+60',  label: 'MY' },
  { code: '+66',  label: 'TH' },
  { code: '+20',  label: 'EG' },
  { code: '+27',  label: 'ZA' },
  { code: '+55',  label: 'BR' },
  { code: '+52',  label: 'MX' },
];

function ContactUsModal({ open, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [comments, setComments] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  // Reset form state each time the modal opens fresh
  useEffect(() => {
    if (open) {
      setName(''); setEmail(''); setCountryCode('+91');
      setPhoneNumber(''); setComments(''); setPreferredTime('');
      setBusy(false); setErr(''); setSent(false);
    }
  }, [open]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // Allow only digits in the phone number input
  const onPhoneChange = (raw) => setPhoneNumber(raw.replace(/\D/g, '').slice(0, 15));

  const submit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setErr('');
    const cleanName  = name.trim();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const cleanEmail = email.trim();

    if (!cleanName) return setErr('Please enter your name');
    if (!countryCode) return setErr('Please select a country code');
    if (!cleanPhone) return setErr('Please enter your contact number');
    if (cleanPhone.length < 6 || cleanPhone.length > 15) {
      return setErr('Contact number should be 6–15 digits');
    }
    if (cleanEmail && !validEmail(cleanEmail)) {
      return setErr('Email looks invalid — leave blank if you prefer not to share');
    }

    setBusy(true);
    try {
      const r = await onSubmit({
        name: cleanName,
        email: cleanEmail,
        countryCode,
        phoneNumber: cleanPhone,
        comments: comments.trim(),
        preferredTime: preferredTime.trim(),
        source: 'demo',
      });
      if (r?.ok) {
        setSent(true);
      } else {
        setErr(r?.error || 'Could not send. Please try again.');
      }
    } catch (e) {
      setErr(e?.message || 'Could not send. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 fade-in flex items-stretch sm:items-center justify-center sm:p-6"
      style={{ background: 'var(--overlay)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md sm:max-h-[90vh] h-full sm:h-auto sm:rounded-3xl flex flex-col"
        style={{
          background: 'var(--surface-elevated)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-strong)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — brand gradient so it pops in demo */}
        <div
          className="flex-shrink-0 px-5 py-4 sm:rounded-t-3xl flex items-center justify-between text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-80 font-bold">Get in touch</div>
              <div className="text-base font-bold leading-tight">Let's talk CineLedger</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition"
            style={{ background: 'rgba(0,0,0,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
          {sent ? (
            <div className="text-center py-10">
              <div
                className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(22, 163, 74, 0.12)' }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: '#16A34A' }} />
              </div>
              <div className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
                Got it — thanks!
              </div>
              <div className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
                We'll reach out to you at your preferred time.
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--brand-gradient)' }}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>
                Building something cinematic and want CineLedger for your production?
                Drop your details and we'll be in touch.
              </p>

              <label className="block text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>
                Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoFocus
                className={inputBaseClasses + ' mb-3'}
                style={inputStyle}
              />

              <label className="block text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>
                Contact No <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="flex gap-2 mb-3">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className={inputBaseClasses + ' appearance-none cursor-pointer'}
                  style={{
                    ...inputStyle,
                    width: '110px',
                    flexShrink: 0,
                    paddingRight: '28px',
                    backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2.5\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >
                  {CONTACT_COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} {c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phoneNumber}
                  onChange={e => onPhoneChange(e.target.value)}
                  placeholder="9876543210"
                  maxLength={15}
                  className={inputBaseClasses + ' flex-1 min-w-0'}
                  style={{ ...inputStyle, fontFamily: '"IBM Plex Mono", monospace' }}
                />
              </div>

              <label className="block text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>
                Mail ID <span className="font-medium normal-case tracking-normal" style={{ color: 'var(--text-4)' }}>(optional)</span>
              </label>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@production.com"
                className={inputBaseClasses + ' mb-3'}
                style={inputStyle}
              />

              <label className="block text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>
                Comments / Details
              </label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Project type, team size, what you're hoping to use CineLedger for…"
                rows={3}
                className={inputBaseClasses + ' resize-none mb-3'}
                style={inputStyle}
              />

              <label className="block text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--text-3)' }}>
                Preferred Date &amp; Time to Reach Out
              </label>
              <input
                type="datetime-local"
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                className={inputBaseClasses + ' mb-4'}
                style={inputStyle}
              />

              {err && (
                <div
                  className="mb-4 px-3 py-2 rounded-lg text-xs flex items-start gap-2"
                  style={{ background: 'rgba(239,68,68,0.10)', color: '#B91C1C' }}
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'var(--brand-gradient)' }}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {busy ? 'Sending…' : 'Send'}
              </button>

              <div className="text-[11px] text-center mt-3" style={{ color: 'var(--text-4)' }}>
                Your details are sent directly to the CineLedger team.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================

const driveAdapter = {
  async call(scriptUrl, action, payload = {}) {
    if (!scriptUrl) throw new Error('Apps Script URL not configured — open Settings');
    let res;
    try {
      res = await fetch(scriptUrl, {
        method: 'POST',
        // text/plain avoids the CORS preflight that Apps Script doesn't handle
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
        redirect: 'follow',
        mode: 'cors',
        credentials: 'omit',
      });
    } catch (e) {
      throw new Error(
        'Could not reach Apps Script. Most likely causes:\n' +
        '• In this Claude preview, external POSTs to script.google.com are blocked by the sandbox — the call will work once you deploy this app outside the preview.\n' +
        '• Open the URL in a new browser tab to confirm the script is alive (you should see JSON).\n' +
        '• Deployment must be "Execute as: Me" + "Who has access: Anyone".\n' +
        'Raw: ' + (e.message || String(e))
      );
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} from Apps Script`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Bad response from Apps Script (not JSON): ' + text.slice(0, 200)); }
    if (data.error) throw new Error(data.error);
    return data;
  },

  ping(scriptUrl)                              { return this.call(scriptUrl, 'ping'); },
  getConfig(scriptUrl)                         { return this.call(scriptUrl, 'getConfig'); },
  updateConfig(scriptUrl, row)                 { return this.call(scriptUrl, 'updateConfig', { row }); },
  deleteProject(scriptUrl, projectName)        { return this.call(scriptUrl, 'deleteProject', { projectName }); },
  syncProject(scriptUrl, projectName, prefix, bills) {
    return this.call(scriptUrl, 'syncProject', { projectName, prefix, bills });
  },
  submitLead(scriptUrl, lead) {
    // Lead capture from demo viewers. Writes to a "Leads" tab in the Config sheet.
    return this.call(scriptUrl, 'submitLead', { lead });
  },
};

// ============================================================
// DATA LAYER — swap these with API calls when you have a backend
// ============================================================
const dataLayer = {
  get: async (key) => {
    try {
      const r = await window.storage.get(key);
      return r?.value ? JSON.parse(r.value) : null;
    } catch (e) { return null; }
  },
  set: async (key, value) => {
    try {
      const payload = JSON.stringify(value);
      await window.storage.set(key, payload);
    } catch (e) {
      // Most common cause: localStorage quota (~5MB) exceeded.
      // We log loudly because a silent drop here looks like data loss to the user.
      console.error('[CineLedger] Storage write FAILED for key', key, '— payload size:',
                    (() => { try { return JSON.stringify(value).length; } catch { return '?'; } })(),
                    'bytes. Likely cause: localStorage quota exceeded.', e);
    }
  },
  getRaw: async (key) => {
    try {
      const r = await window.storage.get(key);
      return r?.value || null;
    } catch (e) { return null; }
  },
  setRaw: async (key, value) => {
    try { await window.storage.set(key, value); } catch (e) {
      console.error('[CineLedger] Storage write FAILED for key', key, e);
    }
  },
};

// ============================================================
// HELPERS
// ============================================================
const formatCurrency = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const todayISO = () => new Date().toISOString().slice(0, 10);
const getDept = (name) => DEPARTMENTS.find(d => d.name === name) || DEPARTMENTS[DEPARTMENTS.length - 1];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const suggestPrefix = (name) => {
  if (!name) return '';
  const words = name.trim().split(/\s+/).filter(w => /[A-Za-z]/.test(w));
  if (words.length === 0) return '';
  if (words.length === 1) {
    return words[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  }
  return words.map(w => {
    const upper = w.match(/[A-Z]/);
    return upper ? upper[0] : w[0].toUpperCase();
  }).join('').slice(0, 5);
};

const generateBillNo = (projectName, projects, bills) => {
  if (!projectName) return '';
  const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
  const prefix = ((project?.prefix) || suggestPrefix(projectName) || 'BILL').toUpperCase();
  const count = bills.filter(b => b.project && b.project.toLowerCase() === projectName.toLowerCase()).length;
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};

// ============================================================
// THEME CSS
// ============================================================
const THEME_CSS = `
  .theme-light {
    --bg: radial-gradient(ellipse 80% 60% at 15% 0%, #FFF1F5 0%, transparent 55%),
          radial-gradient(ellipse 70% 60% at 90% 20%, #FFF7DC 0%, transparent 55%),
          radial-gradient(ellipse 80% 80% at 50% 110%, #EAF1FF 0%, transparent 60%),
          #FCFCFE;
    --surface: #ffffff;
    --surface-2: #f8fafc;
    --surface-3: #f1f5f9;
    --surface-elevated: #ffffff;
    --surface-hover: #f1f5f9;
    --border: #e2e8f0;
    --border-soft: rgba(226, 232, 240, 0.6);
    --border-strong: #cbd5e1;
    --text: #0f172a;
    --text-2: #334155;
    --text-3: #64748b;
    --text-4: #94a3b8;
    --text-divider: #cbd5e1;
    --header-bg: rgba(255, 255, 255, 0.75);
    --nav-bg: rgba(255, 255, 255, 0.9);
    --header-border: rgba(226, 232, 240, 0.6);
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 10px 30px -10px rgba(0, 0, 0, 0.15);
    --overlay: rgba(15, 23, 42, 0.6);
    --badge-sent-bg: #FEE2E2;
    --badge-sent-text: #B91C1C;
    --badge-recv-bg: #DCFCE7;
    --badge-recv-text: #15803D;
    --autofill-bg: #FAFAFC;
    --autofill-text: #0F172A;
    --select-option-bg: #ffffff;
    --select-option-text: #0F172A;
    --select-arrow: #64748b;
    --money-paid: #059669;
    --money-recv: var(--brand-3);
  }
  .theme-dark {
    --bg: radial-gradient(ellipse 80% 60% at 15% 0%, rgba(225, 29, 116, 0.18) 0%, transparent 55%),
          radial-gradient(ellipse 70% 60% at 90% 20%, rgba(217, 119, 6, 0.12) 0%, transparent 55%),
          radial-gradient(ellipse 80% 80% at 50% 110%, rgba(37, 99, 235, 0.14) 0%, transparent 60%),
          #0A0E27;
    --surface: rgba(255, 255, 255, 0.04);
    --surface-2: rgba(255, 255, 255, 0.06);
    --surface-3: rgba(255, 255, 255, 0.09);
    --surface-elevated: #161B3A;
    --surface-hover: rgba(255, 255, 255, 0.08);
    --border: rgba(255, 255, 255, 0.1);
    --border-soft: rgba(255, 255, 255, 0.06);
    --border-strong: rgba(255, 255, 255, 0.2);
    --text: #f1f5f9;
    --text-2: #cbd5e1;
    --text-3: #94a3b8;
    --text-4: #64748b;
    --text-divider: rgba(255, 255, 255, 0.15);
    --header-bg: rgba(10, 14, 39, 0.72);
    --nav-bg: rgba(10, 14, 39, 0.9);
    --header-border: rgba(255, 255, 255, 0.08);
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
    --overlay: rgba(2, 6, 23, 0.94);
    --badge-sent-bg: rgba(239, 68, 68, 0.18);
    --badge-sent-text: #FCA5A5;
    --badge-recv-bg: rgba(34, 197, 94, 0.18);
    --badge-recv-text: #86EFAC;
    --autofill-bg: rgba(255, 255, 255, 0.05);
    --autofill-text: #f1f5f9;
    --select-option-bg: #1e293b;
    --select-option-text: #f1f5f9;
    --select-arrow: #94a3b8;
    --money-paid: #34D399;
    --money-recv: #FBBF24;
  }

  input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus,
  select:-webkit-autofill, textarea:-webkit-autofill {
    -webkit-text-fill-color: var(--autofill-text) !important;
    -webkit-box-shadow: 0 0 0 1000px var(--autofill-bg) inset !important;
    transition: background-color 5000s ease-in-out 0s;
  }
  select option {
    background-color: var(--select-option-bg);
    color: var(--select-option-text);
  }
  @keyframes slideup { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  .fade-in { animation: fadeIn 0.4s ease-out both; }
  .scale-in { animation: scaleIn 0.2s ease-out both; }
  .theme-transition, .theme-transition * { transition: background-color 0.25s ease, color 0.2s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
`;

// ============================================================
// FONT LOADER
// ============================================================
function FontLoader() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);
  return null;
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [screen, setScreen] = useState('form');
  const [bills, setBills] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parties, setParties] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [authUser, setAuthUser] = useState(null);  // null when logged out
  const [settings, setSettings] = useState({
    scriptUrl: DEFAULT_SCRIPT_URL,
    parentFolderId: DRIVE_PARENT_FOLDER_ID,
    configSheetUrl: '',
  });
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  // Derived: is the current session an authenticated admin?
  const isAdmin = Boolean(authUser && authUser.email && authUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  const isDemo  = Boolean(authUser && authUser.role === 'demo');

  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch (e) {}
    return 'light';
  });
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE_ID);
  const palette = useMemo(() => getPalette(paletteId), [paletteId]);
  const changePalette = (id) => {
    setPaletteId(id);
    dataLayer.setRaw('cine-palette', id);
  };

  useEffect(() => {
    (async () => {
      const [b, pr, pa, t, sel, st, au, pal] = await Promise.all([
        dataLayer.get('cine-bills'),
        dataLayer.get('cine-projects'),
        dataLayer.get('cine-parties'),
        dataLayer.getRaw('cine-theme'),
        dataLayer.getRaw('cine-selected-project'),
        dataLayer.get('cine-settings'),
        dataLayer.get('cine-auth'),
        dataLayer.getRaw('cine-palette'),
      ]);
      if (Array.isArray(b)) setBills(b);
      if (Array.isArray(pr)) {
        // Migrate older projects without 'enabled' flag — default to true
        setProjects(pr.map(p => p.enabled === false ? p : { ...p, enabled: p.enabled !== false }));
      }
      if (Array.isArray(pa)) setParties(pa);
      if (t === 'dark' || t === 'light') setTheme(t);
      if (pal && PALETTES.some(p => p.id === pal)) setPaletteId(pal);
      if (sel) setSelectedProjectId(sel);
      if (st && typeof st === 'object') {
        setSettings(s => ({
          ...s,
          ...st,
          scriptUrl: st.scriptUrl || s.scriptUrl, // keep default if saved is empty
          parentFolderId: st.parentFolderId || s.parentFolderId,
        }));
      }
      // Restore auth only if it matches the hard-coded admin (defensive)
      if (au && typeof au === 'object' && au.email && au.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setAuthUser(au);
      } else {
        // No admin session — boot into Demo Mode by default with sample data.
        // Admin-stored data is left intact in storage; demo lives in memory.
        const seed = getDemoSeed();
        setBills(seed.bills);
        setProjects(seed.projects);
        setParties(seed.parties);
        setAuthUser(DEMO_USER);
      }
      setLoaded(true);
    })();
  }, []);

  // Auto-refresh from Drive Config when an admin session regains focus
  // (e.g. switching back to the tab after editing the Config sheet directly).
  // Debounced to avoid hammering the Apps Script. Demo sessions are skipped.
  useEffect(() => {
    if (!loaded) return;
    if (!authUser || authUser.role !== 'admin') return;
    if (!settings.scriptUrl) return;

    let lastRun = 0;
    const REFRESH_COOLDOWN_MS = 30 * 1000; // at most once every 30s

    const tryRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastRun < REFRESH_COOLDOWN_MS) return;
      lastRun = now;
      refreshConfigFromDrive({ silent: true }).catch(() => {});
    };

    window.addEventListener('focus', tryRefresh);
    document.addEventListener('visibilitychange', tryRefresh);
    return () => {
      window.removeEventListener('focus', tryRefresh);
      document.removeEventListener('visibilitychange', tryRefresh);
    };
  }, [loaded, authUser, settings.scriptUrl]);

  // Strip base64 data + blob previews from attachments before writing to localStorage.
  // The base64 only exists for one purpose — upload to Drive — and is huge. After
  // Drive sync we have the URL; before sync there's no point persisting it (5MB quota
  // would silently break). Blob URLs are session-scoped anyway.
  const stripAttachmentsForStorage = (billsArr) => billsArr.map(b => ({
    ...b,
    attachments: Array.isArray(b.attachments)
      ? b.attachments.map(att => ({
          name: att.name,
          size: att.size,
          type: att.type,
          driveId: att.driveId || null,
          driveUrl: att.driveUrl || null,
          uploadedAt: att.uploadedAt || null,
        }))
      : [],
  }));

  const persistBills    = (next) => { setBills(next);    if (!isDemo) dataLayer.set('cine-bills', stripAttachmentsForStorage(next)); };
  const persistProjects = (next) => { setProjects(next); if (!isDemo) dataLayer.set('cine-projects', next); };
  const persistParties  = (next) => { setParties(next);  if (!isDemo) dataLayer.set('cine-parties', next); };
  const persistSettings = (next) => { setSettings(next); if (!isDemo) dataLayer.set('cine-settings', next); };

  const updateSettings = (patch) => persistSettings({ ...settings, ...patch });

  const selectProject = (id) => {
    setSelectedProjectId(id);
    if (isDemo) return; // Demo selection is session-only; don't pollute storage
    if (id) dataLayer.setRaw('cine-selected-project', id);
    else    dataLayer.setRaw('cine-selected-project', '');
  };

  // Apply a partial update to a single project's record (used for drive status)
  const patchProject = (id, patch) => {
    setProjects(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...patch } : p);
      dataLayer.set('cine-projects', next);
      return next;
    });
  };

  // Sync this project's bills to Drive — creates folder + sheet on first run
  // (idempotent on the Apps Script side), then writes all bills for the project.
  const syncProjectBills = async (projectId, opts = {}) => {
    const project = opts.projectOverride || projects.find(p => p.id === projectId);
    if (!project) return { ok: false };
    // Demo sessions never make real Drive calls — pretend it succeeded
    if (isDemo) {
      patchProject(projectId, { driveStatus: 'synced', driveSyncedAt: new Date().toISOString(), driveError: null });
      if (!opts.silent) flashToast('success', 'Synced (demo)');
      return { ok: true, billsSynced: 0, attachmentsUploaded: {} };
    }
    if (!settings.scriptUrl) {
      if (!opts.silent) flashToast('info', 'Set the Apps Script URL in Settings first');
      return { ok: false };
    }
    const sourceBills = opts.billsOverride || bills;
    patchProject(projectId, { driveStatus: 'syncing', driveError: null });
    const projectBills = sourceBills.filter(b => b.project && b.project.toLowerCase() === project.name.toLowerCase());
    try {
      const r = await driveAdapter.syncProject(settings.scriptUrl, project.name, project.prefix, projectBills);
      patchProject(projectId, {
        driveStatus: 'synced',
        driveFolderId: r.folderId,
        driveFolderUrl: r.folderUrl,
        driveSheetId: r.sheetId,
        driveSheetUrl: r.sheetUrl,
        driveSyncedAt: new Date().toISOString(),
        driveError: null,
      });
      if (r.configSheetUrl && r.configSheetUrl !== settings.configSheetUrl) {
        persistSettings({ ...settings, configSheetUrl: r.configSheetUrl });
      }
      // Apply newly-uploaded Drive URLs onto each bill's attachments
      const uploads = r.attachmentsUploaded || {};
      if (Object.keys(uploads).length > 0) {
        const updated = sourceBills.map(b => {
          const ups = uploads[b.id];
          if (!ups || ups.length === 0 || !b.attachments) return b;
          const byIdx = {};
          ups.forEach(u => { byIdx[u.index] = u; });
          return {
            ...b,
            attachments: b.attachments.map((att, i) =>
              byIdx[i] ? { ...att, driveUrl: byIdx[i].url, driveId: byIdx[i].id } : att
            ),
          };
        });
        persistBills(updated);
      }
      const errs = r.attachmentErrors || [];
      if (!opts.silent) {
        if (errs.length > 0) {
          flashToast('info', `Synced ${r.billsSynced} bills · ${errs.length} attachment${errs.length === 1 ? '' : 's'} failed`);
        } else {
          flashToast('success', `Synced ${r.billsSynced ?? projectBills.length} bill${(r.billsSynced ?? projectBills.length) === 1 ? '' : 's'} to Drive`);
        }
      } else if (errs.length > 0) {
        // Silent mode still surfaces attachment problems
        flashToast('info', `Synced — ${errs.length} attachment${errs.length === 1 ? '' : 's'} failed to upload`);
      }
      return { ok: true, ...r };
    } catch (e) {
      patchProject(projectId, { driveStatus: 'failed', driveError: String(e.message || e) });
      if (!opts.silent) flashToast('info', 'Sync failed — open project for details');
      return { ok: false, error: e.message };
    }
  };

  // Pull the latest Config-sheet state into local projects (matches by name)
  const refreshConfigFromDrive = async (opts = {}) => {
    if (!settings.scriptUrl) {
      if (!opts.silent) flashToast('info', 'Set the Apps Script URL in Settings first');
      return { ok: false };
    }
    // Allow the caller to pass an explicit project list (e.g. from the just-loaded
    // admin data during sign-in, before React state has propagated). Falls back to
    // the closure `projects` for the normal Settings → Refresh button.
    const baseProjects = Array.isArray(opts.projectsOverride) ? opts.projectsOverride : projects;
    try {
      const r = await driveAdapter.getConfig(settings.scriptUrl);
      const cfgRows = Array.isArray(r.projects) ? r.projects : [];
      const localByName = new Map(baseProjects.map(p => [p.name.toLowerCase(), p]));

      // 1) Enrich existing local projects with Drive metadata
      const enrichedExisting = baseProjects.map(p => {
        const cfg = cfgRows.find(c => c.name.toLowerCase() === p.name.toLowerCase());
        if (!cfg) return p;
        return {
          ...p,
          driveStatus: cfg.sheetId ? 'synced' : (p.driveStatus || 'pending'),
          driveFolderId: cfg.folderId || p.driveFolderId,
          driveFolderUrl: cfg.folderUrl || p.driveFolderUrl,
          driveSheetId: cfg.sheetId || p.driveSheetId,
          driveSheetUrl: cfg.sheetUrl || p.driveSheetUrl,
          driveSyncedAt: cfg.lastSynced || p.driveSyncedAt,
        };
      });

      // 2) Materialize Config-sheet projects that DON'T exist locally yet.
      // This is the recovery path when localStorage was wiped or the user is
      // on a fresh browser — the Config sheet is the source of truth for which
      // projects exist in this workspace.
      let nextIndex = enrichedExisting.length;
      const newlyMaterialized = cfgRows
        .filter(cfg => !localByName.has(cfg.name.toLowerCase()))
        .map(cfg => ({
          id: uid(),
          name: cfg.name,
          prefix: (cfg.prefix || suggestPrefix(cfg.name) || 'BILL').toUpperCase(),
          color: PROJECT_COLORS[(nextIndex++) % PROJECT_COLORS.length],
          notes: cfg.notes || '',
          enabled: true,
          createdAt: cfg.lastSynced || new Date().toISOString(),
          driveStatus: cfg.sheetId ? 'synced' : 'pending',
          driveFolderId: cfg.folderId || null,
          driveFolderUrl: cfg.folderUrl || null,
          driveSheetId: cfg.sheetId || null,
          driveSheetUrl: cfg.sheetUrl || null,
          driveSyncedAt: cfg.lastSynced || null,
          driveError: null,
          billCounter: Number(cfg.billCount) || 0,
        }));

      const next = [...newlyMaterialized, ...enrichedExisting];
      persistProjects(next);
      persistSettings({ ...settings, configSheetUrl: r.configSheetUrl || settings.configSheetUrl });

      const recovered = newlyMaterialized.length;
      if (!opts.silent) {
        if (recovered > 0) {
          flashToast('success', `Recovered ${recovered} project${recovered === 1 ? '' : 's'} from Drive`);
        } else {
          flashToast('success', `Refreshed ${cfgRows.length} entries from Drive`);
        }
      }
      return { ok: true, recovered, total: cfgRows.length, projects: next, ...r };
    } catch (e) {
      if (!opts.silent) flashToast('info', 'Refresh failed: ' + (e.message || e));
      return { ok: false, error: e.message };
    }
  };

  // Push a manually-edited config row to Drive (admin override)
  const pushConfigRow = async (row) => {
    if (!settings.scriptUrl) {
      flashToast('info', 'Set the Apps Script URL in Settings first');
      return { ok: false };
    }
    try {
      await driveAdapter.updateConfig(settings.scriptUrl, row);
      // mirror locally
      const proj = projects.find(p => p.name.toLowerCase() === row.name.toLowerCase());
      if (proj) {
        patchProject(proj.id, {
          driveFolderId: row.folderId, driveFolderUrl: row.folderUrl,
          driveSheetId:  row.sheetId,  driveSheetUrl:  row.sheetUrl,
          driveStatus:   row.sheetId ? 'synced' : proj.driveStatus,
        });
      }
      flashToast('success', 'Config updated');
      return { ok: true };
    } catch (e) {
      flashToast('info', 'Update failed: ' + (e.message || e));
      return { ok: false, error: e.message };
    }
  };

  const flashToast = (kind, msg) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    dataLayer.setRaw('cine-theme', next);
  };

  // ----- Projects CRUD -----
  const addProject = (data) => {
    const trimmedName = data.name.trim();
    if (!trimmedName) return null;
    if (projects.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      return projects.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    }
    const newProject = {
      id: uid(),
      name: trimmedName,
      prefix: (data.prefix || suggestPrefix(trimmedName) || 'BILL').toUpperCase(),
      color: data.color || PROJECT_COLORS[projects.length % PROJECT_COLORS.length],
      notes: (data.notes || '').trim(),
      createdAt: new Date().toISOString(),
      driveStatus: 'pending',
      driveFolderId: null,
      driveFolderUrl: null,
      driveSheetId: null,
      driveSheetUrl: null,
      driveError: null,
      driveSyncedAt: null,
    };
    persistProjects([newProject, ...projects]);
    return newProject;
  };

  const updateProject = (id, data) => {
    const next = projects.map(p => p.id === id ? {
      ...p,
      name: data.name?.trim() ?? p.name,
      prefix: (data.prefix ?? p.prefix).toUpperCase(),
      color: data.color ?? p.color,
      notes: data.notes ?? p.notes,
    } : p);
    persistProjects(next);
  };

  const deleteProject = (id) => {
    persistProjects(projects.filter(p => p.id !== id));
  };

  // ----- Parties (auto-managed) -----
  const addPartyIfNew = (name, currentParties = parties) => {
    const trimmed = name?.trim();
    if (!trimmed) return currentParties;
    if (currentParties.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) return currentParties;
    const newParty = { id: uid(), name: trimmed, createdAt: new Date().toISOString() };
    const next = [newParty, ...currentParties];
    persistParties(next);
    return next;
  };

  // ----- Bill save (auto-creates project/parties if new) -----
  const saveBill = (bill) => {
    // Determine the bill's project — existing match or freshly created.
    // addProject() returns the project object even when a new one is created,
    // so we can use it directly without waiting for state to flush.
    let billProject = bill.project
      ? projects.find(p => p.name.toLowerCase() === bill.project.toLowerCase())
      : null;
    if (!billProject && bill.project) {
      billProject = addProject({ name: bill.project });
    }

    // Auto-add parties
    let nextParties = parties;
    nextParties = addPartyIfNew(bill.paidBy, nextParties);
    nextParties = addPartyIfNew(bill.paidTo, nextParties);

    const newBill = { ...bill, id: uid(), createdAt: new Date().toISOString() };
    const nextBills = [newBill, ...bills];
    persistBills(nextBills);
    flashToast('success', 'Bill saved · syncing to Drive…');

    // Auto-sync — we already have billProject in hand, no lookup needed.
    if (settings.scriptUrl && billProject) {
      syncProjectBills(billProject.id, {
        silent: true,
        billsOverride: nextBills,
        projectOverride: billProject,
      })
        .then(r => {
          if (r && r.ok) flashToast('success', 'Synced to Drive');
          else if (r && r.error) flashToast('info', 'Auto-sync failed — open Projects to retry');
        })
        .catch(e => console.warn('Auto-sync failed:', e));
    } else if (!settings.scriptUrl) {
      // No Drive backend configured — let the user know once.
      flashToast('info', 'Add an Apps Script URL in Settings to enable auto-sync');
    }
  };

  const deleteBill = (id) => {
    persistBills(bills.filter(b => b.id !== id));
    flashToast('info', 'Bill removed');
  };

  // Auth handlers — soft gate against the hard-coded admin credentials
  const [wantsLogin, setWantsLogin] = useState(false);

  // Reload real (admin) data from storage — used when transitioning from demo → admin.
  // Returns the freshly-loaded projects so callers can pass them to subsequent ops
  // (avoids the React-state-not-yet-propagated trap).
  const reloadRealData = async () => {
    const [b, pr, pa, sel] = await Promise.all([
      dataLayer.get('cine-bills'),
      dataLayer.get('cine-projects'),
      dataLayer.get('cine-parties'),
      dataLayer.getRaw('cine-selected-project'),
    ]);
    const realProjects = Array.isArray(pr)
      ? pr.map(p => p.enabled === false ? p : { ...p, enabled: p.enabled !== false })
      : [];
    setBills(Array.isArray(b) ? b : []);
    setProjects(realProjects);
    setParties(Array.isArray(pa) ? pa : []);
    // Critical: only restore the project filter if it actually exists in real data.
    // Otherwise (e.g. it's a stale 'demo-pX' id from the demo session), clear it
    // so the ledger doesn't silently filter every bill out.
    if (sel && realProjects.some(p => p.id === sel)) {
      setSelectedProjectId(sel);
    } else {
      setSelectedProjectId(null);
    }
    return realProjects;
  };

  const tryLogin = (email, pin) => {
    // Aggressive normalization: lowercase, strip all whitespace (including zero-width),
    // strip surrounding quotes (in case the user pasted from a list).
    const norm = (s) => String(s || '').replace(/[\s'"]+/g, '').toLowerCase();
    const e = norm(email);
    const p = String(pin || '').replace(/\s+/g, '');
    const expectedEmail = ADMIN_EMAIL.toLowerCase();
    if (e === expectedEmail && p === ADMIN_PIN) {
      const user = { email: ADMIN_EMAIL, role: 'admin', loggedInAt: new Date().toISOString() };
      setAuthUser(user);
      dataLayer.set('cine-auth', user);
      setWantsLogin(false);
      // Coming from demo — swap in the real admin data, then try to recover from Drive
      // if the local cache is empty (fresh browser, wiped storage, etc.).
      (async () => {
        const loadedProjects = await reloadRealData();
        if (loadedProjects.length === 0 && settings.scriptUrl) {
          flashToast('info', 'Local cache empty — recovering from Drive…');
          await refreshConfigFromDrive({ projectsOverride: [], silent: false });
        }
      })();
      return { ok: true };
    }
    // Helpful diagnostic in dev console — does NOT leak credentials in UI
    if (typeof console !== 'undefined') {
      console.warn('[CineLedger] Login mismatch.',
        'Email matches:', e === expectedEmail,
        '· PIN length:', p.length, '· expected length:', ADMIN_PIN.length);
    }
    return { ok: false, error: 'Wrong email or PIN' };
  };

  // Switch into demo mode (used by both initial load and admin-logout)
  const enterDemoMode = () => {
    const seed = getDemoSeed();
    setBills(seed.bills);
    setProjects(seed.projects);
    setParties(seed.parties);
    setSelectedProjectId(null); // clear any stale filter from a previous admin session
    setAuthUser(DEMO_USER);
    setScreen('ledger');
  };

  const startDemo = () => {
    setWantsLogin(false);
    enterDemoMode();
  };

  // Contact Us — lead capture from demo viewers
  const [contactOpen, setContactOpen] = useState(false);
  const submitLead = async (lead) => {
    // Always send to whichever Apps Script URL is configured (admin's setting, or
    // the bundled default). Falls back gracefully if the script can't be reached.
    const url = (settings && settings.scriptUrl) || DEFAULT_SCRIPT_URL;
    if (!url) {
      return { ok: false, error: 'No destination configured. Please email us directly.' };
    }
    try {
      await driveAdapter.submitLead(url, lead);
      return { ok: true };
    } catch (e) {
      console.error('[CineLedger] Lead submit failed:', e);
      return { ok: false, error: (e?.message || 'Network error') };
    }
  };

  const logout = () => {
    // Going back to demo, not to login screen
    dataLayer.set('cine-auth', null);
    setWantsLogin(false);
    enterDemoMode();
  };

  // Filter to ENABLED projects for screens used by non-admins; admins see all.
  // Admin "Settings" / "Projects" master view always shows all so the admin can toggle them.
  const visibleProjects = useMemo(
    () => projects.filter(p => p.enabled !== false),
    [projects]
  );

  return (
    <div
      className={`min-h-screen relative theme-transition theme-${theme} palette-${paletteId} flex flex-col`}
      style={{
        fontFamily: '"DM Sans", system-ui, sans-serif',
        background: 'var(--bg)',
        color: 'var(--text)',
        '--brand-1': palette.c1,
        '--brand-2': palette.c2,
        '--brand-3': palette.c3,
        '--brand-4': palette.c4,
        // Pre-built gradient that any caller can use directly
        '--brand-gradient': `linear-gradient(135deg, ${palette.c1} 0%, ${palette.c2} 50%, ${palette.c3} 100%)`,
        '--brand-gradient-h': `linear-gradient(90deg, ${palette.c1}, ${palette.c2}, ${palette.c3}, ${palette.c4})`,
      }}
    >
      <style>{THEME_CSS}</style>
      <FontLoader />

      {!loaded ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-4)' }}>Loading…</div>
      ) : wantsLogin ? (
        <LoginScreen
          onLogin={tryLogin}
          onStartDemo={startDemo}
          onCancel={() => setWantsLogin(false)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      ) : !authUser ? (
        <LoginScreen onLogin={tryLogin} onStartDemo={startDemo} theme={theme} toggleTheme={toggleTheme} />
      ) : (
        <>
          {isDemo && <DemoBanner onSignIn={() => setWantsLogin(true)} onExit={logout} onContact={() => setContactOpen(true)} />}
          <Header
            screen={screen}
            setScreen={setScreen}
            theme={theme}
            toggleTheme={toggleTheme}
            onOpenSettings={() => setScreen('settings')}
            settingsConfigured={Boolean(settings.scriptUrl)}
            isAdmin={isAdmin}
            authUser={authUser}
            onLogout={logout}
            paletteId={paletteId}
            onPaletteChange={changePalette}
          />

          {visibleProjects.length > 0 && (
            <ProjectSelector
              projects={visibleProjects}
              selectedId={selectedProjectId}
              onChange={selectProject}
            />
          )}

          <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 pb-8 pt-4 sm:pt-6 relative z-10">
            {screen === 'form' ? (
              <BillForm
                onSave={saveBill}
                goToLedger={() => setScreen('ledger')}
                projects={visibleProjects}
                parties={parties}
                bills={bills}
                onCreateProject={addProject}
                onGoToProjects={() => setScreen('projects')}
                defaultProjectName={selectedProjectId ? (visibleProjects.find(p => p.id === selectedProjectId)?.name || '') : ''}
              />
            ) : screen === 'ledger' ? (
              <LedgerView
                bills={bills}
                projects={visibleProjects}
                onDelete={deleteBill}
                onNewBill={() => setScreen('form')}
                projectFilter={selectedProjectId ? visibleProjects.find(p => p.id === selectedProjectId) : null}
              />
            ) : screen === 'projects' ? (
              <ProjectsScreen
                projects={projects}
                bills={bills}
                onAdd={addProject}
                onUpdate={updateProject}
                onDelete={deleteProject}
                onSyncBills={syncProjectBills}
                onSelectProject={(id) => { selectProject(id); setScreen('ledger'); }}
                settingsConfigured={Boolean(settings.scriptUrl)}
                onOpenSettings={() => setScreen('settings')}
                isAdmin={isAdmin}
              />
            ) : screen === 'settings' && isAdmin ? (
              <SettingsScreen
                settings={settings}
                onUpdate={updateSettings}
                projects={projects}
                onUpdateProject={updateProject}
                onRefresh={refreshConfigFromDrive}
                onPushRow={pushConfigRow}
                onSyncProject={syncProjectBills}
                onLogout={logout}
                authUser={authUser}
                paletteId={paletteId}
                onPaletteChange={changePalette}
              />
            ) : (
              // Fallback — non-admin tried to reach a restricted screen
              <div className="text-center py-20" style={{ color: 'var(--text-4)' }}>Not available</div>
            )}
          </main>

          <Footer />

          <BottomNav screen={screen} setScreen={setScreen} />

          {toast && (
            <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-[slideup_0.3s_ease-out]">
              <div className={`px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-2 text-sm font-medium ${
                toast.kind === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'
              }`}>
                {toast.kind === 'success' && <CheckCircle2 className="w-4 h-4" />}
                {toast.msg}
              </div>
            </div>
          )}

          <ContactUsModal
            open={contactOpen}
            onClose={() => setContactOpen(false)}
            onSubmit={submitLead}
          />
        </>
      )}
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================
function Header({ screen, setScreen, theme, toggleTheme, onOpenSettings, settingsConfigured, isAdmin, authUser, onLogout, paletteId, onPaletteChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-xl border-b"
      style={{ background: 'var(--header-bg)', borderColor: 'var(--header-border)' }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shadow-lg" style={{
              background: 'linear-gradient(135deg, var(--brand-1) 0%, var(--brand-2) 50%, var(--brand-3) 100%)',
            }}>
              <Clapperboard className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -inset-1 rounded-xl opacity-40 blur-md -z-10" style={{
              background: 'linear-gradient(135deg, var(--brand-1), var(--brand-3))',
            }} />
          </div>
          <div className="min-w-0">
            <div
              className="text-xl sm:text-2xl leading-none tracking-wide truncate"
              style={{ fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.04em', color: 'var(--text)' }}
            >
              {BRAND.name}
            </div>
            <div className="text-[10px] sm:text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{BRAND.tagline}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Gear icon — admins only */}
          {isAdmin && (
            <button
              onClick={onOpenSettings}
              aria-label="Settings"
              className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${screen === 'settings' ? 'ring-2 ring-offset-1' : ''}`}
              style={{
                background: 'var(--surface)',
                borderColor: screen === 'settings' ? 'var(--brand-1)' : 'var(--border)',
                color: 'var(--text-2)',
              }}
            >
              <Settings className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              {!settingsConfigured && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{ background: 'var(--brand-2)', borderColor: 'var(--surface)' }}
                      title="Apps Script URL not configured" />
              )}
            </button>
          )}

          {/* Desktop nav (no Books tab — folded into Ledger) */}
          <nav
            className="hidden sm:flex items-center gap-1 rounded-full p-1 border"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
          >
            <NavBtn active={screen === 'form'}     onClick={() => setScreen('form')}     icon={Plus}       label="New Bill" />
            <NavBtn active={screen === 'ledger'}   onClick={() => setScreen('ledger')}   icon={Wallet}     label="Ledger" />
            <NavBtn active={screen === 'projects'} onClick={() => setScreen('projects')} icon={FolderOpen} label="Projects" />
          </nav>

          {/* User menu (logout) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Account"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
              title={authUser?.email || 'Account'}
            >
              <User className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl border scale-in"
                style={{
                  background: 'var(--surface-elevated)',
                  borderColor: 'var(--border-strong)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                }}
              >
                <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>
                    Signed in as
                  </div>
                  <div className="text-xs mt-0.5 truncate font-semibold" style={{ color: 'var(--text)' }}>
                    {authUser?.email}
                  </div>
                  {isAdmin && (
                    <div className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded font-bold"
                         style={{ background: 'rgba(225,29,116,0.15)', color: 'var(--brand-1)' }}>
                      ADMIN
                    </div>
                  )}
                </div>

                {/* Palette picker — visible to all users (incl. demo) for live pitches */}
                <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
                  <div className="text-[10px] uppercase tracking-wider font-bold mb-2.5" style={{ color: 'var(--text-3)' }}>
                    Color Theme
                  </div>
                  <PalettePicker
                    current={paletteId}
                    onChange={onPaletteChange}
                    columns={4}
                  />
                  <div className="text-[10px] mt-2.5 text-center" style={{ color: 'var(--text-4)' }}>
                    {getPalette(paletteId).name}
                  </div>
                </div>

                <button
                  onClick={() => { setMenuOpen(false); onLogout(); }}
                  className="w-full px-3 py-2.5 text-left text-sm font-semibold flex items-center gap-2 transition hover:opacity-90 rounded-b-xl"
                  style={{ color: '#EF4444' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {authUser?.role === 'demo' ? 'Exit demo' : 'Sign out'}
                </button>
              </div>
            )}
          </div>

          {/* Theme toggle — moved to the absolute end */}
          <ThemeToggle theme={theme} onClick={toggleTheme} />
        </div>
      </div>

      <div className="h-1.5 flex">
        <div className="flex-1" style={{ background: 'linear-gradient(90deg, var(--brand-1), var(--brand-2), var(--brand-3), #16A34A, #2563EB, #7C3AED, var(--brand-1))' }} />
      </div>
    </header>
  );
}

function ThemeToggle({ theme, onClick }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className="relative flex items-center rounded-full border transition-colors duration-300 hover:scale-[1.03] active:scale-95"
      style={{
        width: '58px',
        height: '30px',
        padding: '3px',
        background: isDark
          ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
          : 'linear-gradient(135deg, #FEF3C7, #FED7AA)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Hint icons in the track */}
      <Sun
        className="absolute w-3 h-3 transition-opacity duration-300"
        style={{ left: '8px', color: 'var(--brand-3)', opacity: isDark ? 0.45 : 0 }}
        strokeWidth={2.5}
      />
      <Moon
        className="absolute w-3 h-3 transition-opacity duration-300"
        style={{ right: '8px', color: '#C4B5FD', opacity: isDark ? 0 : 0.5 }}
        strokeWidth={2.5}
      />

      {/* Sliding thumb */}
      <div
        className="rounded-full flex items-center justify-center shadow-md transition-transform duration-300 ease-out"
        style={{
          width: '24px',
          height: '24px',
          transform: isDark ? 'translateX(28px)' : 'translateX(0)',
          background: isDark
            ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
            : 'linear-gradient(135deg, #FBBF24, #F59E0B)',
          boxShadow: isDark
            ? '0 2px 8px rgba(99, 102, 241, 0.5)'
            : '0 2px 8px rgba(251, 191, 36, 0.5)',
        }}
      >
        {isDark
          ? <Moon className="w-3 h-3 text-white" strokeWidth={2.5} />
          : <Sun  className="w-3 h-3 text-white" strokeWidth={2.5} />}
      </div>
    </button>
  );
}

function NavBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="px-3 lg:px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all"
      style={active ? { background: 'linear-gradient(135deg, var(--brand-2), var(--brand-1))', color: '#fff' } : { color: 'var(--text-2)' }}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden lg:inline">{label}</span>
      <span className="lg:hidden">{label.split(' ')[0]}</span>
    </button>
  );
}

// ============================================================
// FOOTER
// ============================================================
function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 pb-24 sm:pb-6 pt-4 relative z-10">
      <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--text-4)' }}>
        <span>© {year}</span>
        <span
          className="font-bold tracking-wide"
          style={{
            background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2), var(--brand-3))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {BRAND.copyright}
        </span>
        <span>by</span>
        <span className="font-semibold" style={{ color: 'var(--text-2)' }}>{BRAND.author}</span>
      </div>
    </footer>
  );
}

// ============================================================
// PROJECT SELECTOR (global context bar)
// ============================================================
function ProjectSelector({ projects, selectedId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = projects.find(p => p.id === selectedId);

  return (
    <div
      className="sticky z-20 backdrop-blur-xl border-b top-[71px] sm:top-[83px]"
      style={{
        background: 'var(--header-bg)',
        borderColor: 'var(--header-border)',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3" ref={ref}>
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase hidden sm:inline" style={{ color: 'var(--text-3)' }}>
          Project
        </span>
        <div className="relative flex-1 sm:flex-none">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-semibold transition"
            style={{
              background: 'var(--surface)',
              borderColor: selected ? selected.color + '55' : 'var(--border)',
              color: 'var(--text)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: selected ? selected.color : 'var(--text-4)' }}
            />
            <span className="truncate">{selected ? selected.name : 'All Projects'}</span>
            {selected && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded ml-0.5"
                    style={{ background: selected.color + '18', color: selected.color }}>
                {selected.prefix}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-4)' }} />
          </button>

          {open && (
            <div
              className="absolute z-50 left-0 sm:left-0 right-0 sm:right-auto sm:min-w-[280px] top-full mt-1 rounded-xl border overflow-hidden scale-in"
              style={{
                background: 'var(--surface-elevated)',
                borderColor: 'var(--border-strong)',
                boxShadow: 'var(--shadow-lg)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            >
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition"
                style={{ background: !selectedId ? 'var(--surface-3)' : 'transparent', color: 'var(--text)' }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--text-4)' }} />
                <span>All Projects</span>
                <span className="ml-auto text-[10px]" style={{ color: 'var(--text-4)' }}>show everything</span>
              </button>
              <div className="border-t" style={{ borderColor: 'var(--border)' }} />
              <div className="max-h-64 overflow-y-auto">
                {projects.map(p => {
                  const active = selectedId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { onChange(p.id); setOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition"
                      style={{ background: active ? 'var(--surface-3)' : 'transparent', color: 'var(--text)' }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="truncate">{p.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded ml-auto flex-shrink-0"
                            style={{ background: p.color + '18', color: p.color }}>
                        {p.prefix}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {selected && (
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] ml-auto" style={{ color: 'var(--text-3)' }}>
            <DriveStatusBadge project={selected} small />
          </div>
        )}
      </div>
    </div>
  );
}

function DriveStatusBadge({ project, small }) {
  const s = project.driveStatus;
  const cls = small ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1';
  if (s === 'synced') {
    return (
      <a
        href={project.driveFolderUrl || project.driveSheetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 rounded-full font-semibold ${cls}`}
        style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16A34A' }}
      >
        <Cloud className="w-3 h-3" /> Drive
        <ExternalLink className="w-2.5 h-2.5" />
      </a>
    );
  }
  if (s === 'syncing') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${cls}`}
            style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#2563EB' }}>
        <Loader2 className="w-3 h-3 animate-spin" /> Syncing…
      </span>
    );
  }
  if (s === 'failed') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${cls}`}
            style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#DC2626' }}>
        <CloudOff className="w-3 h-3" /> Drive failed
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${cls}`}
          style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
      <Cloud className="w-3 h-3" /> Not synced
    </span>
  );
}

// ============================================================
// BOTTOM NAV (mobile)
// ============================================================
function BottomNav({ screen, setScreen }) {
  const items = [
    { id: 'form',     icon: Plus,       label: 'New Bill' },
    { id: 'ledger',   icon: Wallet,     label: 'Ledger' },
    { id: 'projects', icon: FolderOpen, label: 'Projects' },
  ];
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl border-t"
      style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)' }}
    >
      <div className="grid grid-cols-3">
        {items.map(t => {
          const active = screen === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setScreen(t.id)} className="py-3 flex flex-col items-center gap-1 relative">
              {active && (
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, var(--brand-1), var(--brand-3))' }} />
              )}
              <Icon className="w-5 h-5" strokeWidth={2.5} style={{ color: active ? 'var(--text)' : 'var(--text-4)' }} />
              <span className="text-[11px] font-semibold" style={{ color: active ? 'var(--text)' : 'var(--text-4)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================================
// BILL FORM
// ============================================================
const emptyForm = {
  project: '',
  date: todayISO(),
  billNumber: '',
  department: '',
  category: '',
  paidBy: '',
  paidTo: '',
  amount: '',
  paymentMode: 'gpay',
  chequeNo: '', bank: '', txnId: '', upiId: '', utr: '', cardLast4: '',
  description: '',
  status: 'paid',
  approvedBy: '',
  attachments: [],
};

function BillForm({ onSave, goToLedger, projects, parties, bills, onCreateProject, onGoToProjects, defaultProjectName }) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    project: defaultProjectName || '',
    billNumber: defaultProjectName ? generateBillNo(defaultProjectName, projects, bills) : '',
  }));
  const [errors, setErrors] = useState({});

  // When the global selected project changes, mirror it into the form (unless user has typed something different)
  const lastAppliedRef = useRef(defaultProjectName || '');
  useEffect(() => {
    if (defaultProjectName !== lastAppliedRef.current) {
      lastAppliedRef.current = defaultProjectName || '';
      if (defaultProjectName) {
        setForm(f => ({
          ...f,
          project: defaultProjectName,
          billNumber: generateBillNo(defaultProjectName, projects, bills),
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultProjectName]);

  const update = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

  const handleProjectChange = (name) => {
    setForm(f => ({
      ...f,
      project: name,
      billNumber: generateBillNo(name, projects, bills),
    }));
    if (errors.project) setErrors(e => ({ ...e, project: null }));
  };

  const regenerateBillNo = () => {
    update('billNumber', generateBillNo(form.project, projects, bills));
  };

  const handleFiles = async (files) => {
    const list = Array.from(files);
    // Read each file as a base64 data URL so the Apps Script can decode and
    // upload it to Drive. Without this the attachment is just metadata with
    // nothing to actually sync.
    const readAsDataURL = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Read failed'));
      reader.readAsDataURL(file);
    });
    const MAX_SAFE = 10 * 1024 * 1024; // 10 MB — Apps Script JSON request gets unhappy past this
    const oversized = list.filter(f => f.size > MAX_SAFE);
    if (oversized.length > 0) {
      console.warn('[CineLedger] Skipped oversized files:', oversized.map(f => `${f.name} (${(f.size/1024/1024).toFixed(1)}MB)`).join(', '));
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(`Skipped ${oversized.length} file${oversized.length === 1 ? '' : 's'} over 10 MB. Compress or split before attaching.`);
      }
    }
    const accepted = list.filter(f => f.size <= MAX_SAFE);
    try {
      const newAtts = await Promise.all(accepted.map(async f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        data: await readAsDataURL(f),
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      })));
      update('attachments', [...form.attachments, ...newAtts]);
    } catch (e) {
      console.error('[CineLedger] File read failed:', e);
    }
  };

  const removeAttachment = (idx) => {
    update('attachments', form.attachments.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const e = {};
    if (!form.project.trim()) e.project = 'Required';
    if (!form.department) e.department = 'Required';
    if (!form.paidBy.trim()) e.paidBy = 'Required';
    if (!form.paidTo.trim()) e.paidTo = 'Required';
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    // Ensure bill number is set (in case user cleared it)
    const finalBillNo = form.billNumber.trim() || generateBillNo(form.project, projects, bills);
    onSave({ ...form, billNumber: finalBillNo, amount: Number(form.amount) });
    // Reset form but keep the project context from the global selector
    setForm({
      ...emptyForm,
      project: defaultProjectName || '',
      // Bill number will recompute on next render via projects/bills update; leave empty
      billNumber: '',
    });
    setTimeout(goToLedger, 600);
  };

  const activeMode = PAYMENT_MODES.find(m => m.value === form.paymentMode);
  // Paid By / Paid To dropdowns are scoped to the CURRENT project only
  const partyOptionsForProject = useMemo(() => {
    if (!form.project) return [];
    const lowerProject = form.project.toLowerCase();
    const names = new Set();
    bills.forEach(b => {
      if (b.project && b.project.toLowerCase() === lowerProject) {
        if (b.paidBy) names.add(b.paidBy);
        if (b.paidTo) names.add(b.paidTo);
      }
    });
    return Array.from(names);
  }, [form.project, bills]);
  // Approved By can use the global parties list (approvers often span projects)
  const allPartyOptions = parties.map(p => p.name);

  return (
    <div className="fade-in">
      <ScreenHeader
        eyebrow="Step 01"
        title="New Bill Entry"
        subtitle="Log a transaction to the production ledger"
      />

      {/* PROJECT SECTION */}
      <Section title="Project Details" accent="var(--brand-1)" icon={Film}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Project / Production" error={errors.project} required>
            <ComboBox
              value={form.project}
              onChange={handleProjectChange}
              options={projects.map(p => p.name)}
              placeholder="Pick a project or type to create"
              onCreate={(name) => {
                onCreateProject({ name });
                handleProjectChange(name);
              }}
              emptyHint={projects.length === 0
                ? <span>No projects yet — type a name or <button type="button" className="underline" onClick={onGoToProjects} style={{ color: 'var(--brand-1)' }}>open Projects</button></span>
                : null
              }
            />
          </Field>
          <Field label="Bill Date" required>
            <Input type="date" value={form.date} onChange={e => update('date', e.target.value)} />
          </Field>
          <Field label="Bill / Invoice Number">
            <div className="relative">
              <Input
                value={form.billNumber}
                onChange={e => update('billNumber', e.target.value)}
                placeholder={form.project ? generateBillNo(form.project, projects, bills) : 'Pick a project to auto-generate'}
                style={{ paddingRight: '44px', fontFamily: '"IBM Plex Mono", monospace' }}
              />
              {form.project && (
                <button
                  type="button"
                  onClick={regenerateBillNo}
                  title="Regenerate bill number"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition hover:scale-110"
                  style={{ color: 'var(--text-3)', background: 'var(--surface-3)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {form.project && form.billNumber === generateBillNo(form.project, projects, bills) && (
              <div className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--text-4)' }}>
                <Sparkle /> Auto-generated · editable
              </div>
            )}
          </Field>
          <Field label="Department" error={errors.department} required>
            <DeptSelect value={form.department} onChange={v => update('department', v)} />
          </Field>
          <Field label="Sub-category / Notes" wide>
            <Input
              value={form.category}
              onChange={e => update('category', e.target.value)}
              placeholder="e.g. Lens rental, Day 14 catering, Wig procurement"
            />
          </Field>
        </div>
      </Section>

      {/* TRANSACTION SECTION */}
      <Section title="Transaction" accent="var(--brand-3)" icon={Receipt}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Paid By" error={errors.paidBy} required>
            <ComboBox
              value={form.paidBy}
              onChange={(v) => update('paidBy', v)}
              options={partyOptionsForProject}
              placeholder={form.project ? 'Search or add a payer' : 'Pick a project first'}
              createLabel="party"
              emptyHint={!form.project
                ? <span style={{ color: 'var(--text-3)' }}>Select a project to see its payers</span>
                : (partyOptionsForProject.length === 0
                    ? <span style={{ color: 'var(--text-3)' }}>First bill for this project — type a name to add</span>
                    : null)}
            />
          </Field>
          <Field label="Paid To" error={errors.paidTo} required>
            <ComboBox
              value={form.paidTo}
              onChange={(v) => update('paidTo', v)}
              options={partyOptionsForProject}
              placeholder={form.project ? 'Search or add a payee' : 'Pick a project first'}
              createLabel="party"
              emptyHint={!form.project
                ? <span style={{ color: 'var(--text-3)' }}>Select a project to see its payees</span>
                : (partyOptionsForProject.length === 0
                    ? <span style={{ color: 'var(--text-3)' }}>First bill for this project — type a name to add</span>
                    : null)}
            />
          </Field>
          <Field label="Amount (₹)" error={errors.amount} required>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono" style={{ color: 'var(--text-4)' }}>₹</span>
              <Input
                type="number"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
                placeholder="0"
                style={{ paddingLeft: '32px', fontFamily: '"IBM Plex Mono", monospace' }}
              />
            </div>
          </Field>
          <Field label="Attach Bill">
            <AttachBillButton
              attachments={form.attachments}
              onAdd={handleFiles}
            />
          </Field>
          <Field label="Status" wide>
            <StatusSelect value={form.status} onChange={v => update('status', v)} />
          </Field>
        </div>

        {/* Attachment thumbnails directly under the row */}
        {form.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-3)' }}>
              Attached ({form.attachments.length})
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {form.attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border"
                     style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  <div className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 overflow-hidden"
                       style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {att.preview
                      ? <img src={att.preview} alt="" className="w-full h-full object-cover" />
                      : att.type?.startsWith('image/')
                        ? <ImageIcon className="w-4 h-4" style={{ color: 'var(--text-4)' }} />
                        : <FileIcon  className="w-4 h-4" style={{ color: 'var(--text-4)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate" style={{ color: 'var(--text)' }}>{att.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>{(att.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition flex-shrink-0"
                    style={{ color: 'var(--text-4)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--text-3)' }}>Payment Method</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PAYMENT_MODES.map(mode => {
              const Icon = mode.icon;
              const active = form.paymentMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => update('paymentMode', mode.value)}
                  className="relative p-3 rounded-xl border transition-all"
                  style={
                    active
                      ? { background: 'linear-gradient(135deg, var(--brand-1), var(--brand-2))', borderColor: 'transparent', color: '#fff' }
                      : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-2)' }
                  }
                >
                  <Icon className="w-5 h-5 mx-auto mb-1.5" />
                  <div className="text-[11px] font-semibold leading-none">{mode.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {activeMode.needs.length > 0 && (
          <div
            className="mt-5 p-4 rounded-xl border grid sm:grid-cols-2 gap-4 fade-in"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
          >
            {activeMode.needs.includes('chequeNo') && <Field label="Cheque Number"><Input value={form.chequeNo} onChange={e => update('chequeNo', e.target.value)} placeholder="123456" /></Field>}
            {activeMode.needs.includes('bank') &&     <Field label="Bank"><Input value={form.bank} onChange={e => update('bank', e.target.value)} placeholder="HDFC Bank" /></Field>}
            {activeMode.needs.includes('upiId') &&    <Field label="UPI ID"><Input value={form.upiId} onChange={e => update('upiId', e.target.value)} placeholder="vendor@upi" /></Field>}
            {activeMode.needs.includes('txnId') &&    <Field label="Transaction ID"><Input value={form.txnId} onChange={e => update('txnId', e.target.value)} placeholder="UPI / GPay reference" /></Field>}
            {activeMode.needs.includes('utr') &&      <Field label="UTR / Reference No."><Input value={form.utr} onChange={e => update('utr', e.target.value)} placeholder="HDFCN23..." /></Field>}
            {activeMode.needs.includes('cardLast4') && <Field label="Card last 4 digits"><Input value={form.cardLast4} onChange={e => update('cardLast4', e.target.value)} placeholder="0000" maxLength={4} /></Field>}
          </div>
        )}
      </Section>

      {/* DETAILS SECTION */}
      <Section title="Details & Approval" accent="#2563EB" icon={FileText}>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Description / Purpose" wide>
            <Textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Brief context for this expense…"
              rows={3}
            />
          </Field>
          <Field label="Approved By">
            <ComboBox
              value={form.approvedBy}
              onChange={v => update('approvedBy', v)}
              options={allPartyOptions}
              placeholder="Pick an approver"
              createLabel="party"
            />
          </Field>
        </div>
      </Section>

      {/* SUBMIT */}
      <div className="mt-8 sticky bottom-20 sm:bottom-6 z-20">
        <button
          onClick={submit}
          className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-2xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-transform"
          style={{
            background: 'linear-gradient(135deg, var(--brand-3) 0%, var(--brand-2) 50%, var(--brand-1) 100%)',
            boxShadow: '0 20px 40px -10px rgba(225, 29, 116, 0.4)',
          }}
        >
          <CheckCircle2 className="w-5 h-5" />
          Save to Ledger
        </button>
      </div>
    </div>
  );
}

function Sparkle() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" />
    </svg>
  );
}

// Compact attach button used inline in the Transaction grid (next to Amount)
function AttachBillButton({ attachments, onAdd }) {
  const inputRef = useRef(null);
  const count = attachments?.length || 0;
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => { onAdd(e.target.files); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full px-4 py-3 rounded-xl border-2 border-dashed transition-all hover:opacity-90 flex items-center justify-center gap-2"
        style={{
          borderColor: count > 0 ? '#16A34A88' : 'var(--border-strong)',
          color: count > 0 ? '#16A34A' : 'var(--text-2)',
          background: count > 0 ? 'rgba(22, 163, 74, 0.06)' : 'transparent',
        }}
      >
        <Paperclip className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {count > 0 ? `${count} file${count === 1 ? '' : 's'} attached` : 'Attach Bill'}
        </span>
        {count > 0 && (
          <span className="text-[10px] uppercase tracking-wider" style={{ opacity: 0.7 }}>
            · add more
          </span>
        )}
      </button>
    </>
  );
}

// ============================================================
// COMBOBOX — typeable dropdown with "+ Add new" inline
// ============================================================
function ComboBox({ value, onChange, options, placeholder, onCreate, createLabel = '', emptyHint = null }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setSearch(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch(value || ''); // revert to last committed value
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value]);

  const lower = search.trim().toLowerCase();
  const filtered = lower
    ? options.filter(o => o.toLowerCase().includes(lower))
    : options;
  const exact = options.some(o => o.toLowerCase() === lower);
  const canCreate = lower.length > 0 && !exact && Boolean(onCreate || true);

  const handleSelect = (name) => {
    setSearch(name);
    onChange(name);
    setOpen(false);
    setHighlight(0);
  };

  const handleCreate = () => {
    const name = search.trim();
    if (!name) return;
    if (onCreate) onCreate(name);
    else onChange(name);
    setOpen(false);
    setHighlight(0);
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, filtered.length - (canCreate ? 0 : 1)));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight < filtered.length) {
        handleSelect(filtered[highlight]);
      } else if (canCreate) {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSearch(value || '');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        autoComplete="off"
        className={inputBaseClasses}
        style={inputStyle}
      />
      {open && (filtered.length > 0 || canCreate || emptyHint) && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border overflow-hidden scale-in"
          style={{
            background: 'var(--surface-elevated)',
            borderColor: 'var(--border-strong)',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div className="max-h-64 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((o, i) => {
                const isActive = i === highlight;
                return (
                  <button
                    key={o}
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => handleSelect(o)}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2"
                    style={{
                      background: isActive ? 'var(--surface-3)' : 'transparent',
                      color: 'var(--text)',
                    }}
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>
                      {o.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate">{o}</span>
                  </button>
                );
              })
            ) : emptyHint ? (
              <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-3)' }}>{emptyHint}</div>
            ) : null}
          </div>
          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="w-full px-4 py-3 text-left text-sm flex items-center gap-2 border-t font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--brand-1)', background: 'var(--surface-3)' }}
            >
              <Plus className="w-4 h-4" />
              Add "<span className="truncate max-w-[180px] inline-block align-bottom">{search.trim()}</span>" as new {createLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SECTION + FIELD + INPUTS
// ============================================================
function Section({ title, accent, icon: Icon, children, action }) {
  return (
    <section className="mt-6 sm:mt-8 fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: accent + '18', color: accent }}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: 'var(--text)' }}>{title}</h3>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${accent}55, transparent)` }} />
        {action}
      </div>
      <div className="p-4 sm:p-6 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        {children}
      </div>
    </section>
  );
}

function ScreenHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="pt-2 pb-4 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-3)' }}>{eyebrow}</div>
        <h1 className="text-3xl sm:text-5xl mt-1 leading-none"
            style={{ fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.01em', color: 'var(--text)' }}>
          {title}
        </h1>
        {subtitle && <div className="text-sm mt-1.5" style={{ color: 'var(--text-3)' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function Field({ label, children, error, required, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="text-[11px] font-semibold tracking-wider uppercase mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
        {label}
        {required && <span style={{ color: '#EC4899' }}>*</span>}
      </label>
      {children}
      {error && <div className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</div>}
    </div>
  );
}

const inputBaseClasses = "w-full px-4 py-3 rounded-xl border focus:outline-none transition-all";
const inputStyle = {
  background: 'var(--surface-2)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
};

function Input(props) {
  const { className = '', style = {}, ...rest } = props;
  return (
    <input
      {...rest}
      className={inputBaseClasses + ' ' + className}
      style={{ ...inputStyle, ...style }}
      onFocus={e => { e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
    />
  );
}
function Textarea(props) {
  const { className = '', style = {}, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={inputBaseClasses + ' resize-none ' + className}
      style={{ ...inputStyle, ...style }}
      onFocus={e => { e.target.style.borderColor = 'rgba(236, 72, 153, 0.6)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
    />
  );
}

function DeptSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={inputBaseClasses + ' appearance-none cursor-pointer'}
      style={{
        ...inputStyle,
        backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 16px center',
        paddingRight: '40px',
      }}
    >
      <option value="">Select department…</option>
      {DEPARTMENTS.map(d => (
        <option key={d.name} value={d.name}>{d.emoji} {d.name}</option>
      ))}
    </select>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STATUSES.map(s => {
        const active = value === s.value;
        const Icon = s.icon;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className="py-3 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all"
            style={
              active
                ? { background: s.color + '18', borderColor: s.color + '88', color: s.color }
                : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-3)' }
            }
          >
            <Icon className="w-4 h-4" />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// LEDGER VIEW
// ============================================================
function LedgerView({ bills, projects, onDelete, onNewBill, projectFilter }) {
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  // First, narrow bills to the active project if there is one
  const scoped = useMemo(() => {
    if (!projectFilter) return bills;
    return bills.filter(b => b.project && b.project.toLowerCase() === projectFilter.name.toLowerCase());
  }, [bills, projectFilter]);

  const filtered = useMemo(() => {
    if (!query.trim()) return scoped;
    const q = query.toLowerCase();
    return scoped.filter(b =>
      [b.project, b.department, b.paidBy, b.paidTo, b.billNumber, b.description, b.category]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [scoped, query]);

  const totals = useMemo(() => {
    const total   = filtered.reduce((s, b) => s + Number(b.amount || 0), 0);
    const paid    = filtered.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount || 0), 0);
    const pending = filtered.filter(b => b.status === 'pending').reduce((s, b) => s + Number(b.amount || 0), 0);
    const depts   = new Set(filtered.map(b => b.department)).size;
    return { total, paid, pending, count: filtered.length, depts };
  }, [filtered]);

  const byDepartment = useMemo(() => {
    const map = new Map();
    filtered.forEach(b => {
      if (!map.has(b.department)) map.set(b.department, []);
      map.get(b.department).push(b);
    });
    return Array.from(map.entries())
      .map(([dept, list]) => ({
        key: dept, name: dept, list,
        total: list.reduce((s, b) => s + Number(b.amount || 0), 0),
        count: list.length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byIndividual = useMemo(() => {
    const map = new Map();
    filtered.forEach(b => {
      const add = (name, type) => {
        if (!name) return;
        if (!map.has(name)) map.set(name, { name, paidAmount: 0, receivedAmount: 0, list: [] });
        const entry = map.get(name);
        if (type === 'payer') entry.paidAmount += Number(b.amount || 0);
        if (type === 'payee') entry.receivedAmount += Number(b.amount || 0);
        entry.list.push({ ...b, _role: type });
      };
      add(b.paidBy, 'payer');
      add(b.paidTo, 'payee');
    });
    return Array.from(map.values())
      .map(p => ({
        ...p,
        key: p.name,
        total: p.paidAmount + p.receivedAmount,
        // Closing balance from the person's POV: received - paid out.
        // Positive = net received, negative = net paid out.
        closingBalance: p.receivedAmount - p.paidAmount,
        count: p.list.length,
      }))
      .sort((a, b) => Math.abs(b.closingBalance) - Math.abs(a.closingBalance));
  }, [filtered]);

  const groups = view === 'department' ? byDepartment : byIndividual;

  return (
    <div className="fade-in">
      <ScreenHeader
        eyebrow={projectFilter ? `Ledger · ${projectFilter.prefix}` : 'Ledger'}
        title={projectFilter ? projectFilter.name : 'Production Books'}
        subtitle={scoped.length === 0
          ? (projectFilter ? `No bills logged for ${projectFilter.name} yet` : 'No entries yet — start by adding your first bill')
          : `${scoped.length} bill${scoped.length === 1 ? '' : 's'}${projectFilter ? ` in this project` : ' on file'}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total"   value={formatCurrency(totals.total)}   accent="var(--brand-1)" icon={TrendingUp} />
        <StatCard label="Paid"    value={formatCurrency(totals.paid)}    accent="#16A34A" icon={CheckCircle2} />
        <StatCard label="Pending" value={formatCurrency(totals.pending)} accent="#CA8A04" icon={Clock} />
        <StatCard label="Bills"   value={totals.count.toString()}        accent="#2563EB" icon={Hash} sub={`${totals.depts} depts`} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search project, vendor, department…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border focus:outline-none transition"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)', boxShadow: 'var(--shadow-sm)' }}
          />
        </div>
        <div className="flex border rounded-xl p-1 gap-1 flex-wrap" style={{ background: 'var(--surface-3)', borderColor: 'var(--border)' }}>
          <ViewToggle active={view === 'table'}      onClick={() => { setView('table');      setSelected(null); }} icon={FileText}   label="Table" />
          <ViewToggle active={view === 'department'} onClick={() => { setView('department'); setSelected(null); }} icon={Briefcase}  label="Department" />
          <ViewToggle active={view === 'individual'} onClick={() => { setView('individual'); setSelected(null); }} icon={User}       label="Individual" />
          <ViewToggle active={view === 'books'}      onClick={() => { setView('books');      setSelected(null); }} icon={Wallet}     label="Books" />
        </div>
      </div>

      {scoped.length === 0 ? (
        <EmptyState onNewBill={onNewBill} />
      ) : filtered.length === 0 && view !== 'books' ? (
        <div className="text-center py-16" style={{ color: 'var(--text-4)' }}>
          <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <div>No matches for "{query}"</div>
        </div>
      ) : view === 'table' ? (
        <AllTransactionsTable bills={filtered} projects={projects} onDelete={onDelete} />
      ) : view === 'books' ? (
        <BooksScreen
          bills={bills}
          projects={projects}
          selectedProject={projectFilter}
          onSelectProject={() => {}}
          embedded
        />
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <LedgerCard
              key={g.key}
              group={g}
              view={view}
              expanded={selected === g.key}
              onToggle={() => setSelected(selected === g.key ? null : g.key)}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, icon: Icon, sub }) {
  return (
    <div className="relative p-4 rounded-2xl border overflow-hidden"
         style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ background: accent }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-3)' }}>{label}</div>
          {Icon && <Icon className="w-3.5 h-3.5" style={{ color: accent }} />}
        </div>
        <div className="text-lg sm:text-2xl font-bold leading-tight truncate" style={{ fontFamily: '"IBM Plex Mono", monospace', color: 'var(--text)' }}>{value}</div>
        {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>}
      </div>
    </div>
  );
}

function ViewToggle({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
      style={active ? { background: 'var(--surface)', color: 'var(--text)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--text-3)' }}>
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function EmptyState({ onNewBill }) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl border"
         style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="text-6xl mb-4">🎬</div>
      <div className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Lights, camera… ledger</div>
      <div className="mb-6 text-sm max-w-sm mx-auto" style={{ color: 'var(--text-3)' }}>
        Your production books are empty. Log your first bill to see it break down by department and by person.
      </div>
      <button onClick={onNewBill}
        className="px-6 py-3 rounded-full text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg"
        style={{ background: 'linear-gradient(135deg, var(--brand-3), var(--brand-1))' }}>
        <Plus className="w-4 h-4" />
        Add first bill
      </button>
    </div>
  );
}

// ============================================================
// LEDGER CARDS + BILL ROW
// ============================================================
function AllTransactionsTable({ bills, onDelete }) {
  const [expanded, setExpanded] = useState(null);
  const sorted = useMemo(() => {
    return [...bills].sort((a, b) => {
      const da = new Date(b.date || b.createdAt || 0).getTime();
      const db = new Date(a.date || a.createdAt || 0).getTime();
      return da - db; // newest first
    });
  }, [bills]);

  const total = sorted.reduce((s, b) => s + (Number(b.amount) || 0), 0);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {/* Desktop: full table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-3)' }}>
              <Th>Date</Th>
              <Th>Bill No</Th>
              <Th>Project</Th>
              <Th>Department</Th>
              <Th>Paid By</Th>
              <Th>Paid To</Th>
              <Th align="right">Amount</Th>
              <Th>Status</Th>
              <Th align="center">Files</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b, i) => {
              const isOpen = expanded === b.id;
              return (
                <React.Fragment key={b.id}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : b.id)}
                    style={{
                      background: isOpen ? 'var(--surface-2)' : (i % 2 ? 'var(--surface)' : 'transparent'),
                      borderTop: '1px solid var(--border-soft)',
                      cursor: 'pointer',
                    }}
                  >
                    <Td>{b.date}</Td>
                    <Td mono>
                      <span className="px-1.5 py-0.5 rounded text-[11px]"
                            style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                        {b.billNumber || (b.id ? String(b.id).slice(-8) : '—')}
                      </span>
                    </Td>
                    <Td>{b.project || '—'}</Td>
                    <Td>
                      {b.department ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: getDept(b.department)?.color || '#94a3b8' }} />
                          <span className="text-xs">{b.department}</span>
                        </span>
                      ) : '—'}
                    </Td>
                    <Td>{b.paidBy || '—'}</Td>
                    <Td>{b.paidTo || '—'}</Td>
                    <Td align="right" mono strong>{formatCurrency(b.amount)}</Td>
                    <Td>
                      <StatusBadge status={b.status} />
                    </Td>
                    <Td align="center">
                      {b.attachments?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: b.attachments.every(a => a.driveUrl) ? '#16A34A' : 'var(--text-3)' }}>
                          <Paperclip className="w-3 h-3" /> {b.attachments.length}
                        </span>
                      ) : '—'}
                    </Td>
                  </tr>
                  {isOpen && (
                    <tr style={{ background: 'var(--surface)' }}>
                      <td colSpan={9} style={{ padding: '12px 16px', borderTop: '1px solid var(--border-soft)' }}>
                        <BillExpanded bill={b} onDelete={onDelete} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            <tr style={{ background: 'var(--surface-3)', fontWeight: 700 }}>
              <Td colSpan={6}>{sorted.length} transactions</Td>
              <Td align="right" mono strong>{formatCurrency(total)}</Td>
              <Td colSpan={2}>&nbsp;</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards (BillRow already optimized for narrow screens) */}
      <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
        {sorted.map(b => (
          <div key={b.id} style={{ borderColor: 'var(--border)' }}>
            <BillRow bill={b} viewMode="department" onDelete={onDelete} />
          </div>
        ))}
        <div className="p-3 flex items-center justify-between" style={{ background: 'var(--surface-3)', fontWeight: 700 }}>
          <span className="text-xs">{sorted.length} transactions</span>
          <span className="font-mono text-sm">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

// Inline detail view used inside the table when a row is expanded
function BillExpanded({ bill, onDelete }) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
      {bill.category    && <DetailRow k="Sub-category" v={bill.category} />}
      {bill.description && <DetailRow k="Description"  v={bill.description} />}
      {bill.approvedBy  && <DetailRow k="Approved By"  v={bill.approvedBy} />}
      {bill.paymentMode && <DetailRow k="Pay Mode"     v={bill.paymentMode} />}
      {bill.chequeNo    && <DetailRow k="Cheque No"    v={bill.chequeNo} mono />}
      {bill.bank        && <DetailRow k="Bank"         v={bill.bank} />}
      {bill.upiId       && <DetailRow k="UPI ID"       v={bill.upiId} />}
      {bill.txnId       && <DetailRow k="Txn ID"       v={bill.txnId} mono />}
      {bill.utr         && <DetailRow k="UTR"          v={bill.utr} mono />}
      {bill.cardLast4   && <DetailRow k="Card"         v={'•••• ' + bill.cardLast4} mono />}
      {bill.attachments?.length > 0 && (
        <div className="sm:col-span-2 pt-2 mt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="uppercase tracking-wider text-[10px] font-bold mb-2 flex items-center justify-between" style={{ color: 'var(--text-3)' }}>
            <span>Attachments ({bill.attachments.length})</span>
            {bill.attachments.every(a => a.driveUrl) && (
              <span className="inline-flex items-center gap-1" style={{ color: '#16A34A' }}>
                <Cloud className="w-3 h-3" /> on Drive
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {bill.attachments.map((att, i) => <AttachmentChip key={i} att={att} />)}
          </div>
        </div>
      )}
      <div className="sm:col-span-2 pt-2 mt-1 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
        <button onClick={(e) => { e.stopPropagation(); if (window.confirm('Remove this bill?')) onDelete(bill.id); }}
                className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: '#EF4444' }}>
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    paid:     { bg: 'rgba(22,163,74,0.15)',  fg: '#16A34A', icon: CheckCircle2 },
    pending:  { bg: 'rgba(202,138,4,0.18)',  fg: '#CA8A04', icon: Clock },
    approved: { bg: 'rgba(37,99,235,0.15)',  fg: '#2563EB', icon: FileCheck },
  };
  const s = map[status] || { bg: 'var(--surface-3)', fg: 'var(--text-3)', icon: AlertCircle };
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: s.bg, color: s.fg }}>
      <Icon className="w-2.5 h-2.5" />
      {status || 'n/a'}
    </span>
  );
}


function LedgerCard({ group, view, expanded, onToggle, onDelete }) {
  const dept = view === 'department' ? getDept(group.name) : null;
  const color = dept ? dept.color : '#7C3AED';
  const emoji = dept ? dept.emoji : '👤';

  return (
    <div className="rounded-2xl border overflow-hidden"
         style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <button onClick={onToggle} className="w-full p-4 sm:p-5 flex items-center gap-4 transition text-left hover:opacity-90">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border"
             style={{ background: color + '14', borderColor: color + '44' }}>
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate text-base" style={{ color: 'var(--text)' }}>{group.name}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {view === 'individual' ? (
              <span>
                <span className="font-semibold" style={{ color: 'var(--money-paid)' }}>Paid {formatCurrency(group.paidAmount)}</span>
                {group.receivedAmount > 0 && (
                  <> · <span className="font-semibold" style={{ color: 'var(--money-recv)' }}>Received {formatCurrency(group.receivedAmount)}</span></>
                )}
              </span>
            ) : (
              `${group.count} transaction${group.count === 1 ? '' : 's'}`
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {view === 'individual' ? (
            <>
              <div className="text-base sm:text-xl font-bold"
                   style={{
                     fontFamily: '"IBM Plex Mono", monospace',
                     color: group.closingBalance < 0 ? 'var(--brand-2)' : (group.closingBalance > 0 ? '#16A34A' : 'var(--text)'),
                   }}>
                {group.closingBalance < 0 ? '−' : (group.closingBalance > 0 ? '+' : '')}{formatCurrency(Math.abs(group.closingBalance))}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>
                Closing · {group.count} txn{group.count === 1 ? '' : 's'}
              </div>
            </>
          ) : (
            <>
              <div className="text-base sm:text-xl font-bold" style={{ fontFamily: '"IBM Plex Mono", monospace', color }}>
                {formatCurrency(group.total)}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>{group.count} bill{group.count === 1 ? '' : 's'}</div>
            </>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ color: 'var(--text-4)' }} />
      </button>

      {expanded && (
        <div className="border-t fade-in" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          {group.list.map(b => (
            <BillRow key={b.id} bill={b} role={b._role} viewMode={view} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function BillRow({ bill, role, viewMode, onDelete }) {
  const [open, setOpen] = useState(false);
  const dept = getDept(bill.department);
  const status = STATUSES.find(s => s.value === bill.status) || STATUSES[0];
  const mode = PAYMENT_MODES.find(m => m.value === bill.paymentMode);

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border-soft)' }}>
      <div className="p-4 sm:p-5 flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: dept.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>{bill.paidBy}</span>
                <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
                <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>{bill.paidTo}</span>
              </div>
              <div className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
                <span>{formatDate(bill.date)}</span>
                <span style={{ color: 'var(--text-divider)' }}>·</span>
                <span>{bill.project}</span>
                {bill.billNumber && (
                  <>
                    <span style={{ color: 'var(--text-divider)' }}>·</span>
                    <span className="font-mono">#{bill.billNumber}</span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-bold" style={{ fontFamily: '"IBM Plex Mono", monospace', color: 'var(--text)' }}>
                {formatCurrency(bill.amount)}
              </div>
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
                      style={{ background: status.color + '22', color: status.color }}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {viewMode === 'individual' && role && (
            <div className="text-[10px] uppercase tracking-wider mt-1.5 inline-block px-2 py-0.5 rounded font-bold"
                 style={{
                   background: role === 'payer' ? 'var(--badge-sent-bg)' : 'var(--badge-recv-bg)',
                   color: role === 'payer' ? 'var(--badge-sent-text)' : 'var(--badge-recv-text)',
                 }}>
              {role === 'payer' ? 'Sent payment' : 'Received payment'}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3 text-[11px] flex-wrap" style={{ color: 'var(--text-3)' }}>
            <span className="inline-flex items-center gap-1">
              <span>{dept.emoji}</span> {dept.name}
            </span>
            <span className="inline-flex items-center gap-1">
              {mode && <mode.icon className="w-3 h-3" />} {mode?.label}
            </span>
            {bill.attachments?.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> {bill.attachments.length}
              </span>
            )}
            <button onClick={() => setOpen(!open)} className="ml-auto text-[11px] font-semibold transition" style={{ color: 'var(--text-3)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
              {open ? 'Hide' : 'Details'}
            </button>
          </div>

          {open && (
            <div className="mt-3 p-3 rounded-lg border text-xs space-y-1.5 fade-in"
                 style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              {bill.category    && <DetailRow k="Sub-category" v={bill.category} />}
              {bill.description && <DetailRow k="Description"  v={bill.description} />}
              {bill.approvedBy  && <DetailRow k="Approved by"  v={bill.approvedBy} />}
              {bill.chequeNo    && <DetailRow k="Cheque #"     v={bill.chequeNo} />}
              {bill.bank        && <DetailRow k="Bank"         v={bill.bank} />}
              {bill.upiId       && <DetailRow k="UPI ID"       v={bill.upiId} />}
              {bill.txnId       && <DetailRow k="Txn ID"       v={bill.txnId} mono />}
              {bill.utr         && <DetailRow k="UTR"          v={bill.utr} mono />}
              {bill.cardLast4   && <DetailRow k="Card"         v={'•••• ' + bill.cardLast4} mono />}

              {bill.attachments?.length > 0 && (
                <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="uppercase tracking-wider text-[10px] font-bold mb-2 flex items-center justify-between" style={{ color: 'var(--text-3)' }}>
                    <span>Attachments ({bill.attachments.length})</span>
                    {bill.attachments.every(a => a.driveUrl) && (
                      <span className="inline-flex items-center gap-1" style={{ color: '#16A34A' }}>
                        <Cloud className="w-3 h-3" /> on Drive
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bill.attachments.map((att, i) => <AttachmentChip key={i} att={att} />)}
                  </div>
                </div>
              )}

              <div className="pt-2 mt-2 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => { if (window.confirm('Remove this bill from the ledger?')) onDelete(bill.id); }}
                        className="text-[11px] font-semibold inline-flex items-center gap-1" style={{ color: '#EF4444' }}>
                  <Trash2 className="w-3 h-3" /> Delete bill
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Clickable attachment chip — always opens in a new window/tab.
// Drive URL when present, otherwise opens the local base64 preview in a popup.
function AttachmentChip({ att }) {
  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (att.driveUrl) {
      window.open(att.driveUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (att.preview) {
      // Open the local preview (base64 data URL) in a popup window so the user can view/print
      const w = window.open('', '_blank', 'width=900,height=720');
      if (!w) return;
      const isImg = (att.type || '').startsWith('image/') || att.preview.startsWith('data:image/');
      const safeName = (att.name || 'attachment').replace(/[<>"]/g, '');
      const body = isImg
        ? `<img src="${att.preview}" alt="${safeName}" style="max-width:100%;max-height:100vh;display:block;margin:0 auto;">`
        : `<iframe src="${att.preview}" style="width:100%;height:100vh;border:0;"></iframe>`;
      w.document.write(`<!doctype html><html><head><title>${safeName}</title><style>body{margin:0;background:#0a0e27;color:#fff;font-family:system-ui;}h1{font-size:14px;padding:10px 14px;margin:0;background:#161B3A;border-bottom:1px solid rgba(255,255,255,0.1);}</style></head><body><h1>${safeName}</h1>${body}</body></html>`);
      w.document.close();
    }
  };

  const clickable = Boolean(att.driveUrl || att.preview);

  return (
    <a
      href={att.driveUrl || att.preview || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`flex items-center gap-2 p-2 rounded border transition ${clickable ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'}`}
      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', textDecoration: 'none' }}
    >
      <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden flex-shrink-0 border"
           style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {att.preview
          ? <img src={att.preview} className="w-full h-full object-cover" alt="" />
          : att.type?.startsWith('image/')
            ? <ImageIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-4)' }} />
            : <FileIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-4)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>{att.name}</div>
        <div className="text-[10px] flex items-center gap-1" style={{ color: att.driveUrl ? '#16A34A' : 'var(--text-3)' }}>
          <ExternalLink className="w-2.5 h-2.5" />
          {att.driveUrl ? 'Open in Drive' : (clickable ? 'Open in new window' : 'No preview available')}
        </div>
      </div>
    </a>
  );
}

function DetailRow({ k, v, mono }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-24 flex-shrink-0" style={{ color: 'var(--text-3)' }}>{k}</span>
      <span className={mono ? 'font-mono' : ''} style={{ color: 'var(--text-2)' }}>{v}</span>
    </div>
  );
}

// Local money formatter (no currency symbol — caller decides)
function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ============================================================
// BOOKS SCREEN — accounts-style ledger journal with running balance
// ============================================================
function BooksScreen({ bills, projects, selectedProject, onSelectProject, embedded = false }) {
  const [selectedParty, setSelectedParty] = useState('');

  // 1. Bills constrained by project filter (top sticky selector)
  const projectBills = useMemo(() => {
    if (!selectedProject) return bills;
    return bills.filter(b => b.project && b.project.toLowerCase() === selectedProject.name.toLowerCase());
  }, [bills, selectedProject]);

  // 2. All unique party names that appear as either Paid By or Paid To
  //    Scoped to the currently-selected project (or all projects).
  const parties = useMemo(() => {
    const set = new Set();
    projectBills.forEach(b => {
      if (b.paidBy) set.add(b.paidBy);
      if (b.paidTo) set.add(b.paidTo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projectBills]);

  // 3. Filter bills involving the selected party (as Paid By OR Paid To)
  const partyBills = useMemo(() => {
    if (!selectedParty) return [];
    const lower = selectedParty.toLowerCase();
    return projectBills.filter(b =>
      (b.paidBy && b.paidBy.toLowerCase() === lower) ||
      (b.paidTo && b.paidTo.toLowerCase() === lower)
    );
  }, [projectBills, selectedParty]);

  // 4. Sort by date ASC (and createdAt as tiebreaker)
  const sorted = useMemo(() => {
    return [...partyBills].sort((a, b) => {
      const da = new Date(a.date || a.createdAt || 0).getTime();
      const db = new Date(b.date || b.createdAt || 0).getTime();
      if (da !== db) return da - db;
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  }, [partyBills]);

  // 5. Build ledger rows from the selected person's perspective
  //    Paid By = money OUT  → Debit column
  //    Paid To = money IN   → Credit column
  //    Running Balance = sum(Credit) - sum(Debit) → +ve means net received, -ve means net paid out
  const rows = useMemo(() => {
    if (!selectedParty) return [];
    const lower = selectedParty.toLowerCase();
    let balance = 0;
    return sorted.map((bill, i) => {
      const amount = Number(bill.amount) || 0;
      const isPayer    = bill.paidBy && bill.paidBy.toLowerCase() === lower;
      const isReceiver = bill.paidTo && bill.paidTo.toLowerCase() === lower;
      const debit  = isPayer    ? amount : 0;
      const credit = isReceiver ? amount : 0;
      balance += credit - debit; // person's net position
      const counterparty = isPayer ? bill.paidTo : bill.paidBy;
      // Narrative: Department / Sub-category — Description
      const narrParts = [];
      if (bill.department) narrParts.push(bill.department);
      if (bill.category)   narrParts.push(bill.category);
      const narrLead = narrParts.join(' / ');
      const narrative = bill.description
        ? (narrLead ? `${narrLead} — ${bill.description}` : bill.description)
        : (narrLead || '—');
      return {
        index: i + 1,
        date: bill.date,
        project: bill.project || '—',
        name: counterparty || '—',
        narrative,
        journalId: bill.billNumber || (bill.id ? String(bill.id).slice(-8) : ''),
        debit,
        credit,
        balance,
        bill,
      };
    });
  }, [sorted, selectedParty]);

  const totals = useMemo(() => {
    let td = 0, tc = 0;
    rows.forEach(r => { td += r.debit; tc += r.credit; });
    return { debit: td, credit: tc, closing: tc - td };
  }, [rows]);

  return (
    <div>
      {!embedded && (
        <div className="mb-6">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-3)' }}>Books</div>
          <h1 className="text-3xl sm:text-5xl mb-1" style={{ fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.01em', color: 'var(--text)' }}>
            Individual Ledger
          </h1>
          <p style={{ color: 'var(--text-3)' }} className="text-sm">
            Account ledger for a single person · {selectedProject ? selectedProject.name : 'All projects'}
          </p>
        </div>
      )}

      {/* Person picker */}
      <div className="mb-6 rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <label className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2 block" style={{ color: 'var(--text-3)' }}>
          Show Ledger For
        </label>
        {parties.length === 0 ? (
          <div className="text-sm py-2" style={{ color: 'var(--text-3)' }}>
            No transactions yet{selectedProject ? ` in ${selectedProject.name}` : ''} — submit a bill from "New Bill" first.
          </div>
        ) : (
          <ComboBox
            value={selectedParty}
            onChange={v => setSelectedParty(v)}
            options={parties}
            placeholder="Choose a person to view their ledger"
          />
        )}
        {selectedParty && (
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-3)' }}>
            Showing all transactions where <span className="font-semibold" style={{ color: 'var(--text-2)' }}>{selectedParty}</span> is the payer or the payee.
            Debit = money paid out · Credit = money received · Balance = net position.
          </div>
        )}
      </div>

      {!selectedParty ? (
        <div className="py-20 text-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <User className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Pick a person</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Their account ledger will appear here.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>No transactions for {selectedParty}</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Try a different person or change the project filter.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Total Debit"  value={`₹${fmtMoney(totals.debit)}`}  accent="var(--brand-2)" icon={ArrowDownRight} sub="paid out" />
            <StatCard label="Total Credit" value={`₹${fmtMoney(totals.credit)}`} accent="#16A34A" icon={ArrowUpRight}   sub="received" />
            <StatCard
              label="Closing Balance"
              value={`${totals.closing < 0 ? '−' : ''}₹${fmtMoney(Math.abs(totals.closing))}`}
              accent={totals.closing < 0 ? 'var(--brand-2)' : '#16A34A'}
              icon={Wallet}
              sub={totals.closing < 0 ? 'net paid out' : (totals.closing > 0 ? 'net received' : 'square')}
            />
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden sm:block rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-3)' }}>
                    <Th>#</Th>
                    <Th>Date</Th>
                    <Th>Project</Th>
                    <Th>Counterparty</Th>
                    <Th>Narrative</Th>
                    <Th>JournalID</Th>
                    <Th align="right">Debit</Th>
                    <Th align="right">Credit</Th>
                    <Th align="right">Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.bill.id}
                        style={{ background: idx % 2 ? 'var(--surface)' : 'transparent', borderTop: '1px solid var(--border-soft)' }}>
                      <Td mono>{r.index}</Td>
                      <Td>{r.date}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: projects.find(p => p.name === r.project)?.color || '#94a3b8' }} />
                          {r.project}
                        </span>
                      </Td>
                      <Td>{r.name}</Td>
                      <Td truncate>{r.narrative}</Td>
                      <Td mono>
                        <span className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
                          {r.journalId}
                        </span>
                      </Td>
                      <Td align="right" mono>{r.debit > 0 ? `₹${fmtMoney(r.debit)}` : '—'}</Td>
                      <Td align="right" mono>{r.credit > 0 ? `₹${fmtMoney(r.credit)}` : '—'}</Td>
                      <Td align="right" mono strong>
                        <span style={{ color: r.balance < 0 ? 'var(--brand-2)' : (r.balance > 0 ? '#16A34A' : 'var(--text)') }}>
                          {r.balance < 0 ? '−' : ''}₹{fmtMoney(Math.abs(r.balance))}
                        </span>
                      </Td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--surface-3)', fontWeight: 700 }}>
                    <Td colSpan={6}>Totals</Td>
                    <Td align="right" mono strong>₹{fmtMoney(totals.debit)}</Td>
                    <Td align="right" mono strong>₹{fmtMoney(totals.credit)}</Td>
                    <Td align="right" mono strong>
                      <span style={{ color: totals.closing < 0 ? 'var(--brand-2)' : (totals.closing > 0 ? '#16A34A' : 'var(--text)') }}>
                        {totals.closing < 0 ? '−' : ''}₹{fmtMoney(Math.abs(totals.closing))}
                      </span>
                    </Td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS */}
          <div className="sm:hidden space-y-2">
            {rows.map(r => (
              <div key={r.bill.id} className="rounded-xl border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-3)' }}>#{r.index}</span>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{r.date}</span>
                  </div>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>{r.journalId}</span>
                </div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{r.name}</div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: projects.find(p => p.name === r.project)?.color || '#94a3b8' }} />
                    {r.project}
                  </span>
                  {r.narrative && r.narrative !== '—' && <> · {r.narrative}</>}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-soft)' }}>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>Debit</div>
                    <div className="font-mono text-sm" style={{ color: 'var(--text)' }}>{r.debit > 0 ? `₹${fmtMoney(r.debit)}` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>Credit</div>
                    <div className="font-mono text-sm" style={{ color: 'var(--text)' }}>{r.credit > 0 ? `₹${fmtMoney(r.credit)}` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>Balance</div>
                    <div className="font-mono text-sm font-bold" style={{ color: r.balance < 0 ? 'var(--brand-2)' : (r.balance > 0 ? '#16A34A' : 'var(--text)') }}>
                      {r.balance < 0 ? '−' : ''}₹{fmtMoney(Math.abs(r.balance))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-xl border-2 p-3 mt-3" style={{ borderColor: 'var(--brand-1)', background: 'var(--surface)' }}>
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold mb-2" style={{ color: 'var(--text-3)' }}>Totals</div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>Debit</div>
                  <div className="font-mono text-sm font-bold" style={{ color: 'var(--text)' }}>₹{fmtMoney(totals.debit)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>Credit</div>
                  <div className="font-mono text-sm font-bold" style={{ color: 'var(--text)' }}>₹{fmtMoney(totals.credit)}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>Closing</div>
                  <div className="font-mono text-sm font-bold" style={{ color: totals.closing < 0 ? 'var(--brand-2)' : (totals.closing > 0 ? '#16A34A' : 'var(--text)') }}>
                    {totals.closing < 0 ? '−' : ''}₹{fmtMoney(Math.abs(totals.closing))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Small table cell helpers used only by BooksScreen
function Th({ children, align = 'left' }) {
  return (
    <th
      className="px-3 py-2.5 text-[10px] uppercase tracking-[0.15em] font-bold whitespace-nowrap"
      style={{ color: 'var(--text-3)', textAlign: align }}
    >
      {children}
    </th>
  );
}
function Td({ children, align = 'left', mono, strong, truncate, colSpan }) {
  return (
    <td
      colSpan={colSpan}
      className={`px-3 py-2.5 ${mono ? 'font-mono' : ''} ${strong ? 'font-bold' : ''} ${truncate ? 'max-w-[300px] truncate' : ''}`}
      style={{ color: 'var(--text)', textAlign: align, fontSize: '13px' }}
    >
      {children}
    </td>
  );
}

// ============================================================
// PROJECTS SCREEN (master)
// ============================================================
function ProjectsScreen({ projects, bills, onAdd, onUpdate, onDelete, onSyncBills, onSelectProject, settingsConfigured, onOpenSettings }) {
  const [editing, setEditing] = useState(null); // null | 'new' | project obj

  const stats = useMemo(() => {
    const map = new Map();
    bills.forEach(b => {
      if (!b.project) return;
      const key = b.project.toLowerCase();
      if (!map.has(key)) map.set(key, { count: 0, total: 0, lastDate: null });
      const e = map.get(key);
      e.count++;
      e.total += Number(b.amount || 0);
      if (!e.lastDate || (b.date && b.date > e.lastDate)) e.lastDate = b.date;
    });
    return map;
  }, [bills]);

  return (
    <div className="fade-in">
      <ScreenHeader
        eyebrow="Master"
        title="Projects"
        subtitle={projects.length === 0
          ? 'Build your roster of productions. Bills auto-link by project name.'
          : `${projects.length} production${projects.length === 1 ? '' : 's'} on file`}
        action={
          <button
            onClick={() => setEditing('new')}
            className="px-4 py-2.5 rounded-full text-white font-bold text-sm inline-flex items-center gap-2 shadow-md"
            style={{ background: 'linear-gradient(135deg, var(--brand-3), var(--brand-1))' }}
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        }
      />

      {!settingsConfigured && projects.length > 0 && (
        <button
          onClick={onOpenSettings}
          className="w-full mb-4 p-3 rounded-xl border-2 border-dashed flex items-center gap-3 text-left transition hover:opacity-90"
          style={{ borderColor: 'var(--brand-2)', background: 'var(--surface-2)', opacity: 0.95 }}
        >
          <Cloud className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--brand-2)' }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Set up Drive sync to push bills to Google Sheets
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              Configure your Apps Script URL in Settings — takes one minute
            </div>
          </div>
          <Settings className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
        </button>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl border"
             style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="text-6xl mb-4">🎞️</div>
          <div className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No productions yet</div>
          <div className="mb-6 text-sm max-w-sm mx-auto" style={{ color: 'var(--text-3)' }}>
            Add a project to organise bills cleanly. Each project gets a unique prefix for auto-numbered bills (like UF-0001).
          </div>
          <button onClick={() => setEditing('new')}
            className="px-6 py-3 rounded-full text-white font-bold text-sm inline-flex items-center gap-2 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--brand-3), var(--brand-1))' }}>
            <Plus className="w-4 h-4" />
            Create first project
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              stats={stats.get(p.name.toLowerCase()) || { count: 0, total: 0, lastDate: null }}
              onEdit={() => setEditing(p)}
              onSyncBills={() => onSyncBills(p.id)}
              onView={() => onSelectProject(p.id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <ProjectModal
          project={editing === 'new' ? null : editing}
          existingNames={projects.filter(p => editing === 'new' || p.id !== editing.id).map(p => p.name.toLowerCase())}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') onAdd(data);
            else onUpdate(editing.id, data);
            setEditing(null);
          }}
          onDelete={editing !== 'new' ? () => {
            if (window.confirm(`Delete project "${editing.name}"?\n\nExisting bills under this project will keep their data — only the master entry is removed.`)) {
              onDelete(editing.id);
              setEditing(null);
            }
          } : null}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, stats, onEdit, onSyncBills, onView }) {
  const s = project.driveStatus;
  return (
    <div
      className="rounded-2xl border p-4 sm:p-5 relative overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-15 pointer-events-none" style={{ background: project.color }} />

      <div className="relative flex items-center gap-4">
        <button
          onClick={onView}
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border transition hover:scale-[1.03]"
          style={{ background: project.color + '15', borderColor: project.color + '55' }}
          title="View this project's ledger"
        >
          <span className="font-bold text-sm tracking-wide" style={{ color: project.color, fontFamily: '"IBM Plex Mono", monospace' }}>
            {project.prefix}
          </span>
        </button>
        <button onClick={onView} className="flex-1 min-w-0 text-left">
          <div className="font-bold truncate text-base" style={{ color: 'var(--text)' }}>{project.name}</div>
          <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-3)' }}>
            <span>{stats.count} bill{stats.count === 1 ? '' : 's'}</span>
            <span style={{ color: 'var(--text-divider)' }}>·</span>
            <span className="font-semibold" style={{ color: 'var(--text-2)', fontFamily: '"IBM Plex Mono", monospace' }}>
              {formatCurrency(stats.total)}
            </span>
            {stats.lastDate && (
              <>
                <span style={{ color: 'var(--text-divider)' }}>·</span>
                <span>last {formatDate(stats.lastDate)}</span>
              </>
            )}
          </div>
          {project.notes && (
            <div className="text-xs mt-1 truncate italic" style={{ color: 'var(--text-4)' }}>{project.notes}</div>
          )}
        </button>
        <button
          onClick={onEdit}
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition"
          style={{ color: 'var(--text-4)', background: 'var(--surface-2)' }}
          title="Edit project"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      <div className="relative mt-3 pt-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <DriveStatusBadge project={project} />
        <div className="flex-1" />
        {project.driveFolderUrl && (
          <a
            href={project.driveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition hover:opacity-80"
            style={{ color: 'var(--text-2)', background: 'var(--surface-2)' }}
          >
            <FolderOpen className="w-3 h-3" /> Folder
          </a>
        )}
        {project.driveSheetUrl && (
          <a
            href={project.driveSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition hover:opacity-80"
            style={{ color: 'var(--text-2)', background: 'var(--surface-2)' }}
          >
            <FileText className="w-3 h-3" /> Sheet
          </a>
        )}
        <button
          onClick={onSyncBills}
          disabled={s === 'syncing'}
          className="text-[11px] font-bold inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition hover:opacity-90 disabled:opacity-60"
          style={{
            background: s === 'synced'
              ? 'linear-gradient(135deg, #16A34A, #0891B2)'
              : 'linear-gradient(135deg, #2563EB, #7C3AED)',
            color: '#fff',
          }}
          title={s === 'synced' ? 'Re-sync bills' : 'Create folder + sheet, then push bills'}
        >
          {s === 'syncing'
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Syncing…</>
            : <><RefreshCw className="w-3 h-3" /> Sync {stats.count > 0 ? `(${stats.count})` : ''}</>}
        </button>
      </div>

      {project.driveError && s === 'failed' && (
        <div className="relative mt-2 text-[10px] italic truncate" style={{ color: '#EF4444' }} title={project.driveError}>
          {project.driveError}
        </div>
      )}
    </div>
  );
}

function ProjectModal({ project, onClose, onSave, onDelete, existingNames }) {
  const [name, setName] = useState(project?.name || '');
  const [prefix, setPrefix] = useState(project?.prefix || '');
  const [color, setColor] = useState(project?.color || PROJECT_COLORS[0]);
  const [notes, setNotes] = useState(project?.notes || '');
  const [prefixTouched, setPrefixTouched] = useState(Boolean(project));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!prefixTouched) setPrefix(suggestPrefix(name));
  }, [name, prefixTouched]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleSave = () => {
    const e = {};
    const trimmedName = name.trim();
    const trimmedPrefix = prefix.trim();
    if (!trimmedName) e.name = 'Name required';
    else if (existingNames?.includes(trimmedName.toLowerCase())) e.name = 'Project already exists';
    if (!trimmedPrefix) e.prefix = 'Prefix required';
    else if (!/^[A-Z0-9-]{1,6}$/i.test(trimmedPrefix)) e.prefix = 'Use up to 6 letters/numbers';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ name: trimmedName, prefix: trimmedPrefix.toUpperCase(), color, notes: notes.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 fade-in flex items-stretch sm:items-center justify-center sm:p-6"
      style={{
        background: 'var(--overlay)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md h-full sm:h-auto sm:max-h-[90vh]
                   flex flex-col overflow-hidden
                   sm:rounded-3xl sm:border scale-in"
        style={{
          background: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex-shrink-0">
          <div className="h-1.5">
            <div
              className="h-full"
              style={{ background: 'linear-gradient(90deg, var(--brand-1), var(--brand-2), var(--brand-3), #16A34A, #2563EB, #7C3AED)' }}
            />
          </div>
          <div className="p-5 sm:p-6 pb-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-soft)' }}>
            <div className="min-w-0">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'var(--text-3)' }}>
                {project ? 'Edit' : 'Create'}
              </div>
              <h2
                className="text-2xl sm:text-3xl leading-none mt-1 truncate"
                style={{ fontFamily: '"Bebas Neue", sans-serif', letterSpacing: '0.01em', color: 'var(--text)' }}
              >
                {project ? 'Edit Project' : 'New Project'}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full flex items-center justify-center transition hover:opacity-80 flex-shrink-0 ml-3"
              style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body — `min-h-0` is crucial so flex-1 child can shrink and scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5">
          <div className="space-y-4">
            <Field label="Project Name" required error={errors.name}>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Untitled Feature 2026"
              />
            </Field>
            <Field label="Bill Prefix" required error={errors.prefix}>
              <Input
                value={prefix}
                onChange={e => { setPrefix(e.target.value.toUpperCase()); setPrefixTouched(true); }}
                placeholder="e.g. UF26"
                maxLength={6}
                style={{ fontFamily: '"IBM Plex Mono", monospace' }}
              />
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-3)' }}>
                Used in bill numbers like{' '}
                <span
                  className="font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}
                >
                  {(prefix || 'PRF').toUpperCase()}-0001
                </span>
              </div>
            </Field>
            <Field label="Color">
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map(c => {
                  const selected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-9 h-9 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: c,
                        boxShadow: selected ? `0 0 0 3px var(--surface-elevated), 0 0 0 5px ${c}` : 'none',
                      }}
                      aria-label={`color ${c}`}
                    />
                  );
                })}
              </div>
            </Field>
            <Field label="Notes">
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional — director, producer, banner, dates…"
              />
            </Field>
          </div>
        </div>

        {/* Sticky footer */}
        <div
          className="flex-shrink-0 p-4 sm:p-5 flex items-center gap-2 justify-between border-t"
          style={{ borderColor: 'var(--border-soft)', background: 'var(--surface-elevated)' }}
        >
          {onDelete ? (
            <button
              onClick={onDelete}
              className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 transition"
              style={{ color: '#EF4444' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ color: 'var(--text-2)', background: 'var(--surface-3)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--brand-3), var(--brand-2), var(--brand-1))' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS / CONFIG SCREEN (admin)
// ============================================================
function SettingsScreen({ settings, onUpdate, projects, onUpdateProject, onRefresh, onPushRow, onSyncProject, onLogout, authUser, paletteId, onPaletteChange }) {
  const [scriptUrlDraft, setScriptUrlDraft] = useState(settings.scriptUrl || '');
  const [folderDraft, setFolderDraft] = useState(settings.parentFolderId || '');
  const [savedFlash, setSavedFlash] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setScriptUrlDraft(settings.scriptUrl || ''); }, [settings.scriptUrl]);
  useEffect(() => { setFolderDraft(settings.parentFolderId || ''); }, [settings.parentFolderId]);

  const saveSettings = () => {
    onUpdate({ scriptUrl: scriptUrlDraft.trim(), parentFolderId: folderDraft.trim() });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const testConnection = async () => {
    const url = scriptUrlDraft.trim();
    if (!url) { setTestResult({ ok: false, msg: 'Enter the Apps Script URL first' }); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const r = await driveAdapter.ping(url);
      setTestResult({ ok: true, msg: `Connected — Config sheet ready`, configUrl: r.configSheetUrl });
      // Save it automatically if it tested green and isn't yet persisted
      if (url !== settings.scriptUrl || (r.configSheetUrl && r.configSheetUrl !== settings.configSheetUrl)) {
        onUpdate({ scriptUrl: url, configSheetUrl: r.configSheetUrl });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: String(e.message || e) });
    } finally {
      setTesting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div className="fade-in">
      <ScreenHeader
        eyebrow="Admin"
        title="Settings"
        subtitle="Backend connection and project ↔ Drive mappings"
      />

      {/* Apps Script connection */}
      <Section title="Backend Connection" accent="#2563EB" icon={Cloud}>
        <div className="grid gap-4">
          <Field label="Apps Script Web App URL" required>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={scriptUrlDraft}
                onChange={e => setScriptUrlDraft(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px' }}
              />
              <button
                onClick={testConnection}
                disabled={testing || !scriptUrlDraft.trim()}
                className="px-4 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition disabled:opacity-50"
                style={{ background: 'var(--surface-3)', color: 'var(--text)' }}
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                {testing ? 'Testing…' : 'Test'}
              </button>
              {scriptUrlDraft.trim() && (
                <a
                  href={scriptUrlDraft.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition inline-flex items-center justify-center gap-1.5"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                  title="Open URL in a new tab to verify the script is reachable"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </a>
              )}
            </div>
            {testResult && (
              <div
                className="mt-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2"
                style={{
                  background: testResult.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
                  color: testResult.ok ? '#15803D' : '#B91C1C',
                }}
              >
                {testResult.ok
                  ? <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  : <CloudOff className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{testResult.msg}</span>
              </div>
            )}
            <div className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--text-3)' }}>
              Deploy the Apps Script (see <code style={{ background: 'var(--surface-3)', padding: '1px 4px', borderRadius: 3 }}>cine-ledger-apps-script.gs</code>) as a Web App,
              then paste its URL here. Set "Execute as: Me" and "Who has access: Anyone".
            </div>
          </Field>

          <Field label="Parent Folder ID">
            <Input
              value={folderDraft}
              onChange={e => setFolderDraft(e.target.value)}
              placeholder={DRIVE_PARENT_FOLDER_ID}
              style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '13px' }}
            />
            <div className="text-[11px] mt-1.5" style={{ color: 'var(--text-3)' }}>
              The Drive folder where project folders + Config sheet will live. (Currently hardcoded in the Apps Script — update there to change.)
            </div>
          </Field>

          {settings.configSheetUrl && (
            <Field label="Config Sheet">
              <a
                href={settings.configSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
                style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
              >
                <FileText className="w-4 h-4" style={{ color: '#16A34A' }} />
                Open in Google Sheets
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </Field>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={saveSettings}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--brand-3), var(--brand-2), var(--brand-1))' }}
            >
              Save Settings
            </button>
            {savedFlash && (
              <span className="text-xs inline-flex items-center gap-1 fade-in" style={{ color: '#16A34A' }}>
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* Project links table */}
      <Section
        title="Project ↔ Sheet Mappings"
        accent="#7C3AED"
        icon={FolderOpen}
        action={
          <button
            onClick={handleRefresh}
            disabled={refreshing || !settings.scriptUrl}
            className="text-xs font-bold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition disabled:opacity-50"
            style={{ background: 'var(--surface-3)', color: 'var(--text)' }}
          >
            {refreshing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh from Drive
          </button>
        }
      >
        {projects.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-3)' }}>
            No projects yet. Add one from the Projects screen.
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <ConfigRow
                key={p.id}
                project={p}
                onPush={(row) => onPushRow(row)}
                onSync={() => onSyncProject(p.id)}
                disabled={!settings.scriptUrl}
              />
            ))}
          </div>
        )}
        <div className="text-[11px] mt-3 leading-relaxed pt-3 border-t" style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}>
          Tap a row's Sync button to auto-create or refresh the folder + sheet. To manually override a stale link, click <Pencil className="w-3 h-3 inline" /> on a row, paste the new URL, and Save — it pushes straight to the Config sheet.
        </div>
      </Section>

      <Section title="Appearance" accent="var(--brand-2)" icon={Palette}>
        <div className="text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>
          Pick a color theme. Affects accents, gradients, and badges across every screen — applies instantly and persists.
        </div>
        <PalettePicker
          current={paletteId}
          onChange={onPaletteChange}
          columns={6}
        />
        <div className="text-xs mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>Current:</span>
          <span className="font-bold">{getPalette(paletteId).name}</span>
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--brand-1)' }} />
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--brand-2)' }} />
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--brand-3)' }} />
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--brand-4)' }} />
          </div>
        </div>
      </Section>

      <Section title="Project Visibility" accent="#7C3AED" icon={FolderOpen}>
        <div className="text-[11px] mb-3" style={{ color: 'var(--text-3)' }}>
          Toggle which projects appear in the New Bill form, Project picker, and Ledger. Disabled projects stay in the Projects master and Drive — only their visibility in the app changes.
        </div>
        {projects.length === 0 ? (
          <div className="text-xs py-4 text-center" style={{ color: 'var(--text-3)' }}>
            No projects yet — create one from the Projects tab.
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => {
              const enabled = p.enabled !== false;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl border"
                  style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                >
                  <span
                    className="px-2 py-1 rounded-md text-[10px] font-bold tracking-wide font-mono flex-shrink-0"
                    style={{
                      background: (p.color || '#94a3b8') + '22',
                      color: p.color || 'var(--text-2)',
                      border: `1px solid ${(p.color || '#94a3b8')}55`,
                    }}
                  >
                    {p.prefix}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{p.name}</div>
                    <div className="text-[11px]" style={{ color: enabled ? '#16A34A' : 'var(--text-4)' }}>
                      {enabled ? 'Visible to users' : 'Hidden'}
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateProject(p.id, { enabled: !enabled })}
                    role="switch"
                    aria-checked={enabled}
                    className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                    style={{ background: enabled ? '#16A34A' : 'var(--surface-3)' }}
                  >
                    <span
                      className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      style={{ left: enabled ? '22px' : '2px' }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Account" accent="var(--brand-1)" icon={User}>
        <div className="text-sm space-y-3" style={{ color: 'var(--text-2)' }}>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-3)' }}>Signed in as:</span>
            <span className="font-mono">{authUser?.email}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: 'rgba(225,29,116,0.15)', color: 'var(--brand-1)' }}>
              ADMIN
            </span>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 transition border"
            style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </Section>

      <Section title="About" accent="#16A34A" icon={Settings}>
        <div className="text-sm space-y-2" style={{ color: 'var(--text-2)' }}>
          <div><span style={{ color: 'var(--text-3)' }}>Brand:</span> {BRAND.name}</div>
          <div><span style={{ color: 'var(--text-3)' }}>Storage:</span> Browser (window.storage) — bills, projects, parties, settings, theme</div>
          <div><span style={{ color: 'var(--text-3)' }}>Backend:</span> {settings.scriptUrl ? <span style={{ color: '#16A34A' }}>Configured ✓</span> : <span style={{ color: 'var(--brand-2)' }}>Not configured</span>}</div>
        </div>
      </Section>
    </div>
  );
}

function ConfigRow({ project, onPush, onSync, disabled }) {
  const [editing, setEditing] = useState(false);
  const [folderUrl, setFolderUrl] = useState(project.driveFolderUrl || '');
  const [sheetUrl, setSheetUrl] = useState(project.driveSheetUrl || '');
  const [folderId, setFolderId] = useState(project.driveFolderId || '');
  const [sheetId, setSheetId]   = useState(project.driveSheetId || '');

  useEffect(() => { setFolderUrl(project.driveFolderUrl || ''); }, [project.driveFolderUrl]);
  useEffect(() => { setSheetUrl(project.driveSheetUrl || ''); }, [project.driveSheetUrl]);
  useEffect(() => { setFolderId(project.driveFolderId || ''); }, [project.driveFolderId]);
  useEffect(() => { setSheetId(project.driveSheetId || ''); }, [project.driveSheetId]);

  const save = async () => {
    await onPush({
      name: project.name,
      prefix: project.prefix,
      folderId, folderUrl,
      sheetId, sheetUrl,
      lastSynced: new Date().toISOString(),
      billCount: 0,
      notes: project.notes || '',
    });
    setEditing(false);
  };

  return (
    <div className="rounded-xl border p-3 sm:p-4" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border"
             style={{ background: project.color + '18', borderColor: project.color + '55' }}>
          <span className="font-bold text-[11px]" style={{ color: project.color, fontFamily: '"IBM Plex Mono", monospace' }}>
            {project.prefix}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate" style={{ color: 'var(--text)' }}>{project.name}</div>
          {!editing && (
            <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }}>
              {sheetUrl
                ? <span className="font-mono">{sheetUrl.slice(0, 50)}{sheetUrl.length > 50 ? '…' : ''}</span>
                : <span className="italic">Not synced yet</span>}
            </div>
          )}
        </div>
        {!editing && (
          <>
            {sheetUrl && (
              <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
                 className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:opacity-80"
                 style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }} title="Open sheet">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => setEditing(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition"
              style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}
              title="Edit links"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onSync}
              disabled={disabled || project.driveStatus === 'syncing'}
              className="text-[11px] font-bold inline-flex items-center gap-1 px-2.5 py-1 rounded-full transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', color: '#fff' }}
            >
              {project.driveStatus === 'syncing'
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              Sync
            </button>
          </>
        )}
      </div>

      {editing && (
        <div className="mt-3 grid sm:grid-cols-2 gap-3 fade-in">
          <Field label="Folder URL">
            <Input value={folderUrl} onChange={e => setFolderUrl(e.target.value)}
                   placeholder="https://drive.google.com/drive/folders/…"
                   style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }} />
          </Field>
          <Field label="Folder ID">
            <Input value={folderId} onChange={e => setFolderId(e.target.value)}
                   placeholder="1abc…"
                   style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }} />
          </Field>
          <Field label="Sheet URL">
            <Input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
                   placeholder="https://docs.google.com/spreadsheets/…"
                   style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }} />
          </Field>
          <Field label="Sheet ID">
            <Input value={sheetId} onChange={e => setSheetId(e.target.value)}
                   placeholder="1xyz…"
                   style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '12px' }} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
            <button onClick={() => setEditing(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    style={{ color: 'var(--text-2)', background: 'var(--surface-3)' }}>
              Cancel
            </button>
            <button onClick={save} disabled={disabled}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, var(--brand-3), var(--brand-1))' }}>
              Save to Drive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
