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
const INVEST_T = ["Renda Fixa","Ações","FIIs","ETF","BDR","Fundos","Cripto","Poupança","Tesouro Direto"];
// Categorias variáveis projetadas pela média dos últimos 3 meses no Fluxo de Caixa
const VAR_PROJ = ["Alimentação","Transporte","Lazer"];

function catExp(n) {
  const l = n.toLowerCase();
  if (/financiamento|aluguel apart|condomín|seguro resid/.test(l)) return "Moradia";
  if (/marcenaria|vidraçar|adriano|ar condic|geladei|microond|aquecedor|box banh|sofá|cama box|iluminaç|rodapé|revestim|instalação|arandela|varal|michelle|viacor|miudez|depósit|cooktop/.test(l)) return "Obra/Reforma";
  if (/enel|vivo|microsoft|amazon prime|netflix|youtube|google one|spotify|claude|estadão|ifood club/.test(l)) return "Assinaturas";
  if (/contabilizei|imposto|apm|crefito|cremesp|consultoria/.test(l)) return "Impostos";
  if (/prudential|metlife|seguro de vida|seguro veic|ipva|licenc/.test(l)) return "Seguros / Plano de Saúde";
  if (/mercado|ifood\/rest|kobe/.test(l)) return "Alimentação";
  if (/gasolina|pedágio|manutenção veí|barbearia/.test(l)) return "Transporte";
  if (/viagem|cirque/.test(l)) return "Lazer";
  if (/instrumentação/.test(l)) return "Educação / Filhos";
  if (/lbv/.test(l)) return "Doações";
  return "Outros";
}

// Unifica rótulos antigos (gravados antes da padronização) com os atuais
const NORM_CAT = {
  "Prof./Impostos": "Impostos",
  "Seguros": "Seguros / Plano de Saúde",
  "Educação Filhos": "Educação / Filhos",
};
const normCat = c => NORM_CAT[c] || c;

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
  const [confirmModal, setConfirmModal] = useState(null); // {id, note, amount, ym}
  const [searchTxt, setSearchTxt] = useState("");          // busca por texto em Lançamentos
  const [selTx, setSelTx] = useState(() => new Set());     // ids selecionados p/ edição em lote
  const [budgets, setBudgets] = useState([]);              // tetos de orçamento por categoria
  const [snapshots, setSnapshots] = useState([]);          // fotos mensais do patrimônio
  const [budgetForm, setBudgetForm] = useState({ cat:"", amount:"" });

  const openConfirm = (e) => setConfirmModal({id:e.id, note:e.note, amount:+e.amount, ym:e.ym});

  const confirmTx = async () => {
    if (!confirmModal) return;
    await supabase.from("transactions")
      .update({ confirmed: true, amount: confirmModal.amount })
      .eq("id", confirmModal.id);
    setTxs(p => p.map(t => t.id === confirmModal.id
      ? { ...t, confirmed: true, amount: confirmModal.amount }
      : t
    ));
    setConfirmModal(null);
    notify("Lançamento confirmado ✓");
  };

  // Status helper
  const txStatus = (e) => {
    if (e.confirmed) return "confirmed";
    if (e.ym < TODAY_YM) return "late";      // mês passou, não confirmado
    if (e.ym === TODAY_YM) return "pending";  // mês atual, não confirmado
    return "future";                           // mês futuro
  };
  const [importItems,  setImportItems]  = useState([]);
  const [importStep,   setImportStep]   = useState("upload"); // upload | loading | preview | done
  const [importError,  setImportError]  = useState(null);
  const [importSaving, setImportSaving] = useState(false);

  const notify = (msg, ok = true) => { setNotif({ msg, ok }); setTimeout(() => setNotif(null), 3000); };

  const [marketPrices, setMarketPrices] = useState({}); // {TICKER: price}
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketUpdatedAt, setMarketUpdatedAt] = useState(null);

  // Fetch market prices for all tickers on load
  const fetchMarketPrices = useCallback(async (investments) => {
    if (!investments || investments.length === 0) return;
    setMarketLoading(true);
    const prices = {};

    // Ações, FIIs, ETFs, BDRs (brasileiros E internacionais) → /api/quote
    // O proxy busca no Yahoo Finance e devolve preço + moeda + câmbio USD/BRL.
    const mktTickers = [...new Set(
      investments
        .filter(i => i.ticker && ["Ações","FIIs","ETF","BDR"].includes(i.type))
        .map(i => i.ticker.toUpperCase().trim())
        .filter(Boolean)
    )];

    if (mktTickers.length > 0) {
      try {
        const res = await fetch(`/api/quote?tickers=${mktTickers.join(",")}`);
        const data = await res.json();
        const fx = data.usdbrl || 1;
        Object.entries(data.prices || {}).forEach(([tk, q]) => {
          // converte pra BRL quando o ativo é cotado em dólar
          prices[tk] = q.currency === "BRL" ? q.price : q.price * fx;
        });
      } catch(e) { console.warn("quote proxy error", e); }
    }

    // Crypto → CoinGecko (free, no key needed)
    const cryptoInvs = investments.filter(i => i.type === "Cripto" && i.ticker);
    if (cryptoInvs.length > 0) {
      const cryptoMap = { BTC:"bitcoin", ETH:"ethereum", SOL:"solana", BNB:"binancecoin", ADA:"cardano", DOT:"polkadot", MATIC:"matic-network", USDC:"usd-coin", USDT:"tether", XRP:"ripple", DOGE:"dogecoin" };
      const ids = cryptoInvs.map(i => cryptoMap[i.ticker?.toUpperCase()] || i.ticker?.toLowerCase()).filter(Boolean);
      if (ids.length > 0) {
        try {
          const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${[...new Set(ids)].join(",")}&vs_currencies=brl`);
          const data = await res.json();
          cryptoInvs.forEach(inv => {
            const id = cryptoMap[inv.ticker?.toUpperCase()] || inv.ticker?.toLowerCase();
            if (data[id]?.brl) prices[inv.ticker.toUpperCase()] = data[id].brl;
          });
        } catch(e) { console.warn("coingecko fetch error", e); }
      }
    }

    setMarketPrices(prices);
    setMarketUpdatedAt(new Date().toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}));
    setMarketLoading(false);
  }, []);

  // Fetch on load when investments are ready
  useEffect(() => {
    if (invs.length > 0) fetchMarketPrices(invs);
  }, [invs.length]); // eslint-disable-line

  const loadAll = useCallback(async () => {
    setDbLoading(true);
    const [{ data: t }, { data: r }, { data: i }, { data: b }, { data: s }] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", userId).order("ym"),
      supabase.from("recurrents").select("*").eq("user_id", userId),
      supabase.from("investments").select("*").eq("user_id", userId),
      supabase.from("budgets").select("*").eq("user_id", userId),
      supabase.from("snapshots").select("*").eq("user_id", userId).order("ym"),
    ]);
    setTxs((t || []).map(x => ({ ...x, cat: normCat(x.cat) })));
    setRecs((r || []).map(x => ({ ...x, cat: normCat(x.cat) })));
    setInvs(i || []);
    setBudgets(b || []);
    setSnapshots(s || []);
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
  const E0 = { modo:"unico", type:"expense", cat:"Moradia", amount:"", ym:TODAY_YM, note:"", parcelas:"1", endYM:addM(TODAY_YM,11) };
  const R0 = { type:"expense", cat:"Moradia", amount:"", startYM:TODAY_YM, endYM:addM(TODAY_YM,11), note:"" };
  const I0 = { type:"Renda Fixa", name:"", amount:"", ym:TODAY_YM, returnRate:"", ticker:"", quantity:"" };
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

  // Linhas visíveis na aba Lançamentos (sem recorrentes virtuais, com busca por texto)
  const lancRows = useMemo(() =>
    [...filtered]
      .filter(e => !e.isRec)
      .filter(e => !searchTxt || (e.note || "").toLowerCase().includes(searchTxt.toLowerCase()))
      .sort((a,b) => b.ym.localeCompare(a.ym))
  , [filtered, searchTxt]);

  // Seleção em lote
  const toggleSel  = id => setSelTx(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = lancRows.length > 0 && lancRows.every(e => selTx.has(e.id));
  const toggleAll  = () => setSelTx(allSelected ? new Set() : new Set(lancRows.map(e => e.id)));
  const clearSel   = () => setSelTx(new Set());

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

  const currentValue = (inv) => {
    const t = inv.ticker?.toUpperCase();
    if (t && marketPrices[t] && inv.quantity) return marketPrices[t] * +inv.quantity;
    return +inv.amount;
  };
  const totalCurrentValue = invs.reduce((s,i) => s + currentValue(i), 0);
  const totalGain = totalCurrentValue - totInv;

  // Saldo de caixa acumulado (receitas - despesas confirmadas) e patrimônio líquido
  const cashBalance = useMemo(() =>
    txs.filter(t => t.confirmed).reduce((s,t) => s + (t.type==="income" ? +t.amount : -+t.amount), 0)
  , [txs]);
  const netWorth = totalCurrentValue + cashBalance;

  // Média dos últimos 3 meses de uma categoria (sugestão de teto de orçamento)
  const avg3 = (cat) => {
    const months = [addM(TODAY_YM,-3), addM(TODAY_YM,-2), addM(TODAY_YM,-1)];
    const total = txs.filter(t => t.type==="expense" && t.cat===cat && months.includes(t.ym))
                     .reduce((s,t) => s + +t.amount, 0);
    return total / 3;
  };

  // Realizado do mês atual vs teto definido
  const budgetStatus = useMemo(() =>
    budgets.map(b => {
      const spent = txs.filter(t => t.type==="expense" && t.cat===b.cat && t.ym===TODAY_YM)
                       .reduce((s,t) => s + +t.amount, 0);
      const pct = +b.limit_amount > 0 ? spent / +b.limit_amount * 100 : 0;
      return { ...b, spent, pct };
    }).sort((a,b) => b.pct - a.pct)
  , [budgets, txs]);

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

  // Dados do Sankey: Receita → categorias de Despesa (top 6 + Outros) + Investimentos + Sobra
  const sankeyData = useMemo(() => {
    const inc = totInc;
    if (inc <= 0) return null;
    const top = expCats.slice(0, 6);
    const restVal = expCats.slice(6).reduce((s,c)=>s + c.value, 0);
    const dests = top.map(c => ({ name:c.name, value:c.value }));
    if (restVal > 0) dests.push({ name:"Outros gastos", value:restVal });
    const sobra = inc - totExp;
    if (sobra > 0) dests.push({ name:"Sobra", value:sobra, kind:"sobra" });
    return { inc, dests: dests.filter(d=>d.value>0) };
  }, [totInc, totExp, expCats]);

  // Média dos últimos 3 meses por categoria variável (base da projeção)
  const varAvg = useMemo(() => {
    const months = [addM(TODAY_YM,-3), addM(TODAY_YM,-2), addM(TODAY_YM,-1)];
    const avg = {};
    VAR_PROJ.forEach(cat => {
      const total = txs
        .filter(t => t.type === "expense" && t.cat === cat && months.includes(t.ym))
        .reduce((s,t) => s + +t.amount, 0);
      avg[cat] = total / months.length;
    });
    return avg;
  }, [txs]);

  const cashFlow = useMemo(() =>
    Array.from({length:6},(_,i)=>addM(TODAY_YM,i)).map(ym => {
      const entries = allE.filter(e => e.ym === ym);
      const income  = entries.filter(e=>e.type==="income").reduce((s,e)=>s + +e.amount,0);
      const catMap  = {};
      const estSet  = new Set();
      entries.filter(e=>e.type==="expense").forEach(e=>{catMap[e.cat]=(catMap[e.cat]||0)+ +e.amount;});
      // Projeção: usa a média do trimestre quando NÃO há gasto real na categoria variável naquele mês
      VAR_PROJ.forEach(cat => {
        const hasReal = entries.some(e => e.type==="expense" && e.cat===cat);
        if (!hasReal && varAvg[cat] > 0) { catMap[cat] = varAvg[cat]; estSet.add(cat); }
      });
      const expense = Object.values(catMap).reduce((s,v)=>s + v, 0);
      return { ym, label:lbl(ym), income, expense, saldo:income-expense, entries,
               cats:Object.entries(catMap).map(([c,v])=>({cat:c,v,est:estSet.has(c)})).sort((a,b)=>b.v-a.v) };
    })
  , [allE, varAvg]);

  // Acumulação real por mês de aporte (sem projeção)
  const investAccum = useMemo(() => {
    const byYM = {};
    invs.forEach(i => {
      if (!byYM[i.ym]) byYM[i.ym] = {};
      byYM[i.ym][i.type] = (byYM[i.ym][i.type] || 0) + +i.amount;
    });
    return Object.entries(byYM).sort(([a],[b])=>a.localeCompare(b)).map(([ym,types])=>({
      label: lbl(ym), ...types,
    }));
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
    const amt = +txF.amount;
    const parc = (txF.modo==="unico"||txF.modo==="receita") ? 1 : Math.max(2, parseInt(txF.parcelas)||2);
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
    if (!invF.name||!invF.amount) return notify("Preencha nome e valor.",false);
    await supabase.from("investments").insert({
      user_id:userId, type:invF.type, name:invF.name, amount:+invF.amount,
      ym:invF.ym, return_rate:+invF.returnRate||0,
      ticker:invF.ticker||null, quantity:+invF.quantity||null,
    });
    await loadAll(); setInvF(I0); notify("Investimento registrado ✓");
  };

  const delTx  = async id => { await supabase.from("transactions").delete().eq("id",id); setTxs(p=>p.filter(t=>t.id!==id)); };

  // ── Operações em lote ──────────────────────────────────────────────────
  const bulkConfirm = async () => {
    const ids = [...selTx]; if (!ids.length) return;
    await supabase.from("transactions").update({ confirmed:true }).in("id", ids);
    await loadAll(); clearSel(); notify(`${ids.length} confirmado(s) como pago ✓`);
  };
  const bulkCat = async (cat) => {
    const ids = [...selTx]; if (!ids.length || !cat) return;
    await supabase.from("transactions").update({ cat }).in("id", ids);
    await loadAll(); clearSel(); notify(`Categoria alterada para "${cat}" ✓`);
  };
  const bulkDelete = async () => {
    const ids = [...selTx]; if (!ids.length) return;
    if (!window.confirm(`Excluir ${ids.length} lançamento(s)? Esta ação não pode ser desfeita.`)) return;
    await supabase.from("transactions").delete().in("id", ids);
    await loadAll(); clearSel(); notify(`${ids.length} excluído(s)`);
  };

  // ── Orçamento ──────────────────────────────────────────────────────────
  const saveBudget = async (cat, amount) => {
    const amt = +amount; if (!cat || !amt) return;
    const existing = budgets.find(b => b.cat === cat);
    if (existing) await supabase.from("budgets").update({ limit_amount:amt }).eq("id", existing.id);
    else          await supabase.from("budgets").insert({ user_id:userId, cat, limit_amount:amt });
    await loadAll(); setBudgetForm({ cat:"", amount:"" }); notify(`Teto de ${cat} definido ✓`);
  };
  const delBudget = async (id) => {
    await supabase.from("budgets").delete().eq("id", id);
    await loadAll();
  };

  // ── Foto mensal do patrimônio (snapshot) ───────────────────────────────
  const recordSnapshot = async () => {
    const ym = TODAY_YM;
    const row = { user_id:userId, ym, invested:totInv, portfolio_value:totalCurrentValue, net_worth:netWorth };
    const existing = snapshots.find(s => s.ym === ym);
    if (existing) await supabase.from("snapshots").update(row).eq("id", existing.id);
    else          await supabase.from("snapshots").insert(row);
    await loadAll(); notify("Foto do mês salva ✓");
  };
  const delRec = async id => { await supabase.from("recurrents").delete().eq("id",id); setRecs(p=>p.filter(r=>r.id!==id)); };
  const delInv = async id => { await supabase.from("investments").delete().eq("id",id); setInvs(p=>p.filter(i=>i.id!==id)); };
  const logout = async () => { await supabase.auth.signOut(); };

  // ── Exportar todos os dados em JSON ────────────────────────────────────
  const exportData = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const payload = {
      exported_at: new Date().toISOString(),
      user_email: session.user.email,
      user_id: userId,
      counts: { transactions: txs.length, recurrents: recs.length, investments: invs.length },
      transactions: txs,
      recurrents: recs,
      investments: invs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financas-export-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify("Dados exportados ✓");
  };

  // ── Import via IA ─────────────────────────────────────────────────────
  const IMPORT_PROMPT = `Analise este extrato de investimentos e extraia TODOS os ativos com posição atual (não vendidos/resgatados totalmente).
Retorne SOMENTE um JSON array válido, sem markdown, sem texto adicional:
[{"name":"nome completo ou ticker","ticker":"código de negociação ou null","type":"Ações|FIIs|Renda Fixa|Fundos|ETF|BDR|Cripto","amount":valor_number,"return_rate":taxa_anual_number,"ym":"AAAA-MM"}]
Regras:
- Ações/ETFs/BDRs/FIIs listados: amount = preço_médio × quantidade
- Renda Fixa (CRI/CRA/Debênture/CDB/LCI/LCA): amount = valor_de_compra, return_rate = taxa_anual_percentual (ex: 12.5)
- Fundos de investimento: amount = valor_aplicado_ajustado
- ym = mês da compra no formato AAAA-MM (se indisponível, use o mês atual do extrato)
- return_rate = 0 se não disponível
- ticker = código de negociação em maiúsculas (PETR4, HGLG11, BTC, etc.) para Ações/FIIs/ETF/BDR/Cripto; use null para Renda Fixa/Fundos sem código
Retorne APENAS o JSON array, sem nenhum texto adicional.`;

  const handleImportFile = async (file) => {
    setImportStep("loading"); setImportError(null);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let messages;

      if (ext === 'pdf') {
        const base64 = await new Promise((res,rej)=>{
          const r = new FileReader();
          r.onload = () => res(r.result.split(',')[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        messages = [{role:'user',content:[
          {type:'document',source:{type:'base64',media_type:'application/pdf',data:base64}},
          {type:'text',text:IMPORT_PROMPT}
        ]}];
      } else {
        let text;
        if (ext === 'csv') {
          text = await file.text();
        } else {
          // Excel: use SheetJS (npm install xlsx required)
          const buf = await file.arrayBuffer();
          try {
            const XLSX = await import('xlsx');
            const wb = XLSX.read(new Uint8Array(buf));
            text = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
          } catch {
            throw new Error("Instale o pacote xlsx: npm install xlsx");
          }
        }
        messages = [{role:'user',content:`${IMPORT_PROMPT}\n\nExtrato:\n${text.slice(0,15000)}`}];
      }

      // Proxy seguro — chama /api/claude-proxy (Edge Function na Vercel)
      const resp = await fetch('/api/claude-proxy', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({model:'claude-sonnet-4-5',max_tokens:4000,messages})
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);

      const raw = data.content.filter(c=>c.type==='text').map(c=>c.text).join('');
      const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());

      setImportItems(parsed.map((item,i)=>({
        ...item, _id:i, _sel:true,
        ticker:      item.ticker ? String(item.ticker).toUpperCase().trim() : "",
        amount:      Math.round((+item.amount||0)*100)/100,
        return_rate: +item.return_rate || 0,
        ym:          item.ym || TODAY_YM,
      })));
      setImportStep("preview");
    } catch(err) {
      setImportError(`Erro ao processar: ${err.message}`);
      setImportStep("upload");
    }
  };

  const saveImportedItems = async () => {
    setImportSaving(true);
    const rows = importItems.filter(i=>i._sel).map(i=>({
      user_id:userId, type:i.type, name:i.name,
      ticker:(i.ticker||"").trim()||null,
      amount:i.amount, ym:i.ym, return_rate:i.return_rate
    }));
    await supabase.from('investments').insert(rows);
    await loadAll();
    setImportSaving(false);
    setImportStep("done");
  };

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
    {id:"importar",    label: mob?"📥":"Importar"},
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
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={exportData} title="Baixar todos os seus dados em JSON" style={{ background:"transparent", border:`1px solid rgba(${hexRgb(P.gold)},0.4)`, borderRadius:8, padding:"5px 10px", color:P.gold, fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>{mob?"⬇":"⬇ Exportar"}</button>
          <button onClick={logout} style={{ background:"transparent", border:`1px solid ${P.border}`, borderRadius:8, padding:"5px 10px", color:P.muted, fontSize:12, cursor:"pointer", fontWeight:600, whiteSpace:"nowrap" }}>Sair</button>
        </div>
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

          {/* Orçamento do mês */}
          <div style={{...S.card, marginTop:14}}>
            <div style={S.secT}>Orçamento do Mês <span style={{fontSize:11,color:P.muted,fontWeight:500,textTransform:"none",letterSpacing:0}}>— {lbl(TODAY_YM)}</span></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginTop:10,marginBottom:budgetStatus.length?18:0}}>
              <select style={{...S.sel,width:mob?"100%":190}} value={budgetForm.cat} onChange={e=>setBudgetForm(f=>({...f,cat:e.target.value}))}>
                <option value="">Categoria...</option>
                {CATS_EXP.map(c=><option key={c}>{c}</option>)}
              </select>
              <input style={{...S.inp,width:mob?"100%":170}} type="number"
                placeholder={budgetForm.cat?`sugerido ${fmt(avg3(budgetForm.cat))}`:"Teto (R$)"}
                value={budgetForm.amount} onChange={e=>setBudgetForm(f=>({...f,amount:e.target.value}))}/>
              <button style={{...S.btn(P.gold),padding:"9px 16px"}}
                onClick={()=>saveBudget(budgetForm.cat, budgetForm.amount || avg3(budgetForm.cat))}>Definir teto</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {budgetStatus.map(b=>{
                const color = b.pct>=100?P.expense:b.pct>=80?P.gold:P.income;
                return(
                  <div key={b.id}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{fontSize:12,fontWeight:700,color:P.text}}>{b.cat}</span>
                      <span style={{fontSize:12,fontWeight:700,color}}>
                        {fmt(b.spent)} <span style={{color:P.muted,fontWeight:500}}>/ {fmt(b.limit_amount)} · {b.pct.toFixed(0)}%</span>
                        <button style={{...S.btnD,marginLeft:8,padding:"1px 7px"}} onClick={()=>delBudget(b.id)}>✕</button>
                      </span>
                    </div>
                    <div style={{height:9,borderRadius:6,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(b.pct,100)}%`,background:color,borderRadius:6,transition:"width .3s"}}/>
                    </div>
                  </div>
                );
              })}
              {budgetStatus.length===0&&<div style={{color:P.muted,fontSize:13}}>Defina um teto por categoria para acompanhar quanto já gastou no mês. O valor sugerido vem da sua média dos últimos 3 meses.</div>}
            </div>
          </div>

          {/* Sankey: para onde vai o dinheiro */}
          {sankeyData&&(
            <div style={{...S.card, marginTop:14}}>
              <div style={S.secT}>Para Onde Vai o Dinheiro <span style={{fontSize:10,color:P.muted,fontWeight:500,textTransform:"none",letterSpacing:0}}>— {filterYM==="all"?"todo o período":lbl(filterYM)}</span></div>
              <div style={{overflowX:"auto"}}>
              {(()=>{
                const dests=sankeyData.dests, n=dests.length, MIN=34, W=820, nodeW=13;
                const H=Math.max(300, n*MIN+44);
                const sum=dests.reduce((s,d)=>s+d.value,0)||1;
                const gap=8, usable=H-gap*Math.max(0,n-1);
                let lY=0, rY=0;
                const rows=dests.map((d,i)=>{const h=d.value/sum*usable;const o={d,h,lY,rY,cy:rY+h/2,color:d.kind==="sobra"?P.income:PIE_C[i%PIE_C.length]};lY+=h;rY+=h+gap;return o;});
                // Anti-colisão dos rótulos: garante MIN de distância entre centros
                const top=18, bot=H-18;
                for(let i=1;i<rows.length;i++) if(rows[i].cy < rows[i-1].cy+MIN) rows[i].cy=rows[i-1].cy+MIN;
                if(rows.length && rows[rows.length-1].cy>bot){
                  rows[rows.length-1].cy=bot;
                  for(let i=rows.length-2;i>=0;i--) if(rows[i].cy>rows[i+1].cy-MIN) rows[i].cy=rows[i+1].cy-MIN;
                }
                if(rows.length) rows[0].cy=Math.max(rows[0].cy,top);
                const xL=92, xR=W-218;
                return(
                  <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{minWidth:mob?640:0}}>
                    <rect x={xL} y={0} width={nodeW} height={lY} rx={3} fill={P.income}/>
                    <text x={xL-8} y={lY/2-6} textAnchor="end" fontSize="13" fontWeight="800" fill={P.income}>Receitas</text>
                    <text x={xL-8} y={lY/2+11} textAnchor="end" fontSize="10" fill={P.muted}>{fmt(sankeyData.inc)}</text>
                    {rows.map((r,i)=>{
                      const x1=xL+nodeW, x2=xR, mx=(x1+x2)/2, ncy=r.rY+r.h/2;
                      const path=`M${x1},${r.lY} C${mx},${r.lY} ${mx},${r.rY} ${x2},${r.rY} L${x2},${r.rY+r.h} C${mx},${r.rY+r.h} ${mx},${r.lY+r.h} ${x1},${r.lY+r.h} Z`;
                      return(
                        <g key={i}>
                          <path d={path} fill={r.color} fillOpacity={0.32}/>
                          <rect x={xR} y={r.rY} width={nodeW} height={r.h} rx={3} fill={r.color}/>
                          {Math.abs(r.cy-ncy)>5&&<line x1={xR+nodeW} y1={ncy} x2={xR+nodeW+9} y2={r.cy} stroke={r.color} strokeOpacity={0.55} strokeWidth={1}/>}
                          <text x={xR+nodeW+12} y={r.cy-4} dominantBaseline="middle" fontSize="12.5" fontWeight="700" fill={P.text}>{r.d.name}</text>
                          <text x={xR+nodeW+12} y={r.cy+11} dominantBaseline="middle" fontSize="10" fill={P.muted}>{fmt(r.d.value)}</text>
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}
              </div>
            </div>
          )}
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
                <input style={{...S.sel,width:mob?"100%":190,cursor:"text"}} placeholder="🔍 Buscar descrição..."
                  value={searchTxt} onChange={e=>setSearchTxt(e.target.value)}/>
                {filterCat!=="all"&&(
                  <button style={{...S.btn(P.muted),padding:"8px 12px",fontSize:12,color:P.text}} onClick={()=>setFilterCat("all")}>✕ Limpar</button>
                )}
              </div>
            </div>
              {selTx.size>0&&(
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",padding:"10px 14px",margin:"0 0 12px",background:`rgba(${hexRgb(P.gold)},0.08)`,border:`1px solid rgba(${hexRgb(P.gold)},0.3)`,borderRadius:10}}>
                  <span style={{fontWeight:800,color:P.gold,fontSize:13}}>{selTx.size} selecionado{selTx.size>1?"s":""}</span>
                  <select style={{...S.sel,width:"auto",padding:"6px 10px",fontSize:12}} value="" onChange={e=>{const v=e.target.value;e.target.value="";bulkCat(v);}}>
                    <option value="">Mudar categoria…</option>
                    {CATS_EXP.map(c=><option key={c}>{c}</option>)}
                    {CATS_INC.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <button style={{...S.btn(P.income),padding:"6px 12px",fontSize:12,color:"#08080f"}} onClick={bulkConfirm}>✓ Confirmar pagos</button>
                  <button style={{...S.btn(P.expense),padding:"6px 12px",fontSize:12}} onClick={bulkDelete}>✕ Excluir</button>
                  <button style={{...S.btn(P.muted),padding:"6px 12px",fontSize:12,color:P.text}} onClick={clearSel}>Limpar seleção</button>
                </div>
              )}
              <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:mob?540:0}}>
                <thead><tr>
                  <th style={{...S.th,width:32}}><input type="checkbox" checked={allSelected} onChange={toggleAll}/></th>
                  {["Mês","Tipo","Categoria","Descrição","Valor","Status",""].map((h,i)=><th key={i} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {lancRows.map(e=>{
                    const st = txStatus(e);
                    const stStyle = {
                      confirmed: {color:P.income,  label:"✓ Pago"},
                      late:      {color:"#fb923c",  label:"⚠️ Atrasado"},
                      pending:   {color:P.surplus,  label:"◌ Pendente"},
                      future:    {color:P.muted,    label:"◌ Previsto"},
                    }[st];
                    return(
                      <tr key={e.id} style={{opacity:st==="future"?0.7:1,background:selTx.has(e.id)?`rgba(${hexRgb(P.gold)},0.07)`:"transparent"}}>
                        <td style={S.td}><input type="checkbox" checked={selTx.has(e.id)} onChange={()=>toggleSel(e.id)}/></td>
                        <td style={{...S.td,color:P.sub,fontSize:11,fontWeight:600}}>{lbl(e.ym)}</td>
                        <td style={S.td}><span style={S.bdg(e.type==="income"?P.income:P.expense)}>{e.type==="income"?"↑":"↓"}</span></td>
                        <td style={{...S.td,color:P.sub,fontSize:11,fontWeight:600}}>{e.cat}</td>
                        <td style={{...S.td,color:P.text,fontWeight:500}}>{e.note}{e.i_total&&<span style={{fontSize:11,color:P.surplus,marginLeft:4,fontWeight:700}}>[{e.i_num}/{e.i_total}]</span>}</td>
                        <td style={{...S.td,fontWeight:800,color:e.type==="income"?P.income:P.expense}}>{e.type==="income"?"+":"-"}{fmt(e.amount)}</td>
                        <td style={S.td}><span style={{fontSize:12,fontWeight:700,color:stStyle.color}}>{stStyle.label}</span></td>
                        <td style={{...S.td,display:"flex",gap:6,alignItems:"center"}}>
                          {st!=="confirmed"&&st!=="future"&&(
                            <button style={{...S.btn(P.income),padding:"4px 10px",fontSize:11,color:"#08080f"}}
                              onClick={()=>openConfirm(e)}>✓</button>
                          )}
                          {st==="future"&&(
                            <button style={{...S.btn(P.muted),padding:"4px 10px",fontSize:11,color:P.text}}
                              onClick={()=>openConfirm(e)}>✓</button>
                          )}
                          <button style={S.btnD} onClick={()=>delTx(e.id)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
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
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",borderRadius:9,background:c.est?"rgba(147,197,253,0.06)":"rgba(255,255,255,0.04)",border:`1px solid ${c.est?`rgba(${hexRgb(P.surplus)},0.25)`:P.border}`}}>
                        <span style={{fontSize:12,color:P.sub,fontWeight:600}}>{c.cat}{c.est&&<span style={{color:P.surplus,fontWeight:700,marginLeft:5,fontSize:10}}>est.</span>}</span>
                        <span style={{fontSize:13,fontWeight:800,color:c.est?P.surplus:P.expense}}>{fmt(c.v)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:mob?450:0}}>
                      <thead><tr>{["Categoria","Descrição","Valor","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {cf.entries.sort((a,b)=>a.type.localeCompare(b.type)||b.amount-a.amount).map(e=>{
                          const st = txStatus(e);
                          const stStyle = {
                            confirmed:{color:P.income, label:"✓ Pago"},
                            late:     {color:"#fb923c",label:"⚠️ Atrasado"},
                            pending:  {color:P.surplus,label:"◌ Pendente"},
                            future:   {color:P.muted,  label:"◌ Previsto"},
                          }[st];
                          return(
                            <tr key={e.id} style={{opacity:st==="future"?0.7:1}}>
                              <td style={{...S.td,color:P.sub,fontWeight:600}}>{e.cat}</td>
                              <td style={{...S.td,color:P.text,fontWeight:500}}>{e.note}{e.i_total&&<span style={{color:P.surplus,marginLeft:4,fontWeight:700}}>[{e.i_num}/{e.i_total}]</span>}</td>
                              <td style={{...S.td,fontWeight:800,color:e.type==="income"?P.income:P.expense}}>{e.type==="income"?"+":"-"}{fmt(e.amount)}</td>
                              <td style={S.td}><span style={{fontSize:12,fontWeight:700,color:stStyle.color}}>{stStyle.label}</span></td>
                              <td style={S.td}>
                                {st!=="confirmed"&&(
                                  <button style={{...S.btn(st==="future"?P.muted:P.income),padding:"3px 10px",fontSize:11,color:st==="future"?P.text:"#08080f"}}
                                    onClick={()=>openConfirm(e)}>✓ Confirmar</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
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

          {/* Cards de resumo dinâmicos */}
          {invs.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:14}}>
              {[
                {label:"Total Aportado",  value:totInv,          color:P.invest, sub:`${invs.length} ativos`},
                {label:"Valor Atual",     value:totalCurrentValue,color:P.gold,   sub:marketUpdatedAt?`atualizado ${marketUpdatedAt}`:"preço de compra"},
                {label:"Ganho / Perda",   value:totalGain,        color:totalGain>=0?P.income:P.expense, sub:totInv>0?`${((totalGain/totInv)*100).toFixed(1)}% sobre aportado`:""},
                {label:"Ativos c/ Cotação",value:invs.filter(i=>i.ticker&&marketPrices[i.ticker?.toUpperCase()]).length,color:P.surplus,
                  sub:`de ${invs.length} no total`, isCount:true},
              ].map(c=>(
                <div key={c.label} style={{background:`linear-gradient(135deg,rgba(${hexRgb(c.color)},0.1),rgba(0,0,0,0.4))`,border:`1px solid rgba(${hexRgb(c.color)},0.25)`,borderRadius:14,padding:"14px 18px"}}>
                  <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:2,color:P.muted,marginBottom:4,fontWeight:700}}>{c.label}</div>
                  <div style={{fontSize:c.isCount?28:20,fontWeight:900,color:c.color,lineHeight:1}}>{c.isCount?c.value:fmt(c.value)}</div>
                  <div style={{fontSize:11,color:P.muted,marginTop:3,fontWeight:500}}>{c.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <div style={S.secT}>Registrar Investimento</div>
              {marketLoading&&<span style={{fontSize:12,color:P.muted,fontWeight:600}}>🔄 Buscando cotações...</span>}
              {!marketLoading&&marketUpdatedAt&&<button style={{...S.btn(P.muted),padding:"6px 12px",fontSize:11,color:P.text}} onClick={()=>fetchMarketPrices(invs)}>🔄 Atualizar cotações</button>}
            </div>
            <div style={S.row}>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Tipo</label>
                <select style={S.sel} value={invF.type} onChange={e=>setInvF(f=>({...f,type:e.target.value,returnRate:["Ações","FIIs","ETF","BDR","Cripto"].includes(e.target.value)?"":f.returnRate}))}>
                  {INVEST_T.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{...S.fGrp,flex:2}}>
                <label style={S.fLbl}>Nome completo</label>
                <input style={S.inp} placeholder="Ex: Petrobras, Bitcoin, CDB XP..." value={invF.name}
                  onChange={e=>setInvF(f=>({...f,name:e.target.value}))}/>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Ticker / Código <span style={{color:P.muted,fontSize:10}}>(opcional)</span></label>
                <input style={S.inp} placeholder="PETR4, BTC, HGLG11..." value={invF.ticker||""}
                  onChange={e=>setInvF(f=>({...f,ticker:e.target.value.toUpperCase()}))}/>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Qtde <span style={{color:P.muted,fontSize:10}}>(opcional)</span></label>
                <input style={S.inp} type="number" placeholder="0" value={invF.quantity||""}
                  onChange={e=>setInvF(f=>({...f,quantity:e.target.value}))}/>
              </div>
              <div style={S.fGrp}>
                <label style={S.fLbl}>Valor Aportado (R$)</label>
                <input style={S.inp} type="number" placeholder="0,00" value={invF.amount}
                  onChange={e=>setInvF(f=>({...f,amount:e.target.value}))}/>
              </div>
              {/* Rentabilidade só para Renda Fixa e Fundos */}
              {["Renda Fixa","Poupança","Tesouro Direto","Fundos"].includes(invF.type)&&(
                <div style={S.fGrp}>
                  <label style={S.fLbl}>Retorno a.a. (%)</label>
                  <input style={S.inp} type="number" placeholder="12.5" value={invF.returnRate}
                    onChange={e=>setInvF(f=>({...f,returnRate:e.target.value}))}/>
                </div>
              )}
              <div style={S.fGrp}>
                <label style={S.fLbl}>Data Aporte</label>
                <input style={S.inp} type="month" value={invF.ym}
                  onChange={e=>setInvF(f=>({...f,ym:e.target.value}))}/>
              </div>
              <button style={S.btn(P.invest)} onClick={addInv}>+ Registrar</button>
            </div>
            {["Ações","FIIs","ETF","BDR","Cripto"].includes(invF.type)&&(
              <div style={{fontSize:12,color:P.surplus,padding:"7px 12px",background:"rgba(147,197,253,0.07)",borderRadius:10,fontWeight:600,marginTop:4}}>
                💡 Para <strong>{invF.type}</strong> a rentabilidade é variável. Informe o Ticker e a Quantidade para acompanhar a cotação de mercado automaticamente.
              </div>
            )}
          </div>

          {/* Gráfico de acumulação real */}
          {invs.length>0&&investAccum.length>1&&(
            <div style={{...S.card,marginTop:14}}>
              <div style={S.secT}>Patrimônio Acumulado por Aporte</div>
              <ResponsiveContainer width="100%" height={mob?200:240}>
                <BarChart data={investAccum}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"} width={65}/>
                  <Tooltip content={<CTooltip/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                  {investTypes.map((t,i)=>(
                    <Bar key={t} dataKey={t} stackId="a" fill={PIE_C[i%PIE_C.length]} radius={i===investTypes.length-1?[4,4,0,0]:[0,0,0,0]}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Patrimônio ao longo do tempo */}
          <div style={{...S.card,marginTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:12}}>
              <div style={S.secT}>Patrimônio ao Longo do Tempo</div>
              <button style={{...S.btn(P.gold),padding:"7px 14px",fontSize:12}} onClick={recordSnapshot}>📸 Salvar foto deste mês</button>
            </div>
            {snapshots.length>0?(
              <ResponsiveContainer width="100%" height={mob?200:260}>
                <AreaChart data={snapshots.map(s=>({...s,label:lbl(s.ym)}))}>
                  <defs>
                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={P.gold} stopOpacity={0.35}/>
                      <stop offset="100%" stopColor={P.gold} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                  <XAxis dataKey="label" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"} width={65}/>
                  <Tooltip content={<CTooltip/>}/>
                  <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                  <Area type="monotone" dataKey="net_worth" name="Patrimônio" stroke={P.gold} strokeWidth={2} fill="url(#nwGrad)"/>
                  <Area type="monotone" dataKey="portfolio_value" name="Carteira" stroke={P.invest} strokeWidth={2} fillOpacity={0}/>
                </AreaChart>
              </ResponsiveContainer>
            ):(
              <div style={{color:P.muted,fontSize:13,padding:"6px 0"}}>
                Clique em <strong style={{color:P.gold}}>"Salvar foto deste mês"</strong> para registrar seu patrimônio atual ({fmt(netWorth)} = carteira {fmt(totalCurrentValue)} + caixa {fmt(cashBalance)}). Repita uma vez por mês e a curva de evolução vai se formando.
              </div>
            )}
          </div>

          {/* Tabela da carteira */}
          {invs.length>0&&(
            <div style={{...S.card,marginTop:14}}>
              <div style={S.secT}>Carteira</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:mob?600:0}}>
                  <thead>
                    <tr>{["Tipo","Nome","Ticker","Aportado","Cotação","Valor Atual","Ganho/Perda",""].map((h,i)=><th key={i} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {invs.map(inv=>{
                      const tk = inv.ticker?.toUpperCase();
                      const price = tk && marketPrices[tk];
                      const curVal = currentValue(inv);
                      const gain = curVal - +inv.amount;
                      const gainPct = +inv.amount>0?(gain/+inv.amount*100).toFixed(1):0;
                      return(
                        <tr key={inv.id}>
                          <td style={S.td}><span style={S.bdg(P.invest)}>{inv.type}</span></td>
                          <td style={{...S.td,fontWeight:700,color:P.text,maxWidth:150}}>{inv.name}</td>
                          <td style={{...S.td,fontWeight:700,color:P.gold}}>{inv.ticker||<span style={{color:P.muted,fontWeight:400}}>—</span>}</td>
                          <td style={{...S.td,fontWeight:800,color:P.invest}}>{fmt(inv.amount)}</td>
                          <td style={S.td}>
                            {price
                              ? <span style={{color:P.surplus,fontWeight:700}}>{fmt(price)}</span>
                              : <span style={{color:P.muted,fontSize:11}}>{inv.ticker?"buscando...":"—"}</span>}
                          </td>
                          <td style={{...S.td,fontWeight:900,color:P.gold}}>{fmt(curVal)}</td>
                          <td style={S.td}>
                            {inv.ticker&&price&&inv.quantity?(
                              <span style={{fontWeight:700,color:gain>=0?P.income:P.expense}}>
                                {gain>=0?"+":""}{fmt(gain)} ({gainPct}%)
                              </span>
                            ):<span style={{color:P.muted,fontSize:11}}>—</span>}
                          </td>
                          <td style={S.td}><button style={S.btnD} onClick={()=>delInv(inv.id)}>✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{display:"flex",gap:20,marginTop:12,padding:"10px 10px 0",borderTop:`1px solid ${P.border}`,flexWrap:"wrap"}}>
                <span style={{fontSize:13,color:P.sub,fontWeight:600}}>Aportado: <strong style={{color:P.invest}}>{fmt(totInv)}</strong></span>
                <span style={{fontSize:13,color:P.sub,fontWeight:600}}>Valor Atual: <strong style={{color:P.gold}}>{fmt(totalCurrentValue)}</strong></span>
                <span style={{fontSize:13,color:P.sub,fontWeight:600}}>Resultado: <strong style={{color:totalGain>=0?P.income:P.expense}}>{totalGain>=0?"+":""}{fmt(totalGain)}</strong></span>
              </div>
            </div>
          )}
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
                <div style={S.secT}>Patrimônio por Tipo de Ativo</div>
                <ResponsiveContainer width="100%" height={mob?200:240}>
                  <BarChart data={investAccum}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:P.muted,fontWeight:600}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>"R$"+(v/1000).toFixed(0)+"k"} width={60}/>
                    <Tooltip content={<CTooltip/>}/>
                    <Legend wrapperStyle={{fontSize:12,color:P.sub,fontWeight:600}}/>
                    {investTypes.map((t,i)=>(
                      <Bar key={t} dataKey={t} stackId="a" fill={PIE_C[i%PIE_C.length]} radius={i===investTypes.length-1?[4,4,0,0]:[0,0,0,0]}/>
                    ))}
                  </BarChart>
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

        {/* ══ IMPORTAR ════════════════════════════════════════════════════ */}
        {tab==="importar" && <>

          {/* STEP: upload */}
          {importStep==="upload" && <>
            <div style={{...S.card,marginBottom:14}}>
              <div style={S.secT}>📥 Importar Extrato de Investimentos</div>
              <div style={{fontSize:13,color:P.sub,marginBottom:20,lineHeight:1.8}}>
                Faça upload do extrato da sua corretora. A IA lê e extrai seus ativos automaticamente.<br/>
                <strong style={{color:P.gold}}>Formatos aceitos: PDF · Excel (.xlsx) · CSV</strong><br/>
                <span style={{fontSize:12,color:P.muted}}>Compatível com EQI, BTG, XP, Rico, Nubank, Inter, MyProfit e outros.</span>
              </div>

              {/* Drop zone */}
              <div onClick={()=>document.getElementById("importFileInput").click()} style={{
                border:`2px dashed rgba(${hexRgb(P.gold)},0.35)`,borderRadius:14,
                padding:"40px 24px",textAlign:"center",cursor:"pointer",
                background:"rgba(251,191,36,0.04)",transition:"border 0.2s",
              }}>
                <div style={{fontSize:44,marginBottom:12}}>📄</div>
                <div style={{fontSize:15,fontWeight:800,color:P.text,marginBottom:6}}>Clique para selecionar o arquivo</div>
                <div style={{fontSize:12,color:P.muted}}>PDF, Excel (.xlsx / .xls) ou CSV · Máx. 20MB</div>
                <input id="importFileInput" type="file" accept=".pdf,.xlsx,.xls,.csv"
                  style={{display:"none"}}
                  onChange={e=>{const f=e.target.files?.[0];if(f)handleImportFile(f);e.target.value="";}}/>
              </div>

              {importError&&<div style={{marginTop:14,fontSize:13,color:P.expense,padding:"10px 14px",background:"rgba(252,165,165,0.08)",borderRadius:10,fontWeight:600}}>⚠️ {importError}</div>}
            </div>

            <div style={{...S.card,background:"rgba(255,255,255,0.02)"}}>
              <div style={{fontSize:11,fontWeight:800,color:P.muted,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>Como funciona</div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:12}}>
                {[
                  {icon:"1️⃣",title:"Upload",desc:"Selecione o PDF ou Excel do extrato da sua corretora"},
                  {icon:"2️⃣",title:"IA analisa",desc:"Claude lê o arquivo e identifica todos os seus ativos automaticamente"},
                  {icon:"3️⃣",title:"Confirme",desc:"Revise os dados, edite se necessário e salve no seu portfólio"},
                ].map(s=>(
                  <div key={s.title} style={{padding:"16px",borderRadius:12,background:"rgba(255,255,255,0.03)",border:`1px solid ${P.border}`}}>
                    <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
                    <div style={{fontSize:13,fontWeight:800,color:P.text,marginBottom:4}}>{s.title}</div>
                    <div style={{fontSize:12,color:P.sub,lineHeight:1.5}}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {/* STEP: loading */}
          {importStep==="loading"&&(
            <div style={{...S.card,textAlign:"center",padding:"60px 24px"}}>
              <div style={{fontSize:44,marginBottom:16}}>🤖</div>
              <div style={{fontSize:16,fontWeight:900,color:P.gold,marginBottom:8}}>Analisando seu extrato...</div>
              <div style={{fontSize:13,color:P.sub}}>A IA está lendo o arquivo e identificando seus investimentos. Aguarde alguns segundos.</div>
            </div>
          )}

          {/* STEP: preview */}
          {importStep==="preview"&&<>
            <div style={{...S.card,marginBottom:14,background:"rgba(110,231,160,0.05)",border:`1px solid rgba(${hexRgb(P.income)},0.2)`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                <div>
                  <div style={{fontWeight:900,fontSize:15,color:P.income,marginBottom:3}}>
                    ✅ {importItems.length} investimentos identificados
                  </div>
                  <div style={{fontSize:12,color:P.sub}}>Revise, edite e confirme os que deseja salvar no portfólio.</div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button style={{...S.btn(P.muted),color:P.text,fontSize:12}} onClick={()=>{setImportStep("upload");setImportItems([]);setImportError(null);}}>← Novo arquivo</button>
                  <button style={S.btn(P.income)} disabled={importSaving||!importItems.some(i=>i._sel)} onClick={saveImportedItems}>
                    {importSaving?"Salvando...": `💾 Salvar ${importItems.filter(i=>i._sel).length} selecionados`}
                  </button>
                </div>
              </div>
            </div>

            <div style={S.card}>
              <div style={{fontSize:12,color:P.sub,marginBottom:10,fontWeight:600}}>
                💡 Edite nome, tipo, valor ou taxa antes de salvar. Desmarque itens que não quiser importar.
              </div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:650}}>
                  <thead>
                    <tr>
                      <th style={{...S.th,width:36}}>
                        <input type="checkbox"
                          checked={importItems.length>0&&importItems.every(i=>i._sel)}
                          onChange={e=>setImportItems(p=>p.map(i=>({...i,_sel:e.target.checked})))}/>
                      </th>
                      {["Nome","Ticker","Tipo","Valor (R$)","Retorno a.a. %","Mês Aporte"].map(h=><th key={h} style={S.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {importItems.map((item,idx)=>(
                      <tr key={item._id} style={{opacity:item._sel?1:0.4}}>
                        <td style={S.td}>
                          <input type="checkbox" checked={item._sel}
                            onChange={e=>setImportItems(p=>p.map((i,j)=>j===idx?{...i,_sel:e.target.checked}:i))}/>
                        </td>
                        <td style={S.td}>
                          <input style={{...S.inp,fontSize:12,padding:"5px 8px"}} value={item.name}
                            onChange={e=>setImportItems(p=>p.map((i,j)=>j===idx?{...i,name:e.target.value}:i))}/>
                        </td>
                        <td style={S.td}>
                          <input style={{...S.inp,fontSize:12,padding:"5px 8px",width:100,textTransform:"uppercase"}} placeholder="—" value={item.ticker||""}
                            onChange={e=>setImportItems(p=>p.map((i,j)=>j===idx?{...i,ticker:e.target.value.toUpperCase()}:i))}/>
                        </td>
                        <td style={S.td}>
                          <select style={{...S.sel,fontSize:12,padding:"5px 8px"}} value={item.type}
                            onChange={e=>setImportItems(p=>p.map((i,j)=>j===idx?{...i,type:e.target.value}:i))}>
                            {INVEST_T.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={S.td}>
                          <input style={{...S.inp,fontSize:12,padding:"5px 8px",width:120}} type="number" value={item.amount}
                            onChange={e=>setImportItems(p=>p.map((i,j)=>j===idx?{...i,amount:+e.target.value}:i))}/>
                        </td>
                        <td style={S.td}>
                          <input style={{...S.inp,fontSize:12,padding:"5px 8px",width:80}} type="number" value={item.return_rate}
                            onChange={e=>setImportItems(p=>p.map((i,j)=>j===idx?{...i,return_rate:+e.target.value}:i))}/>
                        </td>
                        <td style={S.td}>
                          <input style={{...S.inp,fontSize:12,padding:"5px 8px",width:120}} type="month" value={item.ym}
                            onChange={e=>setImportItems(p=>p.map((i,j)=>j===idx?{...i,ym:e.target.value}:i))}/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>}

          {/* STEP: done */}
          {importStep==="done"&&(
            <div style={{...S.card,textAlign:"center",padding:"60px 24px"}}>
              <div style={{fontSize:44,marginBottom:16}}>🎉</div>
              <div style={{fontSize:18,fontWeight:900,color:P.income,marginBottom:8}}>Importação concluída!</div>
              <div style={{fontSize:13,color:P.sub,marginBottom:24}}>Seus ativos foram adicionados ao portfólio com sucesso.</div>
              <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                <button style={S.btn(P.invest)} onClick={()=>{setTab("investimentos");setImportStep("upload");}}>📈 Ver Investimentos</button>
                <button style={{...S.btn(P.muted),color:P.text}} onClick={()=>{setImportStep("upload");setImportItems([]);}}>📥 Importar mais</button>
              </div>
            </div>
          )}
        </>}

      </main>

      {/* ── Modal de Confirmação ── */}
      {confirmModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={e=>{if(e.target===e.currentTarget)setConfirmModal(null);}}>
          <div style={{...S.card,width:"100%",maxWidth:420,background:"#0f0f18",border:`1px solid rgba(${hexRgb(P.income)},0.3)`}}>
            <div style={{fontSize:15,fontWeight:900,color:P.income,marginBottom:4}}>✓ Confirmar Pagamento</div>
            <div style={{fontSize:12,color:P.sub,marginBottom:20,fontWeight:600}}>{confirmModal.note} · {lbl(confirmModal.ym)}</div>
            <div style={{marginBottom:16}}>
              <label style={{...S.fLbl,display:"block",marginBottom:6}}>Valor Real (R$)</label>
              <input style={{...S.inp,fontSize:16,padding:"12px 14px"}} type="number"
                value={confirmModal.amount}
                onChange={e=>setConfirmModal(f=>({...f,amount:+e.target.value}))}/>
              <div style={{fontSize:11,color:P.muted,marginTop:5}}>Ajuste se o valor real diferiu do previsto.</div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button style={{...S.btn(P.income),flex:1,padding:"12px"}} onClick={confirmTx}>✓ Confirmar como Pago</button>
              <button style={{...S.btn(P.muted),padding:"12px 16px",color:P.text}} onClick={()=>setConfirmModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
