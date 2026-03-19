export interface Scan {
  id: string;
  value: string;
  type: string;
  timestamp: string;
  device_info: {
    userAgent: string;
    platform: string;
    language: string;
  };
}

export type ScanType =
  | 'QR_CODE'
  | 'EAN_13'
  | 'EAN_8'
  | 'CODE_128'
  | 'CODE_39'
  | 'ITF'
  | 'UPC_A'
  | 'UPC_E'
  | 'DATA_MATRIX'
  | 'PDF_417'
  | 'AZTEC'
  | 'OTHER';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type TabId = 'scanner' | 'history';
