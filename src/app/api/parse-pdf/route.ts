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

    // We need to find:
    // 1. Total Trade Fees & Comm.
    // 2. # of Contracts
    // 3. The trades table

    // Extract Total Trade Fees & Comm
    // e.g. "Trade Fees & Comm. $(25.06)"
    const feesMatch = text.match(/Trade Fees & Comm\.?\s*\$\(([\d.]+)\)/i) || text.match(/Trade Fees & Comm\.?\s*-\$([\d.]+)/i);
    let totalFees = 0;
    if (feesMatch) {
      totalFees = parseFloat(feesMatch[1]); // Absolute value
    }

    // Extract Total Contracts
    // e.g. "# of Contracts 42"
    const contractsMatch = text.match(/# of Contracts\s+(\d+)/i);
    let totalContracts = 1;
    if (contractsMatch) {
      totalContracts = parseInt(contractsMatch[1], 10);
    }
    
    // Calculate commission per contract
    const commissionPerContract = totalContracts > 0 ? totalFees / totalContracts : 0;

    // Parse Trades
    // Trades usually follow this line pattern:
    // Symbol Qty Buy Price Buy Time Duration Sell Time Sell Price P&L
    // e.g. MGCZ6 1 4113.2 08/03/2026 11:50:16 6sec 08/03/2026 11:50:09 4113.2 $0.00
    // Sometimes duration is multiline in OCR but pdf-parse might return it differently.
    // Let's use a regex to find trade lines.
    
    // Pattern: (Symbol) (Qty) (Buy Price) (Buy Date Time) (Duration) (Sell Date Time) (Sell Price) (P&L)
    // Buy Date Time: MM/DD/YYYY HH:MM:SS
    const tradeRegex = /([A-Z0-9]+)\s+(\d+)\s+([\d.]+)\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})\s+((?:\d+[a-z]+\s*)*)\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})\s+([\d.]+)\s+(\$[\d.]+|\$\([\d.]+\)|-\$[\d.]+)/gi;
    
    const rows: any[] = [];
    let match;

    while ((match = tradeRegex.exec(text)) !== null) {
      const symbol = match[1];
      const qty = parseInt(match[2], 10);
      const buyPrice = match[3];
      const boughtTimestamp = match[4];
      const duration = match[5].trim();
      const soldTimestamp = match[6];
      const sellPrice = match[7];
      const pnlRaw = match[8]; // e.g. $205.00 or $(41.25)
      
      const tradeCommission = qty * commissionPerContract;

      rows.push({
        symbol,
        qty: String(qty),
        buyPrice,
        sellPrice,
        boughtTimestamp,
        soldTimestamp,
        duration,
        pnl: pnlRaw, // Gross PnL
        commission: String(tradeCommission),
      });
    }

    if (rows.length === 0) {
      // Fallback: If the regex above fails because duration is messy or something, 
      // let's try a looser split-by-line approach.
      const lines = text.split('\n');
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j].trim();
        // Look for lines containing two dates or spanning multiple lines
        // Sometimes pdf-parse breaks lines randomly. Let's merge it with the next few lines just in case
        const mergedLine = [line, lines[j+1], lines[j+2]].filter(Boolean).join(' ');
        const dateMatches = mergedLine.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}/g);
        
        if (dateMatches && dateMatches.length >= 2 && line.match(/^[A-Z0-9]+\s+\d+\s+/)) {
          const parts = mergedLine.split(/\s+/);
          if (parts.length >= 8) {
            const symbol = parts[0];
            const qtyStr = parts[1];
            const qty = parseInt(qtyStr, 10);
            
            if (isNaN(qty)) continue;
            
            const buyPrice = parts[2];
            const boughtTimestamp = `${parts[3]} ${parts[4]}`;
            
            // Find sell timestamp index
            const sellDateIdx = parts.findIndex((p, i) => i > 4 && /\d{2}\/\d{2}\/\d{4}/.test(p));
            if (sellDateIdx === -1) continue;
            
            const durationParts = parts.slice(5, sellDateIdx);
            const duration = durationParts.join(' ');
            
            const soldTimestamp = `${parts[sellDateIdx]} ${parts[sellDateIdx + 1]}`;
            const sellPrice = parts[sellDateIdx + 2];
            const pnlRaw = parts.slice(sellDateIdx + 3).join(' ');
            
            const tradeCommission = qty * commissionPerContract;

            // Simple dedupe since we read ahead
            if (!rows.find(r => r.symbol === symbol && r.boughtTimestamp === boughtTimestamp && r.soldTimestamp === soldTimestamp)) {
                rows.push({
                symbol,
                qty: String(qty),
                buyPrice,
                sellPrice,
                boughtTimestamp,
                soldTimestamp,
                duration,
                pnl: pnlRaw,
                commission: String(tradeCommission),
                });
            }
          }
        }
      }
    }

    return NextResponse.json({ rows, totalFees, totalContracts });
  } catch (error: any) {
    console.error('PDF Parse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
