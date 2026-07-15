# Contexto: Minimal Trading Journal (Estilo Edgewonk)

**Role:** Senior Frontend Developer & Data Engineer  
**Context:** Estamos construyendo un "Minimal Trading Journal" (Diario de Trading Minimalista). El objetivo es crear una réplica estética y simplificada de la interfaz de Edgewonk (diseño premium, limpio, sin saturación visual), pero con soporte completo y nativo para alternar entre Modo Claro y Modo Oscuro (Theme Toggle). La aplicación servirá para auditar el rendimiento de una semana de simulación de cuentas de fondeo utilizando exclusivamente archivos exportados desde TradingView.

## Tech Stack Sugerido
- **Frontend:** Next.js (App Router) + Tailwind CSS + next-themes (para la gestión del modo claro/oscuro).
- **Componentes:** Shadcn/ui (o Radix nativo) para inputs, tablas, tarjetas y el botón de cambio de tema.
- **Gráficos:** Recharts o Chart.js (optimizados para Tailwind y que reaccionen al cambio de tema).
- **Procesamiento:** PapaParse para parsear CSV en el cliente.

---

## REQUISITOS VISUALES (Estilo Edgewonk Adaptable)
1. **Soporte Light/Dark Mode:** Implementar un botón interactivo (Toggle) en la cabecera (Navbar) para cambiar entre temas de forma fluida.
2. **Paleta de Colores (Tailwind):**
   - *Modo Oscuro:* Fondo oscuro profundo (`bg-slate-950`), tarjetas con bordes delgados (`border-slate-800`) y fondos de tarjeta ligeramente más claros (`bg-slate-900`).
   - *Modo Claro:* Fondo limpio (`bg-slate-50`), tarjetas en blanco puro (`bg-white`) con bordes suaves (`border-slate-200`) y sombras muy sutiles (`shadow-sm`).
3. **Acentos de Estado:** Verde esmeralda (`text-emerald-500`) para números positivos/ganancias y Rojo carmesí (`text-rose-500`) para negativos/pérdidas. Los colores de acento deben tener buen contraste en ambos temas.
4. **Layout:** Layout moderno de Dashboard con un Sidebar lateral minimalista y un área de contenido principal con rejilla de tarjetas (Grid) y gráficos interactivos.

---

## FUNCIONALIDADES CORE (Fase 1)

1. **Módulo de Ingestión de Datos (CSV Uploader):**
   - Un área limpia de "Drag & Drop" en el Dashboard.
   - Debe aceptar el archivo CSV que exporta TradingView (Historial de operaciones/órdenes).
   - *Nota de desarrollo:* Como las columnas de TradingView pueden variar según el idioma o la versión, el script de parseo debe mapear de forma flexible campos clave: Fecha/Hora, Símbolo (ej: M6E, MNQ), Tipo (Compra/Venta), Precio de entrada/salida, y PnL Neto (Ganancia/Pérdida incluyendo comisiones).

2. **Panel de Estadísticas (KPI Cards):**
   - **Balance Actual de la Cuenta:** Empezando en 50,000$.
   - **PnL Neto Total:** Suma acumulada de todas las operaciones importadas.
   - **Win Rate (% de Acierto):** (Operaciones ganadoras / Operaciones totales) * 100.
   - **Profit Factor:** (Suma de ganancias de operaciones ganadoras / Suma de pérdidas de operaciones perdedoras).
   - **Operación Media:** Beneficio promedio por trade.

3. **Sección de Gráficos (Visualización del Rendimiento):**
   - **Gráfico de Equity Curve (Línea):** Muestra la evolución temporal del saldo de la cuenta desde los 50,000$ iniciales trade a trade. Debe ser una línea suave y reaccionar correctamente a los colores del modo claro/oscuro.
   - **Distribución Diaria (Barras):** Un gráfico de barras verticales que agrupe el PnL neto por día de la semana (Lunes, Martes, Miércoles, Jueves, Viernes).

4. **Historial de Operaciones (Clean Table):**
   - Una tabla estilizada abajo del todo que muestre los trades procesados de forma cronológica, con paginación y colores de texto condicionales según el resultado (positivo/negativo).

---

## PASO 1 - ENTORNO Y ENTRADA DE DATOS
Generar la estructura inicial del proyecto, la configuración del ThemeProvider (next-themes) y el componente del "CSV Uploader". Pedir el formato exacto de las columnas del archivo CSV de TradingView para asegurar que la función de parseo matemático (`core-logic`) procese los datos sin errores de NAN o undefined.
