import { NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Parse PDF text using unpdf (works in server/edge without DOM APIs)
    const pdf = await getDocumentProxy(uint8);
    const { text } = await extractText(pdf, { mergePages: true });

    // ── 1. Extract Total Trade Fees & Comm ──
    // e.g. "Trade Fees & Comm. $(25.06)"
    const feesMatch = text.match(/Trade Fees & Comm\.?\s*\$\(([\d.]+)\)/i) || text.match(/Trade Fees & Comm\.?\s*-\$([\d.]+)/i);
    let totalFees = 0;
    if (feesMatch) {
      totalFees = parseFloat(feesMatch[1]); // Absolute value
    }

    // ── 2. Extract all trades (WITHOUT commission yet) ──
    // Pattern: Symbol Qty BuyPrice BuyDateTime Duration SellDateTime SellPrice P&L
    const tradeRegex = /([A-Z0-9]+)\s+(\d+)\s+([\d.]+)\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})\s+((?:\d+[a-z]+\s*)*)\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})\s+([\d.]+)\s+(\$[\d.]+|\$\([\d.]+\)|-\$[\d.]+)/gi;
    
    interface RawTradeRow {
      symbol: string;
      qty: number;
      buyPrice: string;
      sellPrice: string;
      boughtTimestamp: string;
      soldTimestamp: string;
      duration: string;
      pnl: string;
    }

    const rawTrades: RawTradeRow[] = [];
    let match;

    while ((match = tradeRegex.exec(text)) !== null) {
      rawTrades.push({
        symbol: match[1],
        qty: parseInt(match[2], 10),
        buyPrice: match[3],
        boughtTimestamp: match[4],
        duration: match[5].trim(),
        soldTimestamp: match[6],
        sellPrice: match[7],
        pnl: match[8],
      });
    }

    // Fallback: looser line-by-line approach if regex above finds nothing
    if (rawTrades.length === 0) {
      const lines = text.split('\n');
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j].trim();
        const mergedLine = [line, lines[j+1], lines[j+2]].filter(Boolean).join(' ');
        const dateMatches = mergedLine.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}/g);
        
        if (dateMatches && dateMatches.length >= 2 && line.match(/^[A-Z0-9]+\s+\d+\s+/)) {
          const parts = mergedLine.split(/\s+/);
          if (parts.length >= 8) {
            const symbol = parts[0];
            const qty = parseInt(parts[1], 10);
            if (isNaN(qty)) continue;
            
            const buyPrice = parts[2];
            const boughtTimestamp = `${parts[3]} ${parts[4]}`;
            
            const sellDateIdx = parts.findIndex((p, i) => i > 4 && /\d{2}\/\d{2}\/\d{4}/.test(p));
            if (sellDateIdx === -1) continue;
            
            const duration = parts.slice(5, sellDateIdx).join(' ');
            const soldTimestamp = `${parts[sellDateIdx]} ${parts[sellDateIdx + 1]}`;
            const sellPrice = parts[sellDateIdx + 2];
            const pnl = parts.slice(sellDateIdx + 3).join(' ');

            // Simple dedupe since we read ahead
            if (!rawTrades.find(r => r.symbol === symbol && r.boughtTimestamp === boughtTimestamp && r.soldTimestamp === soldTimestamp)) {
              rawTrades.push({ symbol, qty, buyPrice, sellPrice, boughtTimestamp, soldTimestamp, duration, pnl });
            }
          }
        }
      }
    }

    // ── 3. Calculate commission per contract based on ACTUAL extracted trades ──
    // The PDF's "# of Contracts" counts both buy-side and sell-side fills,
    // so it's double the number of trade-level contracts. Instead, we sum
    // the qty from our extracted trades to get the real number.
    const totalExtractedQty = rawTrades.reduce((sum, t) => sum + t.qty, 0);
    const commissionPerContract = totalExtractedQty > 0 ? totalFees / totalExtractedQty : 0;

    // ── 4. Build final rows with commission assigned ──
    const rows = rawTrades.map(t => ({
      symbol: t.symbol,
      qty: String(t.qty),
      buyPrice: t.buyPrice,
      sellPrice: t.sellPrice,
      boughtTimestamp: t.boughtTimestamp,
      soldTimestamp: t.soldTimestamp,
      duration: t.duration,
      pnl: t.pnl, // Gross PnL
      commission: String(t.qty * commissionPerContract),
    }));

    return NextResponse.json({ rows, totalFees, totalExtractedQty });
  } catch (error: any) {
    console.error('PDF Parse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
