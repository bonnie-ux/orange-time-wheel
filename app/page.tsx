import React, { useMemo, useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
// 改成原生 HTML，不用安裝 UI 套件

const BRAND = {
  name: "橘時咖啡",
  primary: "#E58A00",
  primaryDark: "#C46D00",
  dark: "#4A2B1A",
  softBg: "#F2EEEA",
  softText: "#4B5563",
} as const;

const LOGO =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  <circle cx='60' cy='60' r='56' fill='#2B2B2B' stroke='#F2A33B' stroke-width='6'/>
  <path d='M50 20 L70 20 L60 55 Z' fill='none' stroke='#F2A33B' stroke-width='4'/>
  <path d='M60 55 L45 95 L75 95 Z' fill='none' stroke='#F2A33B' stroke-width='4'/>
</svg>
`);

type Prize = {
  name: string;
  weight: number;
};

type Segment = Prize & {
  start: number;
  end: number;
  mid: number;
};

type DrawResult = {
  name: string;
  code: string;
};

const PRIZES: Prize[] = [
  { name: "今天免費", weight: 2 },
  { name: "半價優惠", weight: 5 },
  { name: "升級大杯", weight: 12 },
  { name: "送匈牙利捲", weight: 6 },
  { name: "滿200折40", weight: 20 },
  { name: "買兩杯折50", weight: 15 },
  { name: "再抽一次", weight: 15 },
  { name: "原價回饋", weight: 25 },
];

function makeSegments(prizes: Prize[]): Segment[] {
  const total = prizes.reduce((sum, prize) => sum + prize.weight, 0);
  let current = 0;

  return prizes.map((prize) => {
    const angle = (prize.weight / total) * 360;
    const start = current;
    const end = current + angle;
    current = end;
    return { ...prize, start, end, mid: start + angle / 2 };
  });
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arc(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const big = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${big} 0 ${e.x} ${e.y} Z`;
}

function createCouponCode(id: string): string {
  const suffix = id.trim().slice(-3) || "000";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OT-${suffix}-${rand}`;
}

function getRotation(seg: Segment): number {
  return 360 * 6 + (360 - seg.mid);
}

function pickPrize(prizes: Prize[]): Prize {
  const total = prizes.reduce((sum, prize) => sum + prize.weight, 0);
  let r = Math.random() * total;

  for (const prize of prizes) {
    r -= prize.weight;
    if (r <= 0) {
      return prize;
    }
  }

  return prizes[0]!;
}

function resolvePrize(prizes: Prize[]): Prize {
  let picked = pickPrize(prizes);
  let guard = 0;

  while (picked.name === "再抽一次" && guard < 10) {
    picked = pickPrize(prizes);
    guard += 1;
  }

  return picked;
}

function runSelfTests(): void {
  const segments = makeSegments([
    { name: "A", weight: 1 },
    { name: "B", weight: 1 },
  ]);
  console.assert(segments.length === 2, "Expected 2 segments");
  console.assert(Math.round(segments[1]!.end) === 360, "Expected last segment to end at 360");

  const code = createCouponCode("ABC123");
  console.assert(code.startsWith("OT-123-"), "Expected coupon code suffix to use last 3 chars");

  const forced = resolvePrize([{ name: "今天免費", weight: 1 }]);
  console.assert(forced.name === "今天免費", "Expected forced prize to resolve correctly");

  const path = arc(100, 100, 50, 0, 90);
  console.assert(path.startsWith("M 100 100 L"), "Expected SVG arc path to be valid");

  const rotation = getRotation({ name: "A", weight: 1, start: 0, end: 180, mid: 90 });
  console.assert(rotation > 360, "Expected rotation to include full spins");
}

runSelfTests();

export default function App() {
  const [rotation, setRotation] = useState<number>(0);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [flash, setFlash] = useState<boolean>(false);

  const segments = useMemo(() => makeSegments(PRIZES), []);

  const spin = async (): Promise<void> => {
    if (spinning || !customerId.trim()) {
      return;
    }

    setSpinning(true);
    setResult(null);

    const picked = resolvePrize(PRIZES);
    const seg = segments.find((segment) => segment.name === picked.name);
    if (!seg) {
      setSpinning(false);
      return;
    }

    const next = rotation + getRotation(seg);
    const controls = animate(rotation, next, {
      duration: 5,
      ease: [0.1, 0.9, 0.2, 1],
      onUpdate: (value) => setRotation(value),
    });

    await controls.finished;

    setResult({ name: picked.name, code: createCouponCode(customerId) });
    setSpinning(false);

    if (picked.name === "今天免費") {
      setFlash(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([200, 100, 200]);
      }
      window.setTimeout(() => setFlash(false), 1200);
    }
  };

  const size = 320;
  const center = size / 2;
  const radius = 140;
  const colors = [
    "#F7A600",
    "#F1B866",
    "#8C5628",
    "#E28A1A",
    "#F4BF86",
    "#F06D06",
    "#D97A00",
    "#B45309",
  ];

  return (
    <div
      className={`min-h-screen flex flex-col items-center px-6 py-10 ${
        flash ? "bg-red-500" : "bg-[#f2eeea]"
      }`}
    >
      <div className="mb-6 flex w-full max-w-3xl items-center gap-3">
        <img src={LOGO} className="w-12" alt="橘時咖啡 Logo" />
        <div>
          <div className="text-2xl font-bold" style={{ color: BRAND.dark }}>橘時咖啡</div>
          <div className="text-sm" style={{ color: BRAND.softText }}>品牌活動正式版</div>
        </div>
      </div>

      <div className="mb-4 rounded-full px-5 py-2 text-base font-semibold" style={{ backgroundColor: '#F6DEC0', color: BRAND.primaryDark }}>
        ✨ 每日限抽一次
      </div>

      <h2 className="mb-2 text-center text-5xl font-bold" style={{ color: BRAND.dark }}>
        橘時咖啡 抽獎轉盤
      </h2>
      <div className="mb-10 text-center text-2xl" style={{ color: BRAND.softText }}>每日限抽一次，轉出你的今日命運</div>

      <div className="relative mb-8">
        <div className="pointer-events-none absolute left-1/2 top-[-18px] z-20 h-0 w-0 -translate-x-1/2 border-l-[18px] border-r-[18px] border-t-[34px] border-l-transparent border-r-transparent border-t-[#7B4B24] drop-shadow-sm" />

      <motion.div
        animate={{ rotate: rotation }}
        className="rounded-full border-[12px] border-white bg-white shadow-2xl"
        style={{ width: size, height: size }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {segments.map((seg, i) => (
            <path
              key={seg.name + i}
              d={arc(center, center, radius, seg.start, seg.end)}
              fill={colors[i % colors.length]}
            />
          ))}

          <circle cx={center} cy={center} r="28" fill="#fff" />
          <image href={LOGO} x={center - 18} y={center - 18} width="36" height="36" />

          {segments.map((seg, i) => {
            const pos = polar(center, center, radius * 0.65, seg.mid);
            return (
              <text
                key={seg.name + "-label-" + i}
                x={pos.x}
                y={pos.y}
                fill="#fff"
                fontSize="12"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {seg.name}
              </text>
            );
          })}
        </svg>
      </motion.div>
      </div>

      <div className="mt-6 w-full max-w-3xl rounded-[36px] bg-[#f2eeea] p-6 shadow-[0_6px_20px_rgba(0,0,0,0.06)]">
        <div className="mb-3 text-left text-2xl font-bold" style={{ color: BRAND.dark }}>
          抽獎識別碼（例如手機末3碼 / 會員編號）
        </div>
        <input
          placeholder="請輸入識別碼"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="h-16 w-full rounded-[28px] border border-[#E8C89B] bg-white px-6 text-center text-2xl placeholder:text-[#6B7280] focus:outline-none"
        />
      </div>

      <button
        onClick={spin}
        className="mt-5 h-16 w-full max-w-3xl rounded-[28px] text-xl font-bold text-white shadow-md transition hover:opacity-95"
        style={{ backgroundColor: BRAND.primary }}
      >
        {spinning ? "轉動中..." : "開始抽獎"}
      </button>

      <AnimatePresence>
        {result ? (
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="mt-6 w-full max-w-3xl rounded-[32px] bg-white p-6 text-center shadow"
          >
            <div className="mb-2 text-sm tracking-[0.2em] text-orange-600">抽獎結果</div>
            <div className="mb-2 text-4xl font-bold" style={{ color: BRAND.dark }}>
              {result.name}
            </div>
            <div className="text-lg font-semibold" style={{ color: BRAND.dark }}>兌換序號</div>
            <div className="mt-2 rounded-2xl bg-[#FFF5E7] px-4 py-3 font-mono text-2xl font-bold tracking-wider" style={{ color: BRAND.primaryDark }}>{result.code}</div>
            <div className="mt-3 text-base font-medium" style={{ color: BRAND.dark }}>請出示畫面給門市人員確認</div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-6 w-full max-w-3xl rounded-[32px] bg-white p-6 shadow">
        <div className="mb-3 text-left text-xl font-semibold" style={{ color: BRAND.dark }}>
          今日獎項
        </div>
        <div className="flex flex-wrap gap-3">
          {PRIZES.map((item) => (
            <div key={item.name} className="rounded-full px-4 py-2 text-base font-medium" style={{ backgroundColor: '#FFF2DD', color: BRAND.primaryDark }}>
              {item.name}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
