export interface GoogleTokenData {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
  expiry_date?: number;
}

export interface OutlookTokenData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  scope: string;
  expires_in?: number;
  ext_expires_in?: number;
  expires_at?: string; // ISO date string when the token expires
}

// Generic token data type for unified handling
export type TokenData = GoogleTokenData | OutlookTokenData;

export interface SubscriptionData {
  id: string;
  expirationDateTime: string;
  resource?: string;
  clientState?: string;
}