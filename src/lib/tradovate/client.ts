/**
 * Cliente de conexión con la REST API oficial de Tradovate.
 * Tradovate API Docs: https://api.tradovate.com
 */

const TRADOVATE_URLS = {
  live: "https://live.tradovateapi.com/v1",
  demo: "https://demo.tradovateapi.com/v1",
};

export interface TradovateAuthParams {
  name: string;
  password: string;
  appId: string;
  appVersion: string;
  cid?: string | number;
  sec?: string;
  isLive?: boolean;
}

export interface TradovateAccountResponse {
  id: number;
  name: string; // ej: "APEX6339420000008" o "PAAPEX..."
  accountType: string;
  active: boolean;
  clearingHouseId: number;
}

export interface TradovateCashBalance {
  id: number;
  accountId: number;
  amount: number;
  realizedPnL: number;
  openPnL: number;
  totalCashValue: number;
  sodCashBalance: number; // Saldo de apertura del día
}

export interface TradovateFill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  action: "Buy" | "Sell";
  qty: number;
  price: number;
  active: boolean;
}

export interface TradovateContract {
  id: number;
  name: string; // ej: "MGCZ6"
}

export interface TradovatePosition {
  id: number;
  accountId: number;
  contractId: number;
  timestamp: string;
  netPos: number;
  netPrice: number;
  bought: number;
  boughtValue: number;
  sold: number;
  soldValue: number;
  prevPos: number;
  prevPrice: number;
}

export class TradovateService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private userId: number | null = null;

  constructor(isLive = true) {
    this.baseUrl = isLive ? TRADOVATE_URLS.live : TRADOVATE_URLS.demo;
  }

  /**
   * 1. Autenticación con Tradovate para obtener el Access Token.
   */
  async authenticate(params: TradovateAuthParams): Promise<string> {
    // Si no se proporciona un CID/SEC registrado propio, usamos las credenciales oficiales de desarrollo de Tradovate ("Sample App")
    const DEFAULT_SAMPLE_CID = 8;
    const DEFAULT_SAMPLE_SEC = "f03741b6-f634-48d6-9308-c8fb871150c2";

    const cid = params.cid ? Number(params.cid) : DEFAULT_SAMPLE_CID;
    const sec = params.sec ? params.sec : DEFAULT_SAMPLE_SEC;
    const appId = params.cid ? (params.appId || "StateTrading") : "Sample App";

    const payload: Record<string, any> = {
      name: params.name,
      password: params.password,
      appId: appId,
      appVersion: params.appVersion || "1.0",
      cid: cid,
      sec: sec,
    };

    const res = await fetch(`${this.baseUrl}/auth/accesstokenrequest`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Tradovate respondió con código ${res.status}: ${text.slice(0, 150)}`);
    }

    if (!res.ok || data["p-ticket"] || data.errorText || !data.accessToken) {
      if (data["p-time"]) {
        throw new Error(`Tradovate ha impuesto una pausa de seguridad por intentos fallidos. Por favor espera ${data["p-time"]} segundos antes de reintentar.`);
      }
      throw new Error(data.errorText || "Credenciales de Tradovate incorrectas");
    }

    this.accessToken = data.accessToken;
    this.userId = data.userId;
    return data.accessToken;
  }

  private async get<T>(endpoint: string): Promise<T> {
    if (!this.accessToken) {
      throw new Error("No hay sesión autenticada en Tradovate");
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error en Tradovate (${res.status}): ${err}`);
    }

    return res.json();
  }

  /**
   * 2. Lista de cuentas vinculadas (todas las cuentas de Apex del usuario).
   */
  async getAccounts(): Promise<TradovateAccountResponse[]> {
    return this.get<TradovateAccountResponse[]>("/account/list");
  }

  /**
   * 3. Balances de efectivo de cada cuenta.
   */
  async getCashBalances(): Promise<TradovateCashBalance[]> {
    return this.get<TradovateCashBalance[]>("/cashBalance/list");
  }

  /**
   * 4. Lista de ejecuciones / órdenes llenadas (Fills).
   */
  async getFills(): Promise<TradovateFill[]> {
    return this.get<TradovateFill[]>("/fill/list");
  }

  /**
   * 5. Lista de posiciones.
   */
  async getPositions(): Promise<TradovatePosition[]> {
    return this.get<TradovatePosition[]>("/position/list");
  }

  /**
   * 6. Obtener nombre de contrato por ID.
   */
  async getContract(contractId: number): Promise<TradovateContract> {
    return this.get<TradovateContract>(`/contract/item?id=${contractId}`);
  }
}
