import { NextResponse } from "next/server";
import { EconomicCalendarItem, NewsArticle, NewsApiResponse } from "@/lib/news-types";

// Caché en memoria para no saturar las fuentes externas
let cachedData: NewsApiResponse | null = null;
let lastCacheTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

// Diccionario de traducción de eventos macro comunes al español
const TRANSLATION_MAP: Record<string, { title: string; desc: string }> = {
  "cpi": { title: "IPC / Inflación Mensual", desc: "Índice de Precios al Consumo. Volatilidad máxima." },
  "core cpi": { title: "IPC Subyacente", desc: "Medida clave de inflación sin alimentos ni energía." },
  "ppi": { title: "IPP (Precios al Productor)", desc: "Inflación mayorista que anticipa presiones al consumidor." },
  "core ppi": { title: "IPP Subyacente", desc: "Precios al productor excluyendo componentes volátiles." },
  "non-farm employment change": { title: "Nóminas No Agrícolas (NFP)", desc: "Informe mensual clave del empleo en EE.UU." },
  "unemployment rate": { title: "Tasa de Desempleo", desc: "Porcentaje de fuerza laboral sin empleo." },
  "federal funds rate": { title: "Tipos de Interés de la Fed (FOMC)", desc: "Decisión de política monetaria del banco central estadounidense." },
  "fomc statement": { title: "Comunicado del FOMC", desc: "Perspectivas y guía futura sobre tipos de interés." },
  "fomc press conference": { title: "Rueda de Prensa de Jerome Powell", desc: "Intervención del presidente de la Reserva Federal." },
  "gdp": { title: "PIB (Producto Interior Bruto)", desc: "Crecimiento de la economía nacional." },
  "advance gdp": { title: "PIB Preliminar", desc: "Primera estimación del crecimiento trimestral." },
  "retail sales": { title: "Ventas Minoristas", desc: "Indicador fundamental de consumo y gasto del consumidor." },
  "core retail sales": { title: "Ventas Minoristas Subyacentes", desc: "Consumo excluyendo automóviles." },
  "ism manufacturing pmi": { title: "PMI Manufacturero ISM", desc: "Salud y actividad de la industria fabril." },
  "ism services pmi": { title: "PMI de Servicios ISM", desc: "Actividad del sector servicios (mayor parte del PIB)." },
  "unemployment claims": { title: "Peticiones Semanales de Subsidio por Desempleo", desc: "Solicitudes semanales de desempleo." },
  "jolts job openings": { title: "Ofertas de Empleo JOLTs", desc: "Demanda de trabajadores por parte de las empresas." },
  "crude oil inventories": { title: "Inventarios de Petróleo Crudo EIA", desc: "Reservas de crudo y derivados." },
  "consumer sentiment": { title: "Confianza del Consumidor Univ. Michigan", desc: "Sentimiento y expectativas de inflación de los hogares." },
  "ecb interest rate": { title: "Tipos de Interés del BCE", desc: "Decisión de política monetaria del Banco Central Europeo." },
};

function translateEvent(englishTitle: string): { title: string; desc: string } {
  const lower = englishTitle.toLowerCase();
  for (const [key, val] of Object.entries(TRANSLATION_MAP)) {
    if (lower.includes(key)) {
      return { title: val.title, desc: val.desc };
    }
  }
  return { title: englishTitle, desc: "Evento macroeconómico relevante." };
}

// Decodificador de entidades HTML básicas
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function calculateTimeAgo(dateString: string): string {
  try {
    const published = new Date(dateString).getTime();
    if (isNaN(published)) return "Reciente";
    const now = Date.now();
    const diffMin = Math.max(0, Math.floor((now - published) / (1000 * 60)));

    if (diffMin < 2) return "Ahora mismo";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  } catch {
    return "Reciente";
  }
}

function extractTickers(text: string): string[] {
  const upper = text.toUpperCase();
  const tickers: string[] = [];
  if (upper.includes("NVIDIA") || upper.includes("NVDA")) tickers.push("NVDA");
  if (upper.includes("APPLE") || upper.includes("AAPL")) tickers.push("AAPL");
  if (upper.includes("TESLA") || upper.includes("TSLA")) tickers.push("TSLA");
  if (upper.includes("MICROSOFT") || upper.includes("MSFT")) tickers.push("MSFT");
  if (upper.includes("AMAZON") || upper.includes("AMZN")) tickers.push("AMZN");
  if (upper.includes("META") || upper.includes("FACEBOOK")) tickers.push("META");
  if (upper.includes("ALPHABET") || upper.includes("GOOGLE") || upper.includes("GOOGL")) tickers.push("GOOGL");
  if (upper.includes("S&P") || upper.includes("SP500") || upper.includes("ES") || upper.includes("WALL STREET")) tickers.push("S&P 500");
  if (upper.includes("NASDAQ") || upper.includes("NQ")) tickers.push("NASDAQ");
  if (upper.includes("BITCOIN") || upper.includes("BTC") || upper.includes("CRYPTO")) tickers.push("BTC");
  if (upper.includes("FED") || upper.includes("POWELL") || upper.includes("FOMC") || upper.includes("TIPOS")) tickers.push("FED");
  return tickers.slice(0, 3);
}

function classifyCategory(title: string, summary: string): NewsArticle["category"] {
  const combined = (title + " " + summary).toLowerCase();
  if (combined.includes("bitcoin") || combined.includes("crypto") || combined.includes("ethereum")) return "Cripto";
  if (combined.includes("fed") || combined.includes("banco central") || combined.includes("inflación") || combined.includes("ipc") || combined.includes("tipos") || combined.includes("pib") || combined.includes("bce")) return "Macroeconomía";
  if (combined.includes("nvidia") || combined.includes("apple") || combined.includes("tesla") || combined.includes("microsoft") || combined.includes("inteligencia artificial") || combined.includes("ceo") || combined.includes("despido") || combined.includes("chips")) return "Empresas & Tech";
  if (combined.includes("wall street") || combined.includes("nasdaq") || combined.includes("s&p") || combined.includes("bolsa") || combined.includes("futuros") || combined.includes("dow jones")) return "Wall Street";
  return "General";
}

// Generador de noticias de contingencia / offline de alta calidad en español
function getFallbackNews(): NewsArticle[] {
  const now = new Date();
  const getPastIso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60000).toISOString();

  return [
    {
      id: "fb-1",
      title: "Nvidia y el debate en torno a su liderazgo: movimientos estratégicos de Jensen Huang y la carrera de la IA",
      summary: "Los analistas de Wall Street evalúan el impacto de las recientes negociaciones internas y la posición dominante de Nvidia en el suministro de chips de nueva generación para centros de datos.",
      url: "https://es.investing.com/equities/nvidia-corp-news",
      source: "Investing.com España",
      publishedAt: getPastIso(15),
      timeAgo: "Hace 15 min",
      category: "Empresas & Tech",
      tickers: ["NVDA", "NASDAQ"],
      impact: "ALTO",
    },
    {
      id: "fb-2",
      title: "Wall Street abre con cautela ante la próxima intervención de la Reserva Federal",
      summary: "Los futuros del Nasdaq y del S&P 500 cotizan en rango estrecho a la espera de las declaraciones de Jerome Powell y los nuevos datos de inflación mayorista (IPP).",
      url: "https://www.eleconomista.es/mercados-cotizaciones/",
      source: "El Economista",
      publishedAt: getPastIso(38),
      timeAgo: "Hace 38 min",
      category: "Wall Street",
      tickers: ["S&P 500", "NASDAQ", "FED"],
      impact: "ALTO",
    },
    {
      id: "fb-3",
      title: "El sector tecnológico lidera los volúmenes del mercado tras resultados récord en infraestructuras de IA",
      summary: "Grandes corporaciones de semiconductores y computación en la nube reafirman planes de inversión multimillonarios para el próximo trimestre fiscal.",
      url: "https://es.investing.com/news/stock-market-news",
      source: "Investing.com España",
      publishedAt: getPastIso(75),
      timeAgo: "Hace 1 h",
      category: "Empresas & Tech",
      tickers: ["MSFT", "GOOGL", "NVDA"],
      impact: "MEDIO",
    },
    {
      id: "fb-4",
      title: "La Fed reitera su postura data-dependent: el mercado ajusta las probabilidades de recortes de tipos",
      summary: "Los rendimientos del bono del Tesoro a 10 años reaccionan moderadamente mientras los operadores de futuros de tipos recalculan el calendario de la política monetaria.",
      url: "https://cincodias.elpais.com/mercados/",
      source: "Cinco Días",
      publishedAt: getPastIso(130),
      timeAgo: "Hace 2 h",
      category: "Macroeconomía",
      tickers: ["FED", "S&P 500"],
      impact: "ALTO",
    },
    {
      id: "fb-5",
      title: "Tesla y los fabricantes de vehículos eléctricos ajustan previsiones ante la demanda global",
      summary: "Wall Street sigue de cerca las entregas trimestrales y los márgenes brutos en un entorno de competencia creciente y tipos de interés restrictivos.",
      url: "https://es.investing.com/equities/tesla-motors-news",
      source: "Yahoo Finanzas",
      publishedAt: getPastIso(210),
      timeAgo: "Hace 3 h",
      category: "Empresas & Tech",
      tickers: ["TSLA"],
      impact: "MEDIO",
    },
    {
      id: "fb-6",
      title: "Bitcoin consolida por encima de zonas clave mientras el interés institucional sigue en máximos",
      summary: "Las entradas netas en ETFs al contado mantienen el impulso del mercado cripto con baja correlación momentánea respecto a los índices tradicionales.",
      url: "https://es.investing.com/crypto/bitcoin/news",
      source: "Investing.com Cripto",
      publishedAt: getPastIso(300),
      timeAgo: "Hace 5 h",
      category: "Cripto",
      tickers: ["BTC"],
      impact: "INFO",
    },
  ];
}

// Calendario de contingencia con carpetas de impacto para la semana en curso
function getFallbackCalendar(): EconomicCalendarItem[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);

  const formatDay = (offset: number) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  return [
    {
      id: "cal-1",
      title: "Ofertas de Empleo JOLTs",
      country: "USD",
      date: formatDay(1),
      time: "16:00",
      impact: "HIGH",
      forecast: "7.45M",
      previous: "7.44M",
      description: "Encuesta de vacantes laborales en EE.UU. Provoca volatilidad en la apertura americana.",
    },
    {
      id: "cal-2",
      title: "IPC / Índice de Precios al Consumo (Mensual e Interanual)",
      country: "USD",
      date: formatDay(2),
      time: "14:30",
      impact: "HIGH",
      forecast: "0.3%",
      previous: "0.2%",
      description: "Dato crítico de inflación. Máximo riesgo de slippage y ensanchamiento de spreads.",
    },
    {
      id: "cal-3",
      title: "Decisión de Tipos FOMC & Comunicado de la Fed",
      country: "USD",
      date: formatDay(2),
      time: "20:00",
      impact: "HIGH",
      forecast: "4.75%",
      previous: "5.00%",
      description: "Política monetaria de la Reserva Federal. No operar minutos antes de la publicación.",
    },
    {
      id: "cal-4",
      title: "Peticiones Semanales de Subsidio por Desempleo",
      country: "USD",
      date: formatDay(3),
      time: "14:30",
      impact: "HIGH",
      forecast: "218K",
      previous: "221K",
      description: "Informe de empleo semanal de EE.UU. Alta sensibilidad en contratos NQ y ES.",
    },
    {
      id: "cal-5",
      title: "IPP / Precios de Producción Mayorista",
      country: "USD",
      date: formatDay(3),
      time: "14:30",
      impact: "HIGH",
      forecast: "0.2%",
      previous: "0.1%",
      description: "Presión inflacionaria en la cadena de suministros y costes industriales.",
    },
    {
      id: "cal-6",
      title: "NFP - Nóminas No Agrícolas & Tasa de Desempleo",
      country: "USD",
      date: formatDay(4),
      time: "14:30",
      impact: "HIGH",
      forecast: "145K",
      previous: "254K",
      description: "La noticia de mayor volatilidad macroeconómica mensual de todo el mercado.",
    },
    {
      id: "cal-7",
      title: "Sentimiento del Consumidor Univ. Michigan",
      country: "USD",
      date: formatDay(4),
      time: "16:00",
      impact: "MEDIUM",
      forecast: "70.5",
      previous: "68.9",
      description: "Confianza económica de las familias y expectativas de inflación a largo plazo.",
    },
    {
      id: "cal-8",
      title: "Comparecencia de Christine Lagarde (BCE)",
      country: "EUR",
      date: formatDay(3),
      time: "15:00",
      impact: "MEDIUM",
      forecast: "-",
      previous: "-",
      description: "Discurso sobre la estabilidad financiera y expectativas de tipos en la Eurozona.",
    },
  ];
}

// Fetch y parseo de RSS de Google News / El Economista / Investing
async function fetchRssNews(): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];
  const urls = [
    "https://news.google.com/rss/search?q=bolsa+OR+acciones+OR+nvidia+OR+wall+street+OR+fed&hl=es&gl=ES&ceid=ES:es",
    "https://www.eleconomista.es/rss/rss-mercados.php",
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/rss+xml, application/xml, text/xml;q=0.9",
        },
        next: { revalidate: 300 },
      });

      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const xmlText = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemContent = match[1];

        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i) || itemContent.match(/href="([^"]+)"/i);
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
        const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

        if (!titleMatch || !linkMatch) continue;

        const rawTitle = decodeHtmlEntities(titleMatch[1]);
        const rawLink = decodeHtmlEntities(linkMatch[1]);
        const rawDesc = descMatch ? decodeHtmlEntities(descMatch[1]) : "";
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
        const rawSource = sourceMatch ? decodeHtmlEntities(sourceMatch[1]) : url.includes("eleconomista") ? "El Economista" : "Mercados";

        // Limpiar título de sufijos tipo "- El Economista" o "- Cinco Días"
        const cleanTitle = rawTitle.replace(/\s*-\s*[A-Za-z0-9\sÁ-ú.]+$/i, "").trim();

        const category = classifyCategory(cleanTitle, rawDesc);
        const tickers = extractTickers(cleanTitle + " " + rawDesc);

        articles.push({
          id: `rss-${Buffer.from(rawLink.slice(0, 40)).toString("base64")}`,
          title: cleanTitle,
          summary: rawDesc.slice(0, 220) + (rawDesc.length > 220 ? "..." : ""),
          url: rawLink,
          source: rawSource,
          publishedAt: pubDate,
          timeAgo: calculateTimeAgo(pubDate),
          category,
          tickers,
          impact: tickers.includes("NVDA") || tickers.includes("FED") || tickers.includes("S&P 500") ? "ALTO" : "MEDIO",
        });

        if (articles.length >= 25) break;
      }
    } catch {
      // Ignorar errores individuales para no bloquear el resto
    }
  }

  return articles;
}

// Fetch y adaptación del calendario macroeconómico
async function fetchEconomicCalendar(): Promise<EconomicCalendarItem[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 600 },
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error("Calendar fetch error");

    interface FfEvent {
      title: string;
      country: string;
      date: string;
      impact: string;
      forecast?: string;
      previous?: string;
    }

    const rawList: FfEvent[] = await res.json();
    const items: EconomicCalendarItem[] = [];

    for (const item of rawList) {
      // Filtrar divisas clave que afectan a índices y forex principales
      if (!["USD", "EUR", "GBP"].includes(item.country)) continue;

      let impact: EconomicCalendarItem["impact"] = "LOW";
      if (item.impact === "High") impact = "HIGH";
      else if (item.impact === "Medium") impact = "MEDIUM";
      else if (item.impact === "Holiday") impact = "HOLIDAY";

      const eventDate = new Date(item.date);
      const timeStr = !isNaN(eventDate.getTime())
        ? `${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}`
        : "14:30";

      const translated = translateEvent(item.title);

      items.push({
        id: `ff-${item.date}-${item.title.replace(/\s+/g, "_")}`,
        title: translated.title,
        country: item.country,
        date: item.date.slice(0, 10),
        time: timeStr,
        impact,
        forecast: item.forecast || "-",
        previous: item.previous || "-",
        description: translated.desc,
      });
    }

    return items.length > 0 ? items : getFallbackCalendar();
  } catch {
    return getFallbackCalendar();
  }
}

export async function GET() {
  const now = Date.now();

  // Si tenemos caché reciente, devolverla inmediatamente
  if (cachedData && now - lastCacheTime < CACHE_DURATION_MS) {
    return NextResponse.json({ ...cachedData, status: "cached" });
  }

  try {
    const [liveNews, liveCalendar] = await Promise.all([
      fetchRssNews(),
      fetchEconomicCalendar(),
    ]);

    const finalNews = liveNews.length > 0 ? liveNews : getFallbackNews();
    const finalCalendar = liveCalendar.length > 0 ? liveCalendar : getFallbackCalendar();

    // Actualizar caché
    cachedData = {
      calendar: finalCalendar,
      news: finalNews,
      lastUpdated: new Date().toISOString(),
      status: liveNews.length > 0 ? "live" : "fallback",
    };
    lastCacheTime = now;

    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    // Si todo falla, devolver contingencia sin error 500
    return NextResponse.json(
      {
        calendar: getFallbackCalendar(),
        news: getFallbackNews(),
        lastUpdated: new Date().toISOString(),
        status: "fallback",
      },
      { status: 200 }
    );
  }
}
