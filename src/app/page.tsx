"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PromoType = "boost" | "cashback" | "fb5" | "fb10" | "custom";
type Outcome = "gain" | "loss" | "refund";
type Period = "day" | "week" | "month" | "year";
type Bookmaker =
  | "Winamax"
  | "Unibet"
  | "PMU"
  | "Betclic"
  | "Bet365"
  | "Olybet"
  | "Genybet"
  | "Netbet"
  | "Daznbet"
  | "Circusbet"
  | "Bankonbet"
  | "Sportaza";

type PromoRow = {
  id: string;
  name: string;
  bookmaker: Bookmaker;
  type: PromoType;
  stake: number;
  odds: number;
  outcome: Outcome;
  freebets: number;
  cashbackRate: number;
  cashbackCap: number;
  date: string;
  notes: string;
};

const CONVERSION_RATE = 0.85;
const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];
const BOOKMAKERS: Bookmaker[] = [
  "Winamax",
  "Unibet",
  "PMU",
  "Betclic",
  "Bet365",
  "Olybet",
  "Genybet",
  "Netbet",
  "Daznbet",
  "Circusbet",
  "Bankonbet",
  "Sportaza",
];

const formatCurrency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const formatInteger = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const formatPercent = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
});

const promoTypeLabels: Record<PromoType, string> = {
  boost: "Boost value",
  cashback: "Cashback freebets",
  fb5: "5€ -> 5€ freebets",
  fb10: "10€ -> 10€ freebets",
  custom: "Personnalisé",
};

const bookmakerLabels: Record<Bookmaker, string> = {
  Winamax: "Winamax",
  Unibet: "Unibet",
  PMU: "PMU",
  Betclic: "Betclic",
  Bet365: "Bet365",
  Olybet: "Olybet",
  Genybet: "Genybet",
  Netbet: "Netbet",
  Daznbet: "Daznbet",
  Circusbet: "Circusbet",
  Bankonbet: "Bankonbet",
  Sportaza: "Sportaza",
};

const LOGO_ASSET_VERSION = "20260922";

const bookmakerLogoSrc: Partial<Record<Bookmaker, string>> = {
  Winamax: `/winamax.png?v=${LOGO_ASSET_VERSION}`,
  Unibet: `/unibet.png?v=${LOGO_ASSET_VERSION}`,
  PMU: `/pmu.png?v=${LOGO_ASSET_VERSION}`,
  Betclic: `/betclic.png?v=${LOGO_ASSET_VERSION}`,
  Bet365: `/bet365.png?v=${LOGO_ASSET_VERSION}`,
  Olybet: `/olybet.png?v=${LOGO_ASSET_VERSION}`,
  Genybet: `/genybet.png?v=${LOGO_ASSET_VERSION}`,
  Netbet: `/netbet.png?v=${LOGO_ASSET_VERSION}`,
  Daznbet: `/daznbet.png?v=${LOGO_ASSET_VERSION}`,
  Circusbet: `/circusbet.png?v=${LOGO_ASSET_VERSION}`,
  Bankonbet: `/bankonbet.png?v=${LOGO_ASSET_VERSION}`,
  Sportaza: `/sportaza.png?v=${LOGO_ASSET_VERSION}`,
};

function BookmakerLogo({ bookmaker, className = "" }: { bookmaker: Bookmaker; className?: string }) {
  const src = bookmakerLogoSrc[bookmaker];

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-[10px] font-black uppercase tracking-[0.18em] text-white ${className}`}
      >
        {bookmaker.slice(0, 2)}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-[0_12px_24px_rgba(0,0,0,0.22)] ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_60%)]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={bookmakerLabels[bookmaker]}
        className="relative z-10 h-full w-full object-contain p-2"
      />
    </div>
  );
}

function summarizeRows(rows: PromoRow[]) {
  const freebets = rows.reduce((sum, row) => sum + computeFreebets(row), 0);
  const converted = freebets * CONVERSION_RATE;
  const stake = rows.reduce((sum, row) => sum + row.stake, 0);
  const net = rows.reduce((sum, row) => sum + computeNet(row), 0);
  const winningRows = rows.filter((row) => computeNet(row) > 0).length;

  return {
    rows,
    count: rows.length,
    stake,
    freebets,
    converted,
    net,
    winningRows,
  };
}

function buildBilanChart(rows: PromoRow[], period: Period) {
  const today = new Date();
  const periodStart = getPeriodStart(period, today);
  const periodEnd = new Date(today);
  periodEnd.setHours(23, 59, 59, 999);

  const dayBuckets = new Map<string, number>();
  const activeRows = rows.filter((row) => {
    const rowDate = parseLocalDate(row.date);
    return rowDate >= periodStart && rowDate <= periodEnd;
  });

  for (const row of activeRows) {
    const dayKey = row.date;
    dayBuckets.set(dayKey, (dayBuckets.get(dayKey) ?? 0) + computeNet(row));
  }

  const days: Array<{ key: string; label: string; value: number }> = [];
  for (let cursor = new Date(periodStart); cursor <= periodEnd; cursor = addDays(cursor, 1)) {
    const key = toLocalDateInputValue(cursor);
    days.push({
      key,
      label: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(cursor),
      value: dayBuckets.get(key) ?? 0,
    });
  }

  const cumulative: Array<{ key: string; label: string; value: number }> = [];
  let runningTotal = 0;

  cumulative.push({
    key: `${period}-start`,
    label: "0",
    value: 0,
  });

  for (const day of days) {
    runningTotal += day.value;
    cumulative.push({
      ...day,
      value: runningTotal,
    });
  }

  const values = cumulative.map((point) => point.value);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum || 1;

  const width = 1000;
  const height = 320;
  const paddingX = 46;
  const paddingY = 34;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = cumulative.map((point, index) => {
    const x = cumulative.length === 1 ? width / 2 : paddingX + (index / (cumulative.length - 1)) * chartWidth;
    const normalized = (point.value - minimum) / range;
    const y = paddingY + chartHeight - normalized * chartHeight;

    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points.at(-1)?.x.toFixed(2) ?? width - paddingX} ${height - paddingY} L ${points[0]?.x.toFixed(2) ?? paddingX} ${height - paddingY} Z`;

  return {
    points,
    linePath,
    areaPath,
    startValue: 0,
    endValue: cumulative.at(-1)?.value ?? 0,
    minValue: minimum,
    maxValue: maximum,
    activeRowsCount: activeRows.length,
    periodEnd,
  };
}

function toLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateValue: string) {
  return new Date(`${dateValue}T12:00:00`);
}

function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseLocalDate(dateValue));
}

function getPeriodStart(period: Period, referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "day":
      start.setDate(start.getDate() - 1);
      break;
    case "week":
      start.setDate(start.getDate() - 6);
      break;
    case "month":
      start.setDate(start.getDate() - 29);
      break;
    case "year":
      start.setDate(start.getDate() - 364);
      break;
  }

  return start;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

const defaultForm = (): PromoRow => ({
  id: "",
  name: "",
  bookmaker: "Winamax",
  type: "boost",
  stake: 20,
  odds: 2,
  outcome: "gain",
  freebets: 0,
  cashbackRate: 0,
  cashbackCap: 0,
  date: toLocalDateInputValue(),
  notes: "",
});

function computeFreebets(row: PromoRow) {
  if (row.type === "cashback") {
    return Math.min(row.stake * row.cashbackRate, row.cashbackCap);
  }

  return row.freebets;
}

function computeBetResult(row: PromoRow) {
  if (row.outcome === "refund") {
    return 0;
  }

  if (row.outcome === "gain") {
    return row.stake * (row.odds - 1);
  }

  return -row.stake;
}

function computeNet(row: PromoRow) {
  return computeBetResult(row) + computeFreebets(row) * CONVERSION_RATE;
}

function promoTemplate(type: PromoType): Partial<PromoRow> {
  switch (type) {
    case "cashback":
      return {
        stake: 100,
        odds: 1.75,
        outcome: "loss",
        freebets: 0,
        cashbackRate: 0.2,
        cashbackCap: 100,
      };
    case "fb5":
      return {
        stake: 5,
        odds: 2,
        outcome: "gain",
        freebets: 5,
        cashbackRate: 0,
        cashbackCap: 0,
      };
    case "fb10":
      return {
        stake: 10,
        odds: 2,
        outcome: "gain",
        freebets: 10,
        cashbackRate: 0,
        cashbackCap: 0,
      };
    case "boost":
      return {
        stake: 20,
        odds: 2,
        outcome: "gain",
        freebets: 0,
        cashbackRate: 0,
        cashbackCap: 0,
      };
    case "custom":
    default:
      return {
        stake: 10,
        odds: 2,
        outcome: "gain",
        freebets: 0,
        cashbackRate: 0,
        cashbackCap: 0,
      };
  }
}

export default function Home() {
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [form, setForm] = useState<PromoRow>(defaultForm());
  const [period, setPeriod] = useState<Period>("month");
  const [isLoadingPromos, setIsLoadingPromos] = useState(true);
  const [isSavingPromo, setIsSavingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const boostRows = promos.filter((row) => row.type === "boost");
  const promoRows = promos.filter((row) => row.type !== "boost");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPromos() {
      try {
        setIsLoadingPromos(true);
        setPromoError(null);

        const response = await fetch("/api/promos", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Impossible de charger les paris depuis Supabase.");
        }

        const data = (await response.json()) as PromoRow[];
        setPromos(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message = error instanceof Error ? error.message : "Une erreur est survenue au chargement.";
        setPromoError(message);
      } finally {
        setIsLoadingPromos(false);
      }
    }

    void loadPromos();

    return () => controller.abort();
  }, []);

  const totals = useMemo(() => {
    const global = summarizeRows(promos);
    const boosts = summarizeRows(boostRows);
    const promosOnly = summarizeRows(promoRows);

    const byBookmaker = BOOKMAKERS.map((bookmaker) => {
      const rows = promos.filter((row) => row.bookmaker === bookmaker);
      const bookmakerSummary = summarizeRows(rows);

      return {
        bookmaker,
        count: bookmakerSummary.count,
        stake: bookmakerSummary.stake,
        freebets: bookmakerSummary.freebets,
        converted: bookmakerSummary.converted,
        net: bookmakerSummary.net,
      };
    }).filter((entry) => entry.count > 0);

    return {
      global,
      boosts,
      promosOnly,
      byBookmaker,
    };
  }, [boostRows, promoRows, promos]);

  const charts = useMemo(() => {
    return {
      boosts: buildBilanChart(boostRows, period),
      promos: buildBilanChart(promoRows, period),
    };
  }, [boostRows, promoRows, period]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSavingPromo(true);
      setPromoError(null);

      const payload = {
        ...form,
        name: form.name.trim() || `Promo ${promos.length + 1}`,
      };

      const response = await fetch("/api/promos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorBody?.error ?? "Impossible d'enregistrer le pari.");
      }

      const nextRow = (await response.json()) as PromoRow;
      setPromos((current) => [nextRow, ...current]);

      setForm((current) => ({
        ...defaultForm(),
        bookmaker: current.bookmaker,
        type: current.type,
        date: toLocalDateInputValue(),
        ...promoTemplate(current.type),
      }) as PromoRow);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue à l'enregistrement.";
      setPromoError(message);
    } finally {
      setIsSavingPromo(false);
    }
  }

  function updateForm<K extends keyof PromoRow>(key: K, value: PromoRow[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleTypeChange(nextType: PromoType) {
    setForm((current) => ({
      ...current,
      type: nextType,
      ...promoTemplate(nextType),
    }) as PromoRow);
  }

  function handleBookmakerChange(nextBookmaker: Bookmaker) {
    updateForm("bookmaker", nextBookmaker);
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-stone-50 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8%] top-[-8%] h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute right-[8%] top-[4%] h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[28%] h-96 w-96 rounded-full bg-emerald-400/8 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(250,204,21,0.08)_28%,rgba(15,19,26,0.95)_70%,rgba(7,10,15,0.98)_100%)] shadow-[0_36px_110px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="grid gap-10 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
            <div className="flex flex-col justify-between gap-8">
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-amber-200/40 bg-white shadow-[0_0_0_10px_rgba(255,255,255,0.04)] sm:h-24 sm:w-24">
                  <Image src="/logo.png" alt="Les Bons Plans de Tonton" fill priority className="object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.45em] text-amber-200/80">
                    Les Bons Plans de Tonton
                  </p>
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                    Bilan LBPT
                  </h1>
                </div>
              </div>

              <div className="max-w-2xl space-y-4">
                <p className="max-w-xl text-base leading-7 text-stone-200/80 sm:text-lg">
                  Un tableau de bord plus lisible pour suivre les boosts, les promos et le résultat net sans bruit visuel inutile.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <p className="text-xs uppercase tracking-[0.3em] text-stone-300/70">Conversion</p>
                    <p className="mt-2 text-2xl font-black text-amber-200">{formatPercent.format(CONVERSION_RATE)}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <p className="text-xs uppercase tracking-[0.3em] text-stone-300/70">Lignes suivies</p>
                    <p className="mt-2 text-2xl font-black text-white">{formatInteger.format(promos.length)}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <p className="text-xs uppercase tracking-[0.3em] text-stone-300/70">Bilan net</p>
                    <p className={`mt-2 text-2xl font-black ${totals.global.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatCurrency.format(totals.global.net)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur">
              <div className="rounded-[1.5rem] border border-amber-300/20 bg-[linear-gradient(160deg,rgba(255,209,92,0.14),rgba(148,163,184,0.04),rgba(255,255,255,0.02))] p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Bilan global</p>
                <div className="mt-4 flex items-end gap-4">
                  <p className={`text-5xl font-black sm:text-6xl ${totals.global.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatCurrency.format(totals.global.net)}
                  </p>
                  <span className="pb-2 text-sm font-semibold text-stone-200/75">de résultat net</span>
                </div>
                <p className="mt-4 max-w-md text-sm leading-6 text-stone-100/80">
                  Total des freebets gagnés, valeur convertie et résultat de chaque pari/promo en tenant compte de la cote rentrée.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-300/70">Freebets gagnés</p>
                  <p className="mt-2 text-2xl font-black text-white">{formatCurrency.format(totals.global.freebets)}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-300/70">Valeur convertie</p>
                  <p className="mt-2 text-2xl font-black text-amber-200">{formatCurrency.format(totals.global.converted)}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-300/70">Mises engagées</p>
                  <p className="mt-2 text-2xl font-black text-white">{formatCurrency.format(totals.global.stake)}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-300/70">promos positives</p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {formatInteger.format(totals.global.winningRows)} / {formatInteger.format(promos.length)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Courbes du bilan</p>
              <h2 className="mt-2 text-2xl font-black text-white">Boosts et promos séparés</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPeriod(item.key)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] transition ${
                    period === item.key
                      ? "border-amber-300/60 bg-amber-300/20 text-amber-100"
                      : "border-white/10 bg-white/5 text-stone-300 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {[
              {
                title: "Boosts",
                description: "Évolution graphique du bilan des boosts",
                chart: charts.boosts,
                accent: "from-amber-300 to-rose-400",
                dot: "#fbbf24",
              },
              {
                title: "Promos",
                description: "Évolution graphique du bilan des promos",
                chart: charts.promos,
                accent: "from-sky-300 to-emerald-300",
                dot: "#34d399",
              },
            ].map((item) => (
              <article key={item.title} className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">{item.title}</p>
                    <h3 className="mt-2 text-xl font-black text-white">{item.description}</h3>
                  </div>
                  <div className={`rounded-full bg-gradient-to-r ${item.accent} px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-black`}>
                    {PERIODS.find((entry) => entry.key === period)?.label}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Départ</p>
                    <p className="mt-1 text-lg font-black text-white">{formatCurrency.format(item.chart.startValue)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Fin</p>
                    <p className={`mt-1 text-lg font-black ${item.chart.endValue >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatCurrency.format(item.chart.endValue)}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Max</p>
                    <p className="mt-1 text-lg font-black text-amber-200">{formatCurrency.format(item.chart.maxValue)}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Lignes</p>
                    <p className="mt-1 text-lg font-black text-white">{formatInteger.format(item.chart.activeRowsCount)}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/20 p-3">
                  <svg viewBox="0 0 1000 320" className="h-[300px] w-full" role="img" aria-label={`Courbe du bilan ${item.title.toLowerCase()}`}>
                    <defs>
                      <linearGradient id={`lineGradient-${item.title}`} x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor={item.dot} />
                        <stop offset="100%" stopColor={item.title === "Boosts" ? "#fb7185" : "#38bdf8"} />
                      </linearGradient>
                      <linearGradient id={`areaGradient-${item.title}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={item.title === "Boosts" ? "rgba(251,191,36,0.38)" : "rgba(52,211,153,0.32)"} />
                        <stop offset="100%" stopColor="rgba(245,158,11,0.02)" />
                      </linearGradient>
                      <filter id={`glow-${item.title}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor={item.title === "Boosts" ? "rgba(251,191,36,0.3)" : "rgba(52,211,153,0.3)"} />
                      </filter>
                    </defs>

                    <line x1="46" y1="262" x2="954" y2="262" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                    <line x1="46" y1="96" x2="954" y2="96" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="8 8" />

                    <path d={item.chart.areaPath} fill={`url(#areaGradient-${item.title})`} />
                    <path d={item.chart.linePath} fill="none" stroke={`url(#lineGradient-${item.title})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${item.title})`} />

                    {item.chart.points.map((point, index) => (
                      <g key={point.key}>
                        <circle cx={point.x} cy={point.y} r={index === 0 ? 5 : 7} fill={index === 0 ? "#fbbf24" : point.value >= 0 ? item.dot : "#fb7185"} stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
                      </g>
                    ))}

                    <text x="46" y="286" fill="rgba(255,255,255,0.62)" fontSize="18" fontWeight="700">
                      0 €
                    </text>
                    <text x="954" y="286" fill="rgba(255,255,255,0.62)" fontSize="18" fontWeight="700" textAnchor="end">
                      {formatCurrency.format(item.chart.endValue)}
                    </text>

                    {item.chart.points.length > 1 ? (
                      <>
                        <text x={item.chart.points[0].x} y="304" fill="rgba(255,255,255,0.45)" fontSize="14" textAnchor="middle">
                          {period === "day" ? "Début" : item.chart.points[1].label}
                        </text>
                        <text x={item.chart.points.at(-1)?.x ?? 954} y="304" fill="rgba(255,255,255,0.45)" fontSize="14" textAnchor="middle">
                          {formatDateLabel(toLocalDateInputValue(item.chart.periodEnd))}
                        </text>
                      </>
                    ) : null}
                  </svg>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">ajouter un pari</p>
                <h2 className="mt-2 text-2xl font-black text-white">Saisie rapide du bilan</h2>
              </div>
              <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">
                Freebets convertis à 85%
              </div>
            </div>

            {promoError ? (
              <div className="rounded-2xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
                {promoError}
              </div>
            ) : null}

            {isLoadingPromos ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-200/80">
                Chargement des paris enregistrés...
              </div>
            ) : null}

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                Nom de la ligne
                <input
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Ex. Marseille - Paris SG"
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition placeholder:text-stone-400 focus:border-amber-300/60"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 text-sm font-medium text-stone-100/85 sm:col-span-2">
                  <span>Bookmaker</span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
                    {BOOKMAKERS.map((bookmaker) => {
                      const selected = form.bookmaker === bookmaker;

                      return (
                        <button
                          key={bookmaker}
                          type="button"
                          onClick={() => handleBookmakerChange(bookmaker)}
                          className={`flex min-h-[124px] flex-col items-center gap-2 rounded-[1.5rem] border px-3 py-3 text-center transition ${
                            selected
                              ? "border-amber-300/60 bg-[linear-gradient(180deg,rgba(255,214,123,0.16),rgba(255,255,255,0.04))] text-white shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
                              : "border-white/10 bg-black/20 text-stone-200 hover:border-white/20 hover:bg-white/[0.06]"
                          }`}
                        >
                          <BookmakerLogo bookmaker={bookmaker} className="h-14 w-14 sm:h-16 sm:w-16" />
                          <span className="text-[11px] font-semibold leading-tight">{bookmakerLabels[bookmaker]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                  Type de promo
                  <select
                    value={form.type}
                    onChange={(event) => handleTypeChange(event.target.value as PromoType)}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                  >
                    {Object.entries(promoTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                  Issue
                  <select
                    value={form.outcome}
                    onChange={(event) => updateForm("outcome", event.target.value as Outcome)}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                  >
                    <option value="gain">Pari gagné</option>
                    <option value="loss">Pari perdu</option>
                    <option value="refund">Pari remboursé</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                  Cote rentrée
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.odds}
                    onChange={(event) => updateForm("odds", Number(event.target.value))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => updateForm("date", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                  Mise (€)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.stake}
                    onChange={(event) => updateForm("stake", Number(event.target.value))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                  />
                </label>

                {form.type === "cashback" ? (
                  <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                    Taux cashback
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={form.cashbackRate}
                      onChange={(event) => updateForm("cashbackRate", Number(event.target.value))}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                    />
                  </label>
                ) : (
                  <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                    Freebets gagnés (€)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.freebets}
                      onChange={(event) => updateForm("freebets", Number(event.target.value))}
                      className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                    />
                  </label>
                )}
              </div>

              {form.type === "cashback" ? (
                <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                  Plafond cashback (€)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cashbackCap}
                    onChange={(event) => updateForm("cashbackCap", Number(event.target.value))}
                    className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-amber-300/60"
                  />
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-medium text-stone-100/85">
                Commentaire
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  rows={4}
                  placeholder="Détails du match, de la promo ou du plan de conversion"
                  className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none transition placeholder:text-stone-400 focus:border-amber-300/60"
                />
              </label>

                <button
                type="submit"
                disabled={isSavingPromo}
                  className="rounded-2xl bg-[linear-gradient(135deg,#fbbf24,#fb7185)] px-5 py-3 text-sm font-black uppercase tracking-[0.25em] text-white shadow-[0_16px_35px_rgba(249,115,22,0.3)] transition hover:translate-y-[-1px]"
                >
                {isSavingPromo ? "Enregistrement..." : "Ajouter au bilan"}
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Détail des lignes</p>
                <h2 className="mt-2 text-2xl font-black text-white">Boosts et promos séparés</h2>
              </div>
              <p className="text-sm text-stone-300/80">
                La cote alimente le résultat du pari, puis les freebets sont ajoutés après conversion.
              </p>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              {[
                {
                  title: "Bilan des boosts",
                  description: "Uniquement les boosts value du canal.",
                  rows: boostRows,
                  summary: totals.boosts,
                },
                {
                  title: "Bilan des promos",
                  description: "Cashback, freebets et promotions diverses.",
                  rows: promoRows,
                  summary: totals.promosOnly,
                },
              ].map((section) => (
                <div key={section.title} className="rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
                  <div className="flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.32em] text-amber-200/80">{section.title}</p>
                      <h3 className="mt-2 text-xl font-black text-white">{section.description}</h3>
                    </div>
                    <div className={`text-right text-2xl font-black ${section.summary.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatCurrency.format(section.summary.net)}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-black/20 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Lignes</p>
                      <p className="mt-1 text-lg font-semibold text-white">{formatInteger.format(section.summary.count)}</p>
                    </div>
                    <div className="rounded-2xl bg-black/20 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Mises</p>
                      <p className="mt-1 text-lg font-semibold text-white">{formatCurrency.format(section.summary.stake)}</p>
                    </div>
                    <div className="rounded-2xl bg-black/20 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Freebets</p>
                      <p className="mt-1 text-lg font-semibold text-white">{formatCurrency.format(section.summary.freebets)}</p>
                    </div>
                    <div className="rounded-2xl bg-black/20 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Convertis</p>
                      <p className="mt-1 text-lg font-semibold text-amber-200">{formatCurrency.format(section.summary.converted)}</p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-white/10">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-stone-300/75">
                          <tr>
                            <th className="px-4 py-4">Date</th>
                            <th className="px-4 py-4">Ligne</th>
                            <th className="px-4 py-4">Bookmaker</th>
                            <th className="px-4 py-4">Mise</th>
                            <th className="px-4 py-4">Cote</th>
                            <th className="px-4 py-4">Freebets</th>
                            <th className="px-4 py-4">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.length === 0 ? (
                            <tr className="bg-white/[0.03]">
                              <td className="px-4 py-8 text-stone-300/80" colSpan={7}>
                                Aucune ligne dans cette catégorie pour le moment.
                              </td>
                            </tr>
                          ) : (
                            section.rows.map((row, index) => {
                              const freebets = computeFreebets(row);
                              const converted = freebets * CONVERSION_RATE;
                              const betResult = computeBetResult(row);
                              const net = computeNet(row);

                              return (
                                <tr key={row.id} className={index % 2 === 0 ? "bg-white/[0.03]" : "bg-white/[0.015]"}>
                                  <td className="px-4 py-4 align-top text-stone-200">{formatDateLabel(row.date)}</td>
                                  <td className="px-4 py-4 align-top">
                                    <div className="font-semibold text-white">{row.name}</div>
                                    <div className="mt-1 max-w-xs text-xs leading-5 text-stone-300/80">{row.notes}</div>
                                  </td>
                                  <td className="px-4 py-4 align-top text-stone-200">
                                    <div className="flex items-center gap-2">
                                      <BookmakerLogo bookmaker={row.bookmaker} className="h-8 w-8 shrink-0" />
                                      <span>{bookmakerLabels[row.bookmaker]}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 align-top text-stone-200">{formatCurrency.format(row.stake)}</td>
                                  <td className="px-4 py-4 align-top text-stone-200">{row.odds.toFixed(2)}</td>
                                  <td className="px-4 py-4 align-top text-stone-200">
                                    <div>{formatCurrency.format(freebets)}</div>
                                    <div className="text-xs text-stone-400">→ {formatCurrency.format(converted)}</div>
                                  </td>
                                  <td className="px-4 py-4 align-top">
                                    <div className={`font-bold ${net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                      {formatCurrency.format(net)}
                                    </div>
                                    <div className="text-xs text-stone-400">
                                      Pari: {formatCurrency.format(betResult)} · Après conversion: {formatCurrency.format(converted)}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Bilan par bookmaker</p>
              <h2 className="mt-2 text-2xl font-black text-white">Vue consolidée des performances</h2>
            </div>
            <p className="text-sm text-stone-300/80">Chaque bookmaker est agrégé par mise, freebets convertis et résultat net.</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {totals.byBookmaker.length === 0 ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 text-stone-300/80 md:col-span-2 xl:col-span-3">
                Aucun bookmaker à afficher pour le moment.
              </div>
            ) : (
              totals.byBookmaker.map((entry) => (
                <article key={entry.bookmaker} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <BookmakerLogo bookmaker={entry.bookmaker} className="h-11 w-11 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-white">{bookmakerLabels[entry.bookmaker]}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-stone-300/70">{entry.count} ligne(s)</p>
                      </div>
                    </div>
                    <div className={`text-lg font-black ${entry.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {formatCurrency.format(entry.net)}
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-stone-200">
                    <div className="rounded-2xl bg-black/20 p-3">
                      <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Mises</dt>
                      <dd className="mt-1 font-semibold">{formatCurrency.format(entry.stake)}</dd>
                    </div>
                    <div className="rounded-2xl bg-black/20 p-3">
                      <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Freebets</dt>
                      <dd className="mt-1 font-semibold">{formatCurrency.format(entry.freebets)}</dd>
                    </div>
                    <div className="rounded-2xl bg-black/20 p-3">
                      <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Valeur convertie</dt>
                      <dd className="mt-1 font-semibold">{formatCurrency.format(entry.converted)}</dd>
                    </div>
                    <div className="rounded-2xl bg-black/20 p-3">
                      <dt className="text-xs uppercase tracking-[0.2em] text-stone-400">Net</dt>
                      <dd className={`mt-1 font-semibold ${entry.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatCurrency.format(entry.net)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
