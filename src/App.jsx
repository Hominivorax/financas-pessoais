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
const SEED_YEAR = 2026;                          // ano dos dados históricos
const _now  = new Date();
const YEAR  = _now.getFullYear();                // ano atual real
const CUR   = _now.getMonth();                   // mês atual real (0=Jan)
const toYM  = i => `${SEED_YEAR}-${String(i + 1).padStart(2, "0")}`;  // para dados 2026
const TODAY_YM = `${YEAR}-${String(CUR + 1).padStart(2, "0")}`;       // sempre o mês real
function addM(s, n) {
  const [y, m] = s.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function lbl(s) { const [y, m] = s.split("-"); return `${MO[+m - 1]}/${y.slice(2)}`; }
function hexRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(","); }

// ── Hook: window width ────────────────────────────────────────────────────────
function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CATS_EXP = [
  "Moradia","Obra/Reforma","Alimentação","Transporte","Assinaturas",
  "Impostos","Veículo","Seguros / Plano de Saúde","Lazer",
  "Educação / Filhos","Doações","Aluguel","Condomínio","Água","Luz",
  "Telefone","Outros"
];
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

// ── Palette — brighter, higher contrast ───────────────────────────────────────
const P = {
  income:  "#6ee7a0",  // brighter green
  expense: "#fca5a5",  // brighter red
  surplus: "#93c5fd",  // brighter blue
  invest:  "#c4b5fd",  // brighter purple
  gold:    "#fbbf24",  // brighter gold
  text:    "#f4f0e8",  // bright main text
  sub:     "#c4bfb5",  // bright secondary text
  muted:   "#8a8480",  // muted text
  border:  "rgba(255,255,255,0.12)",
  cardBg:  "rgba(255,255,255,0.05)",
};
const PIE_C = ["#fbbf24","#93c5fd","#6ee7a0","#fca5a5","#c4b5fd","#6ee7b7","#fdba74","#f0abfc","#67e8f9","#bef264","#fb923c"];

// ── Seed data ─────────────────────────────────────────────────────────────────
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
  // Se estamos em 2026, usa o mês real; se passamos de 2026, tudo confirmado
  const curForSeed = YEAR === SEED_YEAR ? CUR : (YEAR > SEED_YEAR ? 11 : -1);
  DE.forEach(([nm, vs, isVar, realM]) => {
    for (let i = 0; i < 12; i++) {
      let amount, confirmed;
      if (isVar) {
        if (i === curForSeed && realM != null) { amount = realM; confirmed = true; }
        else { amount = vs[i]; confirmed = i < curForSeed; }
      } else { amount = vs[i]; confirmed = i <= curForSeed; }
      if (!amount) continue;
      rows.push({ user_id: userId, type: "expense", cat: catExp(nm), amount: Math.round(amount * 100) / 100, ym: toYM(i), note: nm, confirmed, is_var: !!isVar });
    }
  });
  DI.forEach(([nm, vs]) => {
    for (let i = 0; i < 12; i++) {
      const amount = vs[i]; if (!amount) continue;
      rows.push({ user_id: userId, type: "income", cat: nm === "Outros" ? "Outras Receitas" : "Receita Profissional", amount: Math.round(amount * 100) / 100, ym: toYM(i), note: nm, confirmed: i <= curForSeed, is_var: false });
    }
  });
  return rows;
}

// ── Installment summary from seed (for the Parcelas tab) ─────────────────────
// Each entry: name, total months active, first month, last month, monthly value, total value
function buildInstallmentSummary() {
  const result = [];
  DE.forEach(([nm, vs]) => {
    const activeMonths = vs.map((v, i) => ({ i, v })).filter(x => x.v > 0);
    if (activeMonths.length < 2) return; // skip one-off or empty
    const firstI = activeMonths[0].i;
    const lastI  = activeMonths[activeMonths.length - 1].i;
    const monthlyVal = activeMonths[0].v;
    const total = activeMonths.length;
    // CUR dinâmico: só conta como pago se o mês do seed (2026) já passou no calendário real
    const curForSeed = YEAR === SEED_YEAR ? CUR : (YEAR > SEED_YEAR ? 11 : -1);
    const paid  = activeMonths.filter(x => x.i < curForSeed).length;
    const paidInCur = activeMonths.find(x => x.i === curForSeed) ? 1 : 0;
    const paidTotal = paid + paidInCur;
    const remaining = total - paidTotal;
    const totalValue = activeMonths.reduce((s, x) => s + x.v, 0);
    if (remaining <= 0) return; // already finished
    result.push({
      name: nm,
      total,
      paid: paidTotal,
      remaining,
      monthlyVal,
      totalValue,
      firstYM: toYM(firstI),
      lastYM:  toYM(lastI),
      cat: catExp(nm),
    });
  });
  return result.sort((a, b) => b.monthlyVal - a.monthlyVal);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const CTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(10,10,18,0.98)", border: `1px solid rgba(${hexRgb(P.gold)},0.4)`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: P.text }}>
      <p style={{ color: P.gold, fontWeight: 800, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: "3px 0", fontWeight: 600 }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ paid, total, color = P.gold }) {
  const pct = Math.round((paid / total) * 100);
  return (
    <div style={{ width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 7, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}bb)`, height: "100%", borderRadius: 99, transition: "width 0.4s" }} />
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen() {
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
    <div style={{ minHeight: "100vh", background: "#08080f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif", padding: 20 }}>
      <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${P.border}`, borderRadius: 18, padding: "40px 32px", width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 30, fontWeight: 900, background: `linear-gradient(90deg,${P.gold},#fde68a)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>◈ FinançasPro</div>
          <div style={{ fontSize: 14, color: P.sub, fontWeight: 500 }}>Acesse sua conta</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: P.sub, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>E-mail</label>
            <input style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box", fontWeight: 500 }}
              type="email" placeholder="seu@email.com" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: P.sub, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Senha</label>
            <input style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", color: P.text, fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box", fontWeight: 500 }}
              type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          {error && <div style={{ fontSize: 13, color: P.expense, padding: "10px 14px", background: "rgba(252,165,165,0.1)", borderRadius: 10, fontWeight: 600 }}>{error}</div>}
          <button style={{ background: `linear-gradient(135deg,${P.gold},#f59e0b)`, border: "none", borderRadius: 10, padding: "14px", color: "#0a0a0f", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 4 }}
            onClick={handleLogin} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{ minHeight: "100vh", background: "#08080f", display: "flex", alignItems: "center", justifyContent: "center", color: P.gold, fontSize: 15, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>Carregando...</div>;
  if (!session) return <LoginScreen />;
  return <Dashboard session={session} />;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ session }) {
  const userId = session.user.id;
  const width  = useWidth();
  const mob    = width < 768;

  const [txs,  setTxs]  = useState([]);
  const [recs, setRecs] = useState([]);
  const [invs, setInvs] = useState([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [seeding,   setSeeding]   = useState(false);
  const [tab,       setTab]       = useState("dashboard");
  const [notif,     setNotif]     = useState(null);
  const [filterYM,  setFilterYM]  = useState("all");
  const [filterCat, setFilterCat] = useState("all"); // for drill-down
  const [expandedCF,setExpandedCF]= useState({});

  const notify = (msg, ok = true) => { setNotif({ msg, ok }); setTimeout(() => setNotif(null), 3000); };

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

  const seedData = async () => {
    setSeeding(true);
    const rows = buildSeedRows(userId);
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK)
      await supabase.from("transactions").insert(rows.slice(i, i + CHUNK));
    await loadAll(); setSeeding(false);
    notify("Dados de 2026 carregados ✓");
  };

  // ── Forms ──────────────────────────────────────────────────────────────
  const E0 = { modo:"unico", type:"expense", cat:"Moradia", amount:"", ym:TODAY_YM, note:"", parcelas:"2", endYM:addM(TODAY_YM,11) };
  const R0 = { type:"expense", cat:"Moradia", amount:"", startYM:TODAY_YM, endYM:addM(TODAY_YM,11), note:"" };
  const I0 = { type:"Renda Fixa", name:"", amount:"", ym:TODAY_YM, returnRate:"" };
  const [txF, setTxF] = useState(E0);
  const [recF,setRecF]= useState(R0);
  const [invF,setInvF]= useState(I0);

  // ── Computed ───────────────────────────────────────────────────────────
  const allE = useMemo(() => {
    const es = [...txs];
    recs.forEach(r => {
      let ym = r.start_ym;
      while (ym <= r.end_ym) {
        if (!txs.some(t => t.recur_id === r.id && t.ym === ym))
          es.push({ id:`rec_${r.id}_${ym}`, type:r.type, cat:r.cat, amount:r.amount, ym, note:r.note, confirmed:ym < TODAY_YM, isRec:true, recurId:r.id });
        ym = addM(ym, 1);
      }
    });
    return es;
  }, [txs, recs]);

  const allYMs = useMemo(() => [...new Set(allE.map(e => e.ym))].sort(), [allE]);
  const filtered = useMemo(() => {
    let res = filterYM === "all" ? allE : allE.filter(e => e.ym === filterYM);
    if (filterCat !== "all") res = res.filter(e => e.cat === filterCat);
    return res;
  }, [allE, filterYM, filterCat]);

  // Drill-down: click pie slice → go to lançamentos filtered by that cat
  const handlePieDrillDown = (data) => {
    setFilterCat(data.name);
    setFilterYM("all");
    setTab("lancamentos");
  };

  const totInc  = filtered.filter(e => e.type === "income").reduce((s, e) => s + +e.amount, 0);
  const totExp  = filtered.filter(e => e.type === "expense").reduce((s, e) => s + +e.amount, 0);
  const surplus = totInc - totExp;
  const totInv  = invs.reduce((s, i) => s + +i.amount, 0);

  const monthSummary = useMemo(() => {
    const map = {};
    allE.forEach(e => {
      if (!map[e.ym]) map[e.ym] = { ym:e.ym, In:0, Out:0 };
      if (e.type === "income") map[e.ym].In  += +e.amount;
      else                     map[e.ym].Out += +e.amount;
    });
    return Object.values(map).sort((a,b)=>a.ym.localeCompare(b.ym))
      .map(d => ({ ...d, label:lbl(d.ym), Saldo:Math.max(0, d.In - d.Out) }));
  }, [allE]);

  const expCats = useMemo(() => {
    const map = {};
    filtered.filter(e => e.type === "expense").forEach(e => { map[e.cat] = (map[e.cat]||0) + +e.amount; });
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }, [filtered]);

  const cashFlow = useMemo(() =>
    Array.from({length:6},(_,i)=>addM(TODAY_YM,i)).map(ym => {
      const entries = allE.filter(e => e.ym === ym);
      const income  = entries.filter(e=>e.type==="income").reduce((s,e)=>s + +e.amount,0);
      const expense = entries.filter(e=>e.type==="expense").reduce((s,e)=>s + +e.amount,0);
      const catMap  = {};
      entries.filter(e=>e.type==="expense").forEach(e=>{catMap[e.cat]=(catMap[e.cat]||0)+ +e.amount;});
      return { ym, label:lbl(ym), income, expense, saldo:income-expense, entries, cats:Object.entries(catMap).map(([c,v])=>({cat:c,v})).sort((a,b)=>b.v-a.v) };
    })
  , [allE]);

  const investByType = useMemo(() => {
    const types = [...new Set(invs.map(i => i.type))];
    return Array.from({length:12}, (_,m) => {
      const point = { mes: MO[(new Date().getMonth()+m)%12] };
      types.forEach(t => {
        const typeInvs = invs.filter(i => i.type === t);
        point[t] = Math.round(typeInvs.reduce((s,i) => s + +i.amount * Math.pow(1 + +i.return_rate/100/12, m+1), 0));
      });
      return point;
    });
  }, [invs]);

  const investTypes = useMemo(() => [...new Set(invs.map(i => i.type))], [invs]);

  // Parcelas dinâmicas — detecta por i_group (form) E por agrupamento de nota (seed)
  const installSummary = useMemo(() => {
    const results = {};

    // 1) Lançamentos com i_group (adicionados pelo formulário)
    const groups = {};
    txs.filter(t => t.i_group).forEach(t => {
      if (!groups[t.i_group]) groups[t.i_group] = [];
      groups[t.i_group].push(t);
    });
    Object.entries(groups).forEach(([gid, items]) => {
      const sorted = [...items].sort((a,b) => a.ym.localeCompare(b.ym));
      const name = (sorted[0].note || "").replace(/\s\d+\/\d+$/, "");
      results[`g_${gid}`] = { items: sorted, name };
    });

    // 2) Lançamentos sem i_group: agrupa por nota+valor+tipo (dados do seed)
    const noGroup = txs.filter(t => !t.i_group && t.type === "expense");
    const byKey = {};
    noGroup.forEach(t => {
      const key = `${t.note}__${t.amount}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(t);
    });
    Object.entries(byKey).forEach(([key, items]) => {
      if (items.length < 2) return; // não é parcelado se só aparece 1x
      const sorted = [...items].sort((a,b) => a.ym.localeCompare(b.ym));
      results[`k_${key}`] = { items: sorted, name: sorted[0].note };
    });

    // Monta o resumo final
    return Object.values(results).map(({ items, name }) => {
      const total     = items.length;
      const paid      = items.filter(t => t.confirmed).length;
      const remaining = total - paid;
      if (remaining <= 0) return null;
      const monthlyVal = +items[0].amount;
      const totalValue = items.reduce((s,t) => s + +t.amount, 0);
      return {
        name,
        total, paid, remaining, monthlyVal, totalValue,
        firstYM: items[0].ym,
        lastYM:  items[items.length-1].ym,
        cat: items[0].cat,
      };
    }).filter(Boolean).sort((a,b) => b.monthlyVal - a.monthlyVal);
  }, [txs]);

  // ── CRUD ───────────────────────────────────────────────────────────────
  const addTx = async () => {
    const amt = +txF.amount, parc = Math.max(1, parseInt(txF.parcelas)||1);
    if (!amt||!txF.ym) return notify("Preencha valor e mês.",false);
    const parcAmt = +(amt/parc).toFixed(2);
    const gid = parc>1?`G${Date.now()}`:null;
    const rows = Array.from({length:parc},(_,i)=>({
      user_id:userId, type:txF.type, cat:txF.cat, amount:parcAmt,
      ym:addM(txF.ym,i), note:parc>1?`${txF.note} ${i+1}/${parc}`:txF.note,
      confirmed:addM(txF.ym,i)<=TODAY_YM,
      i_group:gid, i_num:parc>1?i+1:null, i_total:parc>1?parc:null,
    }));
    await supabase.from("transactions").insert(rows);
    await loadAll(); setTxF(E0);
    notify(parc>1?`${parc} parcelas lançadas ✓`:"Lançamento adicionado ✓");
  };

  const addRec = async (fromTxF = false) => {
    const f = fromTxF ? { type:txF.type, cat:txF.cat, amount:txF.amount, startYM:txF.ym, endYM:txF.endYM||addM(txF.ym,11), note:txF.note } : recF;
    if (!+f.amount || !f.note) return notify("Preencha valor e descrição.", false);
    await supabase.from("recurrents").insert({ user_id:userId, type:f.type, cat:f.cat, amount:+f.amount, start_ym:f.startYM, end_ym:f.endYM, note:f.note });
    await loadAll();
    if (fromTxF) setTxF(E0); else setRecF(R0);
    notify("Recorrente criado ✓");
  };

  const addInv = async () => {
    if (!invF.name||!invF.amount||!invF.returnRate) return notify("Preencha todos os campos.",false);
    await supabase.from("investments").insert({ user_id:userId, type:invF.type, name:invF.name, amount:+invF.amount, ym:invF.ym, return_rate:+invF.returnRate });
    await loadAll(); setInvF(I0); notify("Investimento registrado ✓");
  };

  const delTx  = async id => { await supabase.from("transactions").delete().eq("id",id); setTxs(p=>p.filter(t=>t.id!==id)); };
  const delRec = async id => { await supabase.from("recurrents").delete().eq("id",id); setRecs(p=>p.filter(r=>r.id!==id)); };
  const delInv = async id => { await supabase.from("investments").delete().eq("id",id); setInvs(p=>p.filter(i=>i.id!==id)); };
  const logout = async () => { await supabase.auth.signOut(); };

  // ── Responsive style helpers ───────────────────────────────────────────
  const grid2 = { display:"grid", gridTemplateColumns: mob?"1fr":"1fr 1fr", gap:14 };
  const grid4 = { display:"grid", gridTemplateColumns: mob?"1fr 1fr":"repeat(4,1fr)", gap:12, marginBottom:18 };

  const S = {
    app:    { minHeight:"100vh", background:"#08080f", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:P.text },
    card:   { background:"rgba(255,255,255,0.05)", border:`1px solid ${P.border}`, borderRadius:14, padding: mob?"14px 16px":"18px 22px" },
    inp:    { background:"rgba(255,255,255,0.08)", border:`1px solid ${P.border}`, borderRadius:10, padding:"10px 13px", color:P.text, fontSize:14, width:"100%", outline:"none", boxSizing:"border-box", fontWeight:500 },
    sel:    { background:"rgba(12,12,20,0.95)", border:`1px solid ${P.border}`, borderRadius:10, padding:"10px 13px", color:P.text, fontSize:14, width:"100%", outline:"none", cursor:"pointer", boxSizing:"border-box", fontWeight:500 },
    th:     { textAlign:"left", color:P.muted, fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:1, padding:"8px 10px", borderBottom:`1px solid ${P.border}` },
    td:     { padding:"9px 10px", borderBottom:"1px solid rgba(255,255,255,0.05)", verticalAlign:"middle", fontSize: mob?12:13 },
    secT:   { fontSize:12, fontWeight:800, textTransform:"uppercase", letterSpacing:2, color:P.gold, marginBottom:14 },
    fGrp:   { display:"flex", flexDirection:"column", gap:5, flex:1, minWidth: mob?140:90 },
    fLbl:   { fontSize:11, color:P.sub, letterSpacing:1, textTransform:"uppercase", fontWeight:700 },
    row:    { display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap", marginBottom:10 },
    btn:    (c=P.gold)=>({ background:`linear-gradient(135deg,${c},${c}cc)`, border:"none", borderRadius:10, padding:"10px 18px", color:"#08080f", fontWeight:800, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }),
    btnD:   { background:"transparent", border:`1px solid rgba(${hexRgb(P.expense)},0.35)`, borderRadius:8, padding:"5px 10px", color:P.expense, fontSize:12, cursor:"pointer", fontWeight:600 },
    bdg:    (c)=>({ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700, background:`rgba(${hexRgb(c)},0.18)`, color:c, border:`1px solid rgba(${hexRgb(c)},0.3)` }),
    statC:  (c)=>({ background:`linear-gradient(135deg,rgba(${hexRgb(c)},0.1),rgba(0,0,0,0.4))`, border:`1px solid rgba(${hexRgb(c)},0.3)`, borderRadius:14, padding: mob?"14px 16px":"16px 20px" }),
  };

  const TABS = [
    {id:"dashboard",   label: mob?"📊":"Dashboard"},
    {id:"lancamentos", label: mob?"📝":"Lançamentos"},
    {id:"parcelas",    label: mob?"💳":"Parcelas"},
    {id:"fluxo",       label: mob?"📅":"Fluxo"},
    {id:"investimentos",label:mob?"📈":"Investimentos"},
    {id:"graficos",    label: mob?"📉":"Gráficos"},
  ];

  if (dbLoading) return <div style={{ minHeight:"100vh", background:"#08080f", display:"flex", alignItems:"center", justifyContent:"center", color:P.gold, fontSize:15, fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>Carregando seus dados...</div>;

  return (
    <div style={S.app}>

      {notif && (
        <div style={{ position:"fixed", top:70, right: mob?12:22, left: mob?12:"auto", zIndex:999, padding:"12px 18px", borderRadius:12, fontSize:14, fontWeight:700,
          background:notif.ok?"rgba(110,231,160,0.12)":"rgba(252,165,165,0.12)",
          border:`1px solid ${notif.ok?P.income:P.expense}`, color:notif.ok?P.income:P.expense,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)", textAlign:"center" }}>
          {notif.msg}
        </div>
      )}

      {/* Header */}
      <header style={{ background:"linear-gradient(135deg,#0d0d18,#12121f)", borderBottom:`1px solid rgba(${hexRgb(P.gold)},0.25)`,
        padding: mob?"0 14px":"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between",
        height:56, position:"sticky", top:0, zIndex:100 }}>
        <span style={{ fontSize: mob?15:18, fontWeight:900, background:`linear-gradient(90deg,${P.gold},#fde68a)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", whiteSpace:"nowrap" }}>
          ◈ {mob?"":"FinançasPro"}
        </span>
        <nav style={{ display:"flex", gap:2, overflowX:"auto", flex:1, margin:"0 10px", justifyContent:"center" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              padding: mob?"6px 10px":"6px 13px", borderRadius:8, border:"none", cursor:"pointer",
              fontSize: mob?13:12, fontWeight:700, whiteSpace:"nowrap",
              background:tab===t.id?"rgba(251,191,36,0.15)":"transparent",
              color:tab===t.id?P.gold:P.muted,
              borderBottom:tab===t.id?`2px solid ${P.gold}`:"2px solid transparent",
              transition:"all 0.2s" }}>
              {t.label}
            </button>
          ))}
        </nav>
        <button onClick={logout} style={{ background:"transparent", border:`1px solid ${P.border}`, borderRadius:8, padding:"5px 10px", color:P.muted, fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>Sair</button>
      </header>

      <main style={{ padding: mob?"14px":"20px 24px", maxWidth:1500, margin:"0 auto" }}>


        {/* ══ DASHBOARD ══════════════════════════════════════════════════ */}
        {tab==="dashboard" && <>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:13, color:P.sub, fontWeight:600 }}>Período:</span>
            <select style={{ ...S.sel, width:160 }} value={filterYM} onChange={e=>setFilterYM(e.target.value)}>
              <option value="all">Ano todo (2026)</option>
              {allYMs.map(m=><option key={m} value={m}>{lbl(m)}</option>)}
            </select>
          </div>

          <div style={grid4}>
            {[
              {label:"Receitas",  value:totInc,  color:P.income,  sub:"no período"},
              {label:"Despesas",  value:totExp,  color:P.expense, sub:"no período"},
              {label:"Excedente", value:surplus, color:surplus>=0?P.surplus:P.expense, sub:"para investir"},
              {label:"Invest.",   value:totInv,  color:P.invest,  sub:`${invs.length} aplicações`},
            ].map(c=>(
              <div key={c.label} style={S.statC(c.color)}>
                <div style={{ fontSize:11, textTransform:"uppercase", letterSpacing:2, color:P.muted, marginBottom:5, fontWeight:700 }}>{c.label}</div>
                <div style={{ fontSize: mob?18:22, fontWeight:900, color:c.color, lineHeight:1 }}>{fmt(c.value)}</div>
                <div style={{ fontSize:12, color:P.sub, marginTop:4, fontWeight:500 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div style={grid2}>
            <div style={S.card}>
              <div style={S.secT}>Receitas × Despesas 2026</div>
              <ResponsiveContainer width="100%" height={mob?200:240}>
                <BarChart data={monthSummary} barGap={2}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"}/>
                  <Tooltip content={<CTooltip/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                  <Bar dataKey="In" name="Receitas" fill={P.income} radius={[4,4,0,0]}/>
                  <Bar dataKey="Out" name="Despesas" fill={P.expense} radius={[4,4,0,0]}/>
                  <Bar dataKey="Saldo" name="Excedente" fill={P.surplus} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={S.card}>
              <div style={S.secT}>Despesas por Categoria <span style={{fontSize:10,color:P.muted,fontWeight:500,textTransform:"none",letterSpacing:0}}>— clique numa fatia para ver os lançamentos</span></div>
              {expCats.length>0?(
                <ResponsiveContainer width="100%" height={mob?200:240}>
                  <PieChart>
                    <Pie data={expCats} cx="50%" cy="50%" innerRadius={mob?45:55} outerRadius={mob?80:90}
                      dataKey="value" nameKey="name" paddingAngle={2}
                      onClick={handlePieDrillDown}
                      style={{cursor:"pointer"}}
                      label={({name,percent})=>percent>0.05?`${(percent*100).toFixed(0)}%`:""}
                      labelLine={false} style={{fontSize:11,fill:P.sub,fontWeight:700,cursor:"pointer"}}>
                      {expCats.map((_,i)=><Cell key={i} fill={PIE_C[i%PIE_C.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v=>fmt(v)}/>
                    <Legend wrapperStyle={{fontSize:11,color:P.sub,fontWeight:600}}/>
                  </PieChart>
                </ResponsiveContainer>
              ):<div style={{textAlign:"center",color:P.muted,paddingTop:80,fontSize:14}}>Sem despesas</div>}
            </div>
          </div>

          {/* Category cards */}
          <div style={{ ...S.card, marginTop:14 }}>
            <div style={S.secT}>Breakdown por Categoria</div>
            <div style={{ display:"grid", gridTemplateColumns: mob?"1fr 1fr":"repeat(auto-fill,minmax(190px,1fr))", gap:8 }}>
              {expCats.map((c,i)=>(
                <div key={c.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,0.04)", border:`1px solid rgba(${hexRgb(PIE_C[i%PIE_C.length])},0.25)` }}>
                  <span style={{ fontSize:12, color:P.sub, fontWeight:600 }}>{c.name}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:PIE_C[i%PIE_C.length] }}>{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ══ LANÇAMENTOS ════════════════════════════════════════════════ */}
        {tab==="lancamentos" && <>
          {/* ── Formulário Unificado ── */}
          <div style={{...S.card, marginBottom:14}}>
            <div style={S.secT}>Novo Lançamento</div>

            {/* Linha 1: Tipo de lançamento (botões visuais) */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[
                {val:"unico",   icon:"💸", label:"Despesa única"},
                {val:"receita", icon:"💰", label:"Receita"},
                {val:"parcelado",icon:"💳",label:"Parcelado"},
                {val:"recorrente",icon:"🔄",label:"Recorrente"},
              ].map(op=>{
                const active = txF.modo === op.val;
                return(
                  <button key={op.val} onClick={()=>setTxF(f=>({...f,modo:op.val,
                    type: op.val==="receita"?"income":"expense",
                    cat:  op.val==="receita"?CATS_INC[0]:CATS_EXP[0],
                    parcelas:"1",
                  }))} style={{
                    display:"flex",alignItems:"center",gap:6,
                    padding:"9px 16px",borderRadius:10,border:"none",cursor:"pointer",
                    fontSize:13,fontWeight:700,transition:"all 0.15s",
                    background: active?`rgba(${hexRgb(
                      op.val==="receita"?P.income:
                      op.val==="parcelado"?P.surplus:
                      op.val==="recorrente"?P.invest:P.expense
                    )},0.18)`:"rgba(255,255,255,0.05)",
                    color: active?(
                      op.val==="receita"?P.income:
                      op.val==="parcelado"?P.surplus:
                      op.val==="recorrente"?P.invest:P.expense
                    ):P.muted,
                    border: active?`1.5px solid rgba(${hexRgb(
                      op.val==="receita"?P.income:
                      op.val==="parcelado"?P.surplus:
                      op.val==="recorrente"?P.invest:P.expense
                    )},0.4)`:`1.5px solid ${P.border}`,
                  }}>
                    <span>{op.icon}</span>{op.label}
                  </button>
                );
              })}
            </div>

            {/* Linha 2: campos dinâmicos conforme modo */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>

              {/* Categoria */}
              <div style={{...S.fGrp,minWidth:160}}>
                <label style={S.fLbl}>Categoria</label>
                <select style={S.sel} value={txF.cat} onChange={e=>setTxF(f=>({...f,cat:e.target.value}))}>
                  {(txF.modo==="receita"?CATS_INC:CATS_EXP).map(c=><option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Valor */}
              <div style={{...S.fGrp,minWidth:130}}>
                <label style={S.fLbl}>
                  {txF.modo==="parcelado"?"Valor Total":"Valor (R$)"}
                </label>
                <input style={S.inp} type="number" placeholder="0,00" value={txF.amount}
                  onChange={e=>setTxF(f=>({...f,amount:e.target.value}))}/>
              </div>

              {/* Parcelas — só para parcelado */}
              {txF.modo==="parcelado"&&(
                <div style={{...S.fGrp,maxWidth:110}}>
                  <label style={S.fLbl}>Nº de Parcelas</label>
                  <input style={S.inp} type="number" min="2" max="60" value={txF.parcelas}
                    onChange={e=>setTxF(f=>({...f,parcelas:e.target.value}))}/>
                </div>
              )}

              {/* Mês início */}
              <div style={{...S.fGrp,minWidth:140}}>
                <label style={S.fLbl}>
                  {txF.modo==="recorrente"?"Mês de Início":
                   txF.modo==="parcelado"?"1ª Parcela em":"Mês"}
                </label>
                <input style={S.inp} type="month" value={txF.ym}
                  onChange={e=>setTxF(f=>({...f,ym:e.target.value}))}/>
              </div>

              {/* Mês fim — só para recorrente */}
              {txF.modo==="recorrente"&&(
                <div style={{...S.fGrp,minWidth:140}}>
                  <label style={S.fLbl}>Mês de Encerramento</label>
                  <input style={S.inp} type="month" value={txF.endYM||addM(txF.ym,11)}
                    onChange={e=>setTxF(f=>({...f,endYM:e.target.value}))}/>
                </div>
              )}

              {/* Descrição */}
              <div style={{...S.fGrp,flex:2,minWidth:160}}>
                <label style={S.fLbl}>Descrição</label>
                <input style={S.inp} placeholder={
                  txF.modo==="parcelado"?"Ex: TV Samsung, Sofá...":
                  txF.modo==="recorrente"?"Ex: Salário, Plano de saúde...":
                  txF.modo==="receita"?"Ex: Salário, Freelance...":
                  "Ex: Mercado, Gasolina..."
                } value={txF.note} onChange={e=>setTxF(f=>({...f,note:e.target.value}))}/>
              </div>

              {/* Botão */}
              <button style={S.btn(
                txF.modo==="receita"?P.income:
                txF.modo==="parcelado"?P.surplus:
                txF.modo==="recorrente"?P.invest:P.expense
              )} onClick={()=>{
                if(txF.modo==="recorrente") addRec(true);
                else addTx();
              }}>
                {txF.modo==="parcelado"?`+ ${txF.parcelas||"?"}x Parcelas`:
                 txF.modo==="recorrente"?"+ Criar Recorrente":
                 txF.modo==="receita"?"+ Adicionar Receita":
                 "+ Adicionar Despesa"}
              </button>
            </div>

            {/* Preview parcelado */}
            {txF.modo==="parcelado"&&+txF.parcelas>1&&+txF.amount>0&&(
              <div style={{marginTop:10,fontSize:13,color:P.surplus,padding:"8px 14px",background:"rgba(147,197,253,0.08)",borderRadius:10,fontWeight:600}}>
                💳 {txF.parcelas}x de <strong>{fmt(+txF.amount/+txF.parcelas)}</strong> — de <strong>{lbl(txF.ym)}</strong> até <strong>{lbl(addM(txF.ym,(+txF.parcelas||1)-1))}</strong>
              </div>
            )}

            {/* Preview recorrente */}
            {txF.modo==="recorrente"&&+txF.amount>0&&txF.endYM&&(
              <div style={{marginTop:10,fontSize:13,color:P.invest,padding:"8px 14px",background:"rgba(196,181,253,0.08)",borderRadius:10,fontWeight:600}}>
                🔄 <strong>{fmt(+txF.amount)}/mês</strong> de <strong>{lbl(txF.ym)}</strong> até <strong>{lbl(txF.endYM)}</strong>
              </div>
            )}
          </div>

          {/* ── Lista de Lançamentos ── */}
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={S.secT}>
                Lançamentos
                {filterCat!=="all"&&<span style={{fontSize:11,color:P.gold,marginLeft:8,fontWeight:700,textTransform:"none",letterSpacing:0}}>• {filterCat}</span>}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <select style={{...S.sel,width:150}} value={filterYM} onChange={e=>setFilterYM(e.target.value)}>
                  <option value="all">Todos os meses</option>
                  {allYMs.map(m=><option key={m} value={m}>{lbl(m)}</option>)}
                </select>
                <select style={{...S.sel,width:170}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
                  <option value="all">Todas as categorias</option>
                  {CATS_EXP.map(c=><option key={c}>{c}</option>)}
                  {CATS_INC.map(c=><option key={c}>{c}</option>)}
                </select>
                {filterCat!=="all"&&(
                  <button style={{...S.btn(P.muted),padding:"8px 12px",fontSize:12,color:P.text}} onClick={()=>setFilterCat("all")}>✕ Limpar</button>
                )}
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:mob?500:0}}>
                <thead><tr>{["Mês","Tipo","Categoria","Descrição","Valor","St.",""].map((h,i)=><th key={i} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {[...filtered].filter(e=>!e.isRec).sort((a,b)=>b.ym.localeCompare(a.ym)).map(e=>(
                    <tr key={e.id} style={{opacity:e.confirmed?1:0.75}}>
                      <td style={{...S.td,color:P.sub,fontSize:11,fontWeight:600}}>{lbl(e.ym)}</td>
                      <td style={S.td}><span style={S.bdg(e.type==="income"?P.income:P.expense)}>{e.type==="income"?"↑":"↓"}</span></td>
                      <td style={{...S.td,color:P.sub,fontSize:11,fontWeight:600}}>{e.cat}</td>
                      <td style={{...S.td,color:P.text,fontWeight:500}}>{e.note}{e.i_total&&<span style={{fontSize:11,color:P.surplus,marginLeft:4,fontWeight:700}}>[{e.i_num}/{e.i_total}]</span>}</td>
                      <td style={{...S.td,fontWeight:800,color:e.type==="income"?P.income:P.expense}}>{e.type==="income"?"+":"-"}{fmt(e.amount)}</td>
                      <td style={S.td}>{e.confirmed?<span style={{fontSize:12,color:P.income,fontWeight:700}}>✓</span>:<span style={{fontSize:12,color:P.surplus,fontWeight:700}}>◌</span>}</td>
                      <td style={S.td}><button style={S.btnD} onClick={()=>delTx(e.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",gap:20,marginTop:12,padding:"10px 10px 0",borderTop:`1px solid ${P.border}`,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:P.sub,fontWeight:600}}>Receitas: <strong style={{color:P.income}}>{fmt(totInc)}</strong></span>
              <span style={{fontSize:13,color:P.sub,fontWeight:600}}>Despesas: <strong style={{color:P.expense}}>{fmt(totExp)}</strong></span>
              <span style={{fontSize:13,color:P.sub,fontWeight:600}}>Saldo: <strong style={{color:surplus>=0?P.surplus:P.expense}}>{fmt(surplus)}</strong></span>
            </div>
          </div>
        </>}

        {/* ══ PARCELAS & RECORRENTES ══════════════════════════════════════ */}
        {tab==="parcelas" && <>
          <div style={{fontSize:13,color:P.sub,marginBottom:16,fontWeight:500,lineHeight:1.6}}>
            Visão completa de todas as compras parceladas ativas e pagamentos recorrentes — com progresso, valor mensal e data de encerramento.
          </div>

          {/* Parcelas do plano anual */}
          <div style={{...S.card,marginBottom:14}}>
            <div style={S.secT}>💳 Compras Parceladas — Ainda em Andamento</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {installSummary.map((item,i)=>{
                const pct = Math.round((item.paid/item.total)*100);
                const color = PIE_C[i%PIE_C.length];
                return(
                  <div key={item.name} style={{background:"rgba(255,255,255,0.03)",border:`1px solid rgba(${hexRgb(color)},0.2)`,borderRadius:12,padding:"14px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:14,color:P.text,marginBottom:3}}>{item.name}</div>
                        <div style={{fontSize:12,color:P.sub,fontWeight:600}}>{item.cat}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:900,color:color}}>{fmt(item.monthlyVal)}<span style={{fontSize:11,color:P.muted,fontWeight:600}}>/mês</span></div>
                        <div style={{fontSize:11,color:P.muted,fontWeight:600}}>Total: {fmt(item.totalValue)}</div>
                      </div>
                    </div>
                    <ProgressBar paid={item.paid} total={item.total} color={color}/>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12,fontWeight:700}}>
                      <span style={{color:P.income}}>{item.paid}/{item.total} parcelas pagas ({pct}%)</span>
                      <span style={{color:item.remaining<=2?P.expense:P.muted}}>
                        {item.remaining} restante{item.remaining!==1?"s":""} · até <strong style={{color:color}}>{lbl(item.lastYM)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
              {installSummary.length===0&&<div style={{textAlign:"center",color:P.muted,padding:28,fontSize:13}}>Nenhuma parcela ativa no momento.</div>}
            </div>
          </div>

          {/* Recorrentes cadastrados pelo usuário */}
          <div style={{...S.card,marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={S.secT}>🔄 Pagamentos Recorrentes Cadastrados</div>
              <button style={S.btn(P.invest)} onClick={()=>setTab("recorrentes_form")}>+ Novo Recorrente</button>
            </div>
            {recs.length===0
              ?<div style={{textAlign:"center",color:P.muted,padding:28,fontSize:13}}>Nenhum recorrente cadastrado. Use o botão acima para adicionar.</div>
              :<div style={{display:"flex",flexDirection:"column",gap:10}}>
                {recs.map(r=>{
                  let count=0,ym=r.start_ym;while(ym<=r.end_ym){count++;ym=addM(ym,1);}
                  const color=r.type==="income"?P.income:P.expense;
                  return(
                    <div key={r.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid rgba(${hexRgb(color)},0.2)`,borderRadius:12,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:14,color:P.text,marginBottom:3}}>{r.note}</div>
                        <div style={{fontSize:12,color:P.sub,fontWeight:600}}>{r.cat} · {lbl(r.start_ym)} → {lbl(r.end_ym)} · {count} meses</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:14}}>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:16,fontWeight:900,color}}>{fmt(r.amount)}<span style={{fontSize:11,color:P.muted,fontWeight:600}}>/mês</span></div>
                          <div style={{fontSize:11,color:P.muted,fontWeight:600}}>Total: {fmt(r.amount*count)}</div>
                        </div>
                        <button style={S.btnD} onClick={()=>delRec(r.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>}
          </div>

          {/* Form novo recorrente inline */}
          <div style={S.card}>
            <div style={S.secT}>+ Novo Pagamento Recorrente</div>
            <div style={S.row}>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Tipo</label>
                <select style={S.sel} value={recF.type} onChange={e=>setRecF(f=>({...f,type:e.target.value,cat:e.target.value==="income"?CATS_INC[0]:CATS_EXP[0]}))}>
                  <option value="income">Receita</option><option value="expense">Despesa</option>
                </select>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Categoria</label>
                <select style={S.sel} value={recF.cat} onChange={e=>setRecF(f=>({...f,cat:e.target.value}))}>
                  {(recF.type==="income"?CATS_INC:CATS_EXP).map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Valor/mês</label>
                <input style={S.inp} type="number" placeholder="0,00" value={recF.amount} onChange={e=>setRecF(f=>({...f,amount:e.target.value}))}/>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Início</label>
                <input style={S.inp} type="month" value={recF.startYM} onChange={e=>setRecF(f=>({...f,startYM:e.target.value}))}/>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Até</label>
                <input style={S.inp} type="month" value={recF.endYM} onChange={e=>setRecF(f=>({...f,endYM:e.target.value}))}/>
              </div>
              <div style={{...S.fGrp,flex:2}}>
                <label style={S.fLbl}>Descrição</label>
                <input style={S.inp} placeholder="Ex: Salário, Plano de saúde..." value={recF.note} onChange={e=>setRecF(f=>({...f,note:e.target.value}))}/>
              </div>
              <button style={S.btn(P.invest)} onClick={addRec}>+ Criar</button>
            </div>
          </div>
        </>}

        {/* ══ FLUXO DE CAIXA ═════════════════════════════════════════════ */}
        {tab==="fluxo" && <>
          <div style={{fontSize:13,color:P.sub,marginBottom:14,fontWeight:600}}>
            Próximos 6 meses · <span style={{color:P.income}}>✓ Confirmado</span> · <span style={{color:P.surplus}}>◌ Previsto</span>
          </div>
          <div style={{...S.card,marginBottom:14}}>
            <div style={S.secT}>Resumo — Próximos 6 Meses</div>
            <ResponsiveContainer width="100%" height={mob?180:210}>
              <BarChart data={cashFlow}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                <XAxis dataKey="label" tick={{fontSize:11,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"}/>
                <Tooltip content={<CTooltip/>}/>
                <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                <Bar dataKey="income" name="Receitas" fill={P.income} radius={[4,4,0,0]}/>
                <Bar dataKey="expense" name="Despesas" fill={P.expense} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {cashFlow.map(cf=>(
            <div key={cf.ym} style={{...S.card,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",flexWrap:"wrap",gap:8}}
                onClick={()=>setExpandedCF(p=>({...p,[cf.ym]:!p[cf.ym]}))}>
                <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                  <span style={{fontWeight:900,fontSize:15,color:cf.ym===TODAY_YM?P.gold:P.text}}>
                    {cf.label}{cf.ym===TODAY_YM&&<span style={{fontSize:11,color:P.gold,marginLeft:6}}>(mês atual)</span>}
                  </span>
                  <span style={{fontSize:13,color:P.income,fontWeight:700}}>+{fmt(cf.income)}</span>
                  <span style={{fontSize:13,color:P.expense,fontWeight:700}}>−{fmt(cf.expense)}</span>
                  <span style={{fontSize:14,fontWeight:900,color:cf.saldo>=0?P.surplus:P.expense}}>=&nbsp;{fmt(cf.saldo)}</span>
                </div>
                <span style={{fontSize:14,color:P.muted,fontWeight:700}}>{expandedCF[cf.ym]?"▲":"▼"}</span>
              </div>
              {expandedCF[cf.ym]&&(
                <div style={{marginTop:14}}>
                  <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(auto-fill,minmax(180px,1fr))",gap:7,marginBottom:14}}>
                    {cf.cats.map((c,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:`1px solid ${P.border}`}}>
                        <span style={{fontSize:12,color:P.sub,fontWeight:600}}>{c.cat}</span>
                        <span style={{fontSize:13,fontWeight:800,color:P.expense}}>{fmt(c.v)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:mob?450:0}}>
                      <thead><tr>{["Categoria","Descrição","Valor","Status"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {cf.entries.sort((a,b)=>a.type.localeCompare(b.type)||b.amount-a.amount).map(e=>(
                          <tr key={e.id} style={{opacity:e.confirmed?1:0.72}}>
                            <td style={{...S.td,color:P.sub,fontWeight:600}}>{e.cat}</td>
                            <td style={{...S.td,color:P.text,fontWeight:500}}>{e.note}{e.i_total&&<span style={{color:P.surplus,marginLeft:4,fontWeight:700}}>[{e.i_num}/{e.i_total}]</span>}</td>
                            <td style={{...S.td,fontWeight:800,color:e.type==="income"?P.income:P.expense}}>{e.type==="income"?"+":"-"}{fmt(e.amount)}</td>
                            <td style={S.td}>{e.confirmed?<span style={{color:P.income,fontWeight:700}}>✓</span>:<span style={{color:P.surplus,fontWeight:700}}>◌</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>}

        {/* ══ INVESTIMENTOS ══════════════════════════════════════════════ */}
        {tab==="investimentos" && <>
          <div style={{...S.card,marginBottom:14,background:"rgba(251,191,36,0.06)",border:`1px solid rgba(${hexRgb(P.gold)},0.2)`}}>
            <span style={{fontSize:13,color:P.sub,fontWeight:600}}>💰 Patrimônio líquido atual: </span>
            <strong style={{color:P.gold,fontSize:16}}>R$ 400.000</strong>
            <span style={{fontSize:12,color:P.muted,marginLeft:12}}>Cadastre suas aplicações para rastrear o crescimento.</span>
          </div>
          <div style={S.card}>
            <div style={S.secT}>Registrar Investimento</div>
            <div style={S.row}>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Tipo</label>
                <select style={S.sel} value={invF.type} onChange={e=>setInvF(f=>({...f,type:e.target.value}))}>
                  {INVEST_T.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{...S.fGrp,flex:2}}>
                <label style={S.fLbl}>Nome / Ticker</label>
                <input style={S.inp} placeholder="CDB XP, HGLG11..." value={invF.name} onChange={e=>setInvF(f=>({...f,name:e.target.value}))}/>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Valor (R$)</label>
                <input style={S.inp} type="number" placeholder="0,00" value={invF.amount} onChange={e=>setInvF(f=>({...f,amount:e.target.value}))}/>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Retorno a.a. (%)</label>
                <input style={S.inp} type="number" placeholder="12.5" value={invF.returnRate} onChange={e=>setInvF(f=>({...f,returnRate:e.target.value}))}/>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Data Aporte</label>
                <input style={S.inp} type="month" value={invF.ym} onChange={e=>setInvF(f=>({...f,ym:e.target.value}))}/>
              </div>
              <button style={S.btn(P.invest)} onClick={addInv}>+ Registrar</button>
            </div>
          </div>
          {invs.length>0&&<div style={{...S.card,marginTop:14}}>
            <div style={S.secT}>Crescimento Projetado por Tipo de Ativo — 12 meses</div>
            <ResponsiveContainer width="100%" height={mob?220:260}>
              <AreaChart data={investByType}>
                <defs>
                  {investTypes.map((t,i)=>(
                    <linearGradient key={t} id={`ig${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PIE_C[i%PIE_C.length]} stopOpacity={0.35}/>
                      <stop offset="100%" stopColor={PIE_C[i%PIE_C.length]} stopOpacity={0.05}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                <XAxis dataKey="mes" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"} width={70}/>
                <Tooltip content={<CTooltip/>}/>
                <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                {investTypes.map((t,i)=>(
                  <Area key={t} type="monotone" dataKey={t} stackId="1"
                    stroke={PIE_C[i%PIE_C.length]} fill={`url(#ig${i})`} strokeWidth={2}/>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>}
          {invs.length>0&&<div style={{...S.card,marginTop:14}}>
            <div style={S.secT}>Carteira</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:mob?500:0}}>
                <thead><tr>{["Tipo","Nome","Aportado","a.a.","Proj. 12m",""].map((h,i)=><th key={i} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {invs.map(i=>(
                    <tr key={i.id}>
                      <td style={S.td}><span style={S.bdg(P.invest)}>{i.type}</span></td>
                      <td style={{...S.td,fontWeight:700,color:P.text}}>{i.name}</td>
                      <td style={{...S.td,fontWeight:800,color:P.invest}}>{fmt(i.amount)}</td>
                      <td style={{...S.td,color:P.income,fontWeight:700}}>+{i.return_rate}%</td>
                      <td style={{...S.td,color:P.gold,fontWeight:900}}>{fmt(+i.amount*Math.pow(1+ +i.return_rate/100/12,12))}</td>
                      <td style={S.td}><button style={S.btnD} onClick={()=>delInv(i.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",gap:20,marginTop:12,padding:"10px 10px 0",borderTop:`1px solid ${P.border}`}}>
              <span style={{fontSize:13,color:P.sub,fontWeight:600}}>Total: <strong style={{color:P.invest}}>{fmt(totInv)}</strong></span>
              <span style={{fontSize:13,color:P.sub,fontWeight:600}}>Proj. 12m: <strong style={{color:P.gold}}>{fmt(invs.reduce((s,i)=>s+ +i.amount*Math.pow(1+ +i.return_rate/100/12,12),0))}</strong></span>
            </div>
          </div>}
          {invs.length===0&&<div style={{...S.card,marginTop:14,textAlign:"center",color:P.muted,padding:40,fontSize:14}}>Nenhum investimento cadastrado ainda.</div>}
        </>}

        {/* ══ GRÁFICOS ═══════════════════════════════════════════════════ */}
        {tab==="graficos" && <>
          <div style={grid2}>
            <div style={S.card}>
              <div style={S.secT}>Receitas × Despesas (área)</div>
              <ResponsiveContainer width="100%" height={mob?200:240}>
                <AreaChart data={monthSummary}>
                  <defs>
                    <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.income} stopOpacity={0.3}/><stop offset="100%" stopColor={P.income} stopOpacity={0.02}/></linearGradient>
                    <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.expense} stopOpacity={0.3}/><stop offset="100%" stopColor={P.expense} stopOpacity={0.02}/></linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"} width={60}/>
                  <Tooltip content={<CTooltip/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                  <Area type="monotone" dataKey="In" name="Receitas" stroke={P.income} fill="url(#gI)" strokeWidth={2.5}/>
                  <Area type="monotone" dataKey="Out" name="Despesas" stroke={P.expense} fill="url(#gE)" strokeWidth={2.5}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={S.card}>
              <div style={S.secT}>Excedente Mensal</div>
              <ResponsiveContainer width="100%" height={mob?200:240}>
                <BarChart data={monthSummary}>
                  <defs><linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P.surplus} stopOpacity={0.9}/><stop offset="100%" stopColor={P.surplus} stopOpacity={0.3}/></linearGradient></defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"} width={60}/>
                  <Tooltip content={<CTooltip/>}/>
                  <Bar dataKey="Saldo" name="Excedente" fill="url(#gS)" radius={[5,5,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={S.card}>
              <div style={S.secT}>Evolução Receitas × Despesas</div>
              <ResponsiveContainer width="100%" height={mob?200:240}>
                <LineChart data={monthSummary}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"} width={60}/>
                  <Tooltip content={<CTooltip/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                  <Line type="monotone" dataKey="Out" name="Despesas" stroke={P.expense} strokeWidth={2.5} dot={{r:4,fill:P.expense,strokeWidth:0}}/>
                  <Line type="monotone" dataKey="In" name="Receitas" stroke={P.income} strokeWidth={2.5} dot={{r:4,fill:P.income,strokeWidth:0}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {invs.length>0?(
              <div style={S.card}>
                <div style={S.secT}>Patrimônio por Tipo de Ativo — 12 meses</div>
                <ResponsiveContainer width="100%" height={mob?200:240}>
                  <AreaChart data={investByType}>
                    <defs>
                      {investTypes.map((t,i)=>(
                        <linearGradient key={t} id={`gfig${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PIE_C[i%PIE_C.length]} stopOpacity={0.35}/>
                          <stop offset="100%" stopColor={PIE_C[i%PIE_C.length]} stopOpacity={0.05}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"} width={70}/>
                    <Tooltip content={<CTooltip/>}/>
                    <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                    {investTypes.map((t,i)=>(
                      <Area key={t} type="monotone" dataKey={t} stackId="1"
                        stroke={PIE_C[i%PIE_C.length]} fill={`url(#gfig${i})`} strokeWidth={2}/>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ):(
              <div style={{...S.card,display:"flex",alignItems:"center",justifyContent:"center",minHeight:240}}>
                <div style={{fontSize:13,color:P.muted,textAlign:"center",fontWeight:600}}>
                  Cadastre investimentos para ver o gráfico de crescimento patrimonial.
                </div>
              </div>
            )}
          </div>
        </>}

      </main>
    </div>
  );
}
