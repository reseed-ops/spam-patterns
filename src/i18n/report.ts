// Report flow (/report), report complete, delete (/delete), the receipts kept
// on this device, the category labels, and the server messages a visitor
// sees through the API or the delete form (src/filing.ts, src/scrub.ts
// NOTE_TEXT, src/phone.ts PHONE_ERROR_TEXT; src/app.ts translates them at the
// response boundary). The client scripts (report.js, receipts.js) carry their
// own small dictionaries.
import type { Dict } from './types.ts';

export const DICT_REPORT: Dict = {
  // ---- /report: start ----
  '<strong>Reporting is paused on this site right now.</strong> Nothing you enter will be saved. You can still forward the original text to <strong>7726 (SPAM)</strong>, and everything else on this site still works.': {
    es: '<strong>Los reportes están en pausa en este sitio por ahora.</strong> No se guardará nada de lo que escriba. Aún puede reenviar el mensaje original al <strong>7726 (SPAM)</strong>, y todo lo demás en este sitio sigue funcionando.',
    vi: '<strong>Hiện trang này đang tạm ngừng nhận báo cáo.</strong> Mọi thông tin bạn nhập sẽ không được lưu. Bạn vẫn có thể chuyển tiếp tin nhắn gốc đến <strong>7726 (SPAM)</strong>, và mọi phần khác của trang vẫn hoạt động bình thường.',
  },
  'The report form needs JavaScript to prepare your review screen. Screenshot reading happens on your device, which also needs JavaScript. You can forward the original text to <strong>7726 (SPAM)</strong> instead.': {
    es: 'El formulario de reporte necesita JavaScript para preparar la pantalla de revisión. La lectura de capturas de pantalla se hace en su dispositivo y también necesita JavaScript. En su lugar, puede reenviar el mensaje original al <strong>7726 (SPAM)</strong>.',
    vi: 'Biểu mẫu báo cáo cần JavaScript để chuẩn bị màn hình xem lại. Việc đọc ảnh chụp màn hình diễn ra trên thiết bị của bạn và cũng cần JavaScript. Thay vào đó, bạn có thể chuyển tiếp tin nhắn gốc đến <strong>7726 (SPAM)</strong>.',
  },
  'Both ways lead to a privacy review. Nothing is saved until you select <strong>File this report</strong>. No account needed.': {
    es: 'Las dos opciones llevan a una revisión de privacidad. No se guarda nada hasta que seleccione <strong>Enviar este reporte</strong>. No necesita una cuenta.',
    vi: 'Cả hai cách đều dẫn đến bước xem lại quyền riêng tư. Không có gì được lưu cho đến khi bạn chọn <strong>Gửi báo cáo này</strong>. Không cần tài khoản.',
  },
  'Upload a screenshot.': { es: 'Suba una captura de pantalla.', vi: 'Tải lên ảnh chụp màn hình.' },
  'We read it once to find the sender number and message. We don’t store the image. You’ll review the scrubbed report before filing.': {
    es: 'La leemos una sola vez para encontrar el número del remitente y el mensaje. No guardamos la imagen. Revisará el reporte depurado antes de enviarlo.',
    vi: 'Chúng tôi đọc ảnh một lần để tìm số của người gửi và nội dung tin nhắn. Chúng tôi không lưu ảnh. Bạn sẽ xem lại báo cáo đã làm sạch trước khi gửi.',
  },
  'The screenshot is read by software running in your browser. The image never leaves your device. Supported: PNG, JPEG, WebP, up to {mb} MB. <a href="/privacy#screenshots">How screenshot reading works</a>': {
    es: 'La captura de pantalla la lee un programa que funciona en su navegador. La imagen nunca sale de su dispositivo. Formatos admitidos: PNG, JPEG, WebP, hasta {mb} MB. <a href="/privacy#screenshots">Cómo funciona la lectura de capturas de pantalla</a>',
    vi: 'Ảnh chụp màn hình được đọc bằng phần mềm chạy trong trình duyệt của bạn. Ảnh không bao giờ rời khỏi thiết bị của bạn. Hỗ trợ: PNG, JPEG, WebP, tối đa {mb} MB. <a href="/privacy#screenshots">Cách đọc ảnh chụp màn hình</a>',
  },
  'On Android, once the app is installed you can also share a screenshot to Spam Patterns straight from your photos or messages app.': {
    es: 'En Android, una vez instalada la app, también puede compartir una captura de pantalla con Spam Patterns directamente desde su app de fotos o de mensajes.',
    vi: 'Trên Android, sau khi cài ứng dụng, bạn cũng có thể chia sẻ ảnh chụp màn hình đến Spam Patterns ngay từ ứng dụng ảnh hoặc ứng dụng tin nhắn.',
  },
  'Upload a screenshot': { es: 'Subir una captura de pantalla', vi: 'Tải lên ảnh chụp màn hình' },
  'Enter manually.': { es: 'Escriba los datos a mano.', vi: 'Nhập thủ công.' },
  'Type or paste the sender number and the message.': {
    es: 'Escriba o pegue el número del remitente y el mensaje.',
    vi: 'Gõ hoặc dán số của người gửi và nội dung tin nhắn.',
  },
  'Enter manually': { es: 'Escribir a mano', vi: 'Nhập thủ công' },

  // ---- /report: reading ----
  'Reading screenshot…': { es: 'Leyendo la captura de pantalla…', vi: 'Đang đọc ảnh chụp màn hình…' },
  'Reading on your device. This can take a few seconds.': {
    es: 'Leyendo en su dispositivo. Esto puede tardar unos segundos.',
    vi: 'Đang đọc trên thiết bị của bạn. Việc này có thể mất vài giây.',
  },
  Cancel: { es: 'Cancelar', vi: 'Hủy' },

  // ---- /report: details ----
  'Enter report details': { es: 'Escriba los datos del reporte', vi: 'Nhập thông tin báo cáo' },
  'Sender number': { es: 'Número del remitente', vi: 'Số của người gửi' },
  'The number the text came from. Spaces, dashes and +1 are fine. US numbers only.': {
    es: 'El número desde el que llegó el mensaje. Puede incluir espacios, guiones y +1. Solo números de EE. UU.',
    vi: 'Số đã gửi tin nhắn đến. Có thể dùng dấu cách, gạch ngang và +1. Chỉ nhận số điện thoại Hoa Kỳ.',
  },
  Message: { es: 'Mensaje', vi: 'Tin nhắn' },
  'Paste the spam text. Names, numbers, links and emails are removed in the next step.': {
    es: 'Pegue el mensaje de spam. Los nombres, números, enlaces y correos electrónicos se eliminan en el siguiente paso.',
    vi: 'Dán tin nhắn rác vào đây. Tên, số, đường liên kết và địa chỉ email sẽ được xóa ở bước tiếp theo.',
  },
  'Category <span class="optional">(optional)</span>': {
    es: 'Categoría <span class="optional">(opcional)</span>',
    vi: 'Danh mục <span class="optional">(không bắt buộc)</span>',
  },
  'City named in the message <span class="optional">(optional)</span>': {
    es: 'Ciudad mencionada en el mensaje <span class="optional">(opcional)</span>',
    vi: 'Thành phố được nêu trong tin nhắn <span class="optional">(không bắt buộc)</span>',
  },
  'Only if the message itself names a city. Leave blank otherwise. This is kept separately from the sender’s area code.': {
    es: 'Solo si el propio mensaje menciona una ciudad. De lo contrario, déjelo en blanco. Se guarda por separado del código de área del remitente.',
    vi: 'Chỉ điền nếu chính tin nhắn có nêu tên một thành phố. Nếu không, hãy để trống. Thông tin này được lưu riêng với mã vùng của người gửi.',
  },
  'Review report': { es: 'Revisar el reporte', vi: 'Xem lại báo cáo' },
  Back: { es: 'Atrás', vi: 'Quay lại' },

  // ---- /report: review ----
  'Review before filing.': { es: 'Revise antes de enviar.', vi: 'Xem lại trước khi gửi.' },
  'Check the scrubbed message below and remove any personal details still visible. We keep the sender’s area code, prefix, and a keyed hash of the number. We don’t store the full number. The public fields are listed below. We save the report only when you select <strong>File this report</strong>.': {
    es: 'Revise el mensaje depurado que aparece abajo y elimine cualquier dato personal que todavía se vea. Guardamos el código de área del remitente, el prefijo y un hash con clave del número. No guardamos el número completo. Los campos públicos aparecen abajo. Guardamos el reporte solo cuando usted selecciona <strong>Enviar este reporte</strong>.',
    vi: 'Hãy kiểm tra tin nhắn đã làm sạch bên dưới và xóa mọi thông tin cá nhân vẫn còn hiển thị. Chúng tôi giữ mã vùng, tiền tố của người gửi và một mã băm có khóa của số điện thoại. Chúng tôi không lưu số đầy đủ. Các trường công khai được liệt kê bên dưới. Chúng tôi chỉ lưu báo cáo khi bạn chọn <strong>Gửi báo cáo này</strong>.',
  },
  'Scrubbed message': { es: 'Mensaje depurado', vi: 'Tin nhắn đã làm sạch' },
  'Remove more text': { es: 'Eliminar más texto', vi: 'Xóa thêm nội dung' },
  'Text to remove': { es: 'Texto que se eliminará', vi: 'Nội dung cần xóa' },
  'Copy any words from the scrubbed message that are still private, such as a name or street. They will be replaced with {mask}.': {
    es: 'Copie las palabras del mensaje depurado que todavía sean privadas, como un nombre o una calle. Se reemplazarán por {mask}.',
    vi: 'Hãy sao chép những từ trong tin nhắn đã làm sạch vẫn còn mang tính riêng tư, chẳng hạn tên người hoặc tên đường. Chúng sẽ được thay bằng {mask}.',
  },
  'Remove this text': { es: 'Eliminar este texto', vi: 'Xóa nội dung này' },
  'Sender information we keep': { es: 'Datos del remitente que guardamos', vi: 'Thông tin người gửi mà chúng tôi giữ lại' },
  'The keyed hash is a scrambled code made from the full number with a secret key held only by this site. It lets the site notice the same sender sending the same text twice in a short time. It is never shown or exported, and it expires after {days} days.': {
    es: 'El hash con clave es un código revuelto que se genera a partir del número completo con una clave secreta que solo tiene este sitio. Permite que el sitio note cuando el mismo remitente envía el mismo mensaje dos veces en poco tiempo. Nunca se muestra ni se exporta, y vence después de {days} días.',
    vi: 'Mã băm có khóa là một mã đã xáo trộn, được tạo từ số điện thoại đầy đủ bằng một khóa bí mật chỉ trang này nắm giữ. Nhờ đó, trang có thể nhận ra khi cùng một người gửi gửi cùng một tin nhắn hai lần trong thời gian ngắn. Mã này không bao giờ được hiển thị hay xuất ra, và hết hạn sau {days} ngày.',
  },
  'What may appear publicly': { es: 'Lo que puede aparecer públicamente', vi: 'Những gì có thể được công khai' },
  'Message text, the prefix, the city and the keyed hash are never shown publicly or exported.': {
    es: 'El texto del mensaje, el prefijo, la ciudad y el hash con clave nunca se muestran públicamente ni se exportan.',
    vi: 'Nội dung tin nhắn, tiền tố, thành phố và mã băm có khóa không bao giờ được hiển thị công khai hay xuất ra.',
  },
  'By filing, you dedicate your scrubbed report to the public domain (CC0) to the extent you hold rights in it. Deleting removes it from this site and future data releases; copies already downloaded cannot be recalled.': {
    es: 'Al enviarlo, usted dedica su reporte depurado al dominio público (CC0) en la medida en que tenga derechos sobre él. Al eliminarlo, se quita de este sitio y de las futuras publicaciones de datos; las copias que ya se descargaron no se pueden recuperar.',
    vi: 'Khi gửi, bạn hiến tặng báo cáo đã làm sạch của mình cho phạm vi công cộng (CC0) trong chừng mực bạn có quyền đối với nó. Việc xóa sẽ gỡ báo cáo khỏi trang này và khỏi các lần công bố dữ liệu sau này; những bản sao đã được tải xuống thì không thể thu hồi.',
  },
  'File this report': { es: 'Enviar este reporte', vi: 'Gửi báo cáo này' },
  'Edit details': { es: 'Editar los datos', vi: 'Sửa thông tin' },

  // ---- /report: done, and /report/complete ----
  'Report filed.': { es: 'Reporte enviado.', vi: 'Đã gửi báo cáo.' },
  'Report filed': { es: 'Reporte enviado', vi: 'Đã gửi báo cáo' },
  'Save your deletion receipt code to remove this report later. Anyone with the code can request deletion. You can also forward the original text to <strong>7726 (SPAM)</strong>.': {
    es: 'Guarde su código de recibo para eliminar este reporte más adelante. Cualquier persona que tenga el código puede pedir que se elimine. También puede reenviar el mensaje original al <strong>7726 (SPAM)</strong>.',
    vi: 'Hãy lưu mã biên nhận để xóa, phòng khi bạn muốn xóa báo cáo này sau. Bất kỳ ai có mã này đều có thể yêu cầu xóa. Bạn cũng có thể chuyển tiếp tin nhắn gốc đến <strong>7726 (SPAM)</strong>.',
  },
  'Deletion receipt code': { es: 'Código de recibo para eliminar', vi: 'Mã biên nhận để xóa' },
  'Copy code': { es: 'Copiar el código', vi: 'Sao chép mã' },
  'This code is shown only once. We store only a scrambled version of it, so we cannot show it again or recover it for you.': {
    es: 'Este código se muestra una sola vez. Solo guardamos una versión revuelta, así que no podemos volver a mostrarlo ni recuperarlo por usted.',
    vi: 'Mã này chỉ hiển thị một lần. Chúng tôi chỉ lưu một phiên bản đã xáo trộn của mã, nên không thể hiển thị lại hay khôi phục mã cho bạn.',
  },
  'The code is also saved in this browser on this device, so you can delete the report later from the <a href="/delete">delete page</a>. It is still worth keeping a copy somewhere else.': {
    es: 'El código también se guardó en este navegador, en este dispositivo, para que pueda eliminar el reporte más adelante desde la <a href="/delete">página para eliminar reportes</a>. Aun así, conviene guardar una copia en otro lugar.',
    vi: 'Mã cũng được lưu trong trình duyệt này trên thiết bị này, để sau này bạn có thể xóa báo cáo từ <a href="/delete">trang xóa báo cáo</a>. Dù vậy, bạn vẫn nên giữ một bản sao ở nơi khác.',
  },
  'The deletion receipt code is shown only once, right after filing, and is never put in a web address. If you did not copy it, we cannot show it again.': {
    es: 'El código de recibo para eliminar se muestra una sola vez, justo después de enviar el reporte, y nunca se pone en una dirección web. Si no lo copió, no podemos volver a mostrarlo.',
    vi: 'Mã biên nhận để xóa chỉ hiển thị một lần, ngay sau khi gửi, và không bao giờ được đưa vào địa chỉ web. Nếu bạn chưa sao chép mã, chúng tôi không thể hiển thị lại.',
  },
  'What to do with your original': { es: 'Qué hacer con su original', vi: 'Nên làm gì với bản gốc' },
  'Keep your original': { es: 'Conserve su original', vi: 'Giữ lại bản gốc' },
  'Your original is yours to keep. Leave the text on your phone, and if you used a screenshot, it stays in your photos; this site never had it. Save your deletion receipt code too.': {
    es: 'El original es suyo. Deje el mensaje en su teléfono y, si usó una captura de pantalla, esta sigue en sus fotos; este sitio nunca la tuvo. Guarde también su código de recibo para eliminar.',
    vi: 'Bản gốc là của bạn. Hãy để nguyên tin nhắn trên điện thoại; nếu bạn dùng ảnh chụp màn hình, ảnh vẫn nằm trong thư viện ảnh của bạn, trang này chưa bao giờ có nó. Hãy lưu cả mã biên nhận để xóa.',
  },
  'If you want action taken on the message': { es: 'Si quiere que se tomen medidas sobre el mensaje', vi: 'Nếu bạn muốn tin nhắn được xử lý' },
  'Forward the original text to <strong>7726</strong> (it spells SPAM), and you can file a complaint with the <a href="https://consumercomplaints.fcc.gov/">FCC</a> or the <a href="https://reportfraud.ftc.gov/">FTC</a>. Carriers and regulators can act on the original message. This site publishes only scrubbed patterns.': {
    es: 'Reenvíe el mensaje original al <strong>7726</strong> (en el teclado forma la palabra SPAM) y, si quiere, presente una queja ante la <a href="https://consumercomplaints.fcc.gov/">FCC</a> o la <a href="https://reportfraud.ftc.gov/">FTC</a>. Las compañías telefónicas y los organismos reguladores pueden actuar sobre el mensaje original. Este sitio solo publica patrones depurados.',
    vi: 'Hãy chuyển tiếp tin nhắn gốc đến <strong>7726</strong> (các phím này ghép thành chữ SPAM), và bạn có thể gửi khiếu nại đến <a href="https://consumercomplaints.fcc.gov/">FCC</a> hoặc <a href="https://reportfraud.ftc.gov/">FTC</a>. Nhà mạng và cơ quan quản lý có thể xử lý dựa trên tin nhắn gốc. Trang này chỉ công bố các mẫu đã làm sạch.',
  },
  'Junk mail too?': { es: '¿También recibe correo basura?', vi: 'Bạn cũng nhận thư quảng cáo rác?' },
  'Paper junk mail has its own opt-outs. <a href="/junk-mail">How to cut down junk mail</a> lists the routes that work and what each one covers.': {
    es: 'El correo basura en papel tiene sus propias formas de darse de baja. <a href="/junk-mail">Cómo reducir el correo basura</a> explica las vías que funcionan y lo que cubre cada una.',
    vi: 'Thư quảng cáo rác bằng giấy có cách từ chối nhận riêng. <a href="/junk-mail">Cách giảm thư quảng cáo rác</a> liệt kê những cách hiệu quả và phạm vi của từng cách.',
  },
  'File a spam text anonymously in under a minute. Screenshots are read on your device, and you review the scrubbed report before anything is saved.': {
    es: 'Reporte un mensaje de spam de forma anónima en menos de un minuto. Las capturas de pantalla se leen en su dispositivo y usted revisa el reporte depurado antes de que se guarde nada.',
    vi: 'Báo cáo tin nhắn rác một cách ẩn danh trong chưa đầy một phút. Ảnh chụp màn hình được đọc ngay trên thiết bị của bạn, và bạn xem lại báo cáo đã làm sạch trước khi bất cứ thứ gì được lưu.',
  },

  // ---- /report HowTo structured data ----
  'Both ways lead to a privacy review. Nothing is saved until you select File this report. No account needed.': {
    es: 'Las dos opciones llevan a una revisión de privacidad. No se guarda nada hasta que seleccione Enviar este reporte. No necesita una cuenta.',
    vi: 'Cả hai cách đều dẫn đến bước xem lại quyền riêng tư. Không có gì được lưu cho đến khi bạn chọn Gửi báo cáo này. Không cần tài khoản.',
  },
  'Upload a screenshot or enter manually': {
    es: 'Suba una captura de pantalla o escriba los datos a mano',
    vi: 'Tải lên ảnh chụp màn hình hoặc nhập thủ công',
  },
  'Upload a screenshot (PNG, JPEG, WebP, up to {mb} MB), or enter manually: type or paste the sender number and the message.': {
    es: 'Suba una captura de pantalla (PNG, JPEG, WebP, hasta {mb} MB) o escriba los datos a mano: escriba o pegue el número del remitente y el mensaje.',
    vi: 'Tải lên ảnh chụp màn hình (PNG, JPEG, WebP, tối đa {mb} MB), hoặc nhập thủ công: gõ hoặc dán số của người gửi và nội dung tin nhắn.',
  },
  'The screenshot is read on your device': {
    es: 'La captura de pantalla se lee en su dispositivo',
    vi: 'Ảnh chụp màn hình được đọc trên thiết bị của bạn',
  },
  'The screenshot is read by software running in your browser. The image never leaves your device. We read it once to find the sender number and message. We don’t store the image.': {
    es: 'La captura de pantalla la lee un programa que funciona en su navegador. La imagen nunca sale de su dispositivo. La leemos una sola vez para encontrar el número del remitente y el mensaje. No guardamos la imagen.',
    vi: 'Ảnh chụp màn hình được đọc bằng phần mềm chạy trong trình duyệt của bạn. Ảnh không bao giờ rời khỏi thiết bị của bạn. Chúng tôi đọc ảnh một lần để tìm số của người gửi và nội dung tin nhắn. Chúng tôi không lưu ảnh.',
  },
  'Review before filing': { es: 'Revise antes de enviar', vi: 'Xem lại trước khi gửi' },
  'Check the scrubbed message and remove any personal details still visible. We save the report only when you select File this report.': {
    es: 'Revise el mensaje depurado y elimine cualquier dato personal que todavía se vea. Guardamos el reporte solo cuando usted selecciona Enviar este reporte.',
    vi: 'Hãy kiểm tra tin nhắn đã làm sạch và xóa mọi thông tin cá nhân vẫn còn hiển thị. Chúng tôi chỉ lưu báo cáo khi bạn chọn Gửi báo cáo này.',
  },
  'Save your deletion receipt code': { es: 'Guarde su código de recibo para eliminar', vi: 'Lưu mã biên nhận để xóa' },
  'Save your deletion receipt code to remove this report later. Anyone with the code can request deletion. This code is shown only once.': {
    es: 'Guarde su código de recibo para eliminar este reporte más adelante. Cualquier persona que tenga el código puede pedir que se elimine. Este código se muestra una sola vez.',
    vi: 'Hãy lưu mã biên nhận để xóa, phòng khi bạn muốn xóa báo cáo này sau. Bất kỳ ai có mã này đều có thể yêu cầu xóa. Mã này chỉ hiển thị một lần.',
  },

  // ---- /delete ----
  'Enter the receipt code you saved when you filed. Anyone with the code can delete the report, so keep it private.': {
    es: 'Escriba el código de recibo que guardó cuando envió el reporte. Cualquier persona que tenga el código puede eliminar el reporte, así que no lo comparta.',
    vi: 'Nhập mã biên nhận bạn đã lưu khi gửi báo cáo. Bất kỳ ai có mã đều có thể xóa báo cáo, vì vậy hãy giữ kín mã này.',
  },
  'Receipt code': { es: 'Código de recibo', vi: 'Mã biên nhận' },
  '32 letters and numbers, dashes optional.': {
    es: '32 letras y números; los guiones son opcionales.',
    vi: '32 chữ cái và chữ số, có thể có hoặc không có dấu gạch ngang.',
  },
  Continue: { es: 'Continuar', vi: 'Tiếp tục' },
  'Deleting removes the report from counts and patterns on this site and from all future data releases. Copies that other people already downloaded cannot be recalled. <a href="/privacy#deletion">Deletion details</a>': {
    es: 'Al eliminarlo, el reporte se quita de los conteos y patrones de este sitio y de todas las futuras publicaciones de datos. Las copias que otras personas ya descargaron no se pueden recuperar. <a href="/privacy#deletion">Detalles sobre la eliminación</a>',
    vi: 'Việc xóa sẽ gỡ báo cáo khỏi các số đếm và các mẫu trên trang này, cũng như khỏi mọi lần công bố dữ liệu sau này. Những bản sao người khác đã tải xuống thì không thể thu hồi. <a href="/privacy#deletion">Chi tiết về việc xóa</a>',
  },
  'Lost your code? We cannot look a report up without it. If a published page harms you, use the <a href="/privacy#contest">private flag form</a> instead.': {
    es: '¿Perdió su código? No podemos buscar un reporte sin él. Si una página publicada le perjudica, use en su lugar el <a href="/privacy#contest">formulario privado de señalización</a>.',
    vi: 'Bạn bị mất mã? Chúng tôi không thể tìm báo cáo nếu không có mã. Nếu một trang đã công bố gây hại cho bạn, hãy dùng <a href="/privacy#contest">biểu mẫu gắn cờ riêng tư</a>.',
  },
  'Delete this report?': { es: '¿Eliminar este reporte?', vi: 'Xóa báo cáo này?' },
  'This permanently removes the report linked to the code you entered. It cannot be undone.': {
    es: 'Esto elimina de forma permanente el reporte vinculado al código que escribió. No se puede deshacer.',
    vi: 'Thao tác này xóa vĩnh viễn báo cáo gắn với mã bạn đã nhập. Không thể hoàn tác.',
  },
  'Delete report': { es: 'Eliminar el reporte', vi: 'Xóa báo cáo' },
  'Report deleted': { es: 'Reporte eliminado', vi: 'Đã xóa báo cáo' },
  'Already deleted': { es: 'Ya estaba eliminado', vi: 'Đã bị xóa từ trước' },
  'No report found': { es: 'No se encontró ningún reporte', vi: 'Không tìm thấy báo cáo' },
  'Copies already downloaded cannot be recalled. Deleted reports do not return when the site restores a backup; see <a href="/privacy#deletion">deletion details</a>.': {
    es: 'Las copias que ya se descargaron no se pueden recuperar. Los reportes eliminados no vuelven cuando el sitio restaura una copia de seguridad; consulte los <a href="/privacy#deletion">detalles sobre la eliminación</a>.',
    vi: 'Những bản sao đã được tải xuống thì không thể thu hồi. Báo cáo đã xóa sẽ không xuất hiện lại khi trang khôi phục bản sao lưu; xem <a href="/privacy#deletion">chi tiết về việc xóa</a>.',
  },
  'Try another code': { es: 'Probar con otro código', vi: 'Thử mã khác' },
  'Delete a spam text report you filed, using the receipt code you saved when you filed it.': {
    es: 'Elimine un reporte de mensaje de spam que envió, con el código de recibo que guardó al enviarlo.',
    vi: 'Xóa một báo cáo tin nhắn rác bạn đã gửi, bằng mã biên nhận bạn đã lưu khi gửi.',
  },
  'Reports filed from this browser': { es: 'Reportes enviados desde este navegador', vi: 'Các báo cáo đã gửi từ trình duyệt này' },
  'This browser saved the receipt codes of these reports on this device. Choose one to delete that report.': {
    es: 'Este navegador guardó en este dispositivo los códigos de recibo de estos reportes. Elija uno para eliminar ese reporte.',
    vi: 'Trình duyệt này đã lưu mã biên nhận của các báo cáo này trên thiết bị này. Hãy chọn một báo cáo để xóa.',
  },
  'Remove these codes from this device': { es: 'Quitar estos códigos de este dispositivo', vi: 'Xóa các mã này khỏi thiết bị' },
  'This does <strong>not</strong> delete any report. It only erases the saved codes from this browser. Afterwards, deleting one of these reports needs its receipt code, or an email to <a href="mailto:{email}">{email}</a>.': {
    es: 'Esto <strong>no</strong> elimina ningún reporte. Solo borra los códigos guardados en este navegador. Después, para eliminar uno de estos reportes necesitará su código de recibo, o enviar un correo a <a href="mailto:{email}">{email}</a>.',
    vi: 'Thao tác này <strong>không</strong> xóa báo cáo nào. Nó chỉ xóa các mã đã lưu khỏi trình duyệt này. Sau đó, muốn xóa một trong các báo cáo này, bạn cần mã biên nhận của báo cáo đó, hoặc gửi email đến <a href="mailto:{email}">{email}</a>.',
  },

  // ---- deletion messages (src/filing.ts DELETE_MSG; "invalid" is in core.ts) ----
  'Report deleted. It no longer appears in counts or patterns on this site and will not be part of any future data release. Copies that other people already downloaded cannot be recalled.': {
    es: 'Reporte eliminado. Ya no aparece en los conteos ni en los patrones de este sitio y no formará parte de ninguna publicación de datos futura. Las copias que otras personas ya descargaron no se pueden recuperar.',
    vi: 'Đã xóa báo cáo. Báo cáo không còn xuất hiện trong các số đếm hay các mẫu trên trang này và sẽ không nằm trong bất kỳ lần công bố dữ liệu nào sau này. Những bản sao người khác đã tải xuống thì không thể thu hồi.',
  },
  'This report was already deleted. Nothing else needs to be done.': {
    es: 'Este reporte ya se había eliminado. No hace falta hacer nada más.',
    vi: 'Báo cáo này đã được xóa từ trước. Bạn không cần làm gì thêm.',
  },
  'We could not find a report for this code. Check the code and try again.': {
    es: 'No encontramos ningún reporte con este código. Revise el código e inténtelo de nuevo.',
    vi: 'Chúng tôi không tìm thấy báo cáo nào ứng với mã này. Hãy kiểm tra mã và thử lại.',
  },

  // ---- filing messages (src/filing.ts MSG and the request-key error) ----
  'Report filed. Save your deletion receipt code to remove this report later. Anyone with the code can request deletion. You can also forward the original text to 7726 (SPAM).': {
    es: 'Reporte enviado. Guarde su código de recibo para eliminar este reporte más adelante. Cualquier persona que tenga el código puede pedir que se elimine. También puede reenviar el mensaje original al 7726 (SPAM).',
    vi: 'Đã gửi báo cáo. Hãy lưu mã biên nhận để xóa, phòng khi bạn muốn xóa báo cáo này sau. Bất kỳ ai có mã này đều có thể yêu cầu xóa. Bạn cũng có thể chuyển tiếp tin nhắn gốc đến 7726 (SPAM).',
  },
  'This report was already filed. No additional report was counted.': {
    es: 'Este reporte ya se había enviado. No se contó ningún reporte adicional.',
    vi: 'Báo cáo này đã được gửi trước đó. Không có báo cáo nào được tính thêm.',
  },
  'The saved version would differ from what you reviewed. Check the revised preview and confirm again.': {
    es: 'La versión guardada sería distinta de la que revisó. Revise la vista previa actualizada y vuelva a confirmar.',
    vi: 'Bản được lưu sẽ khác với bản bạn đã xem lại. Hãy kiểm tra bản xem trước đã cập nhật và xác nhận lại.',
  },
  'This filing request was already used for a different report. Start a new report.': {
    es: 'Esta solicitud de envío ya se usó para otro reporte. Empiece un reporte nuevo.',
    vi: 'Yêu cầu gửi này đã được dùng cho một báo cáo khác. Hãy bắt đầu một báo cáo mới.',
  },
  'Too many reports from this connection in the last hour. Try again later.': {
    es: 'Se enviaron demasiados reportes desde esta conexión en la última hora. Inténtelo más tarde.',
    vi: 'Có quá nhiều báo cáo từ kết nối này trong một giờ qua. Hãy thử lại sau.',
  },
  'This site has reached its daily report limit. Intake reopens at midnight UTC. Nothing was saved.': {
    es: 'Este sitio alcanzó su límite diario de reportes. La recepción se reanuda a la medianoche UTC. No se guardó nada.',
    vi: 'Trang này đã đạt giới hạn báo cáo trong ngày. Việc nhận báo cáo sẽ mở lại lúc nửa đêm theo giờ UTC. Không có gì được lưu.',
  },
  'Reporting is paused on this site right now. Nothing was saved. You can still forward the original text to 7726 (SPAM), and everything else on this site still works.': {
    es: 'Los reportes están en pausa en este sitio por ahora. No se guardó nada. Aún puede reenviar el mensaje original al 7726 (SPAM), y todo lo demás en este sitio sigue funcionando.',
    vi: 'Hiện trang này đang tạm ngừng nhận báo cáo. Không có gì được lưu. Bạn vẫn có thể chuyển tiếp tin nhắn gốc đến 7726 (SPAM), và mọi phần khác của trang vẫn hoạt động bình thường.',
  },
  'Missing or malformed request key. Reload and review again.': {
    es: 'Falta la clave de la solicitud o no es válida. Vuelva a cargar la página y revise de nuevo.',
    vi: 'Thiếu khóa yêu cầu hoặc khóa không đúng định dạng. Hãy tải lại trang và xem lại.',
  },

  // ---- field errors (src/filing.ts, src/phone.ts PHONE_ERROR_TEXT) ----
  'Enter the message text.': { es: 'Escriba el texto del mensaje.', vi: 'Nhập nội dung tin nhắn.' },
  'This message is too long to review safely. Paste only the spam text.': {
    es: 'Este mensaje es demasiado largo para revisarlo de forma segura. Pegue solo el mensaje de spam.',
    vi: 'Tin nhắn này quá dài để có thể xem lại một cách an toàn. Chỉ dán phần tin nhắn rác.',
  },
  'After removing personal details, nothing safe was left to keep. Check the message text.': {
    es: 'Después de quitar los datos personales, no quedó nada que se pueda guardar de forma segura. Revise el texto del mensaje.',
    vi: 'Sau khi xóa thông tin cá nhân, không còn nội dung an toàn nào để giữ lại. Hãy kiểm tra lại nội dung tin nhắn.',
  },
  'Part of the message couldn’t be verified as safe to store: a stray number, @ sign or symbol survived cleaning. Check the end of the message for anything the screenshot reader added, remove it, and try again.': {
    es: 'No se pudo comprobar que una parte del mensaje sea segura para guardarla: quedó un número suelto, una @ o un símbolo después de la limpieza. Revise el final del mensaje por si el lector de capturas de pantalla agregó algo, quítelo e inténtelo de nuevo.',
    vi: 'Không thể xác minh một phần tin nhắn là an toàn để lưu: một con số, ký hiệu @ hoặc ký hiệu lạ vẫn còn sót lại sau khi làm sạch. Hãy kiểm tra phần cuối tin nhắn xem trình đọc ảnh chụp màn hình có thêm gì vào không, xóa nó đi và thử lại.',
  },
  'The list of text to remove is not valid.': {
    es: 'La lista de texto que se va a eliminar no es válida.',
    vi: 'Danh sách nội dung cần xóa không hợp lệ.',
  },
  'Enter a city name, or leave it blank.': {
    es: 'Escriba el nombre de una ciudad o deje el campo en blanco.',
    vi: 'Nhập tên thành phố, hoặc để trống.',
  },
  'Enter only the city name as letters, or leave it blank.': {
    es: 'Escriba solo el nombre de la ciudad, con letras, o deje el campo en blanco.',
    vi: 'Chỉ nhập tên thành phố bằng chữ cái, hoặc để trống.',
  },
  'Enter the city exactly as it appears in the message, or leave it blank.': {
    es: 'Escriba la ciudad exactamente como aparece en el mensaje o deje el campo en blanco.',
    vi: 'Nhập tên thành phố đúng như trong tin nhắn, hoặc để trống.',
  },
  'Choose a category from the list.': { es: 'Elija una categoría de la lista.', vi: 'Hãy chọn một danh mục trong danh sách.' },
  'Unknown source.': { es: 'Origen desconocido.', vi: 'Nguồn không xác định.' },
  'Enter the sender number shown in the text.': {
    es: 'Escriba el número del remitente que aparece en el mensaje.',
    vi: 'Nhập số của người gửi hiển thị trong tin nhắn.',
  },
  'Use only digits, spaces, dashes, dots, parentheses, and an optional +1.': {
    es: 'Use solo dígitos, espacios, guiones, puntos, paréntesis y, si quiere, +1.',
    vi: 'Chỉ dùng chữ số, dấu cách, gạch ngang, dấu chấm, dấu ngoặc đơn và +1 (không bắt buộc).',
  },
  'Enter a 10-digit US number, with or without +1.': {
    es: 'Escriba un número de EE. UU. de 10 dígitos, con o sin +1.',
    vi: 'Nhập số điện thoại Hoa Kỳ gồm 10 chữ số, có hoặc không có +1.',
  },
  'This does not look like a valid US number. Check the area code and the next three digits.': {
    es: 'Este no parece un número válido de EE. UU. Revise el código de área y los tres dígitos siguientes.',
    vi: 'Số này có vẻ không phải là số điện thoại Hoa Kỳ hợp lệ. Hãy kiểm tra mã vùng và ba chữ số tiếp theo.',
  },
  'This area code is not a supported US area code. Only US numbers are supported in this version.': {
    es: 'Este código de área no es un código de área de EE. UU. admitido. En esta versión solo se admiten números de EE. UU.',
    vi: 'Mã vùng này không phải là mã vùng Hoa Kỳ được hỗ trợ. Phiên bản này chỉ hỗ trợ số điện thoại Hoa Kỳ.',
  },

  // ---- preview public fields (src/filing.ts) ----
  'Sender area code (claimed origin)': {
    es: 'Código de área del remitente (origen declarado)',
    vi: 'Mã vùng của người gửi (nguồn gốc tự nhận)',
  },
  'Numbering-plan reference region': {
    es: 'Región de referencia del plan de numeración',
    vi: 'Khu vực tham chiếu theo kế hoạch đánh số',
  },
  Category: { es: 'Categoría', vi: 'Danh mục' },
  'Filing date (UTC day)': { es: 'Fecha de envío (día UTC)', vi: 'Ngày gửi (theo ngày UTC)' },
  'The day you file': { es: 'El día en que lo envíe', vi: 'Ngày bạn gửi' },
  'Template match counts': { es: 'Conteo de coincidencias de plantilla', vi: 'Số lần trùng khuôn văn bản' },
  'Counted toward a public pattern only when 3 or more reports match. The message text itself is never published.': {
    es: 'Cuenta para un patrón público solo cuando coinciden 3 o más reportes. El texto del mensaje nunca se publica.',
    vi: 'Chỉ được tính vào một mẫu công khai khi có từ 3 báo cáo trùng khớp trở lên. Bản thân nội dung tin nhắn không bao giờ được công bố.',
  },

  // ---- scrub notes (src/scrub.ts NOTE_TEXT) ----
  'We kept one message from the thread. Other messages were removed.': {
    es: 'Conservamos un solo mensaje de la conversación. Los demás mensajes se eliminaron.',
    vi: 'Chúng tôi giữ lại một tin nhắn trong cuộc trò chuyện. Các tin nhắn khác đã bị xóa.',
  },
  'Phone screen labels such as times and delivery status were removed.': {
    es: 'Se eliminaron las etiquetas de la pantalla del teléfono, como la hora y el estado de entrega.',
    vi: 'Các nhãn trên màn hình điện thoại như giờ và trạng thái gửi đã bị xóa.',
  },
  'The conversation header (contact name or number) was removed.': {
    es: 'Se eliminó el encabezado de la conversación (nombre o número del contacto).',
    vi: 'Phần đầu cuộc trò chuyện (tên hoặc số của liên hệ) đã bị xóa.',
  },
  'Replies that looked like yours were removed.': {
    es: 'Se eliminaron las respuestas que parecían suyas.',
    vi: 'Các tin trả lời có vẻ là của bạn đã bị xóa.',
  },
  'Text you chose to remove was removed.': {
    es: 'Se eliminó el texto que usted eligió quitar.',
    vi: 'Nội dung bạn chọn xóa đã được xóa.',
  },
  'Email addresses were removed.': { es: 'Se eliminaron las direcciones de correo electrónico.', vi: 'Các địa chỉ email đã bị xóa.' },
  'Links were removed.': { es: 'Se eliminaron los enlaces.', vi: 'Các đường liên kết đã bị xóa.' },
  'Phone numbers in the message were removed.': {
    es: 'Se eliminaron los números de teléfono del mensaje.',
    vi: 'Các số điện thoại trong tin nhắn đã bị xóa.',
  },
  'Other numbers were removed.': { es: 'Se eliminaron otros números.', vi: 'Các con số khác đã bị xóa.' },
  'The name in the greeting was removed.': { es: 'Se eliminó el nombre del saludo.', vi: 'Tên trong lời chào đã bị xóa.' },
  'The sender’s first name was removed.': { es: 'Se eliminó el nombre de pila del remitente.', vi: 'Tên của người gửi đã bị xóa.' },
  'The city you entered was masked in the message.': {
    es: 'La ciudad que escribió se ocultó en el mensaje.',
    vi: 'Thành phố bạn nhập đã được che trong tin nhắn.',
  },
  'Other place names were removed.': { es: 'Se eliminaron otros nombres de lugares.', vi: 'Các tên địa danh khác đã bị xóa.' },
  'Other capitalized words that may be names were removed.': {
    es: 'Se eliminaron otras palabras con mayúscula inicial que podrían ser nombres.',
    vi: 'Các từ viết hoa khác có thể là tên người đã bị xóa.',
  },

  // ---- category labels (src/categories.ts CATEGORIES; also used on pattern pages) ----
  Unknown: { es: 'Desconocida', vi: 'Không rõ' },
  Roofing: { es: 'Techos', vi: 'Lợp mái' },
  'Lawn & landscaping': { es: 'Césped y jardinería', vi: 'Cắt cỏ và cảnh quan sân vườn' },
  'Tree service': { es: 'Servicio de árboles', vi: 'Dịch vụ chăm sóc cây' },
  Painting: { es: 'Pintura', vi: 'Sơn nhà' },
  'Pressure washing': { es: 'Lavado a presión', vi: 'Phun rửa áp lực' },
  Gutters: { es: 'Canaletas', vi: 'Máng xối' },
  'Windows & siding': { es: 'Ventanas y revestimiento exterior', vi: 'Cửa sổ và tấm ốp tường' },
  'Heating & cooling': { es: 'Calefacción y aire acondicionado', vi: 'Hệ thống sưởi và làm mát' },
  Plumbing: { es: 'Plomería', vi: 'Sửa ống nước' },
  Fencing: { es: 'Cercas', vi: 'Hàng rào' },
  Solar: { es: 'Energía solar', vi: 'Điện mặt trời' },
  'Pest control': { es: 'Control de plagas', vi: 'Diệt côn trùng' },
  Cleaning: { es: 'Limpieza', vi: 'Dọn dẹp vệ sinh' },
  'Other home service': { es: 'Otro servicio para el hogar', vi: 'Dịch vụ nhà ở khác' },
  'Offer to buy your home': { es: 'Oferta para comprar su casa', vi: 'Lời đề nghị mua nhà của bạn' },
  'Package or delivery notice': { es: 'Aviso de paquete o entrega', vi: 'Thông báo bưu kiện hoặc giao hàng' },
  'Bank or account alert': { es: 'Alerta del banco o de una cuenta', vi: 'Cảnh báo ngân hàng hoặc tài khoản' },
  'Prize or gift': { es: 'Premio o regalo', vi: 'Giải thưởng hoặc quà tặng' },
  Political: { es: 'Política', vi: 'Chính trị' },
  Other: { es: 'Otra', vi: 'Khác' },
};

/** Proper names and other English this section keeps on translated pages (test/i18n.test.ts). */
export const KEEP_REPORT: string[] = [];
