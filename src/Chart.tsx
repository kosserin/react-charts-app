import React, { useEffect, useState } from 'react';
import {
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    ActiveDotProps,
    Area,
    AreaChart,
} from "recharts"

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
    radius: 32,
}

const STARTING_AMOUNT_VALUES = [
    0, 500, 1000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000,
    50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000,
    100000,
]

const EMPLOYED_ANNUAL_PAYMENTS_STEPS = [
    100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000, 7258,
]

const SELF_EMPLOYED_ANNUAL_PAYMENTS_STEPS = [
    1000, 2000, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 36288,
]

// ---------- Typen ----------
type RiskKey =
    | "defensive25"
    | "balanced45"
    | "dynamic65"
    | "ambitious80"
    | "offensive100"

type EmploymentKey = "employed" | "self-employed"

type DataPoint = {
    year: string
    cash: number
    expected: number
    best: number
    worst: number
}

type LegendPayloadItem = {
    dataKey: string
    color: string
}

type LegendProps = {
    payload?: LegendPayloadItem[]
}


// ---------- Hilfsfunktionen ----------
const CHF = new Intl.NumberFormat("de-CH", {
    style: "decimal",
    maximumFractionDigits: 0,
})
const fmt = (n: number) => CHF.format(Math.round(n)).replace(/\u00A0/g, " ") // schmales NBSP entfernen

// Annahmen pro Risiko: erwartete Jahresrendite & Bandbreite (Best/Worst)
const RISK_TABLE: Record<
    RiskKey,
    {
        label: string
        equityShare: number
        expected: number
        best: number
        worst: number
    }
> = {
    defensive25: {
        label: "Defensiv 25",
        equityShare: 0.25,
        expected: 0.025,
        best: 0.04,
        worst: 0.005,
    },
    balanced45: {
        label: "Balanced 45",
        equityShare: 0.45,
        expected: 0.04,
        best: 0.065,
        worst: 0.015,
    },
    dynamic65: {
        label: "Dynamic 65",
        equityShare: 0.65,
        expected: 0.055,
        best: 0.085,
        worst: 0.025,
    },
    ambitious80: {
        label: "Ambitious 80",
        equityShare: 0.8,
        expected: 0.07,
        best: 0.105,
        worst: 0.03,
    },
    offensive100: {
        label: "Offensive 100",
        equityShare: 1.0,
        expected: 0.085,
        best: 0.125,
        worst: 0.035,
    },
}

const EMPLOYMENT: Record<
    EmploymentKey,
    {
        label: string
        equityShare: number
        expected: number
        best: number
        worst: number
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
}

export function useWindowSize() {
    const [size, setSize] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
    })

    useEffect(() => {
        function handleResize() {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }

        window.addEventListener("resize", handleResize)

        // Initial call (important for Framer preview)
        handleResize()

        return () => window.removeEventListener("resize", handleResize)
    }, [])

    return size
}

// Future Value mit monatlicher Einzahlung
function futureValueMonthly(
    start: number,
    monthly: number,
    annualRate: number,
    months: number
) {
    const r = annualRate / 12
    if (r === 0) return start + monthly * months
    const growth = Math.pow(1 + r, months)
    return start * growth + monthly * ((growth - 1) / r)
}

// Datenpunkte pro Jahr erzeugen
function buildData(
    age: number,
    annual: number, // Annual payment
    start: number,
    years: number,
    rates: { expected: number; best: number; worst: number }
) {
    const monthly = annual / 12 // Convert annual to monthly for calculation

    return Array.from({ length: years + 1 }, (_, i) => {
        const months = i * 12
        const yearLabel = `${age + i}`

        // Cash: just the raw sum with no growth
        const cash = start + monthly * months

        // Others: total value including growth (futureValueMonthly already includes starting amount + contributions with growth)
        const expected = futureValueMonthly(
            start,
            monthly,
            rates.expected,
            months
        )
        const best = futureValueMonthly(start, monthly, rates.best, months)
        const worst = futureValueMonthly(start, monthly, rates.worst, months)

        return {
            year: yearLabel,
            cash: cash,
            expected: expected,
            best: best,
            worst: worst,
        }
    })
}

// ---------- UI-Helfer ----------
function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                textAlign: "left",
                fontSize: 18,
                color: COLORS.text,
                fontWeight: 600,
            }}
        >
            {children}
        </div>
    )
}

function LabelRow({
    left,
    right,
}: {
    left: React.ReactNode
    right?: React.ReactNode
}) {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: 12,
            }}
        >
            <span>{left}</span>
            <span style={{ fontWeight: 600, color: COLORS.text }}>{right}</span>
        </div>
    )
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
    value: number
    onChange: (v: number) => void
    onImmediateChange?: (v: number) => void
    min: number
    max: number
    step?: number
    steps?: number[] // 🔥 NEW
    debounceMs?: number
}) {
    // 🔥 INTERNAL MAPPING MODE (index instead of real value)
    const isMapped = Array.isArray(steps) && steps.length > 0

    // When mapped: convert real value → index
    const mappedValue = isMapped ? steps.indexOf(value) : value
    const sliderMin = isMapped ? 0 : min
    const sliderMax = isMapped ? steps.length - 1 : max
    const sliderStep = isMapped ? 1 : step

    const [internalValue, setInternalValue] = React.useState(mappedValue)
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    // external → internal sync
    React.useEffect(() => {
        setInternalValue(mappedValue)
    }, [mappedValue])

    const handleChange = (newRawValue: number) => {
        // 🔥 convert index → real value if mapped
        const newValue = isMapped ? steps[newRawValue] : newRawValue

        setInternalValue(newRawValue)

        if (onImmediateChange) {
            onImmediateChange(newValue)
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(() => {
            onChange(newValue)
        }, debounceMs)
    }

    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    return (
        <>
            <style>{`
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 24px;
                    height: 24px;
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
                    background: `linear-gradient(90deg, ${COLORS.teal} 0%, ${COLORS.teal} ${
                        (100 * (internalValue - sliderMin)) /
                        (sliderMax - sliderMin)
                    }%, #E5E7EB ${
                        (100 * (internalValue - sliderMin)) /
                        (sliderMax - sliderMin)
                    }%)`,
                }}
            />
        </>
    )
}

function Radio({
    checked,
    onChange,
    label,
    sub,
}: {
    checked: boolean
    onChange: () => void
    label: string
    sub?: string
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
            <span style={{ fontWeight: 600, color: COLORS.text, fontSize: 16, textAlign: "left" }}>
                {label}
            </span>
            {sub ? (
                <span style={{ marginLeft: "auto", color: COLORS.sub, textAlign: "right" }}>
                    ({sub})
                </span>
            ) : null}
        </button>
    )
}

// ---------- Hauptkomponente ----------
export default function PortfolioSimulator() {
    const RETIREMENT_AGE = 65
    const ANNUAL_LIMITS = {
        employed:
            EMPLOYED_ANNUAL_PAYMENTS_STEPS[
                EMPLOYED_ANNUAL_PAYMENTS_STEPS.length - 1
            ],
        "self-employed":
            SELF_EMPLOYED_ANNUAL_PAYMENTS_STEPS[
                SELF_EMPLOYED_ANNUAL_PAYMENTS_STEPS.length - 1
            ],
    }

    // Handle employment change and cap to closest valid step if needed
    const handleEmploymentChange = (newEmployment: EmploymentKey) => {
        setEmployment(newEmployment)
        const newSteps =
            newEmployment === "employed"
                ? EMPLOYED_ANNUAL_PAYMENTS_STEPS
                : SELF_EMPLOYED_ANNUAL_PAYMENTS_STEPS
        setAnnualAmountSteps(newSteps)
        const newMax = ANNUAL_LIMITS[newEmployment]

        // Always find the closest valid step
        let closestValue: number
        if (annualAmount > newMax) {
            // If over limit, use the highest step available
            closestValue = newSteps[newSteps.length - 1]
        } else {
            // Find the closest step to current value
            closestValue = newSteps.reduce((prev, curr) =>
                Math.abs(curr - annualAmount) < Math.abs(prev - annualAmount)
                    ? curr
                    : prev
            )
        }

        // ✅ Update both annualAmount AND displayAnnualAmount
        setAnnualAmount(closestValue)
        setDisplayAnnualAmount(closestValue)
    }

    const [age, setAge] = React.useState(35)
    const [displayAge, setDisplayAge] = React.useState(35)


    const [annualAmountSteps, setAnnualAmountSteps] = React.useState(
        EMPLOYED_ANNUAL_PAYMENTS_STEPS
    )
    const years = RETIREMENT_AGE - age
    const [employment, setEmployment] =
        React.useState<EmploymentKey>("employed")
    const [annualAmount, setAnnualAmount] = React.useState(100)
    const [displayAnnualAmount, setDisplayAnnualAmount] = React.useState(100)

    const [start, setStart] = React.useState(10000)
    const [displayStart, setDisplayStart] = React.useState(10000)

    const [risk, setRisk] = React.useState<RiskKey>("dynamic65")

    const riskMeta = RISK_TABLE[risk]
    const data = React.useMemo(
        () =>
            buildData(age, annualAmount, start, years, {
                expected: riskMeta.expected,
                best: riskMeta.best,
                worst: riskMeta.worst,
            }),
        [age, annualAmount, start, years, riskMeta]
    )

    // Calculate return data (showing only gains, not total value)
    // const returnData = React.useMemo(() => {
    //     return data.map((point) => ({
    //         year: point.year,
    //         cash: 0, // Cash has no return
    //         expected: point.expected - point.cash,
    //         best: point.best - point.cash,
    //         worst: point.worst - point.cash,
    //     }))
    // }, [data])

    // Calculate Y-axis domain based on return data
    const yAxisDomain = React.useMemo(() => {
        if (data.length === 0) return [0, 100000]

        // Find min and max across all data series
        let min = Infinity
        let max = -Infinity

        data.forEach((point) => {
            const values = [point.best, point.expected, point.cash, point.worst]
            values.forEach((val) => {
                if (val < min) min = val
                if (val > max) max = val
            })
        })

        // Add a small padding (5%) for visual breathing room
        // const padding = (max - min) * 0.00
        const padding = (max - min) * 0.00
        const domain = [min - padding, max + padding]

        return domain
    }, [data])

    const [tooltipIndex, setTooltipIndex] = React.useState<number>(0)
    const [tooltipPosition, setTooltipPosition] = React.useState<{ x: number, y: number } | undefined>(undefined)
    const [isAnimating, setIsAnimating] = React.useState(false)

    const bestYRef = React.useRef<number>(0)
    const chartRef = React.useRef(null);

    const { width } = useWindowSize()
    const isMobile = width < 1000

    // Calculate potential return (Expected - Cash) at current tooltip index
    const potentialReturn = React.useMemo(() => {
        const safeIndex = Math.min(tooltipIndex, data.length - 1)
        if (!data[safeIndex]) return 0
        return data[safeIndex].expected - data[safeIndex].cash
    }, [tooltipIndex, data])

    // Reset tooltip index when data changes to show the last point
    React.useEffect(() => {
        // 1. Start Animation
        setIsAnimating(true);

        // 2. Wait for animation to finish (e.g., 1000ms)
        const animationTimer = setTimeout(() => {
            setIsAnimating(false);

            // 3. Wait for React to re-enable the Tooltip (active={true})
                    const container = chartRef.current;

                    if (container) {
                        const element = container as HTMLElement;

                        // Find the actual SVG element inside ResponsiveContainer
                        const svg = element.querySelector('svg');
                        if (!svg) {
                            console.log('SVG not found');
                            return;
                        }

                        const rect = svg.getBoundingClientRect();
                        console.log('SVG rect:', rect);
                        console.log('Data length:', data.length);

                        // Find the legend element to get its height
                        const legendElement = element.querySelector('.recharts-legend-wrapper');
                        console.log('legendElement', legendElement);
                        const legendHeight = legendElement ? legendElement.getBoundingClientRect().height + 64 : 0;
                        console.log('Legend height:', legendHeight);

                        // Calculate the X position of the last data point
                        // Chart width minus left and right margins (32px each)
                        const chartWidth = rect.width - 64;
                        // Distribute points evenly across the chart width
                        const pointSpacing = chartWidth / Math.max(1, data.length - 1);
                        // Position of last point: left edge + left margin + (spacing * last index)
                        const xPosition = rect.left + 32 + (pointSpacing * (data.length - 1));
                        const yPosition = rect.top + (rect.height / 2);

                        // Set tooltip Y position to bottom of chart area (before legend)
                        // Total height - bottom margin - legend height
                        const tooltipY = rect.height - 32 - legendHeight;
                        setTooltipPosition({ x: 0, y: tooltipY });

                        console.log('Calculated position:', { xPosition, yPosition, pointSpacing, chartWidth, tooltipY, legendHeight });

                        // Clear any existing tooltip state
                        svg.dispatchEvent(new MouseEvent('mouseleave', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                        }));

                            svg.dispatchEvent(new MouseEvent('mousemove', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                clientX: xPosition,
                                clientY: yPosition,
                            }));
                    }
        }, 200);

        return () => clearTimeout(animationTimer);
    }, [data, annualAmount, start, risk, isMobile]);

    console.log('isMobile', isMobile);

    const currentYearIndex = Math.min(20, years)
    const currentYear = age + currentYearIndex

    const renderActiveDot = React.useCallback(
      ({ cx, cy }: ActiveDotProps) => {
        const newY = cy || 0;
        // Update ref only (no state update during render)
        bestYRef.current = newY;

        return isAnimating ? null : <CircleWithShadow cx={cx} cy={cy} fill={COLORS.best} />;
      },
      [isAnimating]
    );

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || payload.length === 0) {
            return null
        }

        return (
            <div
                style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    transform: "translate(calc(-50% - 11px), calc(100% + 11px + 8px))",
                    pointerEvents: "none",
                    color: "white",
                    boxShadow: "0px 0px 12px rgba(0, 0, 0, 0.25)",
                }}
            >
                <p
                    style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: 14,
                        lineHeight: 1,
                        color: "#5C5C5C",
                    }}
                >
                    In {label} years
                </p>
            </div>
        )
    }

    const CustomLegend = ({ payload }: LegendProps) => {
        const colorMap: Record<string, string> = {
            best: COLORS.best,
            expected: COLORS.expected,
            worst: COLORS.worst,
            cash: COLORS.cash,
        }

        const labelMap: Record<string, string> = {
            best: "Best Case",
            expected: "Erwartet",
            worst: "Worst Case",
            cash: "Cash",
        }

        const safeIndex = Math.min(tooltipIndex, data.length - 1)

        if (!payload) return null

        return (
            <div
                style={{
                    marginTop: "0px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 32,
                }}
            >
                {payload.map(
                    (
                        entry: LegendPayloadItem,
                        index: number
                    ) => {
                        const key = entry.dataKey as keyof DataPoint
                        // For cash, show actual accumulated value from data, not data
                        const currentValue = key === "cash" 
                            ? (data[safeIndex]?.cash as number)
                            : (data[safeIndex]?.[key] as number)

                        return (
                            <div
                                key={`legend-${index}`}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    paddingBlock: 10,
                                }}
                            >
                                {/* Color Box */}
                                <div
                                    style={{
                                        height: 32,
                                        width: 32,
                                        borderRadius: "4px",
                                        backgroundColor:
                                            colorMap[key] || entry.color,
                                        flexShrink: 0,
                                    }}
                                />

                                {/* Text Content */}
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        textAlign: "left"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 600,
                                            color: COLORS.text,
                                        }}
                                    >
                                        {labelMap[key]}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 500,
                                            color: COLORS.text,
                                        }}
                                    >
                                        {fmt(currentValue || 0)}
                                    </span>
                                </div>
                            </div>
                        )
                    }
                )}
            </div>
        )
    }

function CircleWithShadow({ cx, cy, fill }: { cx: number | undefined, cy: number | undefined, fill: string }) {
    return (
      <>
        <defs>
          <filter id="circleShadow" x="-50%" y="-50%" width="200%" height="200%">
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
        const x = props.points?.[0]?.x || 0
        const y2 = props.height + props.top + 8
        // const x1 = Math.floor(Math.random() * 500) + 1
        // const x2 = Math.floor(Math.random() * 500) + 1
        

        return (
            <line
                x1={x}
                y1={bestYRef.current}

                // x2={x}
                x2={x}
                y2={props.points?.[1]?.y + 8 || 0}
                // y2={props.points?.[1]?.y || 0}
                stroke="#000000"
                strokeWidth={1}
            />
        )
    }

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
                        minHeight: 300,
                        pointerEvents: isAnimating ? "none" : "auto",
                        flexDirection: "column",
                    }}
                >
                    <div style={{ padding: 32 }}>
                        <SectionTitle>Calculate your potential 3a assets</SectionTitle>
                    </div>

                    <div style={{ position: "relative", width: "100%", flex: 1 }}>
                        {/* Absolutely positioned title inside the chart */}
                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 32,
                                zIndex: 10,
                                pointerEvents: "auto",
                                textAlign: "left",
                            }}
                        >
                            <h3 style={{ margin: 0 }}>Potential Return:</h3>
                            <h2 style={{ margin: '8px 0 0 0', color: COLORS.bg, fontFamily: '700', lineHeight: 1, fontSize: 32 }}>CHF {fmt(potentialReturn)}</h2>
                            <button onClick={() => alert('asaa')} style={{ backgroundColor: "rgba(0, 0, 0, 0.05)", border: "none", cursor: "pointer", borderRadius: 100, height: 36, paddingInline: 12, fontSize: 14, fontWeight: 600, lineHeight: 1 }}>Info</button>
                        </div>

                        <ResponsiveContainer ref={chartRef} width="100%" height="100%">
                            <AreaChart
                            onMouseMove={(state: any) => {
                                if (state?.activeTooltipIndex !== undefined) {
                                    setTooltipIndex(parseInt(state.activeTooltipIndex));
                                    console.log('onMouseMove triggered, activeIndex:', state.activeTooltipIndex);
                                }
                              }}
                                data={data}
                                // onMouseMove={handleMouseMove}
                                margin={{
                                    left: 32,
                                    right: 32,
                                    top: 32,
                                    bottom: 32,
                                }}
                            >
                                <XAxis
                                    tick={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    tick={false}
                                    axisLine={false}
                                    mirror={true}
                                    domain={yAxisDomain}
                                />
                                {/* <ReferenceLine
                                    x={`${currentYear}`}
                                    stroke="#11182722"
                                /> */}
                                <Tooltip
                                    position={{ y: tooltipPosition?.y || 0 }}
                                    active={!isAnimating}
                                    cursor={!isAnimating ? <CustomCursor /> : false}
                                    isAnimationActive={false}
                                    allowEscapeViewBox={{ x: true, y: true }}
                                    content={<CustomTooltip />}
                                />
                                {/* Area fills - render behind lines */}
                                <defs>
                                    <linearGradient id="bestGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS.best} stopOpacity={0} />
                                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS.expected} stopOpacity={0} />
                                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="worstGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS.worst} stopOpacity={0} />
                                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                
                                <Area
                                    type="monotone"
                                    animationDuration={200}
                                    dataKey="best"
                                    stroke={COLORS.best}
                                    strokeDasharray="6 6"
                                    dot={false}
                                    strokeWidth={2}
                                    activeDot={renderActiveDot}
                                    fill="url(#bestGradient)"
                                    fillOpacity={1}
                                />
                                <Area
                                    type="monotone"
                                    animationDuration={200}
                                    dataKey="expected"
                                    stroke={COLORS.expected}
                                    dot={false}
                                    strokeWidth={3}
                                    activeDot={(props) => isAnimating ? null : <CircleWithShadow cx={props.cx} cy={props.cy} fill={COLORS.expected} />}
                                    fill="url(#expectedGradient)"
                                    fillOpacity={1}
                                />
                                <Area
                                    type="monotone"
                                    animationDuration={200}
                                    dataKey="cash"
                                    stroke={COLORS.cash}
                                    activeDot={(props) => isAnimating ? null : <CircleWithShadow cx={props.cx} cy={props.cy} fill={COLORS.cash} />}
                                    dot={false}
                                    strokeWidth={3}
                                    fill="transparent"
                                />
                                <Area
                                    type="monotone"
                                    animationDuration={200}
                                    dataKey="worst"
                                    stroke={COLORS.worst}
                                    strokeDasharray="6 6"
                                    dot={false}
                                    strokeWidth={2}
                                    activeDot={(props) => isAnimating ? null : <CircleWithShadow cx={props.cx} cy={props.cy} fill={COLORS.worst} />}
                                    fill="url(#worstGradient)"
                                    fillOpacity={1}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    align="left"
                                    wrapperStyle={{ paddingTop: 32 }}
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
                        padding: 32,
                        display: "flex",
                        flexDirection: "column",
                        gap: 32,
                        minWidth: isMobile ? 'unset' : 300,
                    }}
                >
                    <SectionTitle>Deine Details</SectionTitle>

                    {/* Ages and Employment */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                        }}
                    >
                        {/* Alter */}
                        <div>
                            <LabelRow left="Dein Alter" right={displayAge} />
                            <Slider
                                value={age}
                                onChange={setAge}
                                step={1}
                                onImmediateChange={setDisplayAge}
                                min={18}
                                max={64}
                            />
                        </div>

                        {/* Beschäftigung */}
                        <div
                            style={{
                                display: "flex",
                                gap: 32,
                            }}
                        >
                            {(Object.keys(EMPLOYMENT) as EmploymentKey[]).map(
                                (key) => (
                                    <Radio
                                        key={key}
                                        checked={employment === key}
                                        onChange={() =>
                                            handleEmploymentChange(key)
                                        }
                                        label={EMPLOYMENT[key].label}
                                    />
                                )
                            )}
                        </div>
                    </div>

                    {/* Monatliche Einzahlung */}
                    <div>
                        <LabelRow
                            left="Annual payments"
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

                    {/* Startbetrag */}
                    <div>
                        <LabelRow
                            left="Starting amount"
                            right={fmt(displayStart)}
                        />
                        <Slider
                            value={start}
                            onChange={setStart}
                            onImmediateChange={setDisplayStart}
                            min={0}
                            max={200000}
                            steps={STARTING_AMOUNT_VALUES}
                        />
                    </div>

                    {/* Risiko */}
                    <div style={{ marginTop: 4 }}>
                        <LabelRow left="Risk level" />
                        <div style={{ display: "grid" }}>
                            {(Object.keys(RISK_TABLE) as RiskKey[]).map(
                                (key) => (
                                    <Radio
                                        key={key}
                                        checked={risk === key}
                                        onChange={() => setRisk(key)}
                                        label={RISK_TABLE[key].label}
                                        sub={`${Math.round(RISK_TABLE[key].equityShare * 100)}% Aktienanteil`}
                                    />
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}

