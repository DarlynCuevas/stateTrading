export interface EconomicEvent {
  id: string;
  title: string;
  currency: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  dateTime: string; // ISO string
  timeFormatted: string; // "14:30"
  forecast?: string;
  previous?: string;
  description: string;
}

/**
 * Genera el calendario de noticias de alto impacto (USD) para la semana actual
 * basándose en el calendario estándar macroeconómico de EE.UU.
 */
export function getWeeklyEconomicEvents(referenceDate: Date = new Date()): EconomicEvent[] {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();
  const dayOfWeek = referenceDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.

  // Encontrar el lunes de esta semana
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(year, month, currentDay + diffToMonday);

  const events: EconomicEvent[] = [];

  // Función helper para construir fecha con hora en zona horaria europea/Madrid (14:30 Madrid = 08:30 ET)
  const createEvent = (
    dayOffset: number,
    hour: number,
    minute: number,
    title: string,
    description: string,
    forecast?: string,
    previous?: string
  ): EconomicEvent => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);

    const timeFormatted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const dateFormatted = d.toISOString().slice(0, 10);

    return {
      id: `${dateFormatted}-${hour}-${minute}-${title.replace(/\s+/g, "_")}`,
      title,
      currency: "USD",
      impact: "HIGH",
      dateTime: d.toISOString(),
      timeFormatted,
      forecast,
      previous,
      description,
    };
  };

  // Eventos recurrentes estándar de alta volatilidad (horarios en CET/CEST - Madrid):
  // Martes (dayOffset 1)
  events.push(
    createEvent(
      1,
      16,
      0,
      "JOLTs Job Openings",
      "Encuesta de ofertas de empleo. Alta volatilidad en apertura/primeros 30 min.",
      "7.45M",
      "7.44M"
    )
  );

  // Miércoles (dayOffset 2)
  events.push(
    createEvent(
      2,
      14,
      30,
      "CPI / IPC Mensual & Anual",
      "Índice de Precios al Consumidor. MÁXIMA VOLATILIDAD y riesgo de slippage.",
      "0.3%",
      "0.2%"
    ),
    createEvent(
      2,
      20,
      0,
      "Decisión de Tipos FOMC & Rueda de Prensa Fed",
      "Anuncio de política monetaria. No operar 15 min antes ni durante el comunicado.",
      "4.75%",
      "5.00%"
    )
  );

  // Jueves (dayOffset 3) - Todos los jueves
  events.push(
    createEvent(
      3,
      14,
      30,
      "Peticiones de Subsidio por Desempleo (Jobless Claims)",
      "Reclamos semanales de desempleo. Movimiento brusco antes de la apertura de contado.",
      "217K",
      "221K"
    ),
    createEvent(
      3,
      14,
      30,
      "PPI / IPP Precios de Productor",
      "Inflación mayorista. Afecta fuertemente a NQ/MNQ.",
      "0.2%",
      "0.1%"
    )
  );

  // Viernes (dayOffset 4)
  events.push(
    createEvent(
      4,
      14,
      30,
      "NFP - Nóminas No Agrícolas & Tasa de Desempleo",
      "Dato de empleo mensual. Volatilidad extrema, spreads ensanchados.",
      "140K",
      "254K"
    ),
    createEvent(
      4,
      16,
      0,
      "Sentimiento del Consumidor Univ. Michigan",
      "Expectativas de inflación y confianza del consumidor.",
      "70.5",
      "68.9"
    )
  );

  return events.sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );
}

/**
 * Obtiene las noticias de hoy y calcula el estado y tiempo restante
 */
export function getTodayNewsStatus(referenceDate: Date = new Date()) {
  const events = getWeeklyEconomicEvents(referenceDate);
  const todayStr = referenceDate.toISOString().slice(0, 10);

  const todayEvents = events.filter((e) => e.dateTime.slice(0, 10) === todayStr);

  const nowMs = referenceDate.getTime();

  // Encontrar la próxima noticia más cercana
  const upcomingEvents = todayEvents.filter((e) => new Date(e.dateTime).getTime() >= nowMs - 10 * 60 * 1000);
  const nextEvent = upcomingEvents[0] || null;

  let minutesToNext: number | null = null;
  let isImminent = false;
  let isInHighRiskWindow = false;

  if (nextEvent) {
    const eventMs = new Date(nextEvent.dateTime).getTime();
    const diffMs = eventMs - nowMs;
    minutesToNext = Math.round(diffMs / 60000);

    // Ventana de riesgo: 5 minutos antes o 5 minutos después del evento
    isInHighRiskWindow = minutesToNext <= 5 && minutesToNext >= -5;
    // Inminente: menos de 45 minutos
    isImminent = minutesToNext > 0 && minutesToNext <= 45;
  }

  return {
    todayEvents,
    nextEvent,
    minutesToNext,
    isImminent,
    isInHighRiskWindow,
  };
}
