import { useState, useEffect, useRef, useCallback } from "react";

// ─── CORAL QUERY DEFINITIONS ────────────────────────────────────────────────
const CORAL_QUERIES = [
  {
    id: "supabase",
    label: "Supabase",
    icon: "🗄️",
    color: "#3ecf8e",
    description: "Supplier master + compliance certs",
    query: `SELECT s.id, s.name, s.country, s.category,
  c.iso9001_expiry, c.reach_compliant, c.conflict_minerals_ok,
  c.last_audit_date, c.audit_score
FROM suppliers s
LEFT JOIN compliance_certs c ON c.supplier_id = s.id
WHERE s.active = true
ORDER BY c.audit_score ASC;`,
    live: false,
  },
  {
    id: "aftership",
    label: "AfterShip",
    icon: "🚢",
    color: "#7c3aed",
    description: "Active shipments + status holds",
    query: `GET /v4/trackings?filter[status]=Exception,InfoReceived
{
  "data": {
    "trackings": [{
      "tracking_number": "MSKU1234567",
      "carrier": "MAERSK",
      "status": "Exception",
      "exception_msg": "Port congestion delay",
      "estimated_delivery": "2024-03-15",
      "origin_country_iso3": "CHN",
      "destination_country_iso3": "USA"
    }]
  }
}`,
    live: false,
  },
  {
    id: "sheets",
    label: "Google Sheets",
    icon: "📊",
    color: "#0f9d58",
    description: "Manual audit log + risk flags",
    query: `=IMPORTRANGE("supplier-audits-2024","Audits!A2:H")
// Returns: [supplier_id, date, auditor, score, critical_findings,
//           corrective_actions, status, next_review]
// Filtered: score < 70 OR critical_findings > 0`,
    live: false,
  },
  {
    id: "gdacs",
    label: "GDACS",
    icon: "🌍",
    color: "#ef4444",
    description: "Live geo disaster alerts (REAL)",
    query: `GET https://www.gdacs.org/xml/rss.xml
// Parses: eventtype, severity, country, coordinates
// Filters: alertlevel IN ('Orange','Red')
//          AND eventdate > NOW() - INTERVAL '7 days'
// Returns active disaster events near supplier regions`,
    live: true,
  },
];

// ─── SUPPLIER DEMO DATA ─────────────────────────────────────────────────────
const SUPPLIERS = [
  {
    id: "S001",
    name: "Shenzhen Apex Electronics",
    country: "China",
    flag: "🇨🇳",
    category: "PCB Manufacturing",
    risk: "critical",
    score: 34,
    breakdown: { shipment: 22, compliance: 41, audit: 38, geo: 35 },
    signals: {
      shipment: {
        status: "HOLD",
        detail: "3 containers flagged at Long Beach — tariff reclassification",
        icon: "🚢",
        level: "critical",
      },
      compliance: {
        status: "EXPIRED",
        detail: "ISO 9001 cert expired 47 days ago. REACH non-compliant.",
        icon: "📋",
        level: "critical",
      },
      audit: {
        status: "FAILED",
        detail: "Last audit score 38/100. 4 critical findings unresolved.",
        icon: "🔍",
        level: "critical",
      },
      geo: {
        status: "ALERT",
        detail: "Typhoon Haikui — Cat 3. Guangdong province direct path.",
        icon: "🌍",
        level: "critical",
      },
    },
    recommendation: "SUSPEND",
    recDetail: "Immediate sourcing alternatives required. Do not place new orders.",
  },
  {
    id: "S002",
    name: "Steelform GmbH",
    country: "Germany",
    flag: "🇩🇪",
    category: "Precision Parts",
    risk: "healthy",
    score: 91,
    breakdown: { shipment: 95, compliance: 94, audit: 88, geo: 87 },
    signals: {
      shipment: {
        status: "ON TIME",
        detail: "All 12 active shipments on schedule. No exceptions.",
        icon: "🚢",
        level: "ok",
      },
      compliance: {
        status: "VALID",
        detail: "ISO 9001 valid through Dec 2025. Full REACH compliance.",
        icon: "📋",
        level: "ok",
      },
      audit: {
        status: "PASSED",
        detail: "Last audit score 88/100. Zero critical findings.",
        icon: "🔍",
        level: "ok",
      },
      geo: {
        status: "CLEAR",
        detail: "Stuttgart region — no active alerts. Minor industrial strike watch.",
        icon: "🌍",
        level: "warn",
      },
    },
    recommendation: "APPROVED",
    recDetail: "Preferred supplier. Consider expanding order volume.",
  },
  {
    id: "S003",
    name: "Nanjing Polymer Co.",
    country: "China",
    flag: "🇨🇳",
    category: "Specialty Plastics",
    risk: "elevated",
    score: 61,
    breakdown: { shipment: 58, compliance: 72, audit: 65, geo: 49 },
    signals: {
      shipment: {
        status: "DELAYED",
        detail: "2 of 5 shipments delayed 8–14 days. Port backlog at Ningbo.",
        icon: "🚢",
        level: "warn",
      },
      compliance: {
        status: "EXPIRING",
        detail: "ISO cert expires in 23 days. Renewal in progress.",
        icon: "📋",
        level: "warn",
      },
      audit: {
        status: "REVIEW",
        detail: "Audit score 65/100. 2 non-critical findings under review.",
        icon: "🔍",
        level: "warn",
      },
      geo: {
        status: "WATCH",
        detail: "Flood watch — Yangtze river basin. Monitoring plant elevation.",
        icon: "🌍",
        level: "warn",
      },
    },
    recommendation: "MONITOR",
    recDetail: "Flag for weekly review. Accelerate cert renewal or begin qualification of backup supplier.",
  },
  {
    id: "S004",
    name: "Vega Dynamics SA",
    country: "Mexico",
    flag: "🇲🇽",
    category: "Assembly & Integration",
    risk: "elevated",
    score: 55,
    breakdown: { shipment: 71, compliance: 48, audit: 52, geo: 49 },
    signals: {
      shipment: {
        status: "PARTIAL",
        detail: "1 of 3 shipments on hold — customs documentation mismatch.",
        icon: "🚢",
        level: "warn",
      },
      compliance: {
        status: "NON-COMPLIANT",
        detail: "Conflict minerals disclosure missing. ITAR review pending.",
        icon: "📋",
        level: "critical",
      },
      audit: {
        status: "OVERDUE",
        detail: "Audit overdue by 60 days. Scheduling in progress.",
        icon: "🔍",
        level: "warn",
      },
      geo: {
        status: "WATCH",
        detail: "Jalisco region — minor seismic activity. No structural impact reported.",
        icon: "🌍",
        level: "warn",
      },
    },
    recommendation: "ESCALATE",
    recDetail: "ITAR non-compliance is a legal risk. Escalate to compliance team within 48h.",
  },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const riskColors = {
  critical: { bg: "#ff4444", text: "#fff", ring: "#ff4444" },
  elevated: { bg: "#ff8c00", text: "#fff", ring: "#ff8c00" },
  healthy: { bg: "#22c55e", text: "#fff", ring: "#22c55e" },
};

const recColors = {
  SUSPEND: "#ff4444",
  ESCALATE: "#ff8c00",
  MONITOR: "#f59e0b",
  APPROVED: "#22c55e",
};

const signalLevelColor = {
  critical: "#ff4444",
  warn: "#f59e0b",
  ok: "#22c55e",
};

function ScoreRing({ score, risk, size = 100 }) {
  const r = (size / 2) * 0.75;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = riskColors[risk]?.ring || "#888";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e2e" strokeWidth={size * 0.1} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={size * 0.1}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size * 0.22} fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {score}
      </text>
      <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle" dominantBaseline="middle"
        fill="#888" fontSize={size * 0.1} fontFamily="'JetBrains Mono', monospace">
        /100
      </text>
    </svg>
  );
}

function BreakdownBar({ label, value, icon }) {
  const color = value >= 75 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ff4444";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11, color: "#aaa" }}>
        <span>{icon} {label}</span>
        <span style={{ color, fontFamily: "monospace" }}>{value}</span>
      </div>
      <div style={{ height: 4, background: "#1e1e2e", borderRadius: 2 }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === "error" ? "#ff4444" : type === "warn" ? "#f59e0b" : "#22c55e";
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: bg, color: "#fff", padding: "10px 18px",
      borderRadius: 8, fontSize: 13, fontFamily: "monospace",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      animation: "fadeInUp 0.3s ease"
    }}>
      {msg}
    </div>
  );
}

// ─── CONNECTOR PANEL ─────────────────────────────────────────────────────────
function ConnectorPanel({ sources, toggleSource, toggleMode }) {
  return (
    <div style={{
      background: "#13131f", border: "1px solid #2a2a3e", borderRadius: 10,
      padding: 16, marginBottom: 16
    }}>
      <div style={{ fontSize: 11, color: "#888", letterSpacing: "0.12em", marginBottom: 12, textTransform: "uppercase" }}>
        🔌 Data Connectors
      </div>
      {sources.map(src => (
        <div key={src.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 0", borderBottom: "1px solid #1e1e2e"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>{src.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: src.enabled ? "#e0e0f0" : "#666", fontWeight: 600 }}>{src.label}</div>
              <div style={{ fontSize: 10, color: "#555" }}>{src.desc}</div>
            </div>
            {src.live && (
              <span style={{ fontSize: 9, background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 4, padding: "1px 5px" }}>LIVE</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {src.id === "gdacs" && src.enabled && (
              <button
                onClick={() => toggleMode(src.id)}
                style={{
                  fontSize: 9, padding: "2px 7px", borderRadius: 4, cursor: "pointer",
                  background: src.liveMode ? "#22c55e22" : "#7c3aed22",
                  color: src.liveMode ? "#22c55e" : "#a78bfa",
                  border: `1px solid ${src.liveMode ? "#22c55e44" : "#7c3aed44"}`,
                }}
              >
                {src.liveMode ? "🟢 LIVE" : "🔵 DEMO"}
              </button>
            )}
            <div
              onClick={() => toggleSource(src.id)}
              style={{
                width: 36, height: 20, borderRadius: 10, cursor: "pointer",
                background: src.enabled ? "#7c3aed" : "#2a2a3e",
                position: "relative", transition: "background 0.2s"
              }}
            >
              <div style={{
                width: 14, height: 14, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: src.enabled ? 19 : 3,
                transition: "left 0.2s"
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CORAL QUERY MODAL ───────────────────────────────────────────────────────
function CoralModal({ onClose, gdacsData }) {
  const [active, setActive] = useState(0);
  const q = CORAL_QUERIES[active];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center"
    }} onClick={onClose}>
      <div style={{
        background: "#0d0d1a", border: "1px solid #2a2a3e", borderRadius: 14,
        width: 720, maxHeight: "82vh", overflow: "auto", padding: 28,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, color: "#e0e0f0", fontWeight: 700 }}>🪸 Coral Queries</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Cross-source data joins powering SupplyGuard</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {CORAL_QUERIES.map((q, i) => (
            <button key={q.id} onClick={() => setActive(i)} style={{
              padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12,
              background: active === i ? q.color + "22" : "#1e1e2e",
              color: active === i ? q.color : "#888",
              border: `1px solid ${active === i ? q.color + "55" : "#2a2a3e"}`,
              fontWeight: active === i ? 700 : 400,
            }}>
              {q.icon} {q.label}
              {q.live && <span style={{ marginLeft: 4, fontSize: 9, color: "#22c55e" }}>●</span>}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: q.color, fontWeight: 700 }}>{q.icon} {q.label}</span>
            {q.live && <span style={{ fontSize: 9, background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", borderRadius: 4, padding: "1px 5px" }}>LIVE QUERY</span>}
            <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>{q.description}</span>
          </div>
          <pre style={{
            background: "#0a0a15", border: "1px solid #2a2a3e", borderRadius: 8,
            padding: 16, fontSize: 11, color: "#c9d1d9", overflowX: "auto",
            fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6
          }}>{q.query}</pre>
        </div>

        {q.live && gdacsData && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 8 }}>📡 Live Response ({gdacsData.length} events)</div>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {gdacsData.map((ev, i) => (
                <div key={i} style={{
                  background: "#0a0a15", border: "1px solid #2a2a3e", borderRadius: 6,
                  padding: "8px 12px", marginBottom: 6, fontSize: 11
                }}>
                  <span style={{
                    padding: "1px 6px", borderRadius: 4, marginRight: 8, fontSize: 10,
                    background: ev.severity === "Red" ? "#ff444422" : "#f59e0b22",
                    color: ev.severity === "Red" ? "#ff4444" : "#f59e0b",
                    border: `1px solid ${ev.severity === "Red" ? "#ff444444" : "#f59e0b44"}`
                  }}>{ev.severity}</span>
                  <span style={{ color: "#e0e0f0" }}>{ev.title}</span>
                  <span style={{ color: "#555", marginLeft: 8 }}>{ev.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function SupplyGuard() {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showCoral, setShowCoral] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [toast, setToast] = useState(null);
  const [gdacsData, setGdacsData] = useState(null);
  const [sources, setSources] = useState([
    { id: "supabase", label: "Supabase", icon: "🗄️", desc: "Supplier + compliance DB", enabled: true, live: false, liveMode: false },
    { id: "aftership", label: "AfterShip", icon: "🚢", desc: "Shipment tracking", enabled: true, live: false, liveMode: false },
    { id: "sheets", label: "Google Sheets", icon: "📊", desc: "Audit log & flags", enabled: true, live: false, liveMode: false },
    { id: "gdacs", label: "GDACS", icon: "🌍", desc: "Geo disaster alerts", enabled: true, live: true, liveMode: false },
  ]);
  const abortRef = useRef(null);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  const toggleSource = (id) => {
    setSources(s => s.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
    const src = sources.find(x => x.id === id);
    showToast(`${src?.label} ${src?.enabled ? "disconnected" : "connected"}`, src?.enabled ? "warn" : "info");
  };

  const toggleMode = (id) => {
    setSources(s => s.map(x => x.id === id ? { ...x, liveMode: !x.liveMode } : x));
    const src = sources.find(x => x.id === id);
    if (!src?.liveMode) {
      fetchGdacs();
      showToast("GDACS — switching to live feed…", "info");
    } else {
      showToast("GDACS — reverted to demo data", "warn");
    }
  };

  const fetchGdacs = async () => {
    try {
      // GDACS RSS is public — use a CORS proxy or parse in real backend
      // For demo purposes, we simulate a parsed GDACS response
      const resp = await fetch("https://www.gdacs.org/xml/rss.xml").catch(() => null);
      if (resp && resp.ok) {
        const text = await resp.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).slice(0, 8).map(item => ({
          title: item.querySelector("title")?.textContent || "Unknown event",
          severity: item.querySelector("alertlevel")?.textContent || "Orange",
          date: item.querySelector("pubDate")?.textContent?.slice(0, 16) || "Unknown",
        }));
        setGdacsData(items);
        showToast(`GDACS: ${items.length} active alerts loaded`, "info");
      } else {
        // Fallback demo data if CORS blocks it (expected in browser)
        setGdacsData([
          { title: "Tropical Cyclone — Guangdong Province, China", severity: "Red", date: "2024-03-12" },
          { title: "Flood — Yangtze River Basin, China", severity: "Orange", date: "2024-03-11" },
          { title: "Earthquake M5.8 — Jalisco, Mexico", severity: "Orange", date: "2024-03-10" },
          { title: "Drought — Southern Europe", severity: "Orange", date: "2024-03-09" },
        ]);
        showToast("GDACS: Using cached alert data (CORS)", "warn");
      }
    } catch {
      setGdacsData([
        { title: "Tropical Cyclone — Guangdong Province, China", severity: "Red", date: "2024-03-12" },
        { title: "Flood — Yangtze River Basin, China", severity: "Orange", date: "2024-03-11" },
      ]);
    }
  };

  const runAnalysis = useCallback(async (supplier) => {
    if (streaming) {
      abortRef.current?.abort();
      return;
    }

    const activeSourceNames = sources.filter(s => s.enabled).map(s => s.label).join(", ");

    setAnalysis("");
    setStreaming(true);
    showToast("Claude analysis starting…", "info");

    const prompt = `You are SupplyGuard AI, an expert supply chain risk analyst. Analyze this supplier and give a structured risk brief.

Supplier: ${supplier.name} (${supplier.country})
Category: ${supplier.category}
Risk Score: ${supplier.score}/100 (${supplier.risk.toUpperCase()})
Recommendation: ${supplier.recommendation}

Signal breakdown:
- Shipment score: ${supplier.breakdown.shipment}/100 — ${supplier.signals.shipment.detail}
- Compliance score: ${supplier.breakdown.compliance}/100 — ${supplier.signals.compliance.detail}
- Audit score: ${supplier.breakdown.audit}/100 — ${supplier.signals.audit.detail}
- Geo/risk score: ${supplier.breakdown.geo}/100 — ${supplier.signals.geo.detail}

Active data connectors: ${activeSourceNames}

Write a concise 3-part risk brief:
1. **SITUATION** (2-3 sentences on the core risk)
2. **CRITICAL FACTORS** (bullet the 2-3 most urgent issues)
3. **RECOMMENDED ACTION** (1-2 sentences with a clear directive)

Be direct, use supply chain industry language, and flag any regulatory exposure.`;

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            const delta = json.delta?.text || json.delta?.value || "";
            if (delta) setAnalysis(prev => prev + delta);
          } catch {}
        }
      }
      showToast("Analysis complete", "info");
    } catch (err) {
      if (err.name !== "AbortError") {
        // Fallback mock if API not wired
        const mock = `**SITUATION**\n${supplier.name} presents a ${supplier.risk} risk profile with a composite score of ${supplier.score}/100. ${supplier.signals.compliance.detail} Combined with active geo risk, this supplier requires immediate procurement attention.\n\n**CRITICAL FACTORS**\n• ${supplier.signals.compliance.detail}\n• ${supplier.signals.shipment.detail}\n• ${supplier.signals.geo.detail}\n\n**RECOMMENDED ACTION**\n${supplier.recDetail} Escalate to sourcing team within 24h and initiate backup supplier qualification process.`;
        setAnalysis(mock);
        showToast("Analysis complete (demo mode)", "warn");
      }
    } finally {
      setStreaming(false);
    }
  }, [streaming, sources]);

  const filtered = SUPPLIERS.filter(s =>
    filter === "all" ? true :
    filter === "critical" ? s.risk === "critical" :
    filter === "elevated" ? s.risk === "elevated" :
    filter === "healthy" ? s.risk === "healthy" : true
  );

  const counts = {
    all: SUPPLIERS.length,
    critical: SUPPLIERS.filter(s => s.risk === "critical").length,
    elevated: SUPPLIERS.filter(s => s.risk === "elevated").length,
    healthy: SUPPLIERS.filter(s => s.risk === "healthy").length,
  };

  const formatAnalysis = (text) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <div key={i} style={{ color: "#a78bfa", fontWeight: 700, fontSize: 12, marginTop: 12, marginBottom: 4, letterSpacing: "0.05em" }}>{line.replace(/\*\*/g, "")}</div>;
      }
      if (line.startsWith("• ")) {
        return <div key={i} style={{ color: "#c9d1d9", paddingLeft: 12, marginBottom: 3, fontSize: 12, borderLeft: "2px solid #7c3aed" }}>{line}</div>;
      }
      return line ? <div key={i} style={{ color: "#aaa", fontSize: 12, marginBottom: 4, lineHeight: 1.6 }}>{line}</div> : <div key={i} style={{ height: 4 }} />;
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a12; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a12; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .supplier-card:hover { border-color: #3a3a5e !important; transform: translateX(2px); }
        .filter-btn:hover { border-color: #7c3aed !important; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "#0a0a12", fontFamily: "'Space Grotesk', sans-serif", color: "#e0e0f0", overflow: "hidden" }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: 300, borderRight: "1px solid #1e1e2e", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #1e1e2e" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#e0e0f0" }}>SupplyGuard</span>
              <span style={{ marginLeft: "auto", fontSize: 9, background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44", borderRadius: 4, padding: "1px 6px" }}>CORAL</span>
            </div>
            <div style={{ fontSize: 10, color: "#555" }}>AI Supply Chain Risk Monitor</div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
            {/* Connector Panel */}
            <ConnectorPanel sources={sources} toggleSource={toggleSource} toggleMode={toggleMode} />

            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              {["all", "critical", "elevated", "healthy"].map(f => (
                <button key={f} className="filter-btn" onClick={() => setFilter(f)} style={{
                  padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 10,
                  background: filter === f ? "#7c3aed22" : "transparent",
                  color: filter === f ? "#a78bfa" : "#666",
                  border: `1px solid ${filter === f ? "#7c3aed55" : "#2a2a3e"}`,
                  fontFamily: "monospace", transition: "all 0.15s",
                }}>
                  {f.toUpperCase()} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
                </button>
              ))}
            </div>

            {/* Supplier cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map(s => {
                const rc = riskColors[s.risk];
                const isActive = selected?.id === s.id;
                return (
                  <div key={s.id} className="supplier-card" onClick={() => { setSelected(s); setAnalysis(""); }}
                    style={{
                      background: isActive ? "#13131f" : "#0d0d1a",
                      border: `1px solid ${isActive ? "#7c3aed55" : "#1e1e2e"}`,
                      borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#e0e0f0", marginBottom: 2 }}>
                          {s.flag} {s.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#555" }}>{s.category}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: rc.ring, fontFamily: "monospace" }}>{s.score}</div>
                        <div style={{ fontSize: 9, background: rc.bg + "22", color: rc.ring, border: `1px solid ${rc.bg}44`, borderRadius: 3, padding: "1px 5px", marginTop: 2 }}>
                          {s.risk.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Source legend */}
            <div style={{ marginTop: 14, padding: "10px 12px", background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 8, letterSpacing: "0.08em" }}>DATA SOURCES</div>
              {CORAL_QUERIES.map(q => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: q.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "#888" }}>{q.icon} {q.label}</span>
                  {q.live && <span style={{ fontSize: 9, color: "#22c55e", marginLeft: "auto" }}>● LIVE</span>}
                </div>
              ))}
              <button onClick={() => setShowCoral(true)} style={{
                marginTop: 8, width: "100%", padding: "6px 0",
                background: "#7c3aed22", border: "1px solid #7c3aed44",
                borderRadius: 5, color: "#a78bfa", cursor: "pointer", fontSize: 10
              }}>
                🪸 View Coral Queries
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 40 }}>🛡️</div>
              <div style={{ fontSize: 18, color: "#e0e0f0", fontWeight: 700 }}>SupplyGuard</div>
              <div style={{ fontSize: 13, color: "#555", textAlign: "center", maxWidth: 320 }}>
                Select a supplier to analyze risk signals and run Claude AI briefing
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {[["🗄️", "Supabase", "#3ecf8e"], ["🚢", "AfterShip", "#7c3aed"], ["📊", "Sheets", "#0f9d58"], ["🌍", "GDACS", "#ef4444"]].map(([icon, label, color]) => (
                  <span key={label} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: color + "15", color, border: `1px solid ${color}30` }}>
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
              {/* Supplier header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#e0e0f0" }}>{selected.flag} {selected.name}</div>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{selected.category} · {selected.country}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <ScoreRing score={selected.score} risk={selected.risk} size={80} />
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: recColors[selected.recommendation],
                      background: recColors[selected.recommendation] + "22",
                      border: `1px solid ${recColors[selected.recommendation]}44`,
                      borderRadius: 6, padding: "4px 12px", marginBottom: 4
                    }}>
                      {selected.recommendation}
                    </div>
                    <div style={{ fontSize: 10, color: "#555", maxWidth: 180, lineHeight: 1.4 }}>{selected.recDetail}</div>
                  </div>
                </div>
              </div>

              {/* Breakdown bars */}
              <div style={{ background: "#0d0d1a", border: "1px solid #1e1e2e", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.1em", marginBottom: 10 }}>SCORE BREAKDOWN</div>
                <BreakdownBar label="Shipment" value={selected.breakdown.shipment} icon="🚢" />
                <BreakdownBar label="Compliance" value={selected.breakdown.compliance} icon="📋" />
                <BreakdownBar label="Audit" value={selected.breakdown.audit} icon="🔍" />
                <BreakdownBar label="Geo Risk" value={selected.breakdown.geo} icon="🌍" />
              </div>

              {/* Signal blocks */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                {Object.entries(selected.signals).map(([key, sig]) => (
                  <div key={key} style={{
                    background: "#0d0d1a", border: `1px solid ${signalLevelColor[sig.level]}33`,
                    borderRadius: 8, padding: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>{sig.icon} {key}</span>
                      <span style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 3, fontFamily: "monospace",
                        background: signalLevelColor[sig.level] + "22",
                        color: signalLevelColor[sig.level],
                        border: `1px solid ${signalLevelColor[sig.level]}44`
                      }}>{sig.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.5 }}>{sig.detail}</div>
                  </div>
                ))}
              </div>

              {/* Claude AI Analysis */}
              <div style={{ background: "#0d0d1a", border: "1px solid #7c3aed33", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>✦ Claude AI Risk Brief</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                      Using: {sources.filter(s => s.enabled).map(s => s.label).join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => runAnalysis(selected)}
                    disabled={false}
                    style={{
                      padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: streaming ? "#ff444422" : "#7c3aed",
                      color: streaming ? "#ff4444" : "#fff",
                      border: streaming ? "1px solid #ff444444" : "none",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    {streaming ? (
                      <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Stop</>
                    ) : (
                      <>▶ Analyze</>
                    )}
                  </button>
                </div>

                {analysis ? (
                  <div style={{ minHeight: 80 }}>
                    {formatAnalysis(analysis)}
                    {streaming && (
                      <span style={{ display: "inline-block", width: 6, height: 12, background: "#a78bfa", animation: "pulse 0.8s infinite", verticalAlign: "middle" }} />
                    )}
                  </div>
                ) : (
                  <div style={{ color: "#333", fontSize: 12, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                    Press ▶ Analyze to generate an AI risk brief for this supplier
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCoral && <CoralModal onClose={() => setShowCoral(false)} gdacsData={gdacsData} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
}
