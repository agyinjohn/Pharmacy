// Head office connected to branches; small dots travel along the lines to suggest stock
// transfers and orders moving between them. SVG + SMIL, no JavaScript.
const NODES = [
  { id: "acc", x: 110, y: 70, name: "Accra Central" },
  { id: "ksi", x: 430, y: 60, name: "Kumasi Adum" },
  { id: "tkd", x: 95, y: 260, name: "Takoradi" },
  { id: "tma", x: 445, y: 255, name: "Tema" },
];
const HQ = { x: 270, y: 160 };

export default function NetworkMap() {
  return (
    <svg viewBox="0 0 540 320" className="h-auto w-full" role="img" aria-label="Head office connected to four branches">
      <defs>
        <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#0f172a" opacity=".07" /></pattern>
      </defs>
      <rect width="540" height="320" fill="url(#dots)" />
      {NODES.map((n, i) => {
        const mx = (n.x + HQ.x) / 2 + (i % 2 ? 30 : -30); const my = (n.y + HQ.y) / 2 + (i < 2 ? -25 : 25);
        const d = `M${HQ.x},${HQ.y} Q${mx},${my} ${n.x},${n.y}`;
        return (
          <g key={n.id}>
            <path id={`p-${n.id}`} d={d} fill="none" stroke="#cbd5e1" strokeWidth="1.25" strokeDasharray="3 5" />
            <circle r="3.5" fill="#30514a">
              <animateMotion dur={`${4 + i * 0.7}s`} repeatCount="indefinite" begin={`${i * 0.6}s`} keyPoints={i % 2 ? "1;0" : "0;1"} keyTimes="0;1" calcMode="linear"><mpath href={`#p-${n.id}`} /></animateMotion>
            </circle>
            <g transform={`translate(${n.x},${n.y})`}>
              <circle r="22" fill="#fff" stroke="#e2e8f0" />
              <path d="M-6 0h12M0-6v12" stroke="#64748b" strokeWidth="1.75" strokeLinecap="round" />
              <text y="38" textAnchor="middle" fontSize="12" fill="#475569" fontFamily="inherit">{n.name}</text>
            </g>
          </g>
        );
      })}
      <g transform={`translate(${HQ.x},${HQ.y})`}>
        <circle r="44" fill="#30514a" opacity=".08">
          <animate attributeName="r" values="34;48;34" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle r="30" fill="#28433d" />
        <path d="M-8 0h16M0-8v16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        <text y="50" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#0f172a" fontFamily="inherit">Head office</text>
      </g>
    </svg>
  );
}
