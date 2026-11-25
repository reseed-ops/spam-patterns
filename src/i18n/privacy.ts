// Privacy & threat model, Self-host & contribute, the offline page, and the
// private flag form (src/filing.ts FLAG_REASONS and fileFlag messages).
import type { Dict } from './types.ts';

export const DICT_PRIVACY: Dict = {
  // ---- privacy: hero and head ----
  'Your data, your choice': { es: 'Sus datos, su decisión', vi: 'Dữ liệu của bạn, lựa chọn của bạn' },
  'What this site keeps, what it publishes, and what it cannot protect you from.': {
    es: 'Qué guarda este sitio, qué publica y de qué no puede protegerle.',
    vi: 'Trang này lưu giữ gì, công bố gì, và những gì trang không thể bảo vệ bạn.',
  },
  'What Spam Patterns stores and publishes, how screenshots are read on your device, and the risks this site cannot protect you from.': {
    es: 'Qué almacena y publica Spam Patterns, cómo se leen las capturas de pantalla en su dispositivo y los riesgos de los que este sitio no puede protegerle.',
    vi: 'Spam Patterns lưu trữ và công bố những gì, ảnh chụp màn hình được đọc trên thiết bị của bạn như thế nào, và những rủi ro mà trang này không thể bảo vệ bạn.',
  },

  // ---- privacy: screenshots ----
  Screenshots: { es: 'Capturas de pantalla', vi: 'Ảnh chụp màn hình' },
  'Screenshots are read on your device. If your browser has built-in text detection (the Shape Detection API), that is used first; otherwise open-source text-recognition software (Tesseract) runs inside your browser. The review screen says which one read your screenshot. Either way, the image is not uploaded. Only the text you review is sent, and only when you ask for the review screen. The image is not kept in a draft, a thumbnail, or any error report. Files are limited to {mb} MB and {mp} megapixels.': {
    es: 'Las capturas de pantalla se leen en su dispositivo. Si su navegador tiene detección de texto integrada (la Shape Detection API), se usa primero; si no, un programa de reconocimiento de texto de código abierto (Tesseract) se ejecuta dentro de su navegador. La pantalla de revisión indica cuál de los dos leyó su captura. En ambos casos, la imagen no se sube. Solo se envía el texto que usted revisa, y solo cuando pide la pantalla de revisión. La imagen no se guarda en un borrador, una miniatura ni ningún informe de errores. Los archivos tienen un límite de {mb} MB y {mp} megapíxeles.',
    vi: 'Ảnh chụp màn hình được đọc ngay trên thiết bị của bạn. Nếu trình duyệt của bạn có sẵn tính năng nhận diện chữ (Shape Detection API), tính năng đó được dùng trước; nếu không, phần mềm nhận dạng chữ mã nguồn mở (Tesseract) sẽ chạy bên trong trình duyệt. Màn hình duyệt cho biết công cụ nào đã đọc ảnh chụp màn hình của bạn. Dù bằng cách nào, hình ảnh cũng không được tải lên. Chỉ phần chữ bạn xem lại mới được gửi đi, và chỉ khi bạn yêu cầu mở màn hình duyệt. Hình ảnh không được giữ lại trong bản nháp, ảnh thu nhỏ hay bất kỳ báo cáo lỗi nào. Tệp được giới hạn ở {mb} MB và {mp} megapixel.',
  },
  'A screenshot you share to Spam Patterns from another app is handled on your device the same way as one you pick: the installed app keeps it in your browser only until the report page opens it, then deletes it, and it is not sent to the server.': {
    es: 'Una captura de pantalla que comparte con Spam Patterns desde otra app se trata en su dispositivo igual que una que usted elige: la app instalada la guarda en su navegador solo hasta que la página de reporte la abre, luego la elimina, y no se envía al servidor.',
    vi: 'Ảnh chụp màn hình bạn chia sẻ sang Spam Patterns từ một ứng dụng khác được xử lý trên thiết bị của bạn giống như ảnh bạn tự chọn: ứng dụng đã cài chỉ giữ ảnh trong trình duyệt cho đến khi trang báo cáo mở nó, sau đó xóa đi, và ảnh không được gửi lên máy chủ.',
  },
  'Because the image is processed on your device, there is no photo metadata (such as location data) for us to receive or remove.': {
    es: 'Como la imagen se procesa en su dispositivo, no hay metadatos de la foto (como datos de ubicación) que recibamos o tengamos que eliminar.',
    vi: 'Vì hình ảnh được xử lý trên thiết bị của bạn, chúng tôi không nhận và cũng không cần xóa siêu dữ liệu nào của ảnh (chẳng hạn dữ liệu vị trí).',
  },

  // ---- privacy: scrubbing ----
  Scrubbing: { es: 'Depuración', vi: 'Làm sạch' },
  'Before you file, fixed rules remove the greeting name, the sender’s first name, phone numbers, every other number, emails, links, places and other capitalized words that may be names. Rules also drop phone screen labels, the contact name at the top of a conversation, your own replies, and other conversations visible in a screenshot. The rules are the same for every report. Nothing in the message can change them, including text written to look like instructions.': {
    es: 'Antes de que envíe el reporte, unas reglas fijas eliminan el nombre del saludo, el nombre de pila del remitente, los números de teléfono, cualquier otro número, los correos electrónicos, los enlaces, los lugares y otras palabras en mayúscula que podrían ser nombres. Las reglas también quitan las etiquetas de la pantalla del teléfono, el nombre del contacto en la parte superior de la conversación, sus propias respuestas y otras conversaciones visibles en una captura de pantalla. Las reglas son las mismas para todos los reportes. Nada en el mensaje puede cambiarlas, ni siquiera un texto escrito para parecer instrucciones.',
    vi: 'Trước khi bạn gửi, các quy tắc cố định sẽ xóa tên trong lời chào, tên riêng của người gửi, số điện thoại, mọi con số khác, email, đường liên kết, địa danh và những từ viết hoa khác có thể là tên người. Các quy tắc cũng bỏ đi nhãn trên màn hình điện thoại, tên liên hệ ở đầu cuộc trò chuyện, các câu trả lời của chính bạn và những cuộc trò chuyện khác hiện trong ảnh chụp màn hình. Các quy tắc giống nhau cho mọi báo cáo. Không nội dung nào trong tin nhắn có thể thay đổi chúng, kể cả chữ được viết để trông giống như lệnh.',
  },
  'Rules make mistakes. That is why you review the scrubbed message and can remove more text before filing.': {
    es: 'Las reglas se equivocan. Por eso usted revisa el mensaje depurado y puede quitar más texto antes de enviarlo.',
    vi: 'Quy tắc có thể sai. Vì vậy bạn được xem lại tin nhắn đã làm sạch và có thể xóa thêm chữ trước khi gửi.',
  },

  // ---- privacy: storage table ----
  'What is stored': { es: 'Qué se almacena', vi: 'Những gì được lưu trữ' },
  '<tr><th scope="col">Field</th><th scope="col">Stored</th><th scope="col">Public</th></tr>': {
    es: '<tr><th scope="col">Dato</th><th scope="col">¿Se almacena?</th><th scope="col">¿Es público?</th></tr>',
    vi: '<tr><th scope="col">Thông tin</th><th scope="col">Có lưu trữ</th><th scope="col">Công khai</th></tr>',
  },
  '<tr><td>Screenshot</td><td>No (never uploaded)</td><td>No</td></tr>': {
    es: '<tr><td>Captura de pantalla</td><td>No (nunca se sube)</td><td>No</td></tr>',
    vi: '<tr><td>Ảnh chụp màn hình</td><td>Không (không bao giờ tải lên)</td><td>Không</td></tr>',
  },
  '<tr><td>Full sender number</td><td>No (used once, then discarded)</td><td>No</td></tr>': {
    es: '<tr><td>Número completo del remitente</td><td>No (se usa una vez y se descarta)</td><td>No</td></tr>',
    vi: '<tr><td>Số đầy đủ của người gửi</td><td>Không (dùng một lần rồi bỏ)</td><td>Không</td></tr>',
  },
  '<tr><td>Sender area code</td><td>Yes</td><td>Yes, as a count</td></tr>': {
    es: '<tr><td>Código de área del remitente</td><td>Sí</td><td>Sí, como conteo</td></tr>',
    vi: '<tr><td>Mã vùng của người gửi</td><td>Có</td><td>Có, dưới dạng số đếm</td></tr>',
  },
  '<tr><td>Sender prefix (next 3 digits)</td><td>Yes</td><td>No</td></tr>': {
    es: '<tr><td>Prefijo del remitente (los 3 dígitos siguientes)</td><td>Sí</td><td>No</td></tr>',
    vi: '<tr><td>Tiền tố của người gửi (3 chữ số tiếp theo)</td><td>Có</td><td>Không</td></tr>',
  },
  '<tr><td>Keyed hash of the number</td><td>Yes, expires after {days} days</td><td>No</td></tr>': {
    es: '<tr><td>Hash con clave del número</td><td>Sí, vence a los {days} días</td><td>No</td></tr>',
    vi: '<tr><td>Mã băm có khóa của số điện thoại</td><td>Có, hết hạn sau {days} ngày</td><td>Không</td></tr>',
  },
  '<tr><td>Scrubbed message</td><td>Yes</td><td>No, only pattern counts</td></tr>': {
    es: '<tr><td>Mensaje depurado</td><td>Sí</td><td>No, solo el conteo de patrones</td></tr>',
    vi: '<tr><td>Tin nhắn đã làm sạch</td><td>Có</td><td>Không, chỉ số đếm theo mẫu</td></tr>',
  },
  '<tr><td>Category</td><td>Yes</td><td>Yes, as a count</td></tr>': {
    es: '<tr><td>Categoría</td><td>Sí</td><td>Sí, como conteo</td></tr>',
    vi: '<tr><td>Loại tin nhắn</td><td>Có</td><td>Có, dưới dạng số đếm</td></tr>',
  },
  '<tr><td>City named in the message</td><td>Yes</td><td>No</td></tr>': {
    es: '<tr><td>Ciudad mencionada en el mensaje</td><td>Sí</td><td>No</td></tr>',
    vi: '<tr><td>Thành phố được nêu trong tin nhắn</td><td>Có</td><td>Không</td></tr>',
  },
  '<tr><td>Filing time</td><td>Yes</td><td>Day only</td></tr>': {
    es: '<tr><td>Hora de envío</td><td>Sí</td><td>Solo el día</td></tr>',
    vi: '<tr><td>Thời điểm gửi</td><td>Có</td><td>Chỉ ngày</td></tr>',
  },
  '<tr><td>Your IP address</td><td>No. Held in memory only, as keyed codes: up to an hour for rate limits, and up to 7 days (reset when the server restarts) to spot the same report filed again from the same connection. The key for that check is created when the server starts and is never saved.</td><td>No</td></tr>': {
    es: '<tr><td>Su dirección IP</td><td>No. Se mantiene solo en memoria, como códigos con clave: hasta una hora para los límites de frecuencia, y hasta 7 días (se reinicia cuando el servidor se reinicia) para detectar el mismo reporte enviado de nuevo desde la misma conexión. La clave de esa comprobación se crea cuando el servidor arranca y nunca se guarda.</td><td>No</td></tr>',
    vi: '<tr><td>Địa chỉ IP của bạn</td><td>Không. Chỉ giữ trong bộ nhớ, dưới dạng mã có khóa: tối đa một giờ để giới hạn tần suất, và tối đa 7 ngày (đặt lại khi máy chủ khởi động lại) để phát hiện cùng một báo cáo được gửi lại từ cùng một kết nối. Khóa cho việc kiểm tra này được tạo khi máy chủ khởi động và không bao giờ được lưu.</td><td>Không</td></tr>',
  },
  '<tr><td>Your IP address</td><td>No (held in memory as a keyed code for up to an hour for rate limits)</td><td>No</td></tr>': {
    es: '<tr><td>Su dirección IP</td><td>No (se mantiene en memoria como código con clave hasta una hora para los límites de frecuencia)</td><td>No</td></tr>',
    vi: '<tr><td>Địa chỉ IP của bạn</td><td>Không (giữ trong bộ nhớ dưới dạng mã có khóa tối đa một giờ để giới hạn tần suất)</td><td>Không</td></tr>',
  },
  '<tr><td>Deletion receipt</td><td>Only a scrambled version</td><td>No</td></tr>': {
    es: '<tr><td>Código de recibo para eliminar</td><td>Solo una versión cifrada</td><td>No</td></tr>',
    vi: '<tr><td>Mã biên nhận để xóa</td><td>Chỉ một phiên bản đã mã hóa</td><td>Không</td></tr>',
  },
  'There are no accounts, cookies, analytics, tracking pixels, or third-party scripts.': {
    es: 'No hay cuentas, cookies, analítica, píxeles de seguimiento ni scripts de terceros.',
    vi: 'Không có tài khoản, cookie, công cụ phân tích, điểm ảnh theo dõi hay mã của bên thứ ba.',
  },
  'The server keeps one running total of views for each page (which page, nothing about you) and the number of counted reports on file, published at <a href="/stats">/stats</a>. It stores no IP address, browser details, query string, visit time or identifier, and no script on the page is involved.': {
    es: 'El servidor lleva un total acumulado de visitas por página (qué página, nada sobre usted) y el número de reportes contados que hay guardados, publicados en <a href="/stats">/stats</a>. No almacena ninguna dirección IP, datos del navegador, cadena de consulta, hora de la visita ni identificador, y ningún script de la página interviene.',
    vi: 'Máy chủ giữ một con số cộng dồn lượt xem cho mỗi trang (trang nào, không có gì về bạn) và số báo cáo được tính đang lưu, công bố tại <a href="/stats">/stats</a>. Máy chủ không lưu địa chỉ IP, thông tin trình duyệt, chuỗi truy vấn, thời điểm truy cập hay mã định danh nào, và không có đoạn mã nào trên trang tham gia vào việc này.',
  },
  'The site’s service worker stores copies of the app’s own files (styles, scripts, icons, the report page and the on-device text-recognition files) on your device only, so repeat visits load faster. It stores no report data. You can remove it by clearing this site’s data in your browser settings.': {
    es: 'El service worker del sitio guarda copias de los archivos propios de la app (estilos, scripts, íconos, la página de reporte y los archivos de reconocimiento de texto en el dispositivo) solo en su dispositivo, para que las visitas siguientes carguen más rápido. No guarda ningún dato de reportes. Puede eliminarlo borrando los datos de este sitio en la configuración de su navegador.',
    vi: 'Service worker của trang lưu bản sao các tệp riêng của ứng dụng (kiểu trình bày, mã, biểu tượng, trang báo cáo và các tệp nhận dạng chữ trên thiết bị) chỉ trên thiết bị của bạn, để những lần truy cập sau tải nhanh hơn. Nó không lưu dữ liệu báo cáo nào. Bạn có thể gỡ nó bằng cách xóa dữ liệu của trang này trong phần cài đặt trình duyệt.',
  },
  'If you choose a language with the flags at the top of the page, your browser remembers it in its local storage on this device (one setting, “stm-lang”), so the site opens in that language next time. It is never sent to the server, except as the ?lang= in the page address.': {
    es: 'Si elige un idioma con las banderas en la parte superior de la página, su navegador lo recuerda en su almacenamiento local en este dispositivo (un solo ajuste, “stm-lang”), para que el sitio se abra en ese idioma la próxima vez. Nunca se envía al servidor, salvo como el ?lang= en la dirección de la página.',
    vi: 'Nếu bạn chọn ngôn ngữ bằng các lá cờ ở đầu trang, trình duyệt sẽ ghi nhớ lựa chọn đó trong bộ nhớ cục bộ trên thiết bị này (một thiết lập duy nhất, “stm-lang”), để lần sau trang mở bằng ngôn ngữ đó. Thiết lập này không bao giờ được gửi lên máy chủ, ngoại trừ dưới dạng ?lang= trong địa chỉ trang.',
  },
  'This table describes what this app keeps. The hosting provider runs its own network and HTTP logging, separately from the app. The official instance is hosted on Railway, whose HTTP logs record the IP address each request came from (<a href="https://docs.railway.com/observability/logs">Railway’s log documentation</a>). How long Railway keeps them is set by Railway, not by this site: see <a href="https://railway.com/legal/privacy">Railway’s privacy policy</a>.': {
    es: 'Esta tabla describe lo que guarda esta app. El proveedor de alojamiento mantiene sus propios registros de red y HTTP, aparte de la app. La instancia oficial está alojada en Railway, cuyos registros HTTP anotan la dirección IP de la que vino cada solicitud (<a href="https://docs.railway.com/observability/logs">documentación de registros de Railway</a>). Cuánto tiempo los conserva Railway lo decide Railway, no este sitio: consulte la <a href="https://railway.com/legal/privacy">política de privacidad de Railway</a>.',
    vi: 'Bảng này mô tả những gì ứng dụng này lưu giữ. Nhà cung cấp dịch vụ lưu trữ có nhật ký mạng và nhật ký HTTP riêng, tách biệt với ứng dụng. Bản chính thức được lưu trữ trên Railway, và nhật ký HTTP của Railway ghi lại địa chỉ IP mà mỗi yêu cầu gửi đến (<a href="https://docs.railway.com/observability/logs">tài liệu về nhật ký của Railway</a>). Thời gian Railway giữ các nhật ký này do Railway quyết định, không phải trang này: xem <a href="https://railway.com/legal/privacy">chính sách quyền riêng tư của Railway</a>.',
  },

  // ---- privacy: keyed hash ----
  'The keyed hash, honestly': { es: 'El hash con clave, con franqueza', vi: 'Nói thẳng về mã băm có khóa' },
  'The keyed hash is pseudonymous, not anonymous. Its protection is the secrecy of one key on this server. Anyone who obtained that key and the stored area code and prefix could recover a sender number by trying at most 10,000 candidates. The hash is used only inside this site, to spot the same sender sending the same text twice within {hours} hours, and, in memory only, the same report filed again from the same connection within 7 days. It expires after {days} days and is never shown or exported. If the key is rotated, old hashes no longer match new ones.': {
    es: 'El hash con clave es seudónimo, no anónimo. Su protección es el secreto de una sola clave en este servidor. Quien obtuviera esa clave junto con el código de área y el prefijo almacenados podría recuperar un número de remitente probando como máximo 10.000 candidatos. El hash se usa solo dentro de este sitio, para detectar al mismo remitente enviando el mismo texto dos veces en un plazo de {hours} horas y, solo en memoria, el mismo reporte enviado de nuevo desde la misma conexión en un plazo de 7 días. Vence a los {days} días y nunca se muestra ni se exporta. Si se cambia la clave, los hashes antiguos dejan de coincidir con los nuevos.',
    vi: 'Mã băm có khóa là bí danh, không phải ẩn danh. Lớp bảo vệ của nó là việc giữ bí mật một khóa duy nhất trên máy chủ này. Ai có được khóa đó cùng với mã vùng và tiền tố đã lưu thì có thể tìm lại số của người gửi bằng cách thử tối đa 10.000 khả năng. Mã băm chỉ được dùng bên trong trang này, để phát hiện cùng một người gửi gửi cùng một nội dung hai lần trong vòng {hours} giờ, và, chỉ trong bộ nhớ, cùng một báo cáo được gửi lại từ cùng một kết nối trong vòng 7 ngày. Mã băm hết hạn sau {days} ngày và không bao giờ được hiển thị hay xuất ra. Nếu khóa được thay, các mã băm cũ sẽ không còn khớp với mã băm mới.',
  },
  'The keyed hash is pseudonymous, not anonymous. Its protection is the secrecy of one key on this server. Anyone who obtained that key and the stored area code and prefix could recover a sender number by trying at most 10,000 candidates. The hash is used only inside this site, to spot the same sender sending the same text twice within {hours} hours. It expires after {days} days and is never shown or exported. If the key is rotated, old hashes no longer match new ones.': {
    es: 'El hash con clave es seudónimo, no anónimo. Su protección es el secreto de una sola clave en este servidor. Quien obtuviera esa clave junto con el código de área y el prefijo almacenados podría recuperar un número de remitente probando como máximo 10.000 candidatos. El hash se usa solo dentro de este sitio, para detectar al mismo remitente enviando el mismo texto dos veces en un plazo de {hours} horas. Vence a los {days} días y nunca se muestra ni se exporta. Si se cambia la clave, los hashes antiguos dejan de coincidir con los nuevos.',
    vi: 'Mã băm có khóa là bí danh, không phải ẩn danh. Lớp bảo vệ của nó là việc giữ bí mật một khóa duy nhất trên máy chủ này. Ai có được khóa đó cùng với mã vùng và tiền tố đã lưu thì có thể tìm lại số của người gửi bằng cách thử tối đa 10.000 khả năng. Mã băm chỉ được dùng bên trong trang này, để phát hiện cùng một người gửi gửi cùng một nội dung hai lần trong vòng {hours} giờ. Mã băm hết hạn sau {days} ngày và không bao giờ được hiển thị hay xuất ra. Nếu khóa được thay, các mã băm cũ sẽ không còn khớp với mã băm mới.',
  },

  // ---- privacy: residual risks ----
  'Residual risks': { es: 'Riesgos que persisten', vi: 'Những rủi ro còn lại' },
  'In a small dataset, a combination of prefix, city named in the message, category and time could point to one business. That is why those fields are never published together, or at all.': {
    es: 'En un conjunto de datos pequeño, la combinación de prefijo, ciudad mencionada en el mensaje, categoría y hora podría señalar a una sola empresa. Por eso esos datos nunca se publican juntos, ni por separado.',
    vi: 'Trong một tập dữ liệu nhỏ, việc kết hợp tiền tố, thành phố được nêu trong tin nhắn, loại tin nhắn và thời gian có thể chỉ ra một doanh nghiệp cụ thể. Vì vậy các thông tin đó không bao giờ được công bố cùng nhau, hay công bố riêng lẻ.',
  },
  'Reports can be spoofed or fabricated. Three matching reports show repetition, not three independent witnesses.': {
    es: 'Los reportes se pueden falsificar o inventar. Tres reportes que coinciden muestran repetición, no tres testigos independientes.',
    vi: 'Báo cáo có thể bị giả mạo hoặc bịa đặt. Ba báo cáo trùng khớp cho thấy sự lặp lại, không phải ba nhân chứng độc lập.',
  },
  'Your browser and phone keep their own history. This site cannot clear it.': {
    es: 'Su navegador y su teléfono guardan su propio historial. Este sitio no puede borrarlo.',
    vi: 'Trình duyệt và điện thoại của bạn tự lưu lịch sử riêng. Trang này không thể xóa lịch sử đó.',
  },
  'The hosting provider can see network traffic metadata such as IP addresses, and keeps its own logs (see above).': {
    es: 'El proveedor de alojamiento puede ver metadatos del tráfico de red, como las direcciones IP, y guarda sus propios registros (vea más arriba).',
    vi: 'Nhà cung cấp dịch vụ lưu trữ có thể thấy siêu dữ liệu về lưu lượng mạng như địa chỉ IP, và giữ nhật ký riêng (xem ở trên).',
  },
  'Reports from different connections cannot be linked. Someone using several networks or a VPN can still file the same report more than once.': {
    es: 'Los reportes desde conexiones distintas no se pueden vincular. Alguien que use varias redes o una VPN todavía puede enviar el mismo reporte más de una vez.',
    vi: 'Không thể liên kết các báo cáo đến từ những kết nối khác nhau. Người dùng nhiều mạng hoặc VPN vẫn có thể gửi cùng một báo cáo nhiều lần.',
  },
  'People sharing a mobile carrier’s connection may occasionally have a genuine report not counted.': {
    es: 'Las personas que comparten la conexión de un operador móvil pueden, en ocasiones, tener un reporte legítimo que no se cuenta.',
    vi: 'Những người dùng chung kết nối của một nhà mạng di động đôi khi có thể có một báo cáo thật không được tính.',
  },
  'When a report is not counted because the same connection filed it recently, that flag is stored with the report. It implies the two reports came from the same connection, though not which one.': {
    es: 'Cuando un reporte no se cuenta porque la misma conexión lo envió hace poco, esa marca se guarda con el reporte. Implica que los dos reportes vinieron de la misma conexión, aunque no de cuál.',
    vi: 'Khi một báo cáo không được tính vì cùng một kết nối vừa gửi nó gần đây, dấu hiệu đó được lưu cùng báo cáo. Điều này ngụ ý hai báo cáo đến từ cùng một kết nối, nhưng không cho biết là kết nối nào.',
  },

  // ---- privacy: deletion ----
  Deletion: { es: 'Eliminación', vi: 'Xóa báo cáo' },
  'Your receipt code is the only way to delete a report. We store only a scrambled version of it, so we cannot recover it. Deleting removes the report at once from counts and patterns, and from every future data release. A pattern that falls below {n} reports disappears. Copies already downloaded cannot be recalled. Backups are kept for at most 7 days, and a restore re-applies the deletion list so a deleted report does not come back.': {
    es: 'Su código de recibo es la única forma de eliminar un reporte. Solo guardamos una versión cifrada, así que no podemos recuperarlo. Al eliminarlo, el reporte se quita de inmediato de los conteos y los patrones, y de toda publicación futura de datos. Un patrón que baja de {n} reportes desaparece. Las copias ya descargadas no se pueden recuperar. Las copias de seguridad se guardan como máximo 7 días, y al restaurar una se vuelve a aplicar la lista de eliminaciones para que un reporte eliminado no regrese.',
    vi: 'Mã biên nhận là cách duy nhất để xóa một báo cáo. Chúng tôi chỉ lưu một phiên bản đã mã hóa của mã này, nên không thể khôi phục nó. Khi xóa, báo cáo bị gỡ ngay khỏi các số đếm và các mẫu, và khỏi mọi đợt công bố dữ liệu sau này. Mẫu nào giảm xuống dưới {n} báo cáo sẽ biến mất. Các bản sao đã được tải về thì không thể thu hồi. Bản sao lưu được giữ tối đa 7 ngày, và khi khôi phục, danh sách xóa sẽ được áp dụng lại để báo cáo đã xóa không quay lại.',
  },
  'Deletion codes are kept only in your browser’s local storage on your own device (at most 5, for up to 90 days). The server never receives or stores these saved copies, except at the moment you use one to delete a report. To erase them, use <strong>Remove these codes from this device</strong> on the <a href="/delete">delete page</a>, or clear this site’s data in your browser.': {
    es: 'Los códigos para eliminar se guardan solo en el almacenamiento local de su navegador, en su propio dispositivo (como máximo 5, durante hasta 90 días). El servidor nunca recibe ni guarda estas copias, salvo en el momento en que usa una para eliminar un reporte. Para borrarlas, use <strong>Quitar estos códigos de este dispositivo</strong> en la <a href="/delete">página para eliminar</a>, o borre los datos de este sitio en su navegador.',
    vi: 'Mã để xóa chỉ được giữ trong bộ nhớ cục bộ của trình duyệt trên chính thiết bị của bạn (tối đa 5 mã, trong tối đa 90 ngày). Máy chủ không bao giờ nhận hay lưu các bản sao này, trừ lúc bạn dùng một mã để xóa báo cáo. Để xóa các mã này, hãy dùng <strong>Xóa các mã này khỏi thiết bị</strong> trên <a href="/delete">trang xóa báo cáo</a>, hoặc xóa dữ liệu của trang này trong trình duyệt.',
  },

  // ---- privacy: contest and the flag form ----
  'Contest or takedown': { es: 'Impugnación o retirada', vi: 'Khiếu nại hoặc yêu cầu gỡ bỏ' },
  'If something on this site harms you, for example a pattern that points at your business or number, tell us privately. Flagged patterns are removed from public views while they are reviewed. The maintainer aims to respond within 7 days; security and takedown requests come before other work. You can also email <a href="mailto:{email}">{email}</a>.': {
    es: 'Si algo en este sitio le perjudica, por ejemplo un patrón que apunta a su empresa o a su número, díganoslo en privado. Los patrones señalados se retiran de las vistas públicas mientras se revisan. El responsable del sitio procura responder en un plazo de 7 días; las solicitudes de seguridad y de retirada tienen prioridad sobre el resto del trabajo. También puede escribir a <a href="mailto:{email}">{email}</a>.',
    vi: 'Nếu có điều gì trên trang này gây hại cho bạn, ví dụ một mẫu nhắm vào doanh nghiệp hoặc số điện thoại của bạn, hãy báo riêng cho chúng tôi. Các mẫu bị gắn cờ sẽ được gỡ khỏi chế độ xem công khai trong lúc xem xét. Người duy trì cố gắng phản hồi trong vòng 7 ngày; các yêu cầu về bảo mật và gỡ bỏ được ưu tiên trước các việc khác. Bạn cũng có thể gửi email tới <a href="mailto:{email}">{email}</a>.',
  },
  Reason: { es: 'Motivo', vi: 'Lý do' },
  'It shows personal information': { es: 'Muestra información personal', vi: 'Có hiển thị thông tin cá nhân' },
  'It concerns my phone number or my business': {
    es: 'Tiene que ver con mi número de teléfono o mi empresa',
    vi: 'Liên quan đến số điện thoại hoặc doanh nghiệp của tôi',
  },
  'It is inaccurate or misleading': { es: 'Es inexacto o engañoso', vi: 'Không chính xác hoặc gây hiểu lầm' },
  // Also the label of the 'other' category (src/categories.ts): keep the wording neutral.
  'Which page or pattern?': { es: '¿Qué página o patrón?', vi: 'Trang hoặc mẫu nào?' },
  'For a pattern, paste its pattern ID or web address.': {
    es: 'Si es un patrón, pegue su ID de patrón o su dirección web.',
    vi: 'Nếu là một mẫu, hãy dán mã mẫu hoặc địa chỉ web của mẫu đó.',
  },
  'Details <span class="optional">(optional)</span>': {
    es: 'Detalles <span class="optional">(opcional)</span>',
    vi: 'Chi tiết <span class="optional">(không bắt buộc)</span>',
  },
  'How to reach you <span class="optional">(optional)</span>': {
    es: 'Cómo contactarle <span class="optional">(opcional)</span>',
    vi: 'Cách liên lạc với bạn <span class="optional">(không bắt buộc)</span>',
  },
  'Your flag is stored privately for the maintainer and is never published.': {
    es: 'Su señalización se guarda en privado para el responsable del sitio y nunca se publica.',
    vi: 'Nội dung gắn cờ của bạn được lưu riêng cho người duy trì và không bao giờ được công bố.',
  },
  'Send flag privately': { es: 'Enviar señalización en privado', vi: 'Gửi gắn cờ riêng tư' },
  // fileFlag() messages (src/filing.ts; src/app.ts passes them through t())
  'Choose a reason.': { es: 'Elija un motivo.', vi: 'Hãy chọn một lý do.' },
  'Tell us which page or pattern you mean.': {
    es: 'Indíquenos a qué página o patrón se refiere.',
    vi: 'Hãy cho chúng tôi biết bạn muốn nói đến trang hoặc mẫu nào.',
  },
  'Keep details under 2,000 characters.': {
    es: 'Escriba los detalles en menos de 2.000 caracteres.',
    vi: 'Phần chi tiết cần ít hơn 2.000 ký tự.',
  },
  'Contact is too long.': { es: 'El dato de contacto es demasiado largo.', vi: 'Thông tin liên lạc quá dài.' },
  'Thank you. Your flag was saved privately for the maintainer. Flagged material is reviewed and may be removed from public views while it is reviewed. Your flag is not published.': {
    es: 'Gracias. Su señalización se guardó en privado para el responsable del sitio. El contenido señalado se revisa y puede retirarse de las vistas públicas mientras dura la revisión. Su señalización no se publica.',
    vi: 'Cảm ơn bạn. Nội dung gắn cờ của bạn đã được lưu riêng cho người duy trì. Nội dung bị gắn cờ sẽ được xem xét và có thể bị gỡ khỏi chế độ xem công khai trong lúc xem xét. Nội dung gắn cờ của bạn không được công bố.',
  },

  // ---- privacy: contacts ----
  Contacts: { es: 'Contactos', vi: 'Liên hệ' },
  'Privacy: <a href="mailto:{privacy}">{privacy}</a> · Security: <a href="mailto:{security}">{security}</a> · Abuse and takedown: <a href="mailto:{abuse}">{abuse}</a>': {
    es: 'Privacidad: <a href="mailto:{privacy}">{privacy}</a> · Seguridad: <a href="mailto:{security}">{security}</a> · Abusos y retiradas: <a href="mailto:{abuse}">{abuse}</a>',
    vi: 'Quyền riêng tư: <a href="mailto:{privacy}">{privacy}</a> · Bảo mật: <a href="mailto:{security}">{security}</a> · Lạm dụng và gỡ bỏ: <a href="mailto:{abuse}">{abuse}</a>',
  },
  'Effective {date}. Operated by Reseed LLC.': {
    es: 'Vigente desde el {date}. Operado por Reseed LLC.',
    vi: 'Có hiệu lực từ {date}. Do Reseed LLC vận hành.',
  },

  // ---- project (Self-host & contribute) ----
  'Open project': { es: 'Proyecto abierto', vi: 'Dự án mở' },
  'Spam Patterns is a pilot tracking recurring spam texts. It is open-source software under the Apache License 2.0. <a href="https://github.com/reseed-ops/spam-patterns">The code is on GitHub.</a>': {
    es: 'Spam Patterns es un proyecto piloto que da seguimiento a mensajes de spam que se repiten. Es software de código abierto bajo la Apache License 2.0. <a href="https://github.com/reseed-ops/spam-patterns">El código está en GitHub.</a>',
    vi: 'Spam Patterns là một dự án thử nghiệm theo dõi các tin nhắn rác lặp lại. Đây là phần mềm mã nguồn mở theo giấy phép Apache License 2.0. <a href="https://github.com/reseed-ops/spam-patterns">Mã nguồn có trên GitHub.</a>',
  },
  'Spam Patterns is open-source software under the Apache License 2.0. How to self-host it, contribute, and report security issues.': {
    es: 'Spam Patterns es software de código abierto bajo la Apache License 2.0. Cómo autoalojarlo, colaborar y reportar problemas de seguridad.',
    vi: 'Spam Patterns là phần mềm mã nguồn mở theo giấy phép Apache License 2.0. Cách tự triển khai, đóng góp và báo cáo lỗ hổng bảo mật.',
  },
  'The official instance is <a href="{url}">{url}</a>. Forks are not affiliated with it.': {
    es: 'La instancia oficial es <a href="{url}">{url}</a>. Las bifurcaciones no están afiliadas a ella.',
    vi: 'Bản chính thức là <a href="{url}">{url}</a>. Các bản phái sinh (fork) không liên kết với bản này.',
  },
  'Forks and self-hosted copies are not affiliated with the official instance.': {
    es: 'Las bifurcaciones y las copias autoalojadas no están afiliadas a la instancia oficial.',
    vi: 'Các bản phái sinh (fork) và bản tự triển khai không liên kết với bản chính thức.',
  },
  Install: { es: 'Instalación', vi: 'Cài đặt' },
  'One supported path: Docker Compose behind a TLS-terminating reverse proxy. Copy <span class="mono">.env.example</span> to <span class="mono">.env</span>, set <span class="mono">STM_HMAC_KEY</span> to the output of <span class="mono">openssl rand -hex 32</span>, then run <span class="mono">docker compose up -d</span>. See <span class="mono">docs/self-hosting.md</span>.': {
    es: 'Una sola forma admitida: Docker Compose detrás de un proxy inverso que termine TLS. Copie <span class="mono">.env.example</span> a <span class="mono">.env</span>, asigne a <span class="mono">STM_HMAC_KEY</span> la salida de <span class="mono">openssl rand -hex 32</span> y luego ejecute <span class="mono">docker compose up -d</span>. Consulte <span class="mono">docs/self-hosting.md</span>.',
    vi: 'Một cách duy nhất được hỗ trợ: Docker Compose đặt sau một reverse proxy xử lý TLS. Sao chép <span class="mono">.env.example</span> thành <span class="mono">.env</span>, đặt <span class="mono">STM_HMAC_KEY</span> bằng kết quả của <span class="mono">openssl rand -hex 32</span>, rồi chạy <span class="mono">docker compose up -d</span>. Xem <span class="mono">docs/self-hosting.md</span>.',
  },
  'Your responsibilities as an operator': { es: 'Sus responsabilidades como operador', vi: 'Trách nhiệm của bạn khi vận hành' },
  'Keep the key secret. Anyone with it can recover sender numbers from stored prefixes.': {
    es: 'Mantenga la clave en secreto. Cualquiera que la tenga puede recuperar números de remitentes a partir de los prefijos almacenados.',
    vi: 'Giữ bí mật khóa. Bất kỳ ai có khóa đều có thể tìm lại số của người gửi từ các tiền tố đã lưu.',
  },
  'Configure trusted proxies so rate limits see real client addresses.': {
    es: 'Configure los proxies de confianza para que los límites de frecuencia vean las direcciones reales de los clientes.',
    vi: 'Cấu hình các proxy tin cậy để việc giới hạn tần suất thấy được địa chỉ thật của máy khách.',
  },
  'Keep reverse-proxy request-body logging off.': {
    es: 'Mantenga desactivado el registro del cuerpo de las solicitudes en el proxy inverso.',
    vi: 'Luôn tắt việc ghi nhật ký nội dung yêu cầu ở reverse proxy.',
  },
  'Publish your own contacts, retention and takedown practice.': {
    es: 'Publique sus propios contactos y sus prácticas de conservación de datos y de retirada.',
    vi: 'Công bố thông tin liên hệ, cách lưu giữ dữ liệu và quy trình gỡ bỏ của riêng bạn.',
  },
  'Do not add analytics, third-party scripts, or hosted screenshot reading without updating the privacy page first.': {
    es: 'No agregue analítica, scripts de terceros ni lectura de capturas de pantalla en un servidor sin actualizar antes la página de privacidad.',
    vi: 'Đừng thêm công cụ phân tích, mã của bên thứ ba hay việc đọc ảnh chụp màn hình trên máy chủ khi chưa cập nhật trang quyền riêng tư.',
  },
  Contribute: { es: 'Colaborar', vi: 'Đóng góp' },
  'Good first contributions: area-code data corrections, skeleton grammar test fixtures, and accessibility fixes. Please use synthetic text only, never real messages or numbers.': {
    es: 'Buenas primeras contribuciones: correcciones de datos de códigos de área, casos de prueba para la gramática de esqueletos y mejoras de accesibilidad. Use solo texto inventado, nunca mensajes ni números reales.',
    vi: 'Những đóng góp phù hợp để bắt đầu: sửa dữ liệu mã vùng, dữ liệu kiểm thử cho ngữ pháp khung tin nhắn, và sửa lỗi hỗ trợ tiếp cận. Vui lòng chỉ dùng văn bản giả lập, không bao giờ dùng tin nhắn hay số điện thoại thật.',
  },
  Security: { es: 'Seguridad', vi: 'Bảo mật' },
  'Report vulnerabilities privately to <a href="mailto:{email}">{email}</a>. Best effort, no bounty.': {
    es: 'Informe de vulnerabilidades en privado a <a href="mailto:{email}">{email}</a>. Se atienden en la medida de lo posible, sin recompensas.',
    vi: 'Báo cáo lỗ hổng một cách riêng tư tới <a href="mailto:{email}">{email}</a>. Xử lý trong khả năng có thể, không có tiền thưởng.',
  },
  Maintenance: { es: 'Mantenimiento', vi: 'Bảo trì' },
  'One maintainer, best effort, no service-level promise. Issues are triaged weekly; security and takedown requests come first.': {
    es: 'Un solo responsable del sitio, en la medida de lo posible, sin compromiso de nivel de servicio. Los problemas se clasifican cada semana; las solicitudes de seguridad y de retirada van primero.',
    vi: 'Một người duy trì, làm trong khả năng có thể, không cam kết mức độ dịch vụ. Các vấn đề được phân loại hằng tuần; yêu cầu về bảo mật và gỡ bỏ được ưu tiên.',
  },
  History: { es: 'Historia', vi: 'Lịch sử' },
  'Launched November 17, 2026 as Spam Text Map; renamed Spam Patterns on November 19, 2026.': {
    es: 'Se lanzó el 17 de noviembre de 2026 como Spam Text Map; pasó a llamarse Spam Patterns el 19 de noviembre de 2026.',
    vi: 'Ra mắt ngày 17 tháng 11 năm 2026 với tên Spam Text Map; đổi tên thành Spam Patterns ngày 19 tháng 11 năm 2026.',
  },

  // ---- offline page ----
  Offline: { es: 'Sin conexión', vi: 'Ngoại tuyến' },
  'You’re offline': { es: 'No tiene conexión', vi: 'Bạn đang ngoại tuyến' },
  'This page needs a connection, and it isn’t stored on your device. Reports can be reviewed and filed only while you’re online; nothing you type is saved on your device.': {
    es: 'Esta página necesita conexión y no está guardada en su dispositivo. Los reportes solo se pueden revisar y enviar mientras tiene conexión; nada de lo que escribe se guarda en su dispositivo.',
    vi: 'Trang này cần kết nối mạng và không được lưu trên thiết bị của bạn. Chỉ có thể xem lại và gửi báo cáo khi bạn đang trực tuyến; những gì bạn gõ không được lưu trên thiết bị.',
  },
  'When you’re back online, <a href="/">reload the overview</a> or <a href="/report">report a spam text</a>.': {
    es: 'Cuando vuelva a tener conexión, <a href="/">vuelva a cargar el resumen</a> o <a href="/report">reporte un mensaje de spam</a>.',
    vi: 'Khi có mạng trở lại, hãy <a href="/">tải lại trang tổng quan</a> hoặc <a href="/report">báo cáo tin nhắn rác</a>.',
  },
};

/** Proper names and other English this section keeps on translated pages (test/i18n.test.ts). */
export const KEEP_PRIVACY: string[] = ['Shape Detection API', 'Tesseract', 'Railway', 'Apache License 2.0', 'Docker Compose', 'Spam Text Map'];
