export const APP_VERSION = '1.0.0';
export const APP_NAME = 'B.S Evaluation';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const PROJECT_ALLOWED_FIELDS = new Set([
  'name', 'is_current', 'building_data', 'architectural_report',
  'structural_report', 'foundations', 'columns_walls', 'beam_slab',
  'electrical', 'plumbing', 'technical_notes', 'final_report'
]);

export const VALIDATION = {
  usernameMinLen: 2,
  usernameMaxLen: 50,
  fullNameMinLen: 2,
  fullNameMaxLen: 100,
  passwordMinLen: 8,
  usernamePattern: /^[a-zA-Z0-9_\u0600-\u06FF\s]{2,50}$/,
} as const;
