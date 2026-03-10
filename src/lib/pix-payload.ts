/**
 * Gerador de payload PIX estático (BRCode/EMV)
 * Padrão oficial do Banco Central do Brasil
 */

interface PixPayloadParams {
  key: string;
  beneficiary: string;
  city: string;
  amount: number;
  txid?: string;
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "");
}

function crc16(payload: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;
  const bytes = new TextEncoder().encode(payload);
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function generatePixPayload(params: PixPayloadParams): string {
  const { key, amount, txid = "PGTO" } = params;
  const beneficiary = removeDiacritics(params.beneficiary).toUpperCase().slice(0, 25);
  const city = removeDiacritics(params.city).toUpperCase().slice(0, 15);

  // Format amount: "123.45"
  const amountStr = amount.toFixed(2);

  // Merchant Account Information (ID 26)
  const gui = tlv("00", "br.gov.bcb.pix");
  const pixKey = tlv("01", key);
  const merchantAccount = tlv("26", gui + pixKey);

  // Build payload without CRC
  let payload = "";
  payload += tlv("00", "01");                    // Payload Format Indicator
  payload += merchantAccount;                     // Merchant Account Info
  payload += tlv("52", "0000");                  // Merchant Category Code
  payload += tlv("53", "986");                   // Transaction Currency (BRL)
  if (amount > 0) {
    payload += tlv("54", amountStr);             // Transaction Amount
  }
  payload += tlv("58", "BR");                    // Country Code
  payload += tlv("59", beneficiary);             // Merchant Name
  payload += tlv("60", city);                    // Merchant City
  payload += tlv("62", tlv("05", txid));         // Additional Data (txid)
  payload += "6304";                              // CRC placeholder

  // Calculate and append CRC16
  const checksum = crc16(payload);
  return payload + checksum;
}
