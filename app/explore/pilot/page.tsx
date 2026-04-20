"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import styles from "./fragrance-map.module.css";
import DATA from "./fragrance-map-data";

/** Same password as whiteboard (UFH Unilever study) */
const PILOT_PASSWORD = "UFH2026";
const SESSION_KEY = "explore_pilot_access_granted";

const FEELS = DATA.feels;
const IMAGES = DATA.images;

const DEFAULT_Y = "Soothing";
const DEFAULT_X = "Product-Format-This-leaves-me-feeling-soft-and-smooth";

const W = 860,
  H = 560;
const MARGIN = { top: 40, right: 40, bottom: 70, left: 80 };
const PW = W - MARGIN.left - MARGIN.right;
const PH = H - MARGIN.top - MARGIN.bottom;

const OIL_COLOURS: Record<string, string> = {
  citrus: "#e8b647",
  gourmand: "#c77f4a",
  marine: "#5f8aa6",
  woody: "#6b4a33",
};

function likingColour(v: number): string {
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  const lo = 30,
    mid = 55,
    hi = 80;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const mix = (c1: number[], c2: number[], t: number) =>
    [0, 1, 2].map((i) => Math.round(lerp(c1[i], c2[i], t)));
  const LOW = [194, 74, 58];
  const MIDC = [232, 199, 90];
  const HIGH = [78, 139, 85];
  let rgb: number[];
  if (v <= mid) {
    const t = clamp((v - lo) / (mid - lo), 0, 1);
    rgb = mix(LOW, MIDC, t);
  } else {
    const t = clamp((v - mid) / (hi - mid), 0, 1);
    rgb = mix(MIDC, HIGH, t);
  }
  return `rgb(${rgb.join(",")})`;
}

function prettify(s: string): string {
  return s
    .replace(/-/g, " ")
    .replace(
      /\b(Emotions|Fragrance Space|Occasion|Product Format|Routine|Sensorial)\b/,
      "$1 ·"
    );
}

type Stimulus = (typeof DATA.stimuli)[number];

function stimValue(stim: Stimulus, dim: string): number | null {
  if (dim in stim.feels) return stim.feels[dim as keyof typeof stim.feels];
  if (dim in stim.images) return stim.images[dim as keyof typeof stim.images];
  return null;
}

function axisRange(dim: string): [number, number] {
  const vals = DATA.stimuli
    .map((s) => stimValue(s, dim))
    .filter((v): v is number => v != null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(2, (max - min) * 0.12);
  return [Math.max(0, min - pad), max + pad];
}

function ticks(a: number, b: number, n = 5): number[] {
  const out: number[] = [];
  const step = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out.push(a + step * i);
  return out;
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

export default function FragranceMapPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [gateError, setGateError] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [yDim, setYDim] = useState(DEFAULT_Y);
  const [xDim, setXDim] = useState(DEFAULT_X);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(SESSION_KEY) === "true") {
        setIsAuthenticated(true);
      }
    }
    setIsCheckingSession(false);
  }, []);

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gatePassword === PILOT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setIsAuthenticated(true);
      setGateError("");
    } else {
      setGateError("Please contact your admin");
    }
  };

  const visibleId = activeId ?? hoveredId;

  const { xScale, yScale, xMin, xMax, yMin, yMax } = useMemo(() => {
    const [yMin, yMax] = axisRange(yDim);
    const [xMin, xMax] = axisRange(xDim);
    return {
      xScale: (v: number) => MARGIN.left + ((v - xMin) / (xMax - xMin)) * PW,
      yScale: (v: number) => MARGIN.top + PH - ((v - yMin) / (yMax - yMin)) * PH,
      xMin,
      xMax,
      yMin,
      yMax,
    };
  }, [yDim, xDim]);

  const selectedStim = useMemo(
    () => (visibleId ? DATA.stimuli.find((s) => s.id === visibleId) : null),
    [visibleId]
  );

  const handleDotClick = useCallback(
    (id: string) => {
      setActiveId((prev) => (prev === id ? null : id));
    },
    []
  );

  const handlePlotClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).tagName !== "circle") {
      setActiveId(null);
    }
  }, []);

  const handleAxisChange = useCallback(() => {
    setActiveId(null);
    setHoveredId(null);
  }, []);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-[rgba(38,116,186,0.1)] rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-[rgba(38,116,186,1)]" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Welcome</h2>
            <p className="text-gray-600 text-center mt-2">
              Please enter the password to access the Fragrance Map
            </p>
          </div>

          <form onSubmit={handleGateSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={gatePassword}
                onChange={(e) => {
                  setGatePassword(e.target.value);
                  setGateError("");
                }}
                placeholder="Enter password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgba(38,116,186,0.5)] focus:border-[rgba(38,116,186,1)] outline-none transition-colors text-center text-lg"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {gateError && (
              <p className="text-red-500 text-sm text-center">{gateError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white font-medium rounded-lg transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topbar}>
        <div className={styles.brand}>
          Fragrance <em className={styles.brandAccent}>Map</em>
        </div>
        <div className={styles.tagline}>UFH × MGA · Mind Genomics Pilot · n=208</div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.controls}>
          <div className={styles.field}>
            <span className={styles.sectionLabel}>Vertical axis</span>
            <h3 className={styles.fieldTitle}>Feel</h3>
            <div className={styles.hint}>How the fragrance makes people feel</div>
            <select
              className={styles.select}
              value={yDim}
              onChange={(e) => {
                setYDim(e.target.value);
                handleAxisChange();
              }}
            >
              {FEELS.map((f) => (
                <option key={f} value={f}>
                  {prettify(f)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <span className={styles.sectionLabel}>Horizontal axis</span>
            <h3 className={styles.fieldTitle}>Fit</h3>
            <div className={styles.hint}>Which image associations fit the fragrance</div>
            <select
              className={styles.select}
              value={xDim}
              onChange={(e) => {
                setXDim(e.target.value);
                handleAxisChange();
              }}
            >
              {IMAGES.map((img) => (
                <option key={img} value={img}>
                  {prettify(img)}
                </option>
              ))}
            </select>
          </div>

          <hr className={styles.divider} />

          <div className={styles.legend}>
            <h4>Liking</h4>
            <div className={styles.legendBar} />
            <div className={styles.legendLabels}>
              <span>30%</span>
              <span>55%</span>
              <span>80%</span>
            </div>
            <p className={styles.legendCaption}>
              Each stimulus is coloured by its overall liking score — the percentage of
              panelists who answered YES to &quot;Do you like this fragrance?&quot;
            </p>
          </div>

          <hr className={styles.divider} />

          <div className={styles.legend}>
            <h4>How to read</h4>
            <p className={styles.legendCaption}>
              Each of the 15 stimuli is positioned by its score on the two axes
              you&apos;ve chosen. Stimulus names are labelled. Hover or tap a stimulus
              to see its oil composition and exact scores.
            </p>
            <p className={styles.legendCaption} style={{ marginTop: 8 }}>
              <strong className={styles.legendCaptionStrong}>Empty space</strong> on
              the map means positions we didn&apos;t test — territories the optimiser
              can predict into.
            </p>
            <p className={styles.legendCaptionNote}>
              <strong className={styles.legendCaptionStrong}>Note on fit scores:</strong>{" "}
              images were shown in permuted collages of 2–4 at a time, so raw YES rates
              sit on a smaller scale than liking or feel. Fit scores here are multiplied
              by 3 (the average collage size) to put all three lenses on roughly
              comparable 0–100 scales.
            </p>
          </div>
        </aside>

        <main className={styles.stage}>
          <div className={styles.stageHeader}>
            <h1 className={styles.stageTitle}>
              Explore the <em className={styles.stageTitleAccent}>pilot</em> data
            </h1>
            <div className={styles.stageSubtitle}>15 stimuli · 4 oils · 3 lenses</div>
          </div>

          <p className={styles.stageMeta}>
            Each stimulus is a blend of four oil families — Citrus (lemon), Gourmand
            (vanilla), Marine (calone), Woody (cedarwood) — at varying proportions.
            Pick any <em className={styles.stageMetaAccent}>Feel</em> and any{" "}
            <em className={styles.stageMetaAccent}>Fit</em> dimension from the left
            panel; the 15 stimuli will arrange themselves in that 2D space, coloured
            by liking.
          </p>

          <div className={styles.plotWrap}>
            <svg
              className={styles.plot}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              onClick={handlePlotClick}
            >
              {/* Gridlines */}
              {ticks(xMin, xMax, 6).map((v) => {
                const x = xScale(v);
                return (
                  <line
                    key={`gx-${v}`}
                    stroke="#d7d3c8"
                    strokeWidth={0.5}
                    strokeDasharray="2 3"
                    x1={x}
                    y1={MARGIN.top}
                    x2={x}
                    y2={MARGIN.top + PH}
                  />
                );
              })}
              {ticks(yMin, yMax, 6).map((v) => {
                const y = yScale(v);
                return (
                  <line
                    key={`gy-${v}`}
                    stroke="#d7d3c8"
                    strokeWidth={0.5}
                    strokeDasharray="2 3"
                    x1={MARGIN.left}
                    y1={y}
                    x2={MARGIN.left + PW}
                    y2={y}
                  />
                );
              })}

              {/* Axis lines */}
              <line
                stroke="#3a3a44"
                strokeWidth={1}
                x1={MARGIN.left}
                y1={MARGIN.top + PH}
                x2={MARGIN.left + PW}
                y2={MARGIN.top + PH}
              />
              <line
                stroke="#3a3a44"
                strokeWidth={1}
                x1={MARGIN.left}
                y1={MARGIN.top}
                x2={MARGIN.left}
                y2={MARGIN.top + PH}
              />

              {/* Tick labels X */}
              {ticks(xMin, xMax, 6).map((v) => (
                <text
                  key={`tx-${v}`}
                  x={xScale(v)}
                  y={MARGIN.top + PH + 16}
                  textAnchor="middle"
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    fill: "#74747e",
                  }}
                >
                  {fmt(v)}
                </text>
              ))}
              {/* Tick labels Y */}
              {ticks(yMin, yMax, 6).map((v) => (
                <text
                  key={`ty-${v}`}
                  x={MARGIN.left - 10}
                  y={yScale(v) + 3}
                  textAnchor="end"
                  style={{
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    fill: "#74747e",
                  }}
                >
                  {fmt(v)}
                </text>
              ))}

              {/* X axis labels */}
              <text
                x={MARGIN.left + PW / 2}
                y={MARGIN.top + PH + 40}
                textAnchor="middle"
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fill: "#74747e",
                }}
              >
                Fit · scaled score
              </text>
              <text
                x={MARGIN.left + PW / 2}
                y={MARGIN.top + PH + 56}
                textAnchor="middle"
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontStyle: "italic",
                  fontSize: 14,
                  fill: "#14141a",
                }}
              >
                {prettify(xDim)}
              </text>

              {/* Y axis labels */}
              <text
                x={MARGIN.left - 52}
                y={MARGIN.top + PH / 2 - 14}
                textAnchor="middle"
                transform={`rotate(-90 ${MARGIN.left - 52} ${MARGIN.top + PH / 2 - 14})`}
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fill: "#74747e",
                }}
              >
                Feel · % yes
              </text>
              <text
                x={MARGIN.left - 36}
                y={MARGIN.top + PH / 2}
                textAnchor="middle"
                transform={`rotate(-90 ${MARGIN.left - 36} ${MARGIN.top + PH / 2})`}
                style={{
                  fontFamily: '"Fraunces", serif',
                  fontStyle: "italic",
                  fontSize: 14,
                  fill: "#14141a",
                }}
              >
                {prettify(yDim)}
              </text>

              {/* Data dots */}
              {DATA.stimuli.map((s) => {
                const xv = stimValue(s, xDim);
                const yv = stimValue(s, yDim);
                if (xv == null || yv == null) return null;
                const cx = xScale(xv);
                const cy = yScale(yv);
                const isActive = s.id === activeId;
                return (
                  <g key={s.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={18}
                      fill={likingColour(s.liking)}
                      stroke="#14141a"
                      strokeWidth={isActive ? 2.5 : 1}
                      style={{ cursor: "pointer", transition: "stroke-width 0.15s" }}
                      onMouseEnter={() => setHoveredId(s.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => handleDotClick(s.id)}
                    />
                    <text
                      x={cx}
                      y={cy + 3}
                      textAnchor="middle"
                      style={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 10.5,
                        fontWeight: 500,
                        fill: "#14141a",
                        pointerEvents: "none",
                        paintOrder: "stroke",
                        stroke: "#fdfbf6",
                        strokeWidth: 3,
                      }}
                    >
                      {s.id}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Info card */}
            <div
              className={`${styles.info} ${selectedStim ? styles.infoVisible : ""}`}
            >
              <div className={styles.stimId}>{selectedStim?.id ?? "—"}</div>
              <div className={styles.stimLike}>
                Liking{" "}
                <b className={styles.stimLikeValue}>
                  {selectedStim ? `${selectedStim.liking.toFixed(1)}%` : "—"}
                </b>
              </div>
              <div className={styles.oils}>
                {(["citrus", "gourmand", "marine", "woody"] as const).map((k) => {
                  const v = selectedStim?.[k] ?? 0;
                  return (
                    <div key={k} className={styles.oilRow}>
                      <span className={styles.oilName}>
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </span>
                      <span className={styles.oilBarTrack}>
                        <span
                          className={styles.oilBarFill}
                          style={{ width: `${v}%`, background: OIL_COLOURS[k] }}
                        />
                      </span>
                      <span className={styles.oilVal}>{v}%</span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.axisVals}>
                <div className={styles.axisValsRow}>
                  <span className={styles.axisValsLabel}>{prettify(yDim)}</span>
                  <span className={styles.axisValsVal}>
                    {selectedStim
                      ? `${stimValue(selectedStim, yDim)?.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
                <div className={styles.axisValsRow}>
                  <span className={styles.axisValsLabel}>{prettify(xDim)}</span>
                  <span className={styles.axisValsVal}>
                    {selectedStim
                      ? `${stimValue(selectedStim, xDim)?.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className={styles.stageFoot}>
            <strong className={styles.stageFootStrong}>For facilitators:</strong> let
            participants call out Feel and Fit pairs. Watch for axis combinations
            where liking travels cleanly along a diagonal — those are dimensions that
            co-move with preference. Watch for combinations where liking is scattered
            — those dimensions carry{" "}
            <em className={styles.stageFootAccent}>independent</em> information about
            the fragrance, and are candidates for a perfumer brief the optimiser can
            act on.
          </p>
        </main>
      </div>
    </div>
  );
}
