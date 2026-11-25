// Patterns, pattern pages, data, methodology (src/pages.ts), plus the tier
// labels (src/patterns.ts), the slot rules (src/skeleton.ts) and the
// area-code data note (data/area-codes.json, via src/areacodes.ts).
import type { Dict } from './types.ts';

export const DICT_CONTENT: Dict = {
  // ---- correction line (/patterns and every pattern page) ----
  'If a published pattern is wrong or identifies you or your business, contact <a href="mailto:{email}">{email}</a> for review or removal.': {
    es: 'Si un patrón publicado es incorrecto o lo identifica a usted o a su empresa, escriba a <a href="mailto:{email}">{email}</a> para pedir su revisión o eliminación.',
    vi: 'Nếu một mẫu đã công bố bị sai hoặc nhận diện bạn hay doanh nghiệp của bạn, hãy liên hệ <a href="mailto:{email}">{email}</a> để được xem xét lại hoặc gỡ bỏ.',
  },

  // ---- tier labels (src/patterns.ts TIER_LABEL; also used on the overview) ----
  'identical message': { es: 'mensaje idéntico', vi: 'tin nhắn giống hệt' },
  'same message, lightly edited': { es: 'mismo mensaje, con pequeños cambios', vi: 'cùng tin nhắn, có chỉnh sửa nhỏ' },
  'shared script pattern': { es: 'patrón de guion compartido', vi: 'mẫu kịch bản chung' },

  // ---- /patterns ----
  'Template match · {n} reports': {
    es: 'Coincidencia de plantilla · {n} reportes',
    vi: 'Trùng khớp khuôn văn bản · {n} báo cáo',
  },
  '<dt>Pattern ID</dt><dd class="mono">{id}</dd>\n<dt>Reports</dt><dd class="num">{count}</dd>\n<dt>Dates</dt><dd>{from} to {to}</dd>\n<dt>Category</dt><dd>{categories}</dd>': {
    es: '<dt>ID del patrón</dt><dd class="mono">{id}</dd>\n<dt>Reportes</dt><dd class="num">{count}</dd>\n<dt>Fechas</dt><dd>del {from} al {to}</dd>\n<dt>Categoría</dt><dd>{categories}</dd>',
    vi: '<dt>Mã mẫu</dt><dd class="mono">{id}</dd>\n<dt>Số báo cáo</dt><dd class="num">{count}</dd>\n<dt>Thời gian</dt><dd>{from} đến {to}</dd>\n<dt>Danh mục</dt><dd>{categories}</dd>',
  },
  '<strong>{label}</strong>: the masked text is the same.': {
    es: '<strong>{label}</strong>: el texto enmascarado es el mismo.',
    vi: '<strong>{label}</strong>: văn bản đã che giống hệt nhau.',
  },
  '<strong>{label}</strong>: the masked text is nearly the same.': {
    es: '<strong>{label}</strong>: el texto enmascarado es casi el mismo.',
    vi: '<strong>{label}</strong>: văn bản đã che gần như giống nhau.',
  },
  '<strong>{label}</strong>: different wording following the same sequence of moves. This alone never means the texts came from the same sender.': {
    es: '<strong>{label}</strong>: redacción distinta que sigue la misma secuencia de pasos. Esto por sí solo nunca significa que los mensajes vengan del mismo remitente.',
    vi: '<strong>{label}</strong>: cách diễn đạt khác nhau nhưng theo cùng một trình tự các bước. Chỉ riêng điều này không bao giờ có nghĩa là các tin nhắn đến từ cùng một người gửi.',
  },
  'Understanding the signal': { es: 'Entender la señal', vi: 'Hiểu đúng tín hiệu' },
  'Recurring messages and scripts, published after review. A pattern shows repetition in the reports. It does not show who sent the texts, or that they share a sender.': {
    es: 'Mensajes y guiones que se repiten, publicados después de una revisión. Un patrón muestra repetición en los reportes. No muestra quién envió los mensajes ni que tengan un mismo remitente.',
    vi: 'Các tin nhắn và kịch bản lặp lại, được công bố sau khi duyệt. Một mẫu cho thấy sự lặp lại trong các báo cáo. Mẫu không cho biết ai đã gửi tin nhắn, cũng không cho thấy chúng có chung người gửi.',
  },
  'A published pattern goes back to review if its matching templates change, and leaves this page if deletions take it below {n} reports.': {
    es: 'Un patrón publicado vuelve a revisión si cambian las plantillas que coinciden, y sale de esta página si, por eliminaciones, queda con menos de {n} reportes.',
    vi: 'Một mẫu đã công bố sẽ được duyệt lại nếu các khuôn văn bản trùng khớp của nó thay đổi, và sẽ bị gỡ khỏi trang này nếu việc xóa báo cáo khiến nó còn dưới {n} báo cáo.',
  },
  '<p class="status-mark">Pilot in progress</p>\n<p class="empty">No pattern has been published yet.</p>': {
    es: '<p class="status-mark">Prueba piloto en curso</p>\n<p class="empty">Todavía no se ha publicado ningún patrón.</p>',
    vi: '<p class="status-mark">Đang chạy thử nghiệm</p>\n<p class="empty">Chưa có mẫu nào được công bố.</p>',
  },
  '{rules} · Skeleton grammar {grammar}. <a href="/methodology#clustering">How patterns are matched</a> · <a href="/methodology#review">How review works</a>. To contest a pattern privately, use the <a href="/privacy#contest">private flag form</a>.': {
    es: '{rules} · Gramática de esqueletos {grammar}. <a href="/methodology#clustering">Cómo se agrupan los patrones</a> · <a href="/methodology#review">Cómo funciona la revisión</a>. Para impugnar un patrón de forma privada, use el <a href="/privacy#contest">formulario de señalización privada</a>.',
    vi: '{rules} · Ngữ pháp khung {grammar}. <a href="/methodology#clustering">Cách so khớp các mẫu</a> · <a href="/methodology#review">Cách thức duyệt</a>. Để khiếu nại một mẫu một cách riêng tư, hãy dùng <a href="/privacy#contest">biểu mẫu gắn cờ riêng tư</a>.',
  },
  '<h2 id="sources-h">Sources</h2>\n<ul class="meta">\n<li>Published patterns: <span class="num">{count}</span>, from reports filed on this site. Each has at least {n} eligible matching reports and was published after maintainer review.</li>\n<li>Matching rules: {rules} · Skeleton grammar {grammar}. <a href="/methodology#versions">Rules versions</a>.</li>\n<li>Method: <a href="/methodology#clustering">How patterns are matched</a> · <a href="/methodology#review">How review works</a>.</li>\n</ul>': {
    es: '<h2 id="sources-h">Fuentes</h2>\n<ul class="meta">\n<li>Patrones publicados: <span class="num">{count}</span>, a partir de reportes enviados en este sitio. Cada uno tiene al menos {n} reportes elegibles que coinciden y se publicó después de la revisión de un responsable del sitio.</li>\n<li>Reglas de coincidencia: {rules} · Gramática de esqueletos {grammar}. <a href="/methodology#versions">Versiones de las reglas</a>.</li>\n<li>Método: <a href="/methodology#clustering">Cómo se agrupan los patrones</a> · <a href="/methodology#review">Cómo funciona la revisión</a>.</li>\n</ul>',
    vi: '<h2 id="sources-h">Nguồn</h2>\n<ul class="meta">\n<li>Số mẫu đã công bố: <span class="num">{count}</span>, từ các báo cáo được gửi trên trang này. Mỗi mẫu có ít nhất {n} báo cáo hợp lệ trùng khớp và được công bố sau khi người duy trì duyệt.</li>\n<li>Quy tắc so khớp: {rules} · Ngữ pháp khung {grammar}. <a href="/methodology#versions">Các phiên bản quy tắc</a>.</li>\n<li>Phương pháp: <a href="/methodology#clustering">Cách so khớp các mẫu</a> · <a href="/methodology#review">Cách thức duyệt</a>.</li>\n</ul>',
  },
  'Published spam text patterns': { es: 'Patrones de mensajes de spam publicados', vi: 'Các mẫu tin nhắn rác đã công bố' },
  'Recurring spam text messages and scripts, published only after maintainer review. A pattern shows repetition, not who sent the texts.': {
    es: 'Mensajes de spam y guiones que se repiten, publicados solo después de la revisión de un responsable del sitio. Un patrón muestra repetición, no quién envió los mensajes.',
    vi: 'Các tin nhắn rác và kịch bản lặp lại, chỉ được công bố sau khi người duy trì duyệt. Một mẫu cho thấy sự lặp lại, không cho biết ai đã gửi tin nhắn.',
  },

  // ---- pattern page ----
  'Pattern unavailable': { es: 'Patrón no disponible', vi: 'Mẫu không khả dụng' },
  'This pattern is not available': { es: 'Este patrón no está disponible', vi: 'Mẫu này hiện không khả dụng' },
  'It may not be published yet, it may be back under review, it may have dropped below {n} eligible reports after a deletion, or the link may be wrong.': {
    es: 'Puede que todavía no se haya publicado, que haya vuelto a revisión, que haya quedado con menos de {n} reportes elegibles tras una eliminación, o que el enlace sea incorrecto.',
    vi: 'Có thể mẫu chưa được công bố, đang được duyệt lại, đã còn dưới {n} báo cáo hợp lệ sau khi có báo cáo bị xóa, hoặc đường liên kết bị sai.',
  },
  '<a href="/patterns">All patterns</a> · <a href="/methodology#review">How review works</a>': {
    es: '<a href="/patterns">Todos los patrones</a> · <a href="/methodology#review">Cómo funciona la revisión</a>',
    vi: '<a href="/patterns">Tất cả các mẫu</a> · <a href="/methodology#review">Cách thức duyệt</a>',
  },
  '<dt>Pattern ID</dt><dd class="mono">{id}</dd>\n<dt>Reports</dt><dd class="num">{count}</dd>\n<dt>First report</dt><dd>{first}</dd>\n<dt>Latest report</dt><dd>{latest}</dd>\n<dt>Categories</dt><dd>{categories}</dd>\n<dt>Sender area codes</dt><dd>{areaCodes}</dd>\n<dt>Skeleton grammar</dt><dd>{grammar}</dd>': {
    es: '<dt>ID del patrón</dt><dd class="mono">{id}</dd>\n<dt>Reportes</dt><dd class="num">{count}</dd>\n<dt>Primer reporte</dt><dd>{first}</dd>\n<dt>Último reporte</dt><dd>{latest}</dd>\n<dt>Categorías</dt><dd>{categories}</dd>\n<dt>Códigos de área del remitente</dt><dd>{areaCodes}</dd>\n<dt>Gramática de esqueletos</dt><dd>{grammar}</dd>',
    vi: '<dt>Mã mẫu</dt><dd class="mono">{id}</dd>\n<dt>Số báo cáo</dt><dd class="num">{count}</dd>\n<dt>Báo cáo đầu tiên</dt><dd>{first}</dd>\n<dt>Báo cáo gần nhất</dt><dd>{latest}</dd>\n<dt>Danh mục</dt><dd>{categories}</dd>\n<dt>Mã vùng của người gửi</dt><dd>{areaCodes}</dd>\n<dt>Ngữ pháp khung</dt><dd>{grammar}</dd>',
  },
  '{n} different area code': { es: '{n} código de área distinto', vi: '{n} mã vùng khác nhau' },
  '{n} different area codes': { es: '{n} códigos de área distintos', vi: '{n} mã vùng khác nhau' },
  'Script skeleton': { es: 'Esqueleto del guion', vi: 'Khung kịch bản' },
  'Fully masked example': { es: 'Ejemplo totalmente enmascarado', vi: 'Ví dụ đã che kín' },
  'This example is built from the skeleton’s slots, not from any report’s text.': {
    es: 'Este ejemplo se construye a partir de las casillas del esqueleto, no a partir del texto de ningún reporte.',
    vi: 'Ví dụ này được dựng từ các ô của khung, không lấy từ nội dung của bất kỳ báo cáo nào.',
  },
  'These messages do not follow a recognizable script skeleton in grammar {grammar}.': {
    es: 'Estos mensajes no siguen un esqueleto de guion reconocible en la gramática {grammar}.',
    vi: 'Các tin nhắn này không theo một khung kịch bản nào nhận ra được trong ngữ pháp {grammar}.',
  },
  'These reports follow the same script pattern with different wording. A shared script can be used by many unrelated senders, for example businesses using the same texting template. It does not establish a common sender or coordination.': {
    es: 'Estos reportes siguen el mismo patrón de guion con distinta redacción. Un guion compartido puede ser usado por muchos remitentes sin relación entre sí, por ejemplo empresas que usan la misma plantilla de mensajes. No demuestra que haya un remitente común ni coordinación.',
    vi: 'Các báo cáo này theo cùng một mẫu kịch bản nhưng với cách diễn đạt khác nhau. Một kịch bản chung có thể được nhiều người gửi không liên quan đến nhau sử dụng, ví dụ các doanh nghiệp dùng cùng một khuôn tin nhắn. Điều này không chứng minh có chung người gửi hay có sự phối hợp.',
  },
  'Matching text shows the message was repeated. It does not establish who sent it, or that the reports came from different people.': {
    es: 'Que el texto coincida muestra que el mensaje se repitió. No demuestra quién lo envió ni que los reportes vengan de personas distintas.',
    vi: 'Văn bản trùng khớp cho thấy tin nhắn đã được lặp lại. Điều này không chứng minh ai đã gửi, cũng không chứng minh các báo cáo đến từ những người khác nhau.',
  },
  'Published after review. {rules}. We publish the pattern, not its members: no numbers, prefixes, businesses or message text. <a href="/methodology#clustering">Clustering rules</a> · <a href="/privacy#contest">Flag this pattern privately</a>': {
    es: 'Publicado después de una revisión. {rules}. Publicamos el patrón, no sus integrantes: ni números, ni prefijos, ni empresas, ni texto de los mensajes. <a href="/methodology#clustering">Reglas de agrupación</a> · <a href="/privacy#contest">Señalar este patrón de forma privada</a>',
    vi: 'Được công bố sau khi duyệt. {rules}. Chúng tôi công bố mẫu, không công bố các thành phần của nó: không có số điện thoại, tiền tố, doanh nghiệp hay nội dung tin nhắn. <a href="/methodology#clustering">Quy tắc phân nhóm</a> · <a href="/privacy#contest">Gắn cờ mẫu này một cách riêng tư</a>',
  },
  'Pattern {id}': { es: 'Patrón {id}', vi: 'Mẫu {id}' },

  // ---- /data ----
  'Public data, carefully': { es: 'Datos públicos, con cuidado', vi: 'Dữ liệu công khai, một cách thận trọng' },
  'No data release yet': { es: 'Todavía no hay publicación de datos', vi: 'Chưa có bản phát hành dữ liệu nào' },
  'This site has not released any data. There is no feed and no download, and there are no report-level records of any kind. When a release is approved, it will contain only the aggregate counts described below, and this page will show its date and version.': {
    es: 'Este sitio no ha publicado ningún dato. No hay canal de datos ni descarga, y no hay registros de ningún tipo a nivel de reporte. Cuando se apruebe una publicación, contendrá solo los conteos agregados que se describen abajo, y esta página mostrará su fecha y versión.',
    vi: 'Trang này chưa phát hành bất kỳ dữ liệu nào. Không có nguồn cấp dữ liệu, không có tệp tải xuống, và không có bất kỳ bản ghi nào ở cấp từng báo cáo. Khi một bản phát hành được phê duyệt, bản đó sẽ chỉ chứa các số liệu tổng hợp được mô tả bên dưới, và trang này sẽ hiển thị ngày phát hành và phiên bản.',
  },
  'What a release will contain': { es: 'Qué contendrá una publicación', vi: 'Một bản phát hành sẽ chứa gì' },
  'Separate marginal counts, never joined together:': {
    es: 'Conteos marginales por separado, nunca combinados entre sí:',
    vi: 'Các số liệu biên riêng biệt, không bao giờ được ghép với nhau:',
  },
  'reports by sender area code': { es: 'reportes por código de área del remitente', vi: 'số báo cáo theo mã vùng của người gửi' },
  'reports by category': { es: 'reportes por categoría', vi: 'số báo cáo theo danh mục' },
  'reports by pattern skeleton (grammar version included)': {
    es: 'reportes por esqueleto de patrón (con la versión de la gramática)',
    vi: 'số báo cáo theo khung của mẫu (kèm phiên bản ngữ pháp)',
  },
  'reports by UTC day': { es: 'reportes por día (UTC)', vi: 'số báo cáo theo ngày (UTC)' },
  'Never included: message text, sender numbers, prefixes, keyed hashes, fingerprints tied to reports, cities, hours, or any combination of these.': {
    es: 'Nunca se incluyen: texto de los mensajes, números de remitente, prefijos, hashes con clave, huellas vinculadas a reportes, ciudades, horas, ni ninguna combinación de estos datos.',
    vi: 'Không bao giờ bao gồm: nội dung tin nhắn, số của người gửi, tiền tố, mã băm có khóa, dấu vân tay gắn với báo cáo, thành phố, giờ, hay bất kỳ sự kết hợp nào của những thông tin này.',
  },
  'Suppression and delay rules': { es: 'Reglas de supresión y de demora', vi: 'Quy tắc ẩn số liệu và độ trễ' },
  'A count appears only if it covers at least <strong>10 reports</strong>. Smaller counts are suppressed.': {
    es: 'Un conteo aparece solo si abarca al menos <strong>10 reportes</strong>. Los conteos menores se suprimen.',
    vi: 'Một số liệu chỉ xuất hiện nếu bao gồm ít nhất <strong>10 báo cáo</strong>. Các số liệu nhỏ hơn sẽ bị ẩn.',
  },
  'A report becomes eligible only <strong>7 days</strong> after it is filed.': {
    es: 'Un reporte pasa a ser elegible solo <strong>7 días</strong> después de enviarse.',
    vi: 'Một báo cáo chỉ được tính sau <strong>7 ngày</strong> kể từ khi được gửi.',
  },
  'Time is day or coarser. Never hour.': {
    es: 'El tiempo se indica por día o en unidades mayores. Nunca por hora.',
    vi: 'Thời gian được tính theo ngày hoặc đơn vị lớn hơn. Không bao giờ theo giờ.',
  },
  'Before each release, successive releases are compared so a suppressed count cannot be worked out by subtracting one release from another.': {
    es: 'Antes de cada publicación se comparan las publicaciones sucesivas, para que no se pueda deducir un conteo suprimido restando una publicación de otra.',
    vi: 'Trước mỗi lần phát hành, các bản phát hành liên tiếp được so sánh với nhau để không ai suy ra được một số liệu đã ẩn bằng cách lấy bản này trừ bản kia.',
  },
  'Deleted reports are removed from all future releases. Copies already downloaded cannot be recalled.': {
    es: 'Los reportes eliminados se quitan de todas las publicaciones futuras. Las copias ya descargadas no se pueden recuperar.',
    vi: 'Các báo cáo đã xóa sẽ bị loại khỏi mọi bản phát hành sau này. Không thể thu hồi các bản sao đã được tải xuống.',
  },
  Freshness: { es: 'Actualización', vi: 'Độ cập nhật' },
  '<dt>Latest release</dt><dd>None</dd><dt>Release cadence</dt><dd>Not scheduled</dd>': {
    es: '<dt>Última publicación</dt><dd>Ninguna</dd><dt>Frecuencia de publicación</dt><dd>Sin programar</dd>',
    vi: '<dt>Bản phát hành gần nhất</dt><dd>Chưa có</dd><dt>Tần suất phát hành</dt><dd>Chưa lên lịch</dd>',
  },
  Schema: { es: 'Esquema', vi: 'Lược đồ' },
  'The planned release format is published as a JSON Schema: <a href="/data/schema.json">/data/schema.json</a>. Field definitions are in the data dictionary in the project repository (<span class="mono">docs/data-dictionary.md</span>).': {
    es: 'El formato previsto de las publicaciones está publicado como JSON Schema: <a href="/data/schema.json">/data/schema.json</a>. Las definiciones de los campos están en el diccionario de datos del repositorio del proyecto (<span class="mono">docs/data-dictionary.md</span>).',
    vi: 'Định dạng dự kiến của bản phát hành được công bố dưới dạng JSON Schema: <a href="/data/schema.json">/data/schema.json</a>. Định nghĩa các trường nằm trong từ điển dữ liệu ở kho mã của dự án (<span class="mono">docs/data-dictionary.md</span>).',
  },
  Notice: { es: 'Aviso', vi: 'Lưu ý' },
  'No warranty of accuracy. Area codes are claimed origin. A listing is not an allegation against any person or business. Reports are voluntary submissions and counts do not measure spam prevalence.': {
    es: 'Sin garantía de exactitud. Los códigos de área son el origen declarado. Aparecer en una lista no es una acusación contra ninguna persona ni empresa. Los reportes se envían de forma voluntaria y los conteos no miden cuánto spam circula.',
    vi: 'Không bảo đảm tính chính xác. Mã vùng chỉ là nguồn gốc tự nhận. Việc xuất hiện trong danh sách không phải là lời cáo buộc đối với bất kỳ cá nhân hay doanh nghiệp nào. Các báo cáo do người dùng tự nguyện gửi và số liệu không đo lường mức độ phổ biến của tin nhắn rác.',
  },
  License: { es: 'Licencia', vi: 'Giấy phép' },
  'Approved aggregate releases will be dedicated to the public domain (CC0), only to the extent Reseed and submitters hold rights. Spam senders’ own wording is not ours to dedicate and is never released.': {
    es: 'Las publicaciones agregadas aprobadas se cederán al dominio público (CC0), solo en la medida en que Reseed y quienes envían reportes tengan derechos sobre ellas. La redacción de los propios remitentes de spam no nos pertenece, así que no podemos cederla, y nunca se publica.',
    vi: 'Các bản phát hành tổng hợp đã được phê duyệt sẽ được đưa vào phạm vi công cộng (CC0), chỉ trong phạm vi mà Reseed và những người gửi báo cáo có quyền. Lời lẽ do chính những kẻ gửi tin nhắn rác viết không thuộc về chúng tôi nên chúng tôi không thể đưa vào phạm vi công cộng, và chúng không bao giờ được phát hành.',
  },
  'Questions or corrections: <a href="mailto:{email}">{email}</a>. Please do not include original message text or phone numbers in routine inquiries.': {
    es: 'Preguntas o correcciones: <a href="mailto:{email}">{email}</a>. Por favor, no incluya el texto original de los mensajes ni números de teléfono en las consultas habituales.',
    vi: 'Câu hỏi hoặc góp ý sửa lỗi: <a href="mailto:{email}">{email}</a>. Vui lòng không đưa nội dung tin nhắn gốc hay số điện thoại vào các câu hỏi thông thường.',
  },
  'What a Spam Patterns data release will contain: aggregate counts only, with suppression and delay rules. No data has been released yet.': {
    es: 'Qué contendrá una publicación de datos de Spam Patterns: solo conteos agregados, con reglas de supresión y de demora. Todavía no se ha publicado ningún dato.',
    vi: 'Một bản phát hành dữ liệu của Spam Patterns sẽ chứa gì: chỉ các số liệu tổng hợp, kèm quy tắc ẩn số liệu và độ trễ. Hiện chưa có dữ liệu nào được phát hành.',
  },

  // ---- /methodology ----
  'Open methodology': { es: 'Metodología abierta', vi: 'Phương pháp công khai' },
  'Effective {effective}, revised {revised}.': {
    es: 'Vigente desde el {effective}, revisada el {revised}.',
    vi: 'Có hiệu lực từ {effective}, sửa đổi ngày {revised}.',
  },
  '<strong>{rules}</strong> · Skeleton grammar {grammar} · Area-code data {areaVersion}': {
    es: '<strong>{rules}</strong> · Gramática de esqueletos {grammar} · Datos de códigos de área {areaVersion}',
    vi: '<strong>{rules}</strong> · Ngữ pháp khung {grammar} · Dữ liệu mã vùng {areaVersion}',
  },
  'Reports are voluntary submissions from people who chose to file them. They are not a sample of all spam, and counts do not measure how much spam is sent. Early data may come from very few reporters.': {
    es: 'Los reportes los envían voluntariamente personas que decidieron hacerlo. No son una muestra de todo el spam, y los conteos no miden cuánto spam se envía. Los primeros datos pueden venir de muy pocas personas.',
    vi: 'Báo cáo là do những người tự nguyện chọn gửi. Chúng không đại diện cho tất cả tin nhắn rác, và số liệu không đo lường lượng tin nhắn rác được gửi đi. Dữ liệu ban đầu có thể chỉ đến từ rất ít người báo cáo.',
  },
  'Every geographic view uses the sender’s displayed area code. Sender numbers can be spoofed, so this is the claimed origin, not a location. The area code’s <strong>numbering-plan reference region</strong> is the state or territory it is assigned to. It is kept separate from any <strong>city named in the message</strong>, which is never shown publicly.': {
    es: 'Todas las vistas geográficas usan el código de área que aparece en el número del remitente. Los números de remitente se pueden falsificar, así que esto es el origen declarado, no una ubicación. La <strong>región de referencia del plan de numeración</strong> del código de área es el estado o territorio al que está asignado. Se mantiene separada de cualquier <strong>ciudad mencionada en el mensaje</strong>, que nunca se muestra públicamente.',
    vi: 'Mọi chế độ xem theo địa lý đều dùng mã vùng hiển thị trong số của người gửi. Số người gửi có thể bị giả mạo, nên đây là nguồn gốc tự nhận, không phải vị trí. <strong>Khu vực tham chiếu theo kế hoạch đánh số</strong> của mã vùng là bang hoặc vùng lãnh thổ được cấp mã đó. Thông tin này được giữ tách biệt với <strong>thành phố được nêu trong tin nhắn</strong>, vốn không bao giờ được hiển thị công khai.',
  },
  'Area codes outside the US (Canada and the Caribbean) are not accepted in this version. Toll-free codes and US territories are counted in the table but have no map tile.': {
    es: 'En esta versión no se aceptan códigos de área fuera de EE. UU. (Canadá y el Caribe). Los códigos gratuitos y los territorios de EE. UU. se cuentan en la tabla, pero no tienen casilla en el mapa.',
    vi: 'Phiên bản này không nhận các mã vùng ngoài Hoa Kỳ (Canada và vùng Caribe). Các mã miễn cước và các vùng lãnh thổ của Hoa Kỳ được đếm trong bảng nhưng không có ô trên bản đồ.',
  },
  'Area-code data: {source}': { es: 'Datos de códigos de área: {source}', vi: 'Dữ liệu mã vùng: {source}' },
  'Generated from the NANPA NPA database CSV (https://reports.nanpa.com/public/npa_report.csv, linked from https://www.nanpa.com/reports/npa-reports) by scripts/verify-area-codes.mjs. Scope: in-service US geographic codes (states, DC, territories) and in-service toll-free codes. Area-code assignment is a numbering-plan fact, not a sender location. Corrections welcome (see CONTRIBUTING.md).': {
    es: 'Generado a partir del CSV de la base de datos NPA de NANPA (https://reports.nanpa.com/public/npa_report.csv, enlazado desde https://www.nanpa.com/reports/npa-reports) con scripts/verify-area-codes.mjs. Alcance: códigos geográficos de EE. UU. en servicio (estados, DC, territorios) y códigos gratuitos en servicio. La asignación de un código de área es un dato del plan de numeración, no la ubicación del remitente. Se aceptan correcciones (consulte CONTRIBUTING.md).',
    vi: 'Được tạo từ tệp CSV cơ sở dữ liệu NPA của NANPA (https://reports.nanpa.com/public/npa_report.csv, liên kết từ https://www.nanpa.com/reports/npa-reports) bằng scripts/verify-area-codes.mjs. Phạm vi: các mã vùng địa lý của Hoa Kỳ đang hoạt động (các bang, DC, các vùng lãnh thổ) và các mã miễn cước đang hoạt động. Việc cấp mã vùng là một dữ kiện của kế hoạch đánh số, không phải vị trí của người gửi. Hoan nghênh góp ý sửa lỗi (xem CONTRIBUTING.md).',
  },
  'Every report is reduced by fixed rules to a masked template: names, numbers, links, emails and places are replaced with labels. Matching runs only on that template, in three separate tiers. Each tier has its own label and they are never merged.': {
    es: 'Cada reporte se reduce, mediante reglas fijas, a una plantilla enmascarada: los nombres, números, enlaces, correos electrónicos y lugares se reemplazan por etiquetas. La coincidencia se busca solo en esa plantilla, en tres niveles separados. Cada nivel tiene su propia etiqueta y nunca se fusionan.',
    vi: 'Mỗi báo cáo được rút gọn theo các quy tắc cố định thành một khuôn văn bản đã che: tên, số, đường liên kết, địa chỉ email và địa danh được thay bằng nhãn. Việc so khớp chỉ chạy trên khuôn văn bản đó, theo ba mức riêng biệt. Mỗi mức có nhãn riêng và các mức không bao giờ được gộp lại.',
  },
  '<strong>{label}</strong>: the masked templates are the same after lowercasing and spacing are normalized.': {
    es: '<strong>{label}</strong>: las plantillas enmascaradas son iguales después de pasar todo a minúsculas y normalizar los espacios.',
    vi: '<strong>{label}</strong>: các khuôn văn bản đã che giống hệt nhau sau khi chuyển về chữ thường và chuẩn hóa khoảng trắng.',
  },
  '<strong>{label}</strong>: the templates share most of their {size}-word sequences (estimated with {perms}-way MinHash; similarity at least {threshold} to the group’s first report). Each report is compared to the group’s first report only, so a chain of small edits cannot pull unrelated texts together.': {
    es: '<strong>{label}</strong>: las plantillas comparten la mayoría de sus secuencias de {size} palabras (estimado con MinHash de {perms} permutaciones; similitud de al menos {threshold} con el primer reporte del grupo). Cada reporte se compara solo con el primer reporte del grupo, para que una cadena de pequeñas modificaciones no junte mensajes sin relación.',
    vi: '<strong>{label}</strong>: các khuôn văn bản có chung phần lớn các chuỗi {size} từ (ước tính bằng MinHash với {perms} hoán vị; độ tương đồng ít nhất {threshold} so với báo cáo đầu tiên của nhóm). Mỗi báo cáo chỉ được so với báo cáo đầu tiên của nhóm, nên một chuỗi chỉnh sửa nhỏ nối tiếp nhau không thể kéo các tin nhắn không liên quan vào cùng một nhóm.',
  },
  '<strong>{label}</strong>: the templates follow the same script skeleton, described below. This tier alone never implies a shared sender.': {
    es: '<strong>{label}</strong>: las plantillas siguen el mismo esqueleto del guion, descrito más abajo. Este nivel por sí solo nunca implica un remitente compartido.',
    vi: '<strong>{label}</strong>: các khuôn văn bản theo cùng một khung kịch bản, được mô tả bên dưới. Chỉ riêng mức này không bao giờ ngụ ý có chung người gửi.',
  },
  '<strong>{n} eligible reports</strong> that match are a review trigger, not automatic publication (see <a href="#review">Review before publication</a>). A report is eligible while it exists and is not a short-window duplicate (the same sender hash and the same template within {hours} hours, or the same sender hash, template and connection within 7 days, while the server has been running). Three reports do not establish three independent reporters, three senders, or common control. If deletions take a pattern below {n}, it disappears from every public view at once. A group that matches the same reports as a higher tier is listed once, under the higher tier.': {
    es: '<strong>{n} reportes elegibles</strong> que coinciden activan una revisión, no una publicación automática (consulte <a href="#review">Revisión antes de publicar</a>). Un reporte es elegible mientras exista y no sea un duplicado de corto plazo (el mismo hash del remitente y la misma plantilla en un plazo de {hours} horas, o el mismo hash del remitente, la misma plantilla y la misma conexión en un plazo de 7 días, mientras el servidor siga en funcionamiento). Tres reportes no demuestran tres personas independientes, tres remitentes ni un control común. Si por eliminaciones un patrón queda por debajo de {n}, desaparece de inmediato de todas las vistas públicas. Un grupo que coincide con los mismos reportes que un nivel superior aparece una sola vez, en el nivel superior.',
    vi: '<strong>{n} báo cáo hợp lệ</strong> trùng khớp sẽ kích hoạt việc duyệt, chứ không tự động được công bố (xem <a href="#review">Duyệt trước khi công bố</a>). Một báo cáo được coi là hợp lệ khi nó vẫn còn tồn tại và không phải là bản trùng lặp trong thời gian ngắn (cùng mã băm người gửi và cùng khuôn văn bản trong vòng {hours} giờ, hoặc cùng mã băm người gửi, khuôn văn bản và kết nối trong vòng 7 ngày, khi máy chủ vẫn đang chạy). Ba báo cáo không chứng minh có ba người báo cáo độc lập, ba người gửi, hay một sự kiểm soát chung. Nếu việc xóa báo cáo khiến một mẫu còn dưới {n}, mẫu đó lập tức biến mất khỏi mọi chế độ xem công khai. Một nhóm trùng với cùng các báo cáo của một mức cao hơn chỉ được liệt kê một lần, ở mức cao hơn.',
  },
  '<strong>{n} eligible reports</strong> that match are a review trigger, not automatic publication (see <a href="#review">Review before publication</a>). A report is eligible while it exists and is not a short-window duplicate (the same sender hash and the same template within {hours} hours). Three reports do not establish three independent reporters, three senders, or common control. If deletions take a pattern below {n}, it disappears from every public view at once. A group that matches the same reports as a higher tier is listed once, under the higher tier.': {
    es: '<strong>{n} reportes elegibles</strong> que coinciden activan una revisión, no una publicación automática (consulte <a href="#review">Revisión antes de publicar</a>). Un reporte es elegible mientras exista y no sea un duplicado de corto plazo (el mismo hash del remitente y la misma plantilla en un plazo de {hours} horas). Tres reportes no demuestran tres personas independientes, tres remitentes ni un control común. Si por eliminaciones un patrón queda por debajo de {n}, desaparece de inmediato de todas las vistas públicas. Un grupo que coincide con los mismos reportes que un nivel superior aparece una sola vez, en el nivel superior.',
    vi: '<strong>{n} báo cáo hợp lệ</strong> trùng khớp sẽ kích hoạt việc duyệt, chứ không tự động được công bố (xem <a href="#review">Duyệt trước khi công bố</a>). Một báo cáo được coi là hợp lệ khi nó vẫn còn tồn tại và không phải là bản trùng lặp trong thời gian ngắn (cùng mã băm người gửi và cùng khuôn văn bản trong vòng {hours} giờ). Ba báo cáo không chứng minh có ba người báo cáo độc lập, ba người gửi, hay một sự kiểm soát chung. Nếu việc xóa báo cáo khiến một mẫu còn dưới {n}, mẫu đó lập tức biến mất khỏi mọi chế độ xem công khai. Một nhóm trùng với cùng các báo cáo của một mức cao hơn chỉ được liệt kê một lần, ở mức cao hơn.',
  },
  'A group that reaches {n} eligible reports is held for review and is not shown anywhere, or counted, until a maintainer publishes it. The review checks {checks}. The maintainer can publish it or reject it.': {
    es: 'Un grupo que llega a {n} reportes elegibles queda retenido para revisión y no se muestra en ningún lugar, ni se cuenta, hasta que un responsable del sitio lo publique. La revisión comprueba {checks}. El responsable del sitio puede publicarlo o rechazarlo.',
    vi: 'Một nhóm đạt {n} báo cáo hợp lệ sẽ được giữ lại để duyệt và không được hiển thị ở đâu, cũng không được đếm, cho đến khi người duy trì công bố. Việc duyệt kiểm tra {checks}. Người duy trì có thể công bố hoặc từ chối nhóm đó.',
  },
  'A decision covers the exact set of distinct masked templates that was reviewed. If a template joins or leaves the group, or deletions take it below {n} at any point, the decision lapses and the group goes back to review. More reports of templates already reviewed do not; the report count on a published pattern updates as reports are filed or deleted.': {
    es: 'Una decisión cubre exactamente el conjunto de plantillas enmascaradas distintas que se revisó. Si una plantilla entra en el grupo o sale de él, o si en algún momento las eliminaciones lo dejan por debajo de {n}, la decisión caduca y el grupo vuelve a revisión. Los nuevos reportes de plantillas ya revisadas no tienen ese efecto; el número de reportes de un patrón publicado se actualiza a medida que se envían o eliminan reportes.',
    vi: 'Một quyết định áp dụng đúng cho tập hợp các khuôn văn bản đã che riêng biệt đã được duyệt. Nếu có khuôn văn bản nhập vào hoặc rời khỏi nhóm, hoặc vào bất kỳ lúc nào việc xóa báo cáo khiến nhóm còn dưới {n}, quyết định sẽ hết hiệu lực và nhóm được duyệt lại. Các báo cáo mới thuộc những khuôn văn bản đã được duyệt thì không gây ra điều đó; số báo cáo của một mẫu đã công bố được cập nhật khi có báo cáo được gửi hoặc bị xóa.',
  },
  'Review affects only whether a pattern is published. Every report still counts in the totals, the area-code table and the map from the moment it is filed.': {
    es: 'La revisión solo decide si un patrón se publica. Cada reporte se sigue contando en los totales, en la tabla de códigos de área y en el mapa desde el momento en que se envía.',
    vi: 'Việc duyệt chỉ quyết định một mẫu có được công bố hay không. Mọi báo cáo vẫn được tính vào tổng số, bảng mã vùng và bản đồ ngay từ lúc được gửi.',
  },
  'Selection bias: people who report are not a random sample.': {
    es: 'Sesgo de selección: las personas que reportan no son una muestra aleatoria.',
    vi: 'Sai lệch chọn mẫu: những người gửi báo cáo không phải là một nhóm được chọn ngẫu nhiên.',
  },
  'Spoofing: area codes can be faked.': {
    es: 'Falsificación: los códigos de área se pueden falsificar.',
    vi: 'Giả mạo: mã vùng có thể bị làm giả.',
  },
  'Extraction errors: screenshot reading and the masking rules can miss or over-remove text.': {
    es: 'Errores de extracción: la lectura de capturas de pantalla y las reglas de enmascaramiento pueden pasar por alto texto o quitar más de la cuenta.',
    vi: 'Lỗi trích xuất: việc đọc ảnh chụp màn hình và các quy tắc che có thể bỏ sót chữ hoặc xóa nhiều hơn mức cần thiết.',
  },
  'Template splits and collisions: small edits can split one script into several groups, and short generic texts can collide.': {
    es: 'Divisiones y colisiones de plantillas: pequeñas modificaciones pueden dividir un guion en varios grupos, y mensajes cortos y genéricos pueden coincidir sin tener relación.',
    vi: 'Tách và trùng khuôn văn bản: các chỉnh sửa nhỏ có thể tách một kịch bản thành nhiều nhóm, và các tin nhắn ngắn, chung chung có thể trùng nhau một cách ngẫu nhiên.',
  },
  'Coordinated submissions: a few people can file matching reports on purpose. The threshold and review stop accidents and obvious cases, not determined abuse.': {
    es: 'Envíos coordinados: unas pocas personas pueden enviar a propósito reportes que coincidan. El umbral y la revisión frenan los accidentes y los casos evidentes, no el abuso decidido.',
    vi: 'Gửi báo cáo có phối hợp: một vài người có thể cố ý gửi các báo cáo trùng khớp. Ngưỡng và việc duyệt ngăn được các trường hợp vô tình và rõ ràng, nhưng không ngăn được kẻ quyết tâm lạm dụng.',
  },
  'Whether a given script is distinctive cannot be known from a handful of reports.': {
    es: 'Con unos pocos reportes no se puede saber si un guion determinado es distintivo.',
    vi: 'Chỉ với một vài báo cáo thì không thể biết một kịch bản cụ thể có đặc trưng riêng hay không.',
  },
  'Who do the reports come from?': { es: '¿De quién vienen los reportes?', vi: 'Các báo cáo đến từ ai?' },
  'What does the geographic proxy show?': {
    es: '¿Qué muestra el indicador geográfico aproximado?',
    vi: 'Chỉ báo địa lý gián tiếp cho thấy điều gì?',
  },
  'How are patterns matched?': { es: '¿Cómo se agrupan los patrones?', vi: 'Các mẫu được so khớp như thế nào?' },
  'Are patterns reviewed before publication?': {
    es: '¿Se revisan los patrones antes de publicarse?',
    vi: 'Các mẫu có được duyệt trước khi công bố không?',
  },
  'What are the known limitations?': { es: '¿Cuáles son las limitaciones conocidas?', vi: 'Những hạn chế đã biết là gì?' },
  'Who the reports come from': { es: 'De quién vienen los reportes', vi: 'Các báo cáo đến từ ai' },
  'The geographic proxy': { es: 'El indicador geográfico aproximado', vi: 'Chỉ báo địa lý gián tiếp' },
  'How patterns are matched': { es: 'Cómo se agrupan los patrones', vi: 'Cách so khớp các mẫu' },
  'Review before publication': { es: 'Revisión antes de publicar', vi: 'Duyệt trước khi công bố' },
  'Skeleton grammar {grammar}': { es: 'Gramática de esqueletos {grammar}', vi: 'Ngữ pháp khung {grammar}' },
  'The skeleton is the order in which these slots first appear in the masked template:': {
    es: 'El esqueleto es el orden en que estas casillas aparecen por primera vez en la plantilla enmascarada:',
    vi: 'Khung là thứ tự xuất hiện lần đầu của các ô sau trong khuôn văn bản đã che:',
  },
  '<th scope="col">Slot</th><th scope="col">Rule</th>': {
    es: '<th scope="col">Casilla</th><th scope="col">Regla</th>',
    vi: '<th scope="col">Ô</th><th scope="col">Quy tắc</th>',
  },
  // src/skeleton.ts SLOT_RULES[...].describe and CTA_DESCRIBE
  'Opens with a greeting word or addresses the recipient by name.': {
    es: 'Empieza con un saludo o se dirige al destinatario por su nombre.',
    vi: 'Mở đầu bằng một lời chào hoặc gọi người nhận bằng tên.',
  },
  'The sender introduces themselves by first name.': {
    es: 'El remitente se presenta con su nombre de pila.',
    vi: 'Người gửi tự giới thiệu bằng tên riêng.',
  },
  'Claims to be local, or names a city or neighborhood.': {
    es: 'Dice ser de la zona, o menciona una ciudad o un vecindario.',
    vi: 'Tự nhận là người ở gần, hoặc nêu tên một thành phố hay khu dân cư.',
  },
  'Names a home-service trade (roofing, lawn, tree, painting, and so on).': {
    es: 'Menciona un servicio para el hogar (techos, césped, árboles, pintura, etc.).',
    vi: 'Nêu một loại dịch vụ cho nhà ở (lợp mái, cắt cỏ, chăm sóc cây, sơn nhà, v.v.).',
  },
  'Offers a quote, estimate, discount, or something free.': {
    es: 'Ofrece una cotización, un presupuesto, un descuento o algo gratis.',
    vi: 'Đề nghị báo giá, ước tính chi phí, giảm giá, hoặc thứ gì đó miễn phí.',
  },
  'Asks a question or asks for a reply or call. Placed at the last such sentence.': {
    es: 'Hace una pregunta o pide una respuesta o una llamada. Se ubica en la última oración de ese tipo.',
    vi: 'Đặt câu hỏi hoặc đề nghị trả lời hay gọi điện. Được đặt ở câu cuối cùng thuộc loại này.',
  },
  'Fewer than 3 slots: no skeleton. Skeletons with fewer than {n} slots, and these generic skeletons that ordinary texts also produce (appointment reminders, realtor check-ins, contractor quote follow-ups, opt-in local ads), are never shown as patterns:': {
    es: 'Menos de 3 casillas: no hay esqueleto. Los esqueletos con menos de {n} casillas, y estos esqueletos genéricos que también producen mensajes comunes (recordatorios de citas, mensajes de seguimiento de agentes inmobiliarios, seguimientos de cotizaciones de contratistas, anuncios locales a los que la persona se suscribió), nunca se muestran como patrones:',
    vi: 'Dưới 3 ô: không có khung. Các khung có ít hơn {n} ô, và các khung chung chung sau đây mà tin nhắn bình thường cũng tạo ra (nhắc lịch hẹn, tin hỏi thăm của môi giới nhà đất, tin nhắn theo dõi báo giá của nhà thầu, quảng cáo địa phương mà người nhận đã đăng ký), không bao giờ được hiển thị là mẫu:',
  },
  'Pattern IDs are stable within a grammar version on this site. When the grammar changes, its version changes, and patterns may regroup.': {
    es: 'En este sitio, los ID de patrón se mantienen estables dentro de una versión de la gramática. Cuando la gramática cambia, cambia su versión, y los patrones pueden reagruparse.',
    vi: 'Trên trang này, mã mẫu giữ nguyên trong cùng một phiên bản ngữ pháp. Khi ngữ pháp thay đổi, phiên bản của nó cũng thay đổi, và các mẫu có thể được phân nhóm lại.',
  },
  'Rules versions': { es: 'Versiones de las reglas', vi: 'Các phiên bản quy tắc' },
  'The redaction rules (how a message becomes a masked template) and the matching rules (the tiers, the threshold and eligibility, and skeleton grammar {grammar}) each carry a version: <strong>{rules}</strong>. A version changes whenever that behavior changes. A change to the matching rules sends every published pattern back to review. The changelog is in the project repository (<span class="mono">docs/rules-changelog.md</span>).': {
    es: 'Las reglas de depuración (cómo un mensaje se convierte en una plantilla enmascarada) y las reglas de coincidencia (los niveles, el umbral y la elegibilidad, y la gramática de esqueletos {grammar}) tienen cada una su versión: <strong>{rules}</strong>. Una versión cambia cada vez que cambia ese comportamiento. Un cambio en las reglas de coincidencia devuelve a revisión todos los patrones publicados. El registro de cambios está en el repositorio del proyecto (<span class="mono">docs/rules-changelog.md</span>).',
    vi: 'Quy tắc làm sạch (cách một tin nhắn trở thành khuôn văn bản đã che) và quy tắc so khớp (các mức, ngưỡng và điều kiện hợp lệ, cùng ngữ pháp khung {grammar}) đều có phiên bản riêng: <strong>{rules}</strong>. Phiên bản thay đổi mỗi khi cách xử lý tương ứng thay đổi. Một thay đổi trong quy tắc so khớp sẽ đưa mọi mẫu đã công bố trở lại khâu duyệt. Nhật ký thay đổi nằm trong kho mã của dự án (<span class="mono">docs/rules-changelog.md</span>).',
  },
  'Worked example (synthetic)': { es: 'Ejemplo práctico (ficticio)', vi: 'Ví dụ minh họa (giả lập)' },
  'The example is in English, the language the scrubbing rules are written for.': {
    es: 'El ejemplo está en inglés, el idioma para el que están escritas las reglas de depuración.',
    vi: 'Ví dụ được giữ bằng tiếng Anh, vì các quy tắc làm sạch được viết cho tiếng Anh.',
  },
  'Message as filed': { es: 'Mensaje tal como se envió', vi: 'Tin nhắn như khi được gửi' },
  'City named in the message': { es: 'Ciudad mencionada en el mensaje', vi: 'Thành phố được nêu trong tin nhắn' },
  'Masked template (stored, never published)': {
    es: 'Plantilla enmascarada (se guarda, nunca se publica)',
    vi: 'Khuôn văn bản đã che (được lưu, không bao giờ công bố)',
  },
  Skeleton: { es: 'Esqueleto', vi: 'Khung' },
  'Published example for this skeleton': { es: 'Ejemplo publicado para este esqueleto', vi: 'Ví dụ được công bố cho khung này' },
  'Known limitations': { es: 'Limitaciones conocidas', vi: 'Những hạn chế đã biết' },
  'Revision history': { es: 'Historial de revisiones', vi: 'Lịch sử sửa đổi' },
  '{date}: patterns are published only after review; {n} matching reports now trigger a review. Redaction rules v1 and matching rules v1 named as the rules already in use. The review step changes publication only, not redaction or matching.': {
    es: '{date}: los patrones se publican solo después de una revisión; ahora {n} reportes que coinciden activan una revisión. Las reglas de depuración v1 y las reglas de coincidencia v1 se nombran como las reglas que ya estaban en uso. El paso de revisión cambia solo la publicación, no la depuración ni la coincidencia.',
    vi: '{date}: các mẫu chỉ được công bố sau khi duyệt; giờ đây {n} báo cáo trùng khớp sẽ kích hoạt việc duyệt. Quy tắc làm sạch v1 và quy tắc so khớp v1 được đặt tên cho các quy tắc vốn đang được dùng. Bước duyệt chỉ thay đổi việc công bố, không thay đổi việc làm sạch hay so khớp.',
  },
  '{date}: grammar v1 and this page first published.': {
    es: '{date}: primera publicación de la gramática v1 y de esta página.',
    vi: '{date}: ngữ pháp v1 và trang này được công bố lần đầu.',
  },
  '<h2 id="sources">Sources</h2>': { es: '<h2 id="sources">Fuentes</h2>', vi: '<h2 id="sources">Nguồn</h2>' },
  'Rules versions: {rules}. The changelog is in the project repository (<span class="mono">docs/rules-changelog.md</span>). <a href="#versions">Rules versions</a>.': {
    es: 'Versiones de las reglas: {rules}. El registro de cambios está en el repositorio del proyecto (<span class="mono">docs/rules-changelog.md</span>). <a href="#versions">Versiones de las reglas</a>.',
    vi: 'Phiên bản quy tắc: {rules}. Nhật ký thay đổi nằm trong kho mã của dự án (<span class="mono">docs/rules-changelog.md</span>). <a href="#versions">Các phiên bản quy tắc</a>.',
  },
  'Skeleton grammar: {grammar}. <a href="#clustering">How patterns are matched</a>.': {
    es: 'Gramática de esqueletos: {grammar}. <a href="#clustering">Cómo se agrupan los patrones</a>.',
    vi: 'Ngữ pháp khung: {grammar}. <a href="#clustering">Cách so khớp các mẫu</a>.',
  },
  'Area-code data: the <a href="https://www.nanpa.com/reports/npa-reports">NANPA NPA database</a>, version {version}, as described under the geographic proxy above.': {
    es: 'Datos de códigos de área: la <a href="https://www.nanpa.com/reports/npa-reports">base de datos NPA de NANPA</a>, versión {version}, como se describe más arriba en el indicador geográfico aproximado.',
    vi: 'Dữ liệu mã vùng: <a href="https://www.nanpa.com/reports/npa-reports">cơ sở dữ liệu NPA của NANPA</a>, phiên bản {version}, như đã mô tả ở phần chỉ báo địa lý gián tiếp phía trên.',
  },
  'Revision history: effective {effective}, revised {revised}. <a href="#history">Revision history</a>.': {
    es: 'Historial de revisiones: vigente desde el {effective}, revisada el {revised}. <a href="#history">Historial de revisiones</a>.',
    vi: 'Lịch sử sửa đổi: có hiệu lực từ {effective}, sửa đổi ngày {revised}. <a href="#history">Lịch sử sửa đổi</a>.',
  },
  'How Spam Patterns reports are scrubbed, matched into patterns and reviewed before publication, with rules versions and known limitations.': {
    es: 'Cómo se depuran los reportes de Spam Patterns, cómo se agrupan en patrones y cómo se revisan antes de publicarse, con las versiones de las reglas y las limitaciones conocidas.',
    vi: 'Cách các báo cáo của Spam Patterns được làm sạch, so khớp thành mẫu và duyệt trước khi công bố, kèm các phiên bản quy tắc và những hạn chế đã biết.',
  },
};

/** Proper names and other English this section keeps on translated pages (test/i18n.test.ts). */
export const KEEP_CONTENT: string[] = [
  // Methodology worked example: a synthetic English spam text run through the
  // English-only scrubber, its city, and the rendered example for its skeleton.
  'Hi Robin, Theo here! I do pressure washing for a few homes around Brookfield this month. Happy to give you a free estimate, text 555-201-0147. Want one?',
  'Brookfield',
  // Its masked template and the published example for its skeleton, as they
  // read once the scrub masks ([name removed], ...) are set aside.
  'here! I do pressure washing for a few homes around',
  'this month. Happy to give you a free estimate, text',
  'Want one?',
  'Do you need any',
  'work done? I’m working near you in',
  'I can give you a',
];
