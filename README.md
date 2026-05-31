<div align="center">

```
███████╗██╗   ██╗██████╗ ██████╗ ██╗  ██╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗
██╔════╝██║   ██║██╔══██╗██╔══██╗██║  ╚██╗ ██╔╝██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
███████╗██║   ██║██████╔╝██████╔╝██║   ╚████╔╝ ██║  ███╗██║   ██║███████║██████╔╝██║  ██║
╚════██║██║   ██║██╔═══╝ ██╔═══╝ ██║    ╚██╔╝  ██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║
███████║╚██████╔╝██║     ██║     ███████╗██║   ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
╚══════╝ ╚═════╝ ╚═╝     ╚═╝     ╚══════╝╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
```

### 🛡️ AI-Powered Supply Chain Risk Intelligence — Built on Coral

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet_4-D4A96A?style=for-the-badge)](https://anthropic.com)
[![Coral](https://img.shields.io/badge/Coral-4_Sources-FF6B6B?style=for-the-badge)](https://coral.ai)
[![GDACS](https://img.shields.io/badge/GDACS-Live_Feed-22C55E?style=for-the-badge)](https://gdacs.org)

---

*Cross-source supply chain signals × Claude AI streaming × real-time geo disaster alerts*

</div>

---

## ⚡ Quickstart

> **Prerequisites:** Node.js 18+ and npm installed

```bash
# 1. Clone the repo
git clone https://github.com/sabbellasri/SupplyGuard.git
cd SupplyGuard/supplyguard

# 2. Install dependencies
npm install

# 3. Launch
npm run dev
```

**Open** → [http://localhost:5173](http://localhost:5173)

That's it. No API keys required to run. Claude AI analysis works in demo mode out of the box.

---

## 🪸 What is SupplyGuard?

SupplyGuard is a **Coral-native supply chain risk monitor** that joins signals from four live data sources and runs them through Claude AI to generate instant risk briefs on any supplier.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  🗄️ Supabase │    │  🚢 AfterShip│    │  📊 G.Sheets │    │  🌍  GDACS  │
│  Supplier   │    │  Shipment   │    │  Audit Logs │    │  Disaster   │
│  Master DB  │    │  Tracking   │    │  & Flags    │    │  Live Feed  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       └──────────────────┴──────────────────┴──────────────────┘
                                    │
                            🪸 Coral JOIN
                                    │
                          ┌─────────▼─────────┐
                          │   Risk Score 0–100 │
                          │   Signal Breakdown  │
                          │   Claude AI Brief   │
                          └────────────────────┘
```

---

## 🎯 Features

| Feature | Description |
|---|---|
| **4-Source Coral JOIN** | Supabase × AfterShip × Google Sheets × GDACS combined into one risk score |
| **Live Connector Panel** | Toggle each data source on/off — Claude's analysis adapts in real time |
| **Claude AI Streaming** | Press Analyze → watch the risk brief stream token by token |
| **GDACS Live Feed** | Real-time geo disaster alerts correlated to supplier locations |
| **Score Ring** | Composite 0–100 health score with per-signal breakdown bars |
| **Signal Blocks** | Shipment status, compliance certs, audit results, geo risk — all in one view |
| **Risk Recommendations** | SUSPEND / ESCALATE / MONITOR / APPROVED with plain-English reasoning |
| **Coral Query Viewer** | See the exact SQL/API queries powering every data source |
| **Toast Notifications** | Live feedback as connectors toggle and queries fire |

---

## 🗂️ Project Structure

```
supplyguard/
├── src/
│   └── App.jsx          ← Everything. One file, zero dependencies beyond React.
├── index.html
├── vite.config.js
└── package.json
```

---

## 🔌 Data Sources (Coral Architecture)

### 🗄️ Supabase — Supplier Master + Compliance
```sql
SELECT s.id, s.name, s.country, c.iso9001_expiry, c.audit_score
FROM suppliers s
LEFT JOIN compliance_certs c ON c.supplier_id = s.id
WHERE s.active = true ORDER BY c.audit_score ASC;
```

### 🚢 AfterShip — Shipment Tracking
```
GET /v4/trackings?filter[status]=Exception,InfoReceived
→ Returns: holds, delays, port exceptions per supplier
```

### 📊 Google Sheets — Manual Audit Log
```
=IMPORTRANGE("supplier-audits-2024","Audits!A2:H")
→ Filtered: score < 70 OR critical_findings > 0
```

### 🌍 GDACS — Live Geo Disaster Alerts *(real endpoint)*
```
GET https://www.gdacs.org/xml/rss.xml
→ Parses Orange/Red alerts, correlates to supplier countries
```

---

## 🤖 Claude AI Integration

SupplyGuard calls `claude-sonnet-4-20250514` with streaming enabled. The prompt includes:

- Supplier name, country, category
- Composite risk score + per-signal breakdown
- Which Coral connectors are currently active
- All signal details from the four sources

Claude returns a structured **3-part risk brief**:
1. **SITUATION** — core risk in plain language
2. **CRITICAL FACTORS** — the 2–3 most urgent issues
3. **RECOMMENDED ACTION** — a clear directive

> The analysis changes dynamically as you toggle connectors on/off — Claude always knows which sources are live.

---

## 🚀 Demo Script (Hackathon)

```
1. Load the app → show all 4 connectors live in the sidebar
2. Toggle GDACS to 🟢 LIVE → toast fires, open Coral Queries → show real events
3. Click "Shenzhen Apex Electronics" (score: 34, CRITICAL)
4. Hit ▶ Analyze → Claude streams a risk brief live
5. Toggle Supabase OFF → re-analyze
   → Claude brief now says "Using: AfterShip, Sheets, GDACS"
6. Click "Steelform GmbH" (score: 91, HEALTHY) → completely different brief
7. Open 🪸 Coral Queries → walk through the SQL JOIN architecture
```

**Two minutes. Four sources. Live AI. That's the pitch.**

---

## 🏗️ Built With

- **React 18** + **Vite 8** — instant HMR, zero config
- **Anthropic Claude API** — streaming text generation
- **GDACS RSS** — real UN disaster alert feed
- **Coral** — cross-source data JOIN architecture
- Zero UI libraries. Every pixel is hand-coded.

---

<div align="center">

**Built for the Coral Hackathon · May 2026**

*The only supply chain submission. The only GDACS integration. The only 4-source Coral JOIN.*

</div>
