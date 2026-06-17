// Proxy de cotações via Yahoo Finance (server-side, sem problema de CORS).
// Cobre B3 (sufixo .SA), ações/ETFs internacionais e devolve o câmbio USD/BRL.
// Uso: GET /api/quote?tickers=PETR4,HGLG11,HPQ,VWO
export const config = { runtime: "edge" };

// Padrão de ticker da B3: 4 letras + 1 ou 2 dígitos (PETR4, HGLG11, BIAU39)
const B3_RE = /^[A-Z]{4}\d{1,2}$/;

async function yahooPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const data = await res.json();
    const m = data?.chart?.result?.[0]?.meta;
    if (!m || m.regularMarketPrice == null) return null;
    return { price: m.regularMarketPrice, currency: m.currency };
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const tickers = (searchParams.get("tickers") || "")
    .split(",")
    .map(t => t.trim().toUpperCase())
    .filter(Boolean);

  const prices = {};

  // Câmbio USD->BRL para converter ativos cotados em dólar
  const fx = await yahooPrice("BRL=X");
  const usdbrl = fx ? fx.price : null;

  // Busca em lotes de 8 pra não estourar limite do Yahoo
  const CONC = 8;
  for (let k = 0; k < tickers.length; k += CONC) {
    await Promise.all(
      tickers.slice(k, k + CONC).map(async tk => {
        const symbol = B3_RE.test(tk) ? `${tk}.SA` : tk;
        const q = await yahooPrice(symbol);
        if (q) prices[tk] = q; // { price, currency }
      })
    );
  }

  return new Response(JSON.stringify({ prices, usdbrl }), {
    headers: {
      "Content-Type": "application/json",
      // cache de 5 min na borda da Vercel — reduz chamadas ao Yahoo
      "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
    },
  });
}
