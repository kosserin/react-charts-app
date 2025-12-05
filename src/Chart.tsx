import React, { useEffect, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
// @ts-ignore
// import { useLocaleCode } from "framer"

// ---------- Design-Tokens (einfach anpassbar) ----------
const COLORS = {
  bg: "#1FA9B2",
  panel: "#FFFFFF",
  text: "#2B2B2B",
  sub: "#6B7280",
  brand: "#FF285A", // Nutzer-Brand
  teal: "#1FA9B2", // UI-Akzent (Slider/Outline)
  expected: "#5EC5CB", // grün
  cash: "#999999", // hell-türkis
  best: "#0B9A5A", // grau gestrichelt
  worst: "#FFA666", // orange gestrichelt
  border: "#E5E7EB",
  shadow: "0 8px 24px rgba(16,24,40,0.08)",
  radius: 24,
};

// ---------- Font Families ----------
const FONTS = {
  bold: "Galano Grotesque Bold, sans-serif", // fontWeight: 700
  semibold: "Galano Grotesque SemiBold, sans-serif", // fontWeight: 600
  medium: "Galano Grotesque Medium, sans-serif", // fontWeight: 500
};

// ---------- Translations ----------
const TRANSLATIONS = {
  en: {
    title: "Calculate your potential 3a assets",
    potentialReturn: "Potential Return:",
    info: "Info",
    yourDetails: "Your Details",
    yourAge: "Your Age",
    annualPayments: "Annual payments",
    startingAmount: "Starting amount",
    riskLevel: "Risk level",
    employed: "Employed",
    selfEmployed: "Self-employed",
    defensive: "Defensive 25",
    balanced: "Balanced 45",
    dynamic: "Dynamic 65",
    ambitious: "Ambitious 80",
    offensive: "Offensive 100",
    bestCase: "Best Case",
    expected: "Expected",
    worstCase: "Worst Case",
    cash: "Cash",
    inYears: "In {years} years",
    equityShare: "equity share",
  },
  "de-CH": {
    title: "Berechne dein potenzielles 3a-Vermögen",
    potentialReturn: "Potenzielle Rendite:",
    info: "Info",
    yourDetails: "Deine Details",
    yourAge: "Dein Alter",
    annualPayments: "Jährliche Einzahlungen",
    startingAmount: "Startbetrag",
    riskLevel: "Risikoklasse",
    employed: "Angestellt",
    selfEmployed: "Selbstständig",
    defensive: "Defensiv 25",
    balanced: "Ausgewogen 45",
    dynamic: "Dynamisch 65",
    ambitious: "Ambitioniert 80",
    offensive: "Offensiv 100",
    bestCase: "Bester Fall",
    expected: "Erwartet",
    worstCase: "Schlechtester Fall",
    cash: "Bargeld",
    inYears: "In {years} Jahren",
    equityShare: "Aktienanteil",
  },
  fr: {
    title: "Calculez votre avoir potentiel 3a",
    potentialReturn: "Rendement potentiel:",
    info: "Info",
    yourDetails: "Vos détails",
    yourAge: "Votre âge",
    annualPayments: "Versements annuels",
    startingAmount: "Montant de départ",
    riskLevel: "Niveau de risque",
    employed: "Salarié",
    selfEmployed: "Indépendant",
    defensive: "Défensif 25",
    balanced: "Équilibré 45",
    dynamic: "Dynamique 65",
    ambitious: "Ambitieux 80",
    offensive: "Offensif 100",
    bestCase: "Meilleur cas",
    expected: "Attendu",
    worstCase: "Pire cas",
    cash: "Espèces",
    inYears: "Dans {years} ans",
    equityShare: "part d'actions",
  },
  it: {
    title: "Calcola il tuo potenziale patrimonio 3a",
    potentialReturn: "Rendimento potenziale:",
    info: "Info",
    yourDetails: "I tuoi dettagli",
    yourAge: "La tua età",
    annualPayments: "Versamenti annuali",
    startingAmount: "Importo iniziale",
    riskLevel: "Livello di rischio",
    employed: "Dipendente",
    selfEmployed: "Indipendente",
    defensive: "Difensivo 25",
    balanced: "Equilibrato 45",
    dynamic: "Dinamico 65",
    ambitious: "Ambizioso 80",
    offensive: "Offensivo 100",
    bestCase: "Caso migliore",
    expected: "Previsto",
    worstCase: "Caso peggiore",
    cash: "Contanti",
    inYears: "In {years} anni",
    equityShare: "quota azionaria",
  },
};

// Helper function to get translations
function getTranslations(localeCode: string | null) {
  // Map locale codes to our supported languages
  const locale = localeCode?.toLowerCase() || "en";
  if (locale.startsWith("de")) return TRANSLATIONS["de-CH"];
  if (locale.startsWith("fr")) return TRANSLATIONS["fr"];
  if (locale.startsWith("it")) return TRANSLATIONS["it"];
  return TRANSLATIONS["en"];
}

const STARTING_AMOUNT_VALUES = [
  0, 500, 1000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000,
  50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000,
];

const EMPLOYED_ANNUAL_PAYMENTS_STEPS = [
  100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000, 7258,
];

const SELF_EMPLOYED_ANNUAL_PAYMENTS_STEPS = [
  1000, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 36288,
];

// ---------- Typen ----------
type RiskKey =
  | "defensive25"
  | "balanced45"
  | "dynamic65"
  | "ambitious80"
  | "offensive100";

type EmploymentKey = "employed" | "self-employed";

type DataPoint = {
  year: string;
  cash: number;
  expected: number;
  best: number;
  worst: number;
};

type LegendPayloadItem = {
  dataKey: string;
  color: string;
};

type LegendProps = {
  payload?: LegendPayloadItem[];
};

// ---------- Hilfsfunktionen ----------
const CHF = new Intl.NumberFormat("de-CH", {
  style: "decimal",
  maximumFractionDigits: 0,
});
const fmt = (n: number) => CHF.format(Math.round(n)).replace(/\u00A0/g, " "); // schmales NBSP entfernen

// Annahmen pro Risiko: erwartete Jahresrendite & Bandbreite (Best/Worst)
const RISK_TABLE: Record<
  RiskKey,
  {
    label: string;
    equityShare: number;
    cash: number;
    expected: number;
    best: number;
    worst: number;
  }
> = {
  defensive25: {
    label: "Defensiv 25",
    equityShare: 0.25,
    cash: 0.15,
    worst: 0.007,
    best: 4.8,
    expected: 2.41,
  },
  balanced45: {
    label: "Balanced 45",
    equityShare: 0.45,
    cash: 0.15,
    worst: 0.99,
    best: 6.66,
    expected: 3.78,
  },
  dynamic65: {
    label: "Dynamic 65",
    equityShare: 0.65,
    cash: 0.15,
    worst: 1.89,
    best: 8.61,
    expected: 5.2,
  },
  ambitious80: {
    label: "Ambitious 80",
    equityShare: 0.8,
    cash: 0.15,
    worst: 2.45,
    best: 9.98,
    expected: 6.15,
  },
  offensive100: {
    label: "Offensive 100",
    equityShare: 1.0,
    cash: 0.15,
    worst: 2.83,
    best: 11.11,
    expected: 6.89,
  },
};

const EMPLOYMENT: Record<
  EmploymentKey,
  {
    label: string;
    equityShare: number;
    expected: number;
    best: number;
    worst: number;
  }
> = {
  employed: {
    label: "Employed",
    equityShare: 1.0,
    expected: 0.085,
    best: 0.125,
    worst: 0.035,
  },
  "self-employed": {
    label: "Self-employed",
    equityShare: 1.0,
    expected: 0.085,
    best: 0.125,
    worst: 0.035,
  },
};

const ANIMATION_DURATION = 200;

export function useWindowSize() {
  // Initialize with 0 to match SSR - will update after mount
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Set initial size immediately after mount
    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

// Future Value mit monatlicher Einzahlung
function futureValueMonthly(
  start: number,
  monthly: number,
  annualRate: number,
  months: number
) {
  const r = annualRate / 12;
  if (r === 0) return start + monthly * months;
  const growth = Math.pow(1 + r, months);
  return start * growth + monthly * ((growth - 1) / r);
}

// Datenpunkte pro Jahr erzeugen
function buildData(
  age: number,
  annual: number, // Annual payment
  start: number,
  years: number,
  rates: { cash: number; expected: number; best: number; worst: number }
) {
  const monthly = annual / 12; // Convert annual to monthly for calculation

  return Array.from({ length: years + 1 }, (_, i) => {
    const months = i * 12;
    const yearLabel = `${age + i}`;

    // Convert percentage rates to decimal (e.g., 2.41 -> 0.0241)
    const cashRate = rates.cash / 100;
    const expectedRate = rates.expected / 100;
    const bestRate = rates.best / 100;
    const worstRate = rates.worst / 100;

    // All values use futureValueMonthly with their respective growth rates
    const cash = futureValueMonthly(start, monthly, cashRate, months);
    const expected = futureValueMonthly(start, monthly, expectedRate, months);
    const best = futureValueMonthly(start, monthly, bestRate, months);
    const worst = futureValueMonthly(start, monthly, worstRate, months);

    return {
      year: yearLabel,
      cash: cash,
      expected: expected,
      best: best,
      worst: worst,
    };
  });
}

// ---------- UI-Helfer ----------
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: "left",
        fontSize: 32,
        color: COLORS.text,
        fontFamily: FONTS.bold,
      }}
    >
      {children}
    </div>
  );
}

function LabelRow({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 18,
        fontFamily: FONTS.semibold,
        color: COLORS.text,
        marginBottom: 12,
      }}
    >
      <span>{left}</span>
      <span style={{ fontFamily: FONTS.semibold, color: COLORS.text }}>
        {right}
      </span>
    </div>
  );
}

function Slider({
  value,
  onChange,
  onImmediateChange,
  min,
  max,
  step = 1,
  steps, // 🔥 NEW: nonlinear steps array
  debounceMs = 200,
}: {
  value: number;
  onChange: (v: number) => void;
  onImmediateChange?: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  steps?: number[]; // 🔥 NEW
  debounceMs?: number;
}) {
  // 🔥 INTERNAL MAPPING MODE (index instead of real value)
  const isMapped = Array.isArray(steps) && steps.length > 0;

  // When mapped: convert real value → index
  const mappedValue = isMapped ? steps.indexOf(value) : value;
  const sliderMin = isMapped ? 0 : min;
  const sliderMax = isMapped ? steps.length - 1 : max;
  const sliderStep = isMapped ? 1 : step;

  const [internalValue, setInternalValue] = React.useState(mappedValue);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // external → internal sync
  React.useEffect(() => {
    setInternalValue(mappedValue);
  }, [mappedValue]);

  const handleChange = (newRawValue: number) => {
    // 🔥 convert index → real value if mapped
    const newValue = isMapped ? steps[newRawValue] : newRawValue;

    setInternalValue(newRawValue);

    if (onImmediateChange) {
      onImmediateChange(newValue);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => onChange(newValue), debounceMs);
  };

  React.useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return (
    <>
      <style>{`
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 24px;
                    height: 24px;
                    min-width: 24px;
                    min-height: 24px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow:
                        0 6px 13px rgba(0, 0, 0, 0.12),
                        0 0.5px 4px rgba(0, 0, 0, 0.12);
                }

                input[type="range"]::-moz-range-thumb {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: white;
                    cursor: pointer;
                    box-shadow:
                        0 6px 13px rgba(0, 0, 0, 0.12),
                        0 0.5px 4px rgba(0, 0, 0, 0.12);
                }

            `}</style>

      <input
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={sliderStep}
        value={internalValue}
        onChange={(e) => handleChange(Number(e.target.value))}
        style={{
          width: "100%",
          WebkitAppearance: "none",
          height: 6,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${COLORS.teal} 0%, ${
            COLORS.teal
          } ${
            (100 * (internalValue - sliderMin)) / (sliderMax - sliderMin)
          }%, #E5E7EB ${
            (100 * (internalValue - sliderMin)) / (sliderMax - sliderMin)
          }%)`,
        }}
      />
    </>
  );
}

function Radio({
  checked,
  onChange,
  label,
  sub,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onChange}
      aria-pressed={checked}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 0",
        cursor: "pointer",
        backgroundColor: "transparent",
        border: "none",
        minHeight: 56,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          minWidth: 24,
          minHeight: 24,
          borderRadius: 999,
          border: `2px solid ${COLORS.teal}`,
          display: "grid",
          placeItems: "center",
          boxSizing: "border-box",
        }}
      >
        {checked ? (
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: COLORS.teal,
            }}
          />
        ) : null}
      </span>
      <span
        style={{
          fontFamily: FONTS.semibold,
          color: COLORS.text,
          fontSize: 16,
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {sub && (
        <span
          style={{
            marginLeft: "auto",
            color: COLORS.sub,
            textAlign: "right",
            fontFamily: FONTS.medium,
            fontSize: 16,
            whiteSpace: "normal",
          }}
        >
          ({sub})
        </span>
      )}
    </button>
  );
}

// ---------- Main component ----------
export default function PortfolioSimulator() {
  // Get locale from Framer
  // const localeCode = useLocaleCode?.() || "en"
  const localeCode = "en";
  const t = getTranslations(localeCode);

  const RETIREMENT_AGE = 65;
  const ANNUAL_LIMITS = {
    employed:
      EMPLOYED_ANNUAL_PAYMENTS_STEPS[EMPLOYED_ANNUAL_PAYMENTS_STEPS.length - 1],
    "self-employed":
      SELF_EMPLOYED_ANNUAL_PAYMENTS_STEPS[
        SELF_EMPLOYED_ANNUAL_PAYMENTS_STEPS.length - 1
      ],
  };

  // Handle employment change and cap to closest valid step if needed
  const handleEmploymentChange = (newEmployment: EmploymentKey) => {
    setEmployment(newEmployment);
    const newSteps =
      newEmployment === "employed"
        ? EMPLOYED_ANNUAL_PAYMENTS_STEPS
        : SELF_EMPLOYED_ANNUAL_PAYMENTS_STEPS;
    setAnnualAmountSteps(newSteps);
    const newMax = ANNUAL_LIMITS[newEmployment];

    // Always find the closest valid step
    let closestValue: number;
    if (annualAmount > newMax) {
      // If over limit, use the highest step available
      closestValue = newSteps[newSteps.length - 1];
    } else {
      // Find the closest step to current value
      closestValue = newSteps.reduce((prev, curr) =>
        Math.abs(curr - annualAmount) < Math.abs(prev - annualAmount)
          ? curr
          : prev
      );
    }

    setAnnualAmount(closestValue);
    setDisplayAnnualAmount(closestValue);
  };

  const [age, setAge] = React.useState(35);
  const [displayAge, setDisplayAge] = React.useState(35);

  const [annualAmountSteps, setAnnualAmountSteps] = React.useState(
    EMPLOYED_ANNUAL_PAYMENTS_STEPS
  );
  const years = RETIREMENT_AGE - age;
  const [employment, setEmployment] = React.useState<EmploymentKey>("employed");
  const [annualAmount, setAnnualAmount] = React.useState(100);
  const [displayAnnualAmount, setDisplayAnnualAmount] = React.useState(100);

  const [start, setStart] = React.useState(10000);
  const [displayStart, setDisplayStart] = React.useState(10000);

  const [risk, setRisk] = React.useState<RiskKey>("dynamic65");

  const riskMeta = RISK_TABLE[risk];
  const data = React.useMemo(
    () =>
      buildData(age, annualAmount, start, years, {
        cash: riskMeta.cash,
        expected: riskMeta.expected,
        best: riskMeta.best,
        worst: riskMeta.worst,
      }),
    [age, annualAmount, start, years, riskMeta]
  );

  const yAxisDomain = React.useMemo(() => {
    if (data.length === 0) return [0, 100000];

    // Find min and max across all data series
    let min = Infinity;
    let max = -Infinity;

    data.forEach((point) => {
      const values = [point.best, point.expected, point.cash, point.worst];
      values.forEach((val) => {
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });

    // No padding
    const padding = (max - min) * 0.0;
    const domain = [min - padding, max + padding];

    return domain;
  }, [data]);

  const [tooltipIndex, setTooltipIndex] = React.useState<number>(0);
  const [tooltipPosition, setTooltipPosition] = React.useState<
    number | undefined
  >(undefined);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const bestYRef = React.useRef<number>(0);
  const chartRef = React.useRef(null);

  const { width } = useWindowSize();
  const isMobile = width < 1000;
  const isSmallScreen = width < 350;

  // Calculate potential return (Expected - Cash) at current tooltip index
  const potentialReturn = React.useMemo(() => {
    const safeIndex = Math.min(tooltipIndex, data.length - 1);
    if (!data[safeIndex]) return 0;
    return data[safeIndex].expected - data[safeIndex].cash;
  }, [tooltipIndex, data]);

  // Helper function to get chart dimensions and layout information
  const getChartDimensions = React.useCallback(
    (container: HTMLElement) => {
      const svg = container.querySelector("svg");
      if (!svg) return null;

      const rect = svg.getBoundingClientRect();
      const legendElement = container.querySelector(".recharts-legend-wrapper");
      const legendHeight = legendElement
        ? legendElement.getBoundingClientRect().height + 64
        : 0;

      const leftMargin = isSmallScreen ? 16 : 32;
      const rightMargin = isSmallScreen ? 16 : 32;
      const topMargin = 32;
      const chartWidth = rect.width - (leftMargin + rightMargin);
      const pointSpacing = chartWidth / Math.max(1, data.length - 1);

      return {
        svg,
        rect,
        legendHeight,
        leftMargin,
        rightMargin,
        topMargin,
        chartWidth,
        pointSpacing,
      };
    },
    [data.length, isSmallScreen]
  );

  // Helper function to calculate tooltip Y position
  const calculateTooltipYPosition = React.useCallback(
    (rectHeight: number, legendHeight: number) => {
      return rectHeight - 32 - legendHeight;
    },
    []
  );

  // Helper function to trigger tooltip at the last data point
  const triggerTooltipAtPosition = React.useCallback(
    (svg: SVGSVGElement, xPosition: number, yPosition: number) => {
      // Clear any existing tooltip state
      svg.dispatchEvent(
        new MouseEvent("mouseleave", {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      );

      // Trigger tooltip at the calculated position
      svg.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: xPosition,
          clientY: yPosition,
        })
      );
    },
    []
  );

  // Reset tooltip index when data changes to show the last point
  React.useEffect(() => {
    // Start animation and set tooltip to last data point
    setIsAnimating(true);
    setTooltipIndex(data.length - 1);

    // Wait for animation to finish before positioning tooltip
    const animationTimer = setTimeout(() => {
      setIsAnimating(false);

      const container = chartRef.current;
      if (!container) return;

      const dimensions = getChartDimensions(container as HTMLElement);
      if (!dimensions) {
        console.log("SVG not found");
        return;
      }

      const {
        svg,
        rect,
        legendHeight,
        leftMargin,
        topMargin,
        pointSpacing,
      } = dimensions;

      // Calculate position of last data point
      const xPosition =
        rect.left + leftMargin + pointSpacing * (data.length - 1);
      const yPosition = rect.top + topMargin;

      // Set tooltip Y position to bottom of chart area (before legend)
      const tooltipY = calculateTooltipYPosition(rect.height, legendHeight);
      setTooltipPosition(tooltipY);

      console.log("Calculated position:", {
        xPosition,
        yPosition,
        pointSpacing,
        tooltipY,
        legendHeight,
      });

      // Trigger tooltip at the calculated position
      triggerTooltipAtPosition(svg, xPosition, yPosition);
    }, ANIMATION_DURATION);

    return () => clearTimeout(animationTimer);
  }, [
    data,
    annualAmount,
    start,
    risk,
    width,
    isSmallScreen,
    getChartDimensions,
    calculateTooltipYPosition,
    triggerTooltipAtPosition,
  ]);

  const handleMouseMove = React.useCallback(
    (state: any) => {
      if (
        state?.activeTooltipIndex !== undefined &&
        state.activeTooltipIndex !== tooltipIndex
      ) {
        setTooltipIndex(parseInt(state.activeTooltipIndex));
        console.log(
          "onMouseMove triggered, activeIndex:",
          state.activeTooltipIndex
        );
      }
    },
    [tooltipIndex]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    return (
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "6px",
          padding: "4px 8px",
          transform: "translate(calc(-50% - 11px), calc(100% + 11px + 24px))",
          pointerEvents: "none",
          color: "white",
          boxShadow: "0px 0px 12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: FONTS.semibold,
            fontSize: 14,
            lineHeight: 1,
            color: "#5C5C5C",
          }}
        >
          {t.inYears.replace("{years}", label)}
        </p>
      </div>
    );
  };

  const CustomLegend = ({ payload }: LegendProps) => {
    const colorMap: Record<string, string> = {
      best: COLORS.best,
      expected: COLORS.expected,
      worst: COLORS.worst,
      cash: COLORS.cash,
    };

    const labelMap: Record<string, string> = {
      best: t.bestCase,
      expected: t.expected,
      worst: t.worstCase,
      cash: t.cash,
    };

    const safeIndex = Math.min(tooltipIndex, data.length - 1);

    if (!payload) return null;

    return (
      <div
        style={{
          marginTop: "0px",
          display: width < 1200 ? "grid" : "flex",
          flexWrap: width < 1200 ? undefined : "wrap",
          justifyContent: "space-between",
          gap: isSmallScreen ? 0 : 8,
          gridTemplateColumns: width < 1200 ? "repeat(2, 1fr)" : undefined,
        }}
      >
        {payload.map((entry: LegendPayloadItem, index: number) => {
          const key = entry.dataKey as keyof DataPoint;
          // For cash, show actual accumulated value from data, not data
          const currentValue = data[safeIndex]?.[key] as number;

          return (
            <div
              key={`legend-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                paddingBlock: 10,
                minWidth: 120,
              }}
            >
              {/* Color Box */}
              <div
                style={{
                  height: isSmallScreen ? 24 : 32,
                  width: isSmallScreen ? 24 : 32,
                  borderRadius: "4px",
                  backgroundColor: colorMap[key] || entry.color,
                  flexShrink: 0,
                }}
              />

              {/* Text Content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontFamily: FONTS.semibold,
                    color: COLORS.text,
                  }}
                >
                  {labelMap[key]}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontFamily: FONTS.medium,
                    color: "#6E6E6E",
                  }}
                >
                  {fmt(currentValue || 0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  function CircleWithShadow({
    cx,
    cy,
    fill,
  }: {
    cx: number | undefined;
    cy: number | undefined;
    fill: string;
  }) {
    return (
      <>
        <defs>
          <filter
            id="circleShadow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="6"
              floodColor="rgba(0, 0, 0, 0.25)"
            />
          </filter>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={11}
          fill={fill}
          stroke="white"
          strokeWidth={3}
          filter="url(#circleShadow)"
        />
      </>
    );
  }

  const CustomCursor = (props: any) => {
    const x = props.points?.[0]?.x || 0;
    const y2 = props.height + props.top + 24;

    // Use the payload directly from cursor props for real-time positioning
    const payload = props.payload || [];
    if (payload.length === 0) return null;

    const dataPoint = payload[0].payload;

    // Calculate y positions for all dots
    const chartHeight = props.height;
    const yAxisDomainMin = yAxisDomain[0];
    const yAxisDomainMax = yAxisDomain[1];
    const range = yAxisDomainMax - yAxisDomainMin;

    const getYPosition = (value: number) => {
      const ratio = (value - yAxisDomainMin) / range;
      return props.top + chartHeight - ratio * chartHeight;
    };

    const bestY = getYPosition(dataPoint.best);
    const expectedY = getYPosition(dataPoint.expected);
    const worstY = getYPosition(dataPoint.worst);
    const cashY = getYPosition(dataPoint.cash);

    // Update bestYRef for cursor positioning
    bestYRef.current = bestY;

    return (
      <g>
        {/* Cursor line */}
        <line
          x1={x}
          y1={bestY}
          x2={x}
          y2={y2}
          stroke="#5C5C5C"
          strokeWidth={1}
        />
        {/* Active dots */}
        <CircleWithShadow cx={x} cy={bestY} fill={COLORS.best} />
        <CircleWithShadow cx={x} cy={expectedY} fill={COLORS.expected} />
        <CircleWithShadow cx={x} cy={worstY} fill={COLORS.worst} />
        <CircleWithShadow cx={x} cy={cashY} fill={COLORS.cash} />
      </g>
    );
  };

  return (
    <>
      <style>{`
                .recharts-layer:focus,
                .recharts-area:focus,
                .recharts-sector:focus,
                .recharts-surface:focus,
                .recharts-surface > g:focus,
                .recharts-area > g:focus,
                .recharts-area > g > g:focus,
                .recharts-layer > g:focus,
                .recharts-layer > g > g:focus {
                    outline: none !important;
                    outline-color: none;
                    outline-style: none;
                    outline-width: none;
                }
            `}</style>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: COLORS.bg,
          color: COLORS.text,
          padding: `100px ${isMobile ? 16 : 48}px`,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: isMobile ? "flex" : "grid",
            flexDirection: isMobile ? "column-reverse" : undefined,
            gridTemplateColumns: isMobile ? undefined : "1.8fr 1.2fr",
            gap: isMobile ? 0 : 32,
            height: "100%",
            maxWidth: 1254,
            margin: "0 auto",
          }}
        >
          {/* Chart-Panel */}
          <div
            style={{
              background: COLORS.panel,
              ...(isMobile
                ? {
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: COLORS.radius,
                    borderBottomRightRadius: COLORS.radius,
                  }
                : {
                    borderRadius: COLORS.radius,
                  }),
              display: "flex",
              pointerEvents: isAnimating ? "none" : "auto",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: isSmallScreen ? 16 : 32 }}>
              <SectionTitle>{t.title}</SectionTitle>
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                flex: 1,
                touchAction: "pan-y",
              }}
            >
              {/* Absolutely positioned title inside the chart */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: isSmallScreen ? 16 : 32,
                  zIndex: 10,
                  pointerEvents: "auto",
                  textAlign: "left",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontFamily: FONTS.semibold,
                    color: "#333333",
                    fontSize: 18,
                  }}
                >
                  {t.potentialReturn}
                </h3>
                <h2
                  style={{
                    margin: "8px 0",
                    color: COLORS.bg,
                    fontFamily: FONTS.bold,
                    lineHeight: 1,
                    fontSize: 32,
                  }}
                >
                  CHF {fmt(potentialReturn)}
                </h2>
                {/* TODO: Add some popup for info button click */}
                <button
                  onClick={() => alert("asaa")}
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.05)",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 100,
                    height: 36,
                    paddingInline: 12,
                    fontSize: 14,
                    fontFamily: FONTS.semibold,
                    lineHeight: 1,
                    color: COLORS.text,
                  }}
                >
                  {t.info}
                </button>
              </div>
                <ResponsiveContainer
                  ref={chartRef}
                  width="100%"
                  height={isMobile ? undefined : "100%"}
                aspect={isSmallScreen
                    ? 0.65
                    : isMobile
                    ? 0.9
                    : undefined}
                  initialDimension={{ width: 250, height: 250 }}
                >
                  <AreaChart
                    data={data}
                    onMouseMove={handleMouseMove}
                    margin={{
                      left: isSmallScreen ? 16 : 32,
                      right: isSmallScreen ? 16 : 32,
                      top: 32,
                      bottom: 32,
                    }}
                  >
                    <XAxis tick={false} axisLine={false} />
                    <YAxis
                      tick={false}
                      axisLine={false}
                      mirror={true}
                      domain={yAxisDomain}
                    />
                    <defs>
                      <linearGradient
                        id="bestGradient"
                        x1="1"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#C9F8DE" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#FFFFFF"
                          stopOpacity={1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="expectedGradient"
                        x1="1"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#C2EFF2" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#FFFFFF"
                          stopOpacity={1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="worstGradient"
                        x1="1"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#FFEADB" stopOpacity={1} />
                        <stop
                          offset="100%"
                          stopColor="#FFFFFF"
                          stopOpacity={1}
                        />
                      </linearGradient>
                    </defs>

                    <Area
                      type="monotone"
                      animationDuration={ANIMATION_DURATION}
                      dataKey="best"
                      stroke={COLORS.best}
                      strokeDasharray="6 6"
                      dot={false}
                      strokeWidth={2}
                      activeDot={false}
                      fill="url(#bestGradient)"
                      fillOpacity={1}
                    />
                    <Area
                      type="monotone"
                      animationDuration={ANIMATION_DURATION}
                      dataKey="expected"
                      stroke={COLORS.expected}
                      dot={false}
                      strokeWidth={3}
                      activeDot={false}
                      fill="url(#expectedGradient)"
                      fillOpacity={1}
                    />
                    <Area
                      type="monotone"
                      animationDuration={ANIMATION_DURATION}
                      dataKey="worst"
                      stroke={COLORS.worst}
                      strokeDasharray="6 6"
                      dot={false}
                      strokeWidth={2}
                      activeDot={false}
                      fill="url(#worstGradient)"
                      fillOpacity={1}
                    />
                    <Area
                      type="monotone"
                      animationDuration={ANIMATION_DURATION}
                      dataKey="cash"
                      stroke={COLORS.cash}
                      activeDot={false}
                      dot={false}
                      strokeWidth={3}
                      fill="transparent"
                    />
                    <Tooltip
                      position={{ y: tooltipPosition || 0 }}
                      active={!isAnimating}
                      cursor={!isAnimating ? <CustomCursor /> : false}
                      isAnimationActive={false}
                      allowEscapeViewBox={{ x: true, y: true }}
                      content={<CustomTooltip />}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="left"
                      wrapperStyle={{ paddingTop: isMobile ? 16 : 32 }}
                      content={<CustomLegend />}
                    />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Controls-Panel */}
          <div
            style={{
              background: COLORS.panel,
              ...(isMobile
                ? {
                    borderTopLeftRadius: COLORS.radius,
                    borderTopRightRadius: COLORS.radius,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  }
                : {
                    borderRadius: COLORS.radius,
                  }),
              padding: isSmallScreen ? "32px 16px" : 32,
              display: "flex",
              flexDirection: "column",
              gap: 32,
              minWidth: isMobile ? "unset" : 300,
            }}
          >
            <SectionTitle>{t.yourDetails}</SectionTitle>

            {/* Ages and Employment */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Ages */}
              <div>
                <LabelRow left={t.yourAge} right={displayAge} />
                <Slider
                  value={age}
                  onChange={setAge}
                  step={1}
                  onImmediateChange={setDisplayAge}
                  min={18}
                  max={64}
                />
              </div>

              {/* Employment */}
              <div
                style={{
                  display: "flex",
                  flexDirection: isSmallScreen ? "column" : "row",
                  gap: isSmallScreen ? 0 : 8,
                  justifyContent: "space-between",
                }}
              >
                {(Object.keys(EMPLOYMENT) as EmploymentKey[]).map((key) => (
                  <Radio
                    key={key}
                    checked={employment === key}
                    onChange={() => handleEmploymentChange(key)}
                    label={key === "employed" ? t.employed : t.selfEmployed}
                  />
                ))}
              </div>
            </div>

            {/* Annual payments */}
            <div>
              <LabelRow
                left={t.annualPayments}
                right={fmt(displayAnnualAmount)}
              />
              <Slider
                value={annualAmount}
                onChange={setAnnualAmount}
                onImmediateChange={setDisplayAnnualAmount}
                min={0}
                max={5000}
                steps={annualAmountSteps}
              />
            </div>

            {/* Starting amount */}
            <div>
              <LabelRow left={t.startingAmount} right={fmt(displayStart)} />
              <Slider
                value={start}
                onChange={setStart}
                onImmediateChange={setDisplayStart}
                min={0}
                max={200000}
                steps={STARTING_AMOUNT_VALUES}
              />
            </div>

            {/* Risk level */}
            <div style={{ marginTop: 4 }}>
              <LabelRow left={t.riskLevel} />
              <div style={{ display: "grid" }}>
                {(Object.keys(RISK_TABLE) as RiskKey[]).map((key) => {
                  const riskLabels = {
                    defensive25: t.defensive,
                    balanced45: t.balanced,
                    dynamic65: t.dynamic,
                    ambitious80: t.ambitious,
                    offensive100: t.offensive,
                  };
                  return (
                    <Radio
                      key={key}
                      checked={risk === key}
                      onChange={() => setRisk(key)}
                      label={riskLabels[key]}
                      sub={`${Math.round(RISK_TABLE[key].equityShare * 100)}% ${
                        t.equityShare
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
