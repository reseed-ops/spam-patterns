// Header, navigation, footer, switcher, shared caveat, and the server's
// generic error messages (src/app.ts).
import type { Dict } from './types.ts';

export const DICT_CORE: Dict = {
  // ---- header and navigation ----
  Language: { es: 'Idioma', vi: 'Ngôn ngữ' },
  'Skip to content': { es: 'Ir al contenido', vi: 'Chuyển đến nội dung' },
  Main: { es: 'Principal', vi: 'Chính' },
  'Main (mobile)': { es: 'Principal (móvil)', vi: 'Chính (di động)' },
  Footer: { es: 'Pie de página', vi: 'Chân trang' },
  Overview: { es: 'Resumen', vi: 'Tổng quan' },
  Patterns: { es: 'Patrones', vi: 'Các mẫu' },
  'Opt out': { es: 'Darse de baja', vi: 'Gỡ tên' },
  Data: { es: 'Datos', vi: 'Dữ liệu' },
  'Report a spam text': { es: 'Reportar un mensaje de spam', vi: 'Báo cáo tin nhắn rác' },
  '<strong>Demo instance.</strong> This site is not collecting public reports yet. Data shown here is synthetic or test data and may be reset at any time.': {
    es: '<strong>Instancia de demostración.</strong> Este sitio todavía no recibe reportes del público. Los datos que se muestran son ficticios o de prueba y pueden borrarse en cualquier momento.',
    vi: '<strong>Bản chạy thử.</strong> Trang này chưa nhận báo cáo từ công chúng. Dữ liệu hiển thị ở đây là dữ liệu giả lập hoặc dữ liệu thử nghiệm và có thể bị xóa bất cứ lúc nào.',
  },
  'Report spam texts anonymously and see shared script patterns, with privacy built in.': {
    es: 'Reporte mensajes de spam de forma anónima y vea los guiones que se repiten, con la privacidad integrada desde el principio.',
    vi: 'Báo cáo tin nhắn rác một cách ẩn danh và xem các kịch bản lặp lại, với quyền riêng tư được tích hợp sẵn.',
  },

  // ---- footer ----
  'Privacy & threat model': { es: 'Privacidad y modelo de amenazas', vi: 'Quyền riêng tư và mô hình mối đe dọa' },
  'Stop junk mail': { es: 'Frenar el correo basura', vi: 'Giảm thư quảng cáo rác' },
  Scams: { es: 'Estafas', vi: 'Lừa đảo' },
  Methodology: { es: 'Metodología', vi: 'Phương pháp' },
  'Delete a report': { es: 'Eliminar un reporte', vi: 'Xóa báo cáo' },
  'Self-host & contribute': { es: 'Autoalojar y colaborar', vi: 'Tự triển khai và đóng góp' },
  GitHub: { es: 'GitHub', vi: 'GitHub' },
  'More Reseed apps': { es: 'Más apps de Reseed', vi: 'Các ứng dụng khác của Reseed' },
  'Spam Patterns is a project of Reseed LLC. Reports are voluntary submissions. A listing is not an allegation against any person or business. Counts visits and filed reports in total, nothing about you.': {
    es: 'Spam Patterns es un proyecto de Reseed LLC. Los reportes se envían de forma voluntaria. Aparecer en una lista no es una acusación contra ninguna persona ni empresa. Cuenta las visitas y los reportes enviados en total, nada sobre usted.',
    vi: 'Spam Patterns là một dự án của Reseed LLC. Các báo cáo do người dùng tự nguyện gửi. Việc xuất hiện trong danh sách không phải là lời cáo buộc đối với bất kỳ cá nhân hay doanh nghiệp nào. Trang chỉ đếm tổng số lượt xem và số báo cáo đã gửi, không ghi nhận gì về bạn.',
  },

  // ---- shared caveat (html.ts claimedOriginWarning) ----
  'Claimed origin': { es: 'Origen declarado', vi: 'Nguồn gốc tự nhận' },
  '<strong>Claimed origin, not evidence of location.</strong> This view groups reports by the displayed sender’s area code. Sender numbers can be spoofed. A city named in a message is recorded separately.': {
    es: '<strong>Origen declarado, no prueba de ubicación.</strong> Esta vista agrupa los reportes según el código de área del remitente que aparece en pantalla. Los números de remitente se pueden falsificar. Una ciudad mencionada en un mensaje se registra por separado.',
    vi: '<strong>Nguồn gốc tự nhận, không phải bằng chứng về vị trí.</strong> Chế độ xem này nhóm các báo cáo theo mã vùng của số người gửi được hiển thị. Số người gửi có thể bị giả mạo. Thành phố được nêu trong tin nhắn được ghi nhận riêng.',
  },

  // ---- review and rules sentences shared by several pages (pages.ts) ----
  'that the match is real, that no personal detail survived scrubbing, and that the pattern does not read as identifying a person or a single business': {
    es: 'que la coincidencia sea real, que ningún dato personal haya sobrevivido a la depuración y que el patrón no parezca identificar a una persona ni a una sola empresa',
    vi: 'rằng sự trùng khớp là có thật, rằng không còn thông tin cá nhân nào sót lại sau khi làm sạch, và rằng mẫu không có vẻ nhận diện một cá nhân hay một doanh nghiệp cụ thể',
  },
  'When {n} eligible reports match, the pattern goes to a maintainer for review; it is published only after review. The review checks {checks}.': {
    es: 'Cuando coinciden {n} reportes elegibles, el patrón pasa a revisión por parte de un responsable del sitio; solo se publica después de esa revisión. La revisión comprueba {checks}.',
    vi: 'Khi có {n} báo cáo hợp lệ trùng khớp, mẫu được chuyển cho người duy trì xem xét; mẫu chỉ được công bố sau khi duyệt. Việc duyệt kiểm tra {checks}.',
  },
  'Redaction rules {r} · Matching rules {m}': {
    es: 'Reglas de depuración {r} · Reglas de coincidencia {m}',
    vi: 'Quy tắc làm sạch {r} · Quy tắc so khớp {m}',
  },

  // ---- error pages and generic messages (src/app.ts) ----
  Error: { es: 'Error', vi: 'Lỗi' },
  'Page not found': { es: 'Página no encontrada', vi: 'Không tìm thấy trang' },
  'Request not accepted': { es: 'Solicitud no aceptada', vi: 'Yêu cầu không được chấp nhận' },
  'Back to overview': { es: 'Volver al resumen', vi: 'Quay lại trang tổng quan' },
  'Not found.': { es: 'No se encontró.', vi: 'Không tìm thấy.' },
  'Method not allowed.': { es: 'Método no permitido.', vi: 'Phương thức không được phép.' },
  'Request too large.': { es: 'La solicitud es demasiado grande.', vi: 'Yêu cầu quá lớn.' },
  'Send JSON.': { es: 'Envíe JSON.', vi: 'Hãy gửi dữ liệu JSON.' },
  'Malformed JSON.': { es: 'JSON mal formado.', vi: 'JSON không hợp lệ.' },
  'Unsupported form encoding.': { es: 'Codificación de formulario no admitida.', vi: 'Kiểu mã hóa biểu mẫu không được hỗ trợ.' },
  'Images and file uploads are not accepted. Screenshots are read on your device.': {
    es: 'No se aceptan imágenes ni archivos. Las capturas de pantalla se leen en su dispositivo.',
    vi: 'Trang không nhận hình ảnh hay tệp tải lên. Ảnh chụp màn hình được đọc ngay trên thiết bị của bạn.',
  },
  'Something went wrong. Nothing was changed. Try again.': {
    es: 'Algo salió mal. No se cambió nada. Inténtelo de nuevo.',
    vi: 'Đã xảy ra lỗi. Không có gì bị thay đổi. Hãy thử lại.',
  },
  'Too many attempts. Try again later.': {
    es: 'Demasiados intentos. Inténtelo más tarde.',
    vi: 'Quá nhiều lần thử. Hãy thử lại sau.',
  },
  'Too many flags. Try again later.': {
    es: 'Demasiadas señalizaciones. Inténtelo más tarde.',
    vi: 'Quá nhiều lần gắn cờ. Hãy thử lại sau.',
  },
  'Check the form.': { es: 'Revise el formulario.', vi: 'Hãy kiểm tra lại biểu mẫu.' },
  'Enter the 32-character receipt code you saved when you filed the report.': {
    es: 'Escriba el código de recibo de 32 caracteres que guardó cuando envió el reporte.',
    vi: 'Nhập mã biên nhận gồm 32 ký tự mà bạn đã lưu khi gửi báo cáo.',
  },
};
