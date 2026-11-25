// Overview (home page): hero, how it works, metrics, recurring scripts,
// area-code filters, table, tile map (src/map.ts), detail panels, sources.
import type { Dict } from './types.ts';

export const DICT_HOME: Dict = {
  // ---- page head ----
  'Spam text reports and recurring scripts': {
    es: 'Reportes de mensajes de spam y guiones que se repiten',
    vi: 'Báo cáo tin nhắn rác và các kịch bản lặp lại',
  },
  'See which sender area codes and recurring scripts people report in spam texts, and file your own anonymously. Screenshots are read on your device.': {
    es: 'Vea qué códigos de área de remitentes y qué guiones que se repiten reporta la gente en los mensajes de spam, y envíe su propio reporte de forma anónima. Las capturas de pantalla se leen en su dispositivo.',
    vi: 'Xem những mã vùng người gửi và kịch bản lặp lại nào được mọi người báo cáo trong tin nhắn rác, và tự gửi báo cáo của bạn một cách ẩn danh. Ảnh chụp màn hình được đọc ngay trên thiết bị của bạn.',
  },

  // ---- hero ----
  'A pilot tracking recurring spam texts.': {
    es: 'Un piloto que da seguimiento a los mensajes de spam que se repiten.',
    vi: 'Một dự án thí điểm theo dõi các tin nhắn rác lặp lại.',
  },
  'Report a spam text to expose shared scripts, anonymously': {
    es: 'Reporte un mensaje de spam para sacar a la luz los guiones compartidos, de forma anónima',
    vi: 'Báo cáo tin nhắn rác để vạch trần các kịch bản dùng chung, một cách ẩn danh',
  },
  'Paste the text or use a screenshot. Screenshots stay on your device, and names, numbers and links are scrubbed automatically before you approve. Nothing is stored before you approve it, and you can <a href="/delete">delete a report later</a>.': {
    es: 'Pegue el texto o use una captura de pantalla. Las capturas de pantalla se quedan en su dispositivo, y los nombres, números y enlaces se depuran automáticamente antes de que usted apruebe. No se guarda nada antes de que usted lo apruebe, y puede <a href="/delete">eliminar un reporte más tarde</a>.',
    vi: 'Dán nội dung tin nhắn hoặc dùng ảnh chụp màn hình. Ảnh chụp màn hình được giữ trên thiết bị của bạn, và tên, số điện thoại cùng đường liên kết được tự động làm sạch trước khi bạn chấp thuận. Không có gì được lưu trước khi bạn chấp thuận, và bạn có thể <a href="/delete">xóa báo cáo sau này</a>.',
  },
  'Filing adds to a public record of recurring spam scripts. It does not block the sender or file a complaint with your carrier or regulators.': {
    es: 'Enviar un reporte contribuye a un registro público de guiones de spam que se repiten. No bloquea al remitente ni presenta una queja ante su compañía telefónica o las autoridades reguladoras.',
    vi: 'Việc gửi báo cáo góp phần vào hồ sơ công khai về các kịch bản tin nhắn rác lặp lại. Việc này không chặn người gửi và không gửi khiếu nại đến nhà mạng hay cơ quan quản lý.',
  },
  'How your report is protected': { es: 'Cómo se protege su reporte', vi: 'Báo cáo của bạn được bảo vệ như thế nào' },
  'No account': { es: 'Sin cuenta', vi: 'Không cần tài khoản' },
  'Screenshots read on your device': { es: 'Capturas de pantalla leídas en su dispositivo', vi: 'Ảnh chụp màn hình được đọc trên thiết bị của bạn' },
  'Delete a report later': { es: 'Elimine un reporte más tarde', vi: 'Có thể xóa báo cáo sau' },

  // ---- how it works (FLOW_STEPS) ----
  'Simple by design': { es: 'Sencillo por diseño', vi: 'Đơn giản ngay từ thiết kế' },
  'How it works': { es: 'Cómo funciona', vi: 'Cách hoạt động' },
  'You get a spam text': { es: 'Recibe un mensaje de spam', vi: 'Bạn nhận được tin nhắn rác' },
  'Screenshot it or paste the text.': { es: 'Tome una captura de pantalla o pegue el texto.', vi: 'Chụp ảnh màn hình hoặc dán nội dung tin nhắn.' },
  'Read on your device': { es: 'Se lee en su dispositivo', vi: 'Đọc ngay trên thiết bị' },
  'The image never leaves your phone.': { es: 'La imagen nunca sale de su teléfono.', vi: 'Hình ảnh không bao giờ rời khỏi điện thoại của bạn.' },
  'Details scrubbed': { es: 'Datos depurados', vi: 'Thông tin được làm sạch' },
  'Names, numbers and links removed automatically.': {
    es: 'Nombres, números y enlaces se eliminan automáticamente.',
    vi: 'Tên, số điện thoại và đường liên kết được tự động xóa.',
  },
  'You review, then file': { es: 'Usted revisa y luego envía', vi: 'Bạn xem lại, rồi gửi' },
  'Nothing is stored before you approve it.': { es: 'No se guarda nada antes de que usted lo apruebe.', vi: 'Không có gì được lưu trước khi bạn chấp thuận.' },
  'Patterns emerge': { es: 'Surgen los patrones', vi: 'Các mẫu dần lộ ra' },
  'Matching scripts are reviewed, then published.': {
    es: 'Los guiones que coinciden se revisan y luego se publican.',
    vi: 'Các kịch bản trùng khớp được duyệt, rồi công bố.',
  },
  'Each step is described in full in the <a href="/methodology">methodology</a> (scrubbing, matching and review) and on the <a href="/privacy">privacy page</a> (what is stored).': {
    es: 'Cada paso se describe en detalle en la <a href="/methodology">metodología</a> (depuración, coincidencia y revisión) y en la <a href="/privacy">página de privacidad</a> (qué se guarda).',
    vi: 'Từng bước được mô tả đầy đủ trong phần <a href="/methodology">phương pháp</a> (làm sạch, so khớp và duyệt) và trên <a href="/privacy">trang quyền riêng tư</a> (những gì được lưu trữ).',
  },

  // ---- metrics ----
  'Pilot figures, {range}': { es: 'Cifras del piloto, {range}', vi: 'Số liệu thí điểm, {range}' },
  'Reports filed': { es: 'Reportes enviados', vi: 'Báo cáo đã gửi' },
  'State or DC with reports': { es: 'Estado o DC con reportes', vi: 'Tiểu bang hoặc DC có báo cáo' },
  'States and DC with reports': { es: 'Estados y DC con reportes', vi: 'Tiểu bang và DC có báo cáo' },
  'Pattern published': { es: 'Patrón publicado', vi: 'Mẫu đã công bố' },
  'Patterns published': { es: 'Patrones publicados', vi: 'Mẫu đã công bố' },
  'counted live from filed reports · patterns appear only after review': {
    es: 'contado en vivo a partir de los reportes enviados · los patrones aparecen solo después de la revisión',
    vi: 'đếm trực tiếp từ các báo cáo đã gửi · mẫu chỉ xuất hiện sau khi được duyệt',
  },

  // ---- recurring scripts ----
  'Reviewed before publication': { es: 'Revisados antes de publicarse', vi: 'Được duyệt trước khi công bố' },
  'Recurring scripts': { es: 'Guiones que se repiten', vi: 'Kịch bản lặp lại' },
  'Texts whose wording or script repeats across reports, such as lead-generation pitches. A shared script can be used by many unrelated senders and does not establish a common sender.': {
    es: 'Mensajes cuya redacción o guion se repite en varios reportes, como las ofertas para captar clientes potenciales. Un mismo guion puede ser usado por muchos remitentes sin relación entre sí y no demuestra que haya un remitente común.',
    vi: 'Những tin nhắn có câu chữ hoặc kịch bản lặp lại trong nhiều báo cáo, chẳng hạn như lời chào mời để thu thập khách hàng tiềm năng. Một kịch bản chung có thể được nhiều người gửi không liên quan sử dụng và không chứng minh rằng có chung một người gửi.',
  },
  'Template match ({label})': { es: 'Coincidencia de plantilla ({label})', vi: 'Trùng khớp khuôn văn bản ({label})' },
  '<a href="/patterns">All published patterns</a> · <a href="/methodology#review">How review works</a>': {
    es: '<a href="/patterns">Todos los patrones publicados</a> · <a href="/methodology#review">Cómo funciona la revisión</a>',
    vi: '<a href="/patterns">Tất cả các mẫu đã công bố</a> · <a href="/methodology#review">Cách thức duyệt</a>',
  },
  'Pilot in progress': { es: 'Piloto en curso', vi: 'Đang thí điểm' },
  '<strong>No patterns published yet.</strong> File a spam text to help surface the first one.': {
    es: '<strong>Todavía no hay patrones publicados.</strong> Envíe un reporte de un mensaje de spam para ayudar a que surja el primero.',
    vi: '<strong>Chưa có mẫu nào được công bố.</strong> Hãy gửi báo cáo một tin nhắn rác để giúp tìm ra mẫu đầu tiên.',
  },
  '<span class="example-label">Illustrative example</span> What a published script looks like after scrubbing. This is made up, not a real report.': {
    es: '<span class="example-label">Ejemplo ilustrativo</span> Así se ve un guion publicado después de depurarlo. Es inventado, no es un reporte real.',
    vi: '<span class="example-label">Ví dụ minh họa</span> Một kịch bản đã công bố trông như thế này sau khi làm sạch. Đây là ví dụ bịa ra, không phải báo cáo thật.',
  },
  'Hi {recipient}, this is {sender} with a quick question about your property. We buy houses for cash in any condition. Reply YES or call {phone}. Details: {link}': {
    es: 'Hola {recipient}, le habla {sender} con una pregunta rápida sobre su propiedad. Compramos casas al contado en cualquier condición. Responda SÍ o llame al {phone}. Detalles: {link}',
    vi: 'Chào {recipient}, tôi là {sender}, muốn hỏi nhanh về bất động sản của bạn. Chúng tôi mua nhà bằng tiền mặt, bất kể tình trạng nào. Trả lời CÓ hoặc gọi {phone}. Chi tiết: {link}',
  },
  'A report is <strong>eligible</strong> if it has not been deleted and is not a repeat of the same text from the same sender within a short window. Every counted report appears in the area-code counts below as soon as it is filed, before any pattern is published. <a href="/methodology#review">How review works</a>.': {
    es: 'Un reporte es <strong>elegible</strong> si no se ha eliminado y no es una repetición del mismo texto del mismo remitente en un período corto. Cada reporte contado aparece en los conteos por código de área más abajo en cuanto se envía, antes de que se publique cualquier patrón. <a href="/methodology#review">Cómo funciona la revisión</a>.',
    vi: 'Một báo cáo là <strong>hợp lệ</strong> nếu chưa bị xóa và không phải là bản lặp lại của cùng một nội dung từ cùng một người gửi trong một khoảng thời gian ngắn. Mỗi báo cáo được tính sẽ xuất hiện trong số liệu theo mã vùng bên dưới ngay khi được gửi, trước khi bất kỳ mẫu nào được công bố. <a href="/methodology#review">Cách thức duyệt</a>.',
  },

  // ---- area codes: filters, counts, tabs ----
  'Claimed origin only': { es: 'Solo origen declarado', vi: 'Chỉ là nguồn gốc tự nhận' },
  'Reported sender area codes': { es: 'Códigos de área de remitentes reportados', vi: 'Mã vùng của người gửi bị báo cáo' },
  'Date range': { es: 'Rango de fechas', vi: 'Khoảng ngày' },
  'Last 30 days': { es: 'Últimos 30 días', vi: '30 ngày qua' },
  'Last 90 days': { es: 'Últimos 90 días', vi: '90 ngày qua' },
  'Last 12 months': { es: 'Últimos 12 meses', vi: '12 tháng qua' },
  'All time': { es: 'Todo el período', vi: 'Toàn bộ thời gian' },
  Apply: { es: 'Aplicar', vi: 'Áp dụng' },
  '{rangeStart} to {rangeEnd}': { es: '{rangeStart} a {rangeEnd}', vi: 'từ {rangeStart} đến {rangeEnd}' },
  'through {rangeEnd}': { es: 'hasta el {rangeEnd}', vi: 'tính đến {rangeEnd}' },
  '{count} report filed · {range}': { es: '{count} reporte enviado · {range}', vi: '{count} báo cáo đã gửi · {range}' },
  '{count} reports filed · {range}': { es: '{count} reportes enviados · {range}', vi: '{count} báo cáo đã gửi · {range}' },
  'Choose a view': { es: 'Elija una vista', vi: 'Chọn chế độ xem' },
  Table: { es: 'Tabla', vi: 'Bảng' },
  Map: { es: 'Mapa', vi: 'Bản đồ' },
  'Counts are voluntary reports and do not measure how much spam is sent. <a href="/methodology">How counts work</a>.': {
    es: 'Los conteos son reportes voluntarios y no miden cuánto spam se envía. <a href="/methodology">Cómo funcionan los conteos</a>.',
    vi: 'Số liệu là các báo cáo tự nguyện và không đo lường lượng tin nhắn rác được gửi đi. <a href="/methodology">Cách tính số liệu</a>.',
  },

  // ---- detail panels ----
  'Clear selection': { es: 'Borrar selección', vi: 'Bỏ chọn' },
  'Area code {code}': { es: 'Código de área {code}', vi: 'Mã vùng {code}' },
  'Area code state / region': { es: 'Estado o región del código de área', vi: 'Tiểu bang / khu vực của mã vùng' },
  Reports: { es: 'Reportes', vi: 'Báo cáo' },
  Timeframe: { es: 'Período', vi: 'Khoảng thời gian' },
  'The reference region is where this area code is assigned, not where the sender is.': {
    es: 'La región de referencia es donde está asignado este código de área, no donde está el remitente.',
    vi: 'Khu vực tham chiếu là nơi mã vùng này được cấp, không phải nơi người gửi đang ở.',
  },
  '{count} report across {codes} area code · {range}': { es: '{count} reporte en {codes} código de área · {range}', vi: '{count} báo cáo thuộc {codes} mã vùng · {range}' },
  '{count} report across {codes} area codes · {range}': { es: '{count} reporte en {codes} códigos de área · {range}', vi: '{count} báo cáo thuộc {codes} mã vùng · {range}' },
  '{count} reports across {codes} area code · {range}': { es: '{count} reportes en {codes} código de área · {range}', vi: '{count} báo cáo thuộc {codes} mã vùng · {range}' },
  '{count} reports across {codes} area codes · {range}': { es: '{count} reportes en {codes} códigos de área · {range}', vi: '{count} báo cáo thuộc {codes} mã vùng · {range}' },

  // ---- table ----
  'No reports were filed in this date range.': { es: 'No se enviaron reportes en este período.', vi: 'Không có báo cáo nào được gửi trong khoảng thời gian này.' },
  'Reports by sender area code, {range}': { es: 'Reportes por código de área del remitente, {range}', vi: 'Báo cáo theo mã vùng của người gửi, {range}' },
  'Area code': { es: 'Código de área', vi: 'Mã vùng' },

  // ---- map panel ----
  'Reports by state': { es: 'Reportes por estado', vi: 'Báo cáo theo tiểu bang' },
  'Skip map to next section': { es: 'Saltar el mapa e ir a la siguiente sección', vi: 'Bỏ qua bản đồ, đến phần tiếp theo' },
  'View results table': { es: 'Ver la tabla de resultados', vi: 'Xem bảng kết quả' },
  'No reports in this range are assigned to a state or DC.': {
    es: 'Ningún reporte de este período corresponde a un estado o a DC.',
    vi: 'Không có báo cáo nào trong khoảng thời gian này thuộc về một tiểu bang hoặc DC.',
  },
  'Tiles group reports by the state assigned to the displayed sender’s area code.': {
    es: 'Los mosaicos agrupan los reportes según el estado al que está asignado el código de área del remitente que aparece en pantalla.',
    vi: 'Các ô nhóm báo cáo theo tiểu bang được cấp mã vùng của số người gửi hiển thị.',
  },
  '{n} report uses area codes without a map position (toll-free or territories): {codes}. They are included in the table.': {
    es: '{n} reporte usa códigos de área sin posición en el mapa (números gratuitos o territorios): {codes}. Se incluyen en la tabla.',
    vi: '{n} báo cáo dùng mã vùng không có vị trí trên bản đồ (số miễn phí hoặc vùng lãnh thổ): {codes}. Các mã này vẫn có trong bảng.',
  },
  '{n} reports use area codes without a map position (toll-free or territories): {codes}. They are included in the table.': {
    es: '{n} reportes usan códigos de área sin posición en el mapa (números gratuitos o territorios): {codes}. Se incluyen en la tabla.',
    vi: '{n} báo cáo dùng mã vùng không có vị trí trên bản đồ (số miễn phí hoặc vùng lãnh thổ): {codes}. Các mã này vẫn có trong bảng.',
  },

  // ---- tile map, state list, legend (src/map.ts) ----
  '{nReports} report': { es: '{nReports} reporte', vi: '{nReports} báo cáo' },
  '{nReports} reports': { es: '{nReports} reportes', vi: '{nReports} báo cáo' },
  // reportsWord() after a number in the state list ("3 reports")
  report: { es: 'reporte', vi: 'báo cáo' },
  reports: { es: 'reportes', vi: 'báo cáo' },
  ', selected': { es: ', seleccionado', vi: ', đang chọn' },
  '{states} state': { es: '{states} estado', vi: '{states} tiểu bang' },
  '{states} states': { es: '{states} estados', vi: '{states} tiểu bang' },
  '{states} state and DC': { es: '{states} estado y DC', vi: '{states} tiểu bang và DC' },
  '{states} states and DC': { es: '{states} estados y DC', vi: '{states} tiểu bang và DC' },
  '{total} report across {where}': { es: '{total} reporte en {where}', vi: '{total} báo cáo tại {where}' },
  '{total} reports across {where}': { es: '{total} reportes en {where}', vi: '{total} báo cáo tại {where}' },
  '{abbr} {n}. {state}: {n} report, {range}': { es: '{abbr} {n}. {state}: {n} reporte, {range}', vi: '{abbr} {n}. {state}: {n} báo cáo, {range}' },
  '{abbr} {n}. {state}: {n} reports, {range}': { es: '{abbr} {n}. {state}: {n} reportes, {range}', vi: '{abbr} {n}. {state}: {n} báo cáo, {range}' },
  'Tile map of US states and DC, one equal-size tile per state. States with reports are links.': {
    es: 'Mapa de mosaicos de los estados de EE. UU. y DC, un mosaico del mismo tamaño por estado. Los estados con reportes son enlaces.',
    vi: 'Bản đồ ô vuông các tiểu bang Hoa Kỳ và DC, mỗi tiểu bang là một ô có kích thước bằng nhau. Các tiểu bang có báo cáo là liên kết.',
  },
  'States with reports, most reports first': {
    es: 'Estados con reportes, primero los que tienen más reportes',
    vi: 'Các tiểu bang có báo cáo, nhiều báo cáo nhất xếp trước',
  },
  '0 reports in this range': { es: '0 reportes en este período', vi: '0 báo cáo trong khoảng thời gian này' },
  '1 report': { es: '1 reporte', vi: '1 báo cáo' },
  '2–4 reports': { es: '2–4 reportes', vi: '2–4 báo cáo' },
  '5–19 reports': { es: '5–19 reportes', vi: '5–19 báo cáo' },
  '20+ reports': { es: '20+ reportes', vi: '20+ báo cáo' },
  '<strong>Legend.</strong> Each state or DC is one equal-size tile (a row in the list on narrow screens). Color shows the state’s total reports in this range, and the number is the exact count. Each state’s area codes are listed on its detail view.': {
    es: '<strong>Leyenda.</strong> Cada estado o DC es un mosaico del mismo tamaño (una fila de la lista en pantallas angostas). El color indica el total de reportes del estado en este período, y el número es la cifra exacta. Los códigos de área de cada estado aparecen en su vista de detalle.',
    vi: '<strong>Chú giải.</strong> Mỗi tiểu bang hoặc DC là một ô có kích thước bằng nhau (một dòng trong danh sách trên màn hình hẹp). Màu sắc thể hiện tổng số báo cáo của tiểu bang trong khoảng thời gian này, và con số là số lượng chính xác. Các mã vùng của mỗi tiểu bang được liệt kê trong phần xem chi tiết của tiểu bang đó.',
  },
  'Color key': { es: 'Clave de colores', vi: 'Chú thích màu' },

  // ---- sources ----
  Sources: { es: 'Fuentes', vi: 'Nguồn' },
  'Figures on this page: {reports}, {places}, and {patterns}, {rangeName} ({range}). Counted live from reports filed on this site.': {
    es: 'Cifras de esta página: {reports}, {places} y {patterns}, {rangeName} ({range}). Contadas en vivo a partir de los reportes enviados en este sitio.',
    vi: 'Số liệu trên trang này: {reports}, {places} và {patterns}, {rangeName} ({range}). Được đếm trực tiếp từ các báo cáo đã gửi trên trang này.',
  },
  '{count} report filed': { es: '{count} reporte enviado', vi: '{count} báo cáo đã gửi' },
  '{count} reports filed': { es: '{count} reportes enviados', vi: '{count} báo cáo đã gửi' },
  '{count} state or DC with reports': { es: '{count} estado o DC con reportes', vi: '{count} tiểu bang hoặc DC có báo cáo' },
  '{count} states and DC with reports': { es: '{count} estados y DC con reportes', vi: '{count} tiểu bang và DC có báo cáo' },
  '{count} pattern published': { es: '{count} patrón publicado', vi: '{count} mẫu đã công bố' },
  '{count} patterns published': { es: '{count} patrones publicados', vi: '{count} mẫu đã công bố' },
  'Counts are voluntary reports and do not measure how much spam is sent. Area codes are the sender’s claimed origin, not a location. <a href="/methodology">How counts work</a>.': {
    es: 'Los conteos son reportes voluntarios y no miden cuánto spam se envía. Los códigos de área son el origen declarado del remitente, no una ubicación. <a href="/methodology">Cómo funcionan los conteos</a>.',
    vi: 'Số liệu là các báo cáo tự nguyện và không đo lường lượng tin nhắn rác được gửi đi. Mã vùng là nguồn gốc tự nhận của người gửi, không phải vị trí. <a href="/methodology">Cách tính số liệu</a>.',
  },
  'Patterns are published only after maintainer review: <a href="/patterns">published patterns</a> · <a href="/methodology#review">how review works</a>.': {
    es: 'Los patrones se publican solo después de la revisión de un responsable del sitio: <a href="/patterns">patrones publicados</a> · <a href="/methodology#review">cómo funciona la revisión</a>.',
    vi: 'Mẫu chỉ được công bố sau khi người duy trì duyệt: <a href="/patterns">các mẫu đã công bố</a> · <a href="/methodology#review">cách thức duyệt</a>.',
  },
};

/** Proper names and other English this section keeps on translated pages (test/i18n.test.ts). */
export const KEEP_HOME: string[] = [];
