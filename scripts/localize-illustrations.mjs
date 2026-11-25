// Writes the Spanish and Vietnamese copies of the illustrations that carry
// text labels: public/static/img/<name>.es.svg and <name>.vi.svg. Run after
// changing an illustration or a label below:  node scripts/localize-illustrations.mjs
// Labels are kept short so they fit the shapes drawn around the English.
// test/i18n-illustrations.test.ts checks the copies are current.
import { readFileSync, writeFileSync } from 'node:fs';

export const LABELS = {
  'hero-illustration': {
    'New message': { es: 'Mensaje nuevo', vi: 'Tin nhắn mới' },
    'Ready to review': { es: 'Listo para revisar', vi: 'Sẵn sàng xem lại' },
    'Private details are hidden': { es: 'Datos privados ocultos', vi: 'Đã ẩn thông tin riêng' },
    'PRIVACY CHECK': { es: 'PRIVACIDAD', vi: 'QUYỀN RIÊNG TƯ' },
    'Personal details hidden': { es: 'Datos personales ocultos', vi: 'Đã ẩn thông tin cá nhân' },
    Anonymous: { es: 'Anónimo', vi: 'Ẩn danh' },
    'No account needed': { es: 'Sin cuenta', vi: 'Không cần tài khoản' },
    '✓ On-device reading': { es: '✓ Se lee en su equipo', vi: '✓ Đọc trên thiết bị' },
    'Pattern candidate': { es: 'Posible patrón', vi: 'Mẫu tiềm năng' },
    'Human review required': { es: 'Requiere revisión humana', vi: 'Cần người duyệt' },
  },
  'pattern-illustration': {
    'Example A': { es: 'Ejemplo A', vi: 'Ví dụ A' },
    'Example B': { es: 'Ejemplo B', vi: 'Ví dụ B' },
    'Shared structure': { es: 'Estructura común', vi: 'Cấu trúc chung' },
  },
  'privacy-illustration': {
    'On your device': { es: 'En su dispositivo', vi: 'Trên thiết bị của bạn' },
    'You review': { es: 'Usted revisa', vi: 'Bạn xem lại' },
    'Minimal record': { es: 'Registro mínimo', vi: 'Lưu tối thiểu' },
    'Nothing is filed until you approve the reviewed report.': {
      es: 'No se envía nada hasta que usted apruebe el reporte revisado.',
      vi: 'Không có gì được gửi cho đến khi bạn duyệt báo cáo đã xem lại.',
    },
  },
};

const DIR = new URL('../public/static/img/', import.meta.url);

/** The translated SVG source for one illustration and language. */
export function localize(name, lang) {
  const src = readFileSync(new URL(`${name}.svg`, DIR), 'utf8');
  return src.replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/g, (m, open, text, close) => {
    const e = LABELS[name][text];
    if (!e) throw new Error(`${name}.svg: no ${lang} label for ${JSON.stringify(text)}`);
    return open + e[lang] + close;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const name of Object.keys(LABELS)) {
    for (const lang of ['es', 'vi']) {
      writeFileSync(new URL(`${name}.${lang}.svg`, DIR), localize(name, lang));
      console.log(`wrote public/static/img/${name}.${lang}.svg`);
    }
  }
}
