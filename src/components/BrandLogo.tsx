const COLOR = "#3EB6E5";
const WIDTH = 640;
const HEIGHT = 76;
const INSET = 2.2;
const HATCH_WIDTH = 56;
const HATCH_COUNT = 17;
const HATCH_INSET = 5;

export function BrandLogo() {
  const hatchTop = INSET + 5;
  const hatchBottom = HEIGHT - INSET - 5;
  const hatchStep =
    HATCH_COUNT > 1 ? (hatchBottom - hatchTop) / (HATCH_COUNT - 1) : 0;
  const leftX = INSET;
  const rightX = WIDTH - INSET - HATCH_WIDTH;
  const leftRule = INSET + HATCH_WIDTH;
  const rightRule = WIDTH - INSET - HATCH_WIDTH;

  const hatches = (x: number, key: string) =>
    Array.from({ length: HATCH_COUNT }, (_, i) => {
      const y = hatchTop + i * hatchStep;
      return (
        <line
          key={`${key}-${i}`}
          x1={x + HATCH_INSET}
          y1={y}
          x2={x + HATCH_WIDTH - HATCH_INSET}
          y2={y}
          stroke={COLOR}
          strokeWidth="1.45"
        />
      );
    });

  return (
    <svg
      className="brand-logo"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Checking-sites"
    >
      <rect
        x={INSET}
        y={INSET}
        width={WIDTH - INSET * 2}
        height={HEIGHT - INSET * 2}
        stroke={COLOR}
        strokeWidth="1.7"
      />
      {hatches(leftX, "l")}
      {hatches(rightX, "r")}
      <line
        x1={leftRule}
        y1={INSET}
        x2={leftRule}
        y2={HEIGHT - INSET}
        stroke={COLOR}
        strokeWidth="1.7"
      />
      <line
        x1={rightRule}
        y1={INSET}
        x2={rightRule}
        y2={HEIGHT - INSET}
        stroke={COLOR}
        strokeWidth="1.7"
      />
      <text
        x={WIDTH / 2}
        y={HEIGHT / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill={COLOR}
        fontSize="32"
        fontWeight="800"
        letterSpacing="4.2"
        className="brand-logo-type"
      >
        CHECKING-SITES
      </text>
    </svg>
  );
}
