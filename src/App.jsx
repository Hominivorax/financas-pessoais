import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart, LineChart, Line,
} from "recharts";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPA_URL = "https://etqrsfyahxiivyxlpwbs.supabase.co";
const SUPA_KEY = "sb_publishable_VdB7-EOyKVIYl5mgduKhVA_X0U-Sjls";
const supabase = createClient(SUPA_URL, SUPA_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
const MO = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const YEAR = 2026, CUR = 4;
const toYM = i => `${YEAR}-${String(i + 1).padStart(2, "0")}`;
const TODAY_YM = toYM(CUR);
function addM(s, n) {
  const [y, m] = s.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function lbl(s) { const [y, m] = s.split("-"); return `${MO[+m - 1]}/${y.slice(2)}`; }
function hexRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(","); }

// ── Constants ─────────────────────────────────────────────────────────────────
const CATS_EXP = ["Moradia","Obra/Reforma","Alimentação","Transporte","Assinaturas","Prof./Impostos","Seguros","Lazer","Educação Filhos","Doações","Outros"];
const CATS_INC = ["Receita Profissional","Outras Receitas"];
const INVEST_T = ["Renda Fixa","Ações","FIIs","Cripto","Poupança","Tesouro Direto"];

function catExp(n) {
  const l = n.toLowerCase();
  if (/financiamento|aluguel apart|condomín|seguro resid/.test(l)) return "Moradia";
  if (/marcenaria|vidraçar|adriano|ar condic|geladei|microond|aquecedor|box banh|sofá|cama box|iluminaç|rodapé|revestim|instalação|arandela|varal|michelle|viacor|miudez|depósit|cooktop/.test(l)) return "Obra/Reforma";
  if (/enel|vivo|microsoft|amazon prime|netflix|youtube|google one|spotify|claude|estadão|ifood club/.test(l)) return "Assinaturas";
  if (/contabilizei|imposto|apm|crefito|cremesp|consultoria/.test(l)) return "Prof./Impostos";
  if (/prudential|metlife|seguro de vida|seguro veic|ipva|licenc/.test(l)) return "Seguros";
  if (/mercado|ifood\/rest|kobe/.test(l)) return "Alimentação";
  if (/gasolina|pedágio|manutenção veí|barbearia/.test(l)) return "Transporte";
  if (/viagem|cirque/.test(l)) return "Lazer";
  if (/instrumentação/.test(l)) return "Educação Filhos";
  if (/lbv/.test(l)) return "Doações";
  return "Outros";
}

const P = { income: "#4ade80", expense: "#f87171", surplus: "#60a5fa", invest: "#a78bfa", gold: "#d4a843" };
const PIE_C = ["#f59e0b","#60a5fa","#4ade80","#f87171","#a78bfa","#34d399","#fb923c","#e879f9","#38bdf8","#a3e635","#c084fc"];

// ── Seed data (loaded once on first login) ────────────────────────────────────
const DE = [
  ["Financiamento Casa/Familia",[6240,6240,6240,6240,6240,6240,6240,6240,6240,6240,6240,6240]],
  ["Seguro Residencial Santander",[91.86,91.86,91.86,91.86,1007.20,0,0,0,0,0,0,0]],
  ["Contabilizei",[195,195,195,195,195,195,195,195,195,195,195,195]],
  ["Imposto / Pró-labore",[138.59,665.5,1015.7,979.35,550,1023,1023,1023,1023,1023,1023,1023]],
  ["Aluguel Apartamento",[3439.84,3794.84,3794.84,2324.85,0,0,0,0,0,0,0,0]],
  ["Condomínio Vaga Garagem",[92.93,92.93,92.93,92.93,0,0,0,0,0,0,0,0]],
  ["Condomínio Apartamento",[1740.19,1740.19,1580.18,1574.33,0,0,0,0,0,0,0,0]],
  ["Enel",[164.93,95.35,105.36,103.56,130,130,130,130,130,130,130,130]],
  ["Vivo",[178.9,178.9,178.9,178.9,180,180,180,180,180,180,180,180]],
  ["Geladeira",[0,0,594.89,594.89,594.89,594.89,594.89,594.89,594.89,594.89,594.89,594.89]],
  ["Microondas",[0,0,129.63,129.63,129.63,129.63,129.63,129.63,0,0,0,0]],
  ["Instalação Ar Condicionados",[0,0,2079,2079,0,0,0,0,0,0,0,0]],
  ["Aquecedor",[0,0,0,978.35,978.35,978.35,978.35,978.35,978.35,0,0,0]],
  ["Ar condicionados",[1456.3,1456.3,1456.3,1456.3,1456.3,1456.3,1456.3,1456.3,1456.3,0,0,0]],
  ["Adriano Empreiteiro",[7500,3504.25,0,33673.54,0,0,0,0,0,0,0,0]],
  ["Rodapés",[0,0,0,2796.5,0,0,0,0,0,0,0,0]],
  ["Marcenaria",[50000,19292.2,19292.2,19292.2,19292.2,19292.2,19292.2,0,0,0,0,0]],
  ["Vidraçaria",[0,3724.98,3724.98,3724.98,3724.98,0,0,0,0,0,0,0]],
  ["Sofá/Mesa/Cadeiras",[0,0,0,3137.33,3137.33,3137.33,0,0,0,0,0,0]],
  ["Cama Box",[0,0,0,440.45,440.45,440.45,440.45,440.45,440.45,0,0,0]],
  ["Instalação eletros",[0,0,0,109.73,109.73,109.73,109.73,0,0,0,0,0]],
  ["Box Banheiro",[0,0,228.32,228.32,228.32,228.32,0,0,0,0,0,0]],
  ["Varais",[0,0,0,313,313,313,0,0,0,0,0,0]],
  ["Iluminação",[0,909.78,981.78,909.78,909.78,909.78,909.78,909.78,909.78,909.78,909.78,0]],
  ["Miudezas/Diversos da Obra",[0,0,79.09,3768.01,787.09,787.09,787.09,787.09,787.09,0,0,0]],
  ["Revestimento Extra",[0,114.23,114.23,114.23,114.23,114.23,0,0,0,0,0,0]],
  ["Microsoft",[149.75,50,50,48.63,48.63,48.63,48.63,48.63,48.63,48.63,48.63,48.63]],
  ["Michelle Arquiteta",[0,2400,2400,2400,0,0,0,0,0,0,0,0]],
  ["Arandelas",[0,0,0,531.33,531.33,531.33,0,0,0,0,0,0]],
  ["Compra - Cooktop",[0,102.7,102.7,102.7,102.7,102.7,102.7,102.7,0,0,0,0]],
  ["Depósito",[0,173,173,173,173,173,173,0,0,0,0,0]],
  ["Amazon Prime",[41.7,13.9,13.9,13.9,13.9,13.9,13.9,13.9,13.9,13.9,13.9,13.9]],
  ["Netflix",[0,20.9,20.9,20.9,20.9,20.9,20.9,20.9,20.9,20.9,20.9,20.9]],
  ["iFood clube",[0,5.95,5.95,5.95,0,0,0,0,0,0,0,0]],
  ["Youtube Premium",[26.9,26.9,26.9,26.9,26.9,26.9,26.9,26.9,26.9,26.9,26.9,26.9]],
  ["Google One",[12.49,12.49,12.49,12.49,12.49,12.49,12.49,12.49,0,0,0,0]],
  ["Spotify",[40.9,40.9,40.9,40.9,40.9,40.9,40.9,40.9,40.9,40.9,40.9,40.9]],
  ["Claude",[0,0,0,0,110,110,110,110,110,110,110,110]],
  ["Estadão",[0,0,0,0,1.9,1.9,1.9,1.9,1.9,1.9,1.9,1.9]],
  ["APM",[175.85,175.85,175.85,175.85,175.85,175.85,175.85,175.85,175.85,175.85,175.85,175.85]],
  ["CREFITO",[0,432.75,0,0,0,0,0,0,0,0,0,0]],
  ["CREMESP",[75,75,75,0,75,75,75,75,75,75,75,0]],
  ["Consultoria de investimentos",[2491.66,2491.66,2491.66,2491.66,2491.66,2491.66,2491.66,2491.66,0,0,0,0]],
  ["Seguro de vida Metlife",[1312,1312,1312,0,1312,0,0,0,0,0,0,0]],
  ["Prudential 676130",[603.56,603.56,258.33,0,258.33,258.33,258.33,258.33,258.33,258.33,258.33,258.33]],
  ["Prudential 672069",[912.82,292.3,292.3,0,292.3,292.3,292.3,292.3,292.3,292.3,292.3,292.3]],
  ["Seguro Veiculo",[574.54,574.54,323.86,0,323.86,323.86,323.86,323.86,323.86,323.86,323.86,323.86]],
  ["IPVA",[216.7,216.7,216.7,0,216.7,216.7,216.7,216.7,216.7,216.7,216.7,216.7]],
  ["Licenciamento",[15,15,15,0,15,15,15,15,15,15,15,15]],
  ["LBV",[85,85,85,85,85,85,85,85,85,85,85,85]],
  ["Viagem - Delva",[423.4,755.7,793.7,755.7,332.2,332.2,332.2,332.2,332.2,0,0,0]],
  ["Cirque Du Soleil",[0,0,0,1316,1316,1316,0,0,0,0,0,0]],
  ["Instrumentação Thais",[450,0,1350,1300,450,0,0,0,0,0,0,0]],
  ["Instrumentação Jameson",[600,0,450,300,0,0,0,0,0,0,0,0]],
  ["Instrumentação Beatriz",[0,150,400,0,650,0,0,0,0,0,0,0]],
  ["Gasolina",[978.06,572.2,1210.38,1322.63,1246.3,1246.3,1246.3,1246.3,1246.3,1246.3,1246.3,1246.3],true,376.15],
  ["Barbearia",[0,0,0,30,0,0,0,0,0,0,0,0],true,null],
  ["Mercado/Alimentos/Farmácia",[570.54,703.8,1234.75,1734.5,570,768.6,768.6,768.6,608.4,570,570,570],true,857.39],
  ["iFood/Restaurante/Entretenim",[1027.58,229.68,1400.07,1195.21,103.33,103.33,1000,1000,1000,1000,1000,1000],true,893.85],
  ["Pedágio/Estacionamento",[219.8,34.2,200.12,150.37,50,50,50,50,50,50,50,50],true,119.54],
  ["Manutenção Veículo",[5385,0,81.93,65,0,0,0,0,0,0,0,0],true,104.12],
  ["Compras Online Miscelânea",[522.4,122.41,611,547.87,33.4,33.4,33.4,33.4,0,0,0,0],true,30],
  ["Kobe",[1010.24,672.24,956,630,468,468,468,468,468,468,468,468],true,1500.79],
];

const DI = [
  ["Patrick",[23749,23123,24285,25000,25000,23000,23000,23000,23000,23000,23000,23000]],
  ["Jefferson",[6529.19,6166,7155.75,13602.71,11957.5,5000,5000,5000,5000,5000,5000,5000]],
  ["Adiney",[0,2675,6653.87,4589,23951.37,2000,2000,2000,2000,2000,2000,2000]],
  ["Marcos",[5397.85,6400.56,4585.66,4741.56,5000,5000,5000,5000,5000,5000,5000,5000]],
  ["CEDIG",[4235,3520,0,0,0,0,0,0,0,0,0,0]],
  ["Outros",[5036.29,4231.02,17638.04,40361.96,3072.66,0,0,0,0,0,0,0]],
  ["Hosp. Leonor Mendes",[2800,0,2800,700,2800,2800,2800,2800,2800,2800,2800,2800]],
];

function buildSeedRows(userId) {
  const rows = [];
  DE.forEach(([nm, vs, isVar, realM]) => {
    for (let i = 0; i < 12; i++) {
      let amount, confirmed;
      if (isVar) {
        if (i === CUR && realM != null) { amount = realM; confirmed = true; }
        else { amount = vs[i]; confirmed = i < CUR; }
      } else { amount = vs[i]; confirmed = i <= CUR; }
      if (!amount) continue;
      rows.push({ user_id: userId, type: "expense", cat: catExp(nm), amount: Math.round(amount * 100) / 100, ym: toYM(i), note: nm, confirmed, is_var: !!isVar });
    }
  });
  DI.forEach(([nm, vs]) => {
    for (let i = 0; i < 12; i++) {
      const amount = vs[i]; if (!amount) continue;
      rows.push({ user_id: userId, type: "income", cat: nm === "Outros" ? "Outras Receitas" : "Receita Profissional", amount: Math.round(amount * 100) / 100, ym: toYM(i), note: nm, confirmed: i <= CUR, is_var: false });
    }
  });
  return rows;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const card  = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 22px" };
const inp   = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 11px", color: "#e5e0d5", fontSize: 13, width: "100%", outline: "none", boxSizing: "border-box" };
const sel   = { background: "rgba(12,12,18,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 11px", color: "#e5e0d5", fontSize: 13, width: "100%", outline: "none", cursor: "pointer", boxSizing: "border-box" };
const th    = { textAlign: "left", color: "#555", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, padding: "7px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" };
const td    = { padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle" };
const secT  = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: P.gold, marginBottom: 12 };
const fGrp  = { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 90 };
const fLbl  = { fontSize: 10, color: "#666", letterSpacing: 1, textTransform: "uppercase" };
const row   = { display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 };
const btn   = (c = P.gold) => ({ background: `linear-gradient(135deg,${c},${c}bb)`, border: "none", borderRadius: 8, padding: "9px 16px", color: "#0a0a0f", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" });
const btnD  = { background: "transparent", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 6, padding: "3px 8px", color: "#f87171", fontSize: 11, cursor: "pointer" };
const bdg   = (c) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `rgba(${hexRgb(c)},0.15)`, color: c, border: `1px solid rgba(${hexRgb(c)},0.25)` });
const statC = (c) => ({ background: `linear-gradient(135deg,rgba(${hexRgb(c)},0.08),rgba(0,0,0,0.3))`, border: `1px solid rgba(${hexRgb(c)},0.25)`, borderRadius: 14, padding: "16px 20px" });

const CTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(10,10,15,0.97)", border: "1px solid rgba(212,168,67,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#e5e0d5" }}>
      <p style={{ color: P.gold, fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: "2px 0" }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("E-mail ou senha incorretos.");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ ...card, width: 360, padding: "40px 36px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, background: `linear-gradient(90deg,${P.gold},#f0d080)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
            ◈ FinançasPro
          </div>
          <div style={{ fontSize: 13, color: "#555" }}>Acesse sua conta</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={fGrp}>
            <label style={fLbl}>E-mail</label>
            <input style={inp} type="email" placeholder="seu@email.com" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <div style={fGrp}>
            <label style={fLbl}>Senha</label>
            <input style={inp} type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          {error && <div style={{ fontSize: 12, color: P.expense, padding: "8px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 8 }}>{error}</div>}
          <button style={{ ...btn(), width: "100%", padding: "12px", fontSize: 14, marginTop: 4 }} onClick={handleLogin} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: P.gold, fontSize: 14 }}>Carregando...</div>
    </div>
  );

  if (!session) return <LoginScreen />;
  return <Dashboard session={session} />;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ session }) {
  const userId = session.user.id;

  const [txs,  setTxs]  = useState([]);
  const [recs, setRecs] = useState([]);
  const [invs, setInvs] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [notif, setNotif] = useState(null);
  const [filterYM, setFilterYM] = useState("all");
  const [expandedCF, setExpandedCF] = useState({});

  const notify = (msg, ok = true) => { setNotif({ msg, ok }); setTimeout(() => setNotif(null), 2800); };

  // ── Load from Supabase ──────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setDbLoading(true);
    const [{ data: t }, { data: r }, { data: i }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("ym"),
      supabase.from("recurrents").select("*").eq("user_id", userId),
      supabase.from("investments").select("*").eq("user_id", userId),
    ]);
    setTxs(t || []); setRecs(r || []); setInvs(i || []);
    setDbLoading(false);
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Seed initial data ───────────────────────────────────────────────────
  const seedData = async () => {
    setSeeding(true);
    const rows = buildSeedRows(userId);
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await supabase.from("transactions").insert(rows.slice(i, i + CHUNK));
    }
    await loadAll();
    setSeeding(false);
    notify("Dados de 2026 carregados com sucesso ✓");
  };

  // ── Form defaults ───────────────────────────────────────────────────────
  const E0 = { type: "expense", cat: "Moradia", amount: "", ym: TODAY_YM, note: "", parcelas: "1" };
  const R0 = { type: "expense", cat: "Moradia", amount: "", startYM: TODAY_YM, endYM: addM(TODAY_YM, 11), note: "" };
  const I0 = { type: "Renda Fixa", name: "", amount: "", ym: TODAY_YM, returnRate: "" };
  const [txF, setTxF] = useState(E0);
  const [recF, setRecF] = useState(R0);
  const [invF, setInvF] = useState(I0);

  // ── Computed ────────────────────────────────────────────────────────────
  const allE = useMemo(() => {
    const es = [...txs];
    recs.forEach(r => {
      let ym = r.start_ym;
      while (ym <= r.end_ym) {
        const exists = txs.some(t => t.recur_id === r.id && t.ym === ym);
        if (!exists) es.push({ id: `rec_${r.id}_${ym}`, type: r.type, cat: r.cat, amount: r.amount, ym, note: r.note, confirmed: ym < TODAY_YM, isRec: true, recurId: r.id });
        ym = addM(ym, 1);
      }
    });
    return es;
  }, [txs, recs]);

  const allYMs = useMemo(() => [...new Set(allE.map(e => e.ym))].sort(), [allE]);
  const filtered = useMemo(() => filterYM === "all" ? allE : allE.filter(e => e.ym === filterYM), [allE, filterYM]);

  const totInc   = filtered.filter(e => e.type === "income").reduce((s, e) => s + +e.amount, 0);
  const totExp   = filtered.filter(e => e.type === "expense").reduce((s, e) => s + +e.amount, 0);
  const surplus  = totInc - totExp;
  const totInv   = invs.reduce((s, i) => s + +i.amount, 0);

  const monthSummary = useMemo(() => {
    const map = {};
    allE.forEach(e => {
      if (!map[e.ym]) map[e.ym] = { ym: e.ym, In: 0, Out: 0 };
      if (e.type === "income") map[e.ym].In += +e.amount;
      else map[e.ym].Out += +e.amount;
    });
    return Object.values(map).sort((a, b) => a.ym.localeCompare(b.ym))
      .map(d => ({ ...d, label: lbl(d.ym), Saldo: Math.max(0, d.In - d.Out) }));
  }, [allE]);

  const expCats = useMemo(() => {
    const map = {};
    filtered.filter(e => e.type === "expense").forEach(e => { map[e.cat] = (map[e.cat] || 0) + +e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const investProj = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => ({
      mes: MO[(new Date().getMonth() + m) % 12],
      Patrimônio: Math.round(invs.reduce((s, i) => s + +i.amount * Math.pow(1 + +i.return_rate / 100 / 12, m + 1), 0)),
    }))
  , [invs]);

  const cashFlow = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => addM(TODAY_YM, i)).map(ym => {
      const entries = allE.filter(e => e.ym === ym);
      const income  = entries.filter(e => e.type === "income").reduce((s, e) => s + +e.amount, 0);
      const expense = entries.filter(e => e.type === "expense").reduce((s, e) => s + +e.amount, 0);
      const catMap  = {};
      entries.filter(e => e.type === "expense").forEach(e => { catMap[e.cat] = (catMap[e.cat] || 0) + +e.amount; });
      const cats = Object.entries(catMap).map(([c, v]) => ({ cat: c, v })).sort((a, b) => b.v - a.v);
      return { ym, label: lbl(ym), income, expense, saldo: income - expense, entries, cats };
    })
  , [allE]);

  // ── CRUD ────────────────────────────────────────────────────────────────
  const addTx = async () => {
    const amt = +txF.amount, parc = Math.max(1, parseInt(txF.parcelas) || 1);
    if (!amt || !txF.ym) return notify("Preencha valor e mês.", false);
    const parcAmt = +(amt / parc).toFixed(2);
    const gid = parc > 1 ? `G${Date.now()}` : null;
    const rows = Array.from({ length: parc }, (_, i) => ({
      user_id: userId, type: txF.type, cat: txF.cat, amount: parcAmt,
      ym: addM(txF.ym, i), note: parc > 1 ? `${txF.note} ${i + 1}/${parc}` : txF.note,
      confirmed: addM(txF.ym, i) <= TODAY_YM,
      i_group: gid, i_num: parc > 1 ? i + 1 : null, i_total: parc > 1 ? parc : null,
    }));
    await supabase.from("transactions").insert(rows);
    await loadAll();
    setTxF(E0);
    notify(parc > 1 ? `${parc} parcelas lançadas ✓` : "Lançamento adicionado ✓");
  };

  const delTx = async (id) => {
    await supabase.from("transactions").delete().eq("id", id);
    setTxs(p => p.filter(t => t.id !== id));
  };

  const addRec = async () => {
    if (!+recF.amount || !recF.note) return notify("Preencha todos os campos.", false);
    await supabase.from("recurrents").insert({ user_id: userId, type: recF.type, cat: recF.cat, amount: +recF.amount, start_ym: recF.startYM, end_ym: recF.endYM, note: recF.note });
    await loadAll(); setRecF(R0); notify("Recorrente criado ✓");
  };

  const delRec = async (id) => {
    await supabase.from("recurrents").delete().eq("id", id);
    setRecs(p => p.filter(r => r.id !== id));
  };

  const addInv = async () => {
    if (!invF.name || !invF.amount || !invF.returnRate) return notify("Preencha todos os campos.", false);
    await supabase.from("investments").insert({ user_id: userId, type: invF.type, name: invF.name, amount: +invF.amount, ym: invF.ym, return_rate: +invF.returnRate });
    await loadAll(); setInvF(I0); notify("Investimento registrado ✓");
  };

  const delInv = async (id) => {
    await supabase.from("investments").delete().eq("id", id);
    setInvs(p => p.filter(i => i.id !== id));
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "lancamentos", label: "Lançamentos" },
    { id: "recorrentes", label: "Recorrentes" },
    { id: "fluxo", label: "Fluxo de Caixa" },
    { id: "investimentos", label: "Investimentos" },
    { id: "graficos", label: "Gráficos" },
  ];

  if (dbLoading) return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ color: P.gold, fontSize: 14 }}>Carregando seus dados...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e5e0d5" }}>

      {notif && <div style={{ position: "fixed", top: 66, right: 22, zIndex: 999, padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: notif.ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${notif.ok ? "#4ade80" : "#f87171"}`, color: notif.ok ? "#4ade80" : "#f87171" }}>{notif.msg}</div>}

      <header style={{ background: "linear-gradient(135deg,#0d0d15,#12121e)", borderBottom: "1px solid rgba(212,168,67,0.2)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 17, fontWeight: 800, background: `linear-gradient(90deg,${P.gold},#f0d080)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>◈ FinançasPro</span>
        <nav style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: tab === t.id ? "rgba(212,168,67,0.15)" : "transparent", color: tab === t.id ? P.gold : "#666", borderBottom: tab === t.id ? `2px solid ${P.gold}` : "2px solid transparent", transition: "all 0.2s" }}>{t.label}</button>
          ))}
        </nav>
        <button onClick={logout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 12px", color: "#555", fontSize: 12, cursor: "pointer" }}>Sair</button>
      </header>

      <main style={{ padding: "20px 24px", maxWidth: 1500, margin: "0 auto" }}>

        {/* Seed banner */}
        {txs.length === 0 && !seeding && (
          <div style={{ ...card, marginBottom: 16, background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, color: P.gold, marginBottom: 4 }}>Banco de dados vazio</div>
              <div style={{ fontSize: 12, color: "#666" }}>Clique para carregar todos os seus dados de 2026 no banco.</div>
            </div>
            <button style={btn()} onClick={seedData}>Carregar dados de 2026</button>
          </div>
        )}
        {seeding && (
          <div style={{ ...card, marginBottom: 16, textAlign: "center", color: P.gold, fontSize: 13 }}>
            ⏳ Carregando dados no banco... aguarde.
          </div>
        )}

        {/* ═══ DASHBOARD ══════════════════════════════════════════════════ */}
        {tab === "dashboard" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Período:</span>
            <select style={{ ...sel, width: 150 }} value={filterYM} onChange={e => setFilterYM(e.target.value)}>
              <option value="all">Ano todo (2026)</option>
              {allYMs.map(m => <option key={m} value={m}>{lbl(m)}</option>)}
            </select>
            <span style={{ fontSize: 11, color: "#444" }}>✅ Confirmado &nbsp;|&nbsp; 🔵 Previsto</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
            {[
              { label: "Receitas", value: totInc, color: P.income, sub: "no período" },
              { label: "Despesas", value: totExp, color: P.expense, sub: "no período" },
              { label: "Excedente", value: surplus, color: surplus >= 0 ? P.surplus : P.expense, sub: "para investir" },
              { label: "Patrimônio Inv.", value: totInv, color: P.invest, sub: `${invs.length} aplicações` },
            ].map(c => (
              <div key={c.label} style={statC(c.color)}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#555", marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color, lineHeight: 1 }}>{fmt(c.value)}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={card}>
              <div style={secT}>Receitas × Despesas — 2026</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthSummary} barGap={2}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} tickFormatter={v => "R$" + (v / 1000).toFixed(0) + "k"} />
                  <Tooltip content={<CTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#777" }} />
                  <Bar dataKey="In" name="Receitas" fill={P.income} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Out" name="Despesas" fill={P.expense} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Saldo" name="Excedente" fill={P.surplus} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={card}>
              <div style={secT}>Despesas por Categoria</div>
              {expCats.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={expCats} cx="50%" cy="50%" innerRadius={55} outerRadius={88} dataKey="value" nameKey="name" paddingAngle={2}
                      label={({ name, percent }) => percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ""} labelLine={false} style={{ fontSize: 9, fill: "#999" }}>
                      {expCats.map((_, i) => <Cell key={i} fill={PIE_C[i % PIE_C.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: "center", color: "#444", paddingTop: 80, fontSize: 13 }}>Sem despesas</div>}
            </div>
          </div>

          <div style={{ ...card, marginTop: 14 }}>
            <div style={secT}>Breakdown por Categoria</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
              {expCats.map((c, i) => (
                <div key={c.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid rgba(${hexRgb(PIE_C[i % PIE_C.length])},0.2)` }}>
                  <span style={{ fontSize: 12, color: "#999" }}>{c.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: PIE_C[i % PIE_C.length] }}>{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ═══ LANÇAMENTOS ════════════════════════════════════════════════ */}
        {tab === "lancamentos" && <>
          <div style={card}>
            <div style={secT}>Novo Lançamento</div>
            <div style={row}>
              <div style={fGrp}>
                <label style={fLbl}>Tipo</label>
                <select style={sel} value={txF.type} onChange={e => setTxF(f => ({ ...f, type: e.target.value, cat: e.target.value === "income" ? CATS_INC[0] : CATS_EXP[0] }))}>
                  <option value="income">Receita</option><option value="expense">Despesa</option>
                </select>
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Categoria</label>
                <select style={sel} value={txF.cat} onChange={e => setTxF(f => ({ ...f, cat: e.target.value }))}>
                  {(txF.type === "income" ? CATS_INC : CATS_EXP).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Valor Total (R$)</label>
                <input style={inp} type="number" placeholder="0,00" value={txF.amount} onChange={e => setTxF(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div style={{ ...fGrp, maxWidth: 100 }}>
                <label style={fLbl}>Parcelas</label>
                <input style={inp} type="number" min="1" max="60" value={txF.parcelas} onChange={e => setTxF(f => ({ ...f, parcelas: e.target.value }))} />
              </div>
              <div style={fGrp}>
                <label style={fLbl}>1ª Parcela em</label>
                <input style={inp} type="month" value={txF.ym} onChange={e => setTxF(f => ({ ...f, ym: e.target.value }))} />
              </div>
              <div style={{ ...fGrp, flex: 2 }}>
                <label style={fLbl}>Descrição</label>
                <input style={inp} placeholder="Ex: Sofá novo, Bônus..." value={txF.note} onChange={e => setTxF(f => ({ ...f, note: e.target.value }))} />
              </div>
              <button style={btn()} onClick={addTx}>{+txF.parcelas > 1 ? `+ ${txF.parcelas}x` : "+ Adicionar"}</button>
            </div>
            {+txF.parcelas > 1 && +txF.amount > 0 && (
              <div style={{ fontSize: 12, color: "#60a5fa", padding: "7px 12px", background: "rgba(96,165,250,0.07)", borderRadius: 8 }}>
                💳 {txF.parcelas}x de <strong>{fmt(+txF.amount / +txF.parcelas)}</strong> a partir de <strong>{lbl(txF.ym)}</strong>
              </div>
            )}
          </div>

          <div style={{ ...card, marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={secT}>Lançamentos</div>
              <select style={{ ...sel, width: 150 }} value={filterYM} onChange={e => setFilterYM(e.target.value)}>
                <option value="all">Todos os meses</option>
                {allYMs.map(m => <option key={m} value={m}>{lbl(m)}</option>)}
              </select>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr>{["Mês","Tipo","Categoria","Descrição","Valor","Status",""].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {[...filtered].filter(e => !e.isRec).sort((a, b) => b.ym.localeCompare(a.ym)).map(e => (
                  <tr key={e.id} style={{ opacity: e.confirmed ? 1 : 0.72 }}>
                    <td style={{ ...td, color: "#555", fontSize: 11 }}>{lbl(e.ym)}</td>
                    <td style={td}><span style={bdg(e.type === "income" ? P.income : P.expense)}>{e.type === "income" ? "↑" : "↓"}</span></td>
                    <td style={{ ...td, color: "#888", fontSize: 11 }}>{e.cat}</td>
                    <td style={{ ...td, color: "#aaa" }}>{e.note}{e.i_total && <span style={{ fontSize: 10, color: "#60a5fa", marginLeft: 4 }}>[{e.i_num}/{e.i_total}]</span>}</td>
                    <td style={{ ...td, fontWeight: 700, color: e.type === "income" ? P.income : P.expense }}>{e.type === "income" ? "+" : "-"}{fmt(e.amount)}</td>
                    <td style={td}>{e.confirmed ? <span style={{ fontSize: 11, color: "#4ade80" }}>✓</span> : <span style={{ fontSize: 11, color: "#60a5fa" }}>◌</span>}</td>
                    <td style={td}><button style={btnD} onClick={() => delTx(e.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 20, marginTop: 10, padding: "8px 10px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: 12, color: "#666" }}>Receitas: <strong style={{ color: P.income }}>{fmt(totInc)}</strong></span>
              <span style={{ fontSize: 12, color: "#666" }}>Despesas: <strong style={{ color: P.expense }}>{fmt(totExp)}</strong></span>
              <span style={{ fontSize: 12, color: "#666" }}>Saldo: <strong style={{ color: surplus >= 0 ? P.surplus : P.expense }}>{fmt(surplus)}</strong></span>
            </div>
          </div>
        </>}

        {/* ═══ RECORRENTES ════════════════════════════════════════════════ */}
        {tab === "recorrentes" && <>
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={secT}>Novo Lançamento Fixo / Recorrente</div>
            <div style={row}>
              <div style={fGrp}>
                <label style={fLbl}>Tipo</label>
                <select style={sel} value={recF.type} onChange={e => setRecF(f => ({ ...f, type: e.target.value, cat: e.target.value === "income" ? CATS_INC[0] : CATS_EXP[0] }))}>
                  <option value="income">Receita</option><option value="expense">Despesa</option>
                </select>
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Categoria</label>
                <select style={sel} value={recF.cat} onChange={e => setRecF(f => ({ ...f, cat: e.target.value }))}>
                  {(recF.type === "income" ? CATS_INC : CATS_EXP).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Valor/mês (R$)</label>
                <input style={inp} type="number" placeholder="0,00" value={recF.amount} onChange={e => setRecF(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Início</label>
                <input style={inp} type="month" value={recF.startYM} onChange={e => setRecF(f => ({ ...f, startYM: e.target.value }))} />
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Até</label>
                <input style={inp} type="month" value={recF.endYM} onChange={e => setRecF(f => ({ ...f, endYM: e.target.value }))} />
              </div>
              <div style={{ ...fGrp, flex: 2 }}>
                <label style={fLbl}>Descrição</label>
                <input style={inp} placeholder="Ex: Salário, Aluguel..." value={recF.note} onChange={e => setRecF(f => ({ ...f, note: e.target.value }))} />
              </div>
              <button style={btn(P.invest)} onClick={addRec}>+ Criar</button>
            </div>
          </div>
          <div style={card}>
            <div style={secT}>Recorrentes Cadastrados</div>
            {recs.length === 0
              ? <div style={{ textAlign: "center", color: "#444", padding: 32 }}>Nenhum recorrente cadastrado ainda.</div>
              : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{["Tipo","Cat.","Valor/mês","Período","Descrição",""].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {recs.map(r => (
                      <tr key={r.id}>
                        <td style={td}><span style={bdg(r.type === "income" ? P.income : P.expense)}>{r.type === "income" ? "Receita" : "Despesa"}</span></td>
                        <td style={{ ...td, color: "#888" }}>{r.cat}</td>
                        <td style={{ ...td, fontWeight: 700, color: r.type === "income" ? P.income : P.expense }}>{fmt(r.amount)}</td>
                        <td style={{ ...td, color: "#555", fontSize: 11 }}>{lbl(r.start_ym)} → {lbl(r.end_ym)}</td>
                        <td style={{ ...td, color: "#aaa" }}>{r.note}</td>
                        <td style={td}><button style={btnD} onClick={() => delRec(r.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </div>
        </>}

        {/* ═══ FLUXO DE CAIXA ═════════════════════════════════════════════ */}
        {tab === "fluxo" && <>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>
            Próximos 6 meses · <span style={{ color: "#4ade80" }}>✓ Confirmado</span> · <span style={{ color: "#60a5fa" }}>◌ Previsto</span>
          </div>
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={secT}>Resumo — Próximos 6 Meses</div>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={cashFlow}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} tickFormatter={v => "R$" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#777" }} />
                <Bar dataKey="income" name="Receitas" fill={P.income} radius={[3, 3, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill={P.expense} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {cashFlow.map(cf => (
            <div key={cf.ym} style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setExpandedCF(p => ({ ...p, [cf.ym]: !p[cf.ym] }))}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: cf.ym === TODAY_YM ? P.gold : "#ddd" }}>
                    {cf.label} {cf.ym === TODAY_YM && <span style={{ fontSize: 11, color: P.gold }}>(mês atual)</span>}
                  </span>
                  <span style={{ fontSize: 12, color: P.income }}>+{fmt(cf.income)}</span>
                  <span style={{ fontSize: 12, color: P.expense }}>−{fmt(cf.expense)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cf.saldo >= 0 ? P.surplus : P.expense }}>=&nbsp;{fmt(cf.saldo)}</span>
                </div>
                <span style={{ fontSize: 12, color: "#555" }}>{expandedCF[cf.ym] ? "▲" : "▼"}</span>
              </div>
              {expandedCF[cf.ym] && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 6, marginBottom: 12 }}>
                    {cf.cats.map((c, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: 11, color: "#888" }}>{c.cat}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: P.expense }}>{fmt(c.v)}</span>
                      </div>
                    ))}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead><tr>{["Categoria","Descrição","Valor","Status"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {cf.entries.sort((a, b) => a.type.localeCompare(b.type) || b.amount - a.amount).map(e => (
                        <tr key={e.id} style={{ opacity: e.confirmed ? 1 : 0.7 }}>
                          <td style={{ ...td, color: "#888" }}>{e.cat}</td>
                          <td style={{ ...td, color: "#aaa" }}>{e.note}{e.i_total && <span style={{ color: "#60a5fa", marginLeft: 4 }}>[{e.i_num}/{e.i_total}]</span>}</td>
                          <td style={{ ...td, fontWeight: 700, color: e.type === "income" ? P.income : P.expense }}>{e.type === "income" ? "+" : "-"}{fmt(e.amount)}</td>
                          <td style={td}>{e.confirmed ? <span style={{ color: "#4ade80" }}>✓</span> : <span style={{ color: "#60a5fa" }}>◌</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </>}

        {/* ═══ INVESTIMENTOS ══════════════════════════════════════════════ */}
        {tab === "investimentos" && <>
          <div style={card}>
            <div style={secT}>Registrar Investimento</div>
            <div style={row}>
              <div style={fGrp}>
                <label style={fLbl}>Tipo</label>
                <select style={sel} value={invF.type} onChange={e => setInvF(f => ({ ...f, type: e.target.value }))}>
                  {INVEST_T.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ ...fGrp, flex: 2 }}>
                <label style={fLbl}>Nome / Ticker</label>
                <input style={inp} placeholder="CDB XP, HGLG11, Tesouro IPCA+..." value={invF.name} onChange={e => setInvF(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Valor (R$)</label>
                <input style={inp} type="number" placeholder="0,00" value={invF.amount} onChange={e => setInvF(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Retorno a.a. (%)</label>
                <input style={inp} type="number" placeholder="12.5" value={invF.returnRate} onChange={e => setInvF(f => ({ ...f, returnRate: e.target.value }))} />
              </div>
              <div style={fGrp}>
                <label style={fLbl}>Data do Aporte</label>
                <input style={inp} type="month" value={invF.ym} onChange={e => setInvF(f => ({ ...f, ym: e.target.value }))} />
              </div>
              <button style={btn(P.invest)} onClick={addInv}>+ Registrar</button>
            </div>
          </div>
          {invs.length > 0 && <div style={{ ...card, marginTop: 14 }}>
            <div style={secT}>Carteira</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr>{["Tipo","Nome","Aportado","Retorno a.a.","Projeção 12m",""].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {invs.map(i => (
                  <tr key={i.id}>
                    <td style={td}><span style={bdg(P.invest)}>{i.type}</span></td>
                    <td style={{ ...td, fontWeight: 600, color: "#ccc" }}>{i.name}</td>
                    <td style={{ ...td, fontWeight: 700, color: P.invest }}>{fmt(i.amount)}</td>
                    <td style={{ ...td, color: P.income }}>+{i.return_rate}%</td>
                    <td style={{ ...td, color: P.gold, fontWeight: 700 }}>{fmt(+i.amount * Math.pow(1 + +i.return_rate / 100 / 12, 12))}</td>
                    <td style={td}><button style={btnD} onClick={() => delInv(i.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </>}

        {/* ═══ GRÁFICOS ═══════════════════════════════════════════════════ */}
        {tab === "graficos" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={card}>
              <div style={secT}>Receitas × Despesas (área)</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthSummary}>
                  <defs>
                    <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.income} stopOpacity={0.25} /><stop offset="100%" stopColor={P.income} stopOpacity={0.02} /></linearGradient>
                    <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.expense} stopOpacity={0.25} /><stop offset="100%" stopColor={P.expense} stopOpacity={0.02} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} tickFormatter={v => "R$" + (v / 1000).toFixed(0) + "k"} width={60} />
                  <Tooltip content={<CTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#777" }} />
                  <Area type="monotone" dataKey="In" name="Receitas" stroke={P.income} fill="url(#gI)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Out" name="Despesas" stroke={P.expense} fill="url(#gE)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={card}>
              <div style={secT}>Excedente Mensal</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthSummary}>
                  <defs><linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.surplus} stopOpacity={0.9} /><stop offset="100%" stopColor={P.surplus} stopOpacity={0.3} /></linearGradient></defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} tickFormatter={v => "R$" + (v / 1000).toFixed(0) + "k"} width={60} />
                  <Tooltip content={<CTooltip />} />
                  <Bar dataKey="Saldo" name="Excedente" fill="url(#gS)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={card}>
              <div style={secT}>Evolução de Receitas e Despesas</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthSummary}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} tickFormatter={v => "R$" + (v / 1000).toFixed(0) + "k"} width={60} />
                  <Tooltip content={<CTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#777" }} />
                  <Line type="monotone" dataKey="Out" name="Despesas" stroke={P.expense} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="In" name="Receitas" stroke={P.income} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {invs.length > 0 ? (
              <div style={card}>
                <div style={secT}>Crescimento Projetado dos Investimentos</div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={investProj}>
                    <defs><linearGradient id="gV" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.invest} stopOpacity={0.3} /><stop offset="100%" stopColor={P.invest} stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false} tickFormatter={v => "R$" + (v / 1000).toFixed(0) + "k"} width={70} />
                    <Tooltip content={<CTooltip />} />
                    <Area type="monotone" dataKey="Patrimônio" stroke={P.invest} fill="url(#gV)" strokeWidth={2} dot={{ r: 3, fill: P.invest }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 13, color: "#444", textAlign: "center" }}>Cadastre investimentos para ver o gráfico de crescimento patrimonial.</div>
              </div>
            )}
          </div>
        </>}

      </main>
    </div>
  );
}

