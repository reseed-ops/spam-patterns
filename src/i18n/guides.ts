// Junk mail guide, people-search opt-out (incl. the email builder and other
// opt-outs) and the scams guide (src/pages.ts). The builder's client-side
// messages live in public/static/js/optout.js (its own small dictionary).
import type { Dict } from './types.ts';

export const DICT_GUIDES: Dict = {
  // ---- shared by the three guides ----
  'Practical next steps': { es: 'Pasos prácticos', vi: 'Các bước thiết thực' },
  'The limits of opting out': { es: 'Los límites de darse de baja', vi: 'Giới hạn của việc gỡ tên' },

  // ---- /junk-mail ----
  'How to cut down junk mail': { es: 'Cómo reducir el correo basura', vi: 'Cách giảm thư quảng cáo rác' },
  'There is no single switch at the Postal Service that stops junk mail. These are the routes that actually work. Each one covers a different kind of mail, so most people use more than one.': {
    es: 'El Servicio Postal no tiene un solo interruptor que detenga el correo basura. Estas son las vías que de verdad funcionan. Cada una cubre un tipo distinto de correo, así que la mayoría de las personas usa más de una.',
    vi: 'Bưu điện Hoa Kỳ không có một nút bấm duy nhất nào để chặn thư quảng cáo rác. Dưới đây là những cách thực sự hiệu quả. Mỗi cách áp dụng cho một loại thư khác nhau, nên hầu hết mọi người dùng nhiều hơn một cách.',
  },
  'Prescreened credit and insurance offers': {
    es: 'Ofertas preseleccionadas de crédito y seguros',
    vi: 'Lời mời tín dụng và bảo hiểm được sàng lọc trước',
  },
  'These are the “pre-approved” or “you’ve been selected” offers. The official opt-out is <strong>OptOutPrescreen.com</strong>, or call <strong class="nowrap">1-888-5-OPT-OUT</strong> (<span class="nowrap">1-888-567-8688</span>). It is run by the consumer credit bureaus Equifax, Experian, TransUnion and Innovis under the Fair Credit Reporting Act. It is free.': {
    es: 'Son las ofertas “preaprobadas” o de “usted ha sido seleccionado”. La vía oficial para darse de baja es <strong>OptOutPrescreen.com</strong>, o llame al <strong class="nowrap">1-888-5-OPT-OUT</strong> (<span class="nowrap">1-888-567-8688</span>). La administran las agencias de crédito al consumidor Equifax, Experian, TransUnion e Innovis en virtud de la Fair Credit Reporting Act (ley federal de informes de crédito). Es gratis.',
    vi: 'Đây là những lời mời kiểu “đã được duyệt trước” hoặc “bạn đã được chọn”. Cách gỡ tên chính thức là <strong>OptOutPrescreen.com</strong>, hoặc gọi <strong class="nowrap">1-888-5-OPT-OUT</strong> (<span class="nowrap">1-888-567-8688</span>). Dịch vụ này do các công ty báo cáo tín dụng tiêu dùng Equifax, Experian, TransUnion và Innovis vận hành theo Fair Credit Reporting Act (luật liên bang về báo cáo tín dụng). Dịch vụ miễn phí.',
  },
  'An online or phone opt-out lasts 5 years.': {
    es: 'La baja por internet o por teléfono dura 5 años.',
    vi: 'Yêu cầu gỡ qua mạng hoặc qua điện thoại có hiệu lực 5 năm.',
  },
  'A permanent opt-out starts on the website and finishes when you print, sign and mail their form.': {
    es: 'La baja permanente empieza en el sitio web y termina cuando usted imprime, firma y envía por correo el formulario.',
    vi: 'Yêu cầu gỡ vĩnh viễn bắt đầu trên trang web và hoàn tất khi bạn in, ký và gửi qua bưu điện mẫu đơn của họ.',
  },
  'Requests are processed within about 5 days. Offers that were already printed can keep arriving for a few weeks.': {
    es: 'Las solicitudes se procesan en unos 5 días. Las ofertas que ya se imprimieron pueden seguir llegando durante algunas semanas.',
    vi: 'Yêu cầu được xử lý trong khoảng 5 ngày. Những lời mời đã được in sẵn vẫn có thể tiếp tục đến trong vài tuần.',
  },
  '<strong>Type the address yourself.</strong> Look-alike sites exist. The real opt-out is always free; nobody legitimate will charge you for it.': {
    es: '<strong>Escriba la dirección usted mismo.</strong> Existen sitios que imitan al verdadero. La baja real siempre es gratuita; nadie legítimo le cobrará por ella.',
    vi: '<strong>Hãy tự gõ địa chỉ trang web.</strong> Có những trang giả mạo trông giống hệt trang thật. Dịch vụ gỡ tên thật luôn miễn phí; không bên hợp pháp nào thu phí bạn cho việc này.',
  },
  'Catalogs, magazine offers and national promotions': {
    es: 'Catálogos, ofertas de revistas y promociones nacionales',
    vi: 'Catalô, lời mời đặt báo và chương trình khuyến mãi trên cả nước',
  },
  'For mail from companies you don’t buy from, use <a href="https://www.dmachoice.org/">DMAchoice</a>, run by the Association of National Advertisers (ANA).': {
    es: 'Para el correo de empresas a las que usted no les compra, use <a href="https://www.dmachoice.org/">DMAchoice</a>, administrado por la Association of National Advertisers (ANA, asociación nacional de anunciantes).',
    vi: 'Với thư từ những công ty bạn không mua hàng, hãy dùng <a href="https://www.dmachoice.org/">DMAchoice</a>, do Association of National Advertisers (ANA, hiệp hội các nhà quảng cáo quốc gia) vận hành.',
  },
  'It costs a one-time {fee} online (checked {date}) and lasts 10 years.': {
    es: 'Cuesta un pago único de {fee} por internet (verificado el {date}) y dura 10 años.',
    vi: 'Phí trả một lần là {fee} khi đăng ký qua mạng (kiểm tra ngày {date}) và có hiệu lực 10 năm.',
  },
  'Allow about 90 days for it to take effect.': {
    es: 'Cuente con unos 90 días para que surta efecto.',
    vi: 'Cần khoảng 90 ngày để có hiệu lực.',
  },
  'The ANA estimates it cuts this kind of prospect mail by about 80%.': {
    es: 'La ANA calcula que reduce en un 80% aproximadamente este tipo de correo dirigido a posibles clientes.',
    vi: 'ANA ước tính dịch vụ này giảm khoảng 80% loại thư chào hàng này.',
  },
  'It does not cover companies you bought from or donated to in the past two years, local businesses, or political mail.': {
    es: 'No cubre a las empresas a las que usted les compró o donó en los últimos dos años, a los negocios locales ni el correo político.',
    vi: 'Dịch vụ này không áp dụng cho các công ty bạn đã mua hàng hoặc quyên góp trong hai năm qua, các doanh nghiệp địa phương, hay thư chính trị.',
  },
  'One catalog at a time': { es: 'Un catálogo a la vez', vi: 'Từng catalô một' },
  '<a href="https://www.catalogchoice.org/">Catalog Choice</a> is a free nonprofit service that sends opt-out requests to individual catalogs and mailers. Each request takes about 6 to 8 weeks.': {
    es: '<a href="https://www.catalogchoice.org/">Catalog Choice</a> es un servicio gratuito sin fines de lucro que envía solicitudes de baja a cada catálogo y remitente por separado. Cada solicitud tarda entre 6 y 8 semanas aproximadamente.',
    vi: '<a href="https://www.catalogchoice.org/">Catalog Choice</a> là dịch vụ phi lợi nhuận miễn phí, gửi yêu cầu gỡ tên đến từng catalô và từng bên gửi thư. Mỗi yêu cầu mất khoảng 6 đến 8 tuần.',
  },
  'Mail addressed to “Current Resident” or “Postal Customer” (the Postal Service’s Every Door Direct Mail) has no registry opt-out. The only route is asking each sender directly.': {
    es: 'El correo dirigido a “Current Resident” (residente actual) o “Postal Customer” (cliente postal), que es el Every Door Direct Mail del Servicio Postal, no tiene un registro para darse de baja. La única vía es pedírselo directamente a cada remitente.',
    vi: 'Thư gửi tới “Current Resident” (cư dân hiện tại) hoặc “Postal Customer” (khách hàng bưu điện), tức dịch vụ Every Door Direct Mail của Bưu điện Hoa Kỳ, không có danh sách đăng ký để gỡ tên. Cách duy nhất là yêu cầu trực tiếp từng bên gửi.',
  },
  'Bills, statements and political mail are not advertising, so these opt-outs do not cover them.': {
    es: 'Las facturas, los estados de cuenta y el correo político no son publicidad, así que estas bajas no los cubren.',
    vi: 'Hóa đơn, sao kê và thư chính trị không phải là quảng cáo, nên các cách gỡ tên này không áp dụng cho chúng.',
  },
  'Expect 6 weeks to 3 months before your mailbox visibly thins.': {
    es: 'Espere de 6 semanas a 3 meses antes de notar que llega menos correo a su buzón.',
    vi: 'Thường phải mất từ 6 tuần đến 3 tháng thì hộp thư của bạn mới vơi đi rõ rệt.',
  },
  'A paid convenience option also exists: <a href="https://www.paperkarma.com/">PaperKarma</a> lets you photograph a mail piece and files opt-out requests for you. This site has no connection to it.': {
    es: 'También existe una opción de pago por comodidad: <a href="https://www.paperkarma.com/">PaperKarma</a> le permite fotografiar un envío y presenta las solicitudes de baja por usted. Este sitio no tiene ninguna relación con ese servicio.',
    vi: 'Ngoài ra còn có một lựa chọn trả phí cho tiện: <a href="https://www.paperkarma.com/">PaperKarma</a> cho phép bạn chụp ảnh một lá thư và gửi yêu cầu gỡ tên thay bạn. Trang này không có liên hệ gì với dịch vụ đó.',
  },
  'This page collects no information and links only to the services named. Details checked {date}; fees and timing are set by each service and can change. For spam texts, <a href="/report">file a report here</a> and forward the original to <strong>7726</strong>.': {
    es: 'Esta página no recopila ninguna información y solo enlaza a los servicios mencionados. Datos verificados el {date}; cada servicio fija sus tarifas y plazos, que pueden cambiar. Para los mensajes de spam, <a href="/report">envíe un reporte aquí</a> y reenvíe el original al <strong>7726</strong>.',
    vi: 'Trang này không thu thập thông tin nào và chỉ dẫn liên kết đến các dịch vụ được nêu tên. Thông tin được kiểm tra ngày {date}; phí và thời gian do từng dịch vụ quy định và có thể thay đổi. Với tin nhắn rác, hãy <a href="/report">gửi báo cáo tại đây</a> và chuyển tiếp tin nhắn gốc đến <strong>7726</strong>.',
  },
  'The opt-outs that actually reduce paper junk mail, what each one covers, and their limits.': {
    es: 'Las vías para darse de baja que de verdad reducen el correo basura en papel, qué cubre cada una y sus límites.',
    vi: 'Những cách gỡ tên thực sự giúp giảm thư quảng cáo rác bằng giấy, phạm vi của từng cách và giới hạn của chúng.',
  },

  // ---- /opt-out ----
  'Opt out of people-search sites': {
    es: 'Darse de baja de los sitios de búsqueda de personas',
    vi: 'Gỡ tên khỏi các trang tra cứu thông tin cá nhân',
  },
  'A lot of spam texts start on a people-search site: someone looks up a name and gets a phone number. This page helps you ask the biggest sites to take your listing down.': {
    es: 'Muchos mensajes de spam empiezan en un sitio de búsqueda de personas: alguien busca un nombre y consigue un número de teléfono. Esta página le ayuda a pedir a los sitios más grandes que retiren su ficha.',
    vi: 'Rất nhiều tin nhắn rác bắt đầu từ một trang tra cứu thông tin cá nhân: ai đó tra một cái tên và lấy được số điện thoại. Trang này giúp bạn yêu cầu các trang lớn nhất gỡ trang hồ sơ của bạn xuống.',
  },
  '{name} (web form only)': { es: '{name} (solo formulario web)', vi: '{name} (chỉ qua biểu mẫu web)' },
  'The email is written in English because these companies handle requests in English.': {
    es: 'El correo se redacta en inglés porque estas empresas tramitan las solicitudes en inglés.',
    vi: 'Email được viết bằng tiếng Anh vì các công ty này xử lý yêu cầu bằng tiếng Anh.',
  },
  'What these sites are': { es: 'Qué son estos sitios', vi: 'Các trang này là gì' },
  'People-search sites publish your name, past and current addresses, phone numbers, relatives and more, collected from public records and other sources. Anyone can look you up. Taking yourself off them leaves less of your information in circulation for scammers and spammers to use.': {
    es: 'Los sitios de búsqueda de personas publican su nombre, sus direcciones actuales y anteriores, sus números de teléfono, sus familiares y más, a partir de registros públicos y otras fuentes. Cualquiera puede buscarlo. Si usted se retira de ellos, queda menos información suya en circulación que los estafadores y los spammers puedan usar.',
    vi: 'Các trang tra cứu thông tin cá nhân công bố tên, địa chỉ cũ và hiện tại, số điện thoại, người thân của bạn và nhiều thông tin khác, thu thập từ hồ sơ công khai và các nguồn khác. Bất kỳ ai cũng có thể tra cứu bạn. Gỡ tên khỏi các trang này giúp giảm lượng thông tin của bạn đang lưu hành mà kẻ lừa đảo và kẻ gửi tin rác có thể lợi dụng.',
  },
  'Suppression hides your listing from name search. It does not delete the public records underneath.': {
    es: 'La supresión oculta su ficha en las búsquedas por nombre. No borra los registros públicos de los que proviene.',
    vi: 'Việc ẩn chỉ giấu trang hồ sơ của bạn khỏi kết quả tìm theo tên. Nó không xóa các hồ sơ công khai gốc.',
  },
  'Listings come back when new data arrives. Check again every few months.': {
    es: 'Las fichas vuelven a aparecer cuando llegan datos nuevos. Revise de nuevo cada pocos meses.',
    vi: 'Trang hồ sơ sẽ xuất hiện lại khi có dữ liệu mới. Hãy kiểm tra lại vài tháng một lần.',
  },
  'Some sites ask you to prove who you are, with an email link or a phone call with a code. That is their process, not ours.': {
    es: 'Algunos sitios le piden que demuestre quién es, con un enlace por correo electrónico o una llamada telefónica con un código. Ese es su proceso, no el nuestro.',
    vi: 'Một số trang yêu cầu bạn chứng minh danh tính, qua một đường liên kết gửi bằng email hoặc một cuộc gọi kèm mã. Đó là quy trình của họ, không phải của chúng tôi.',
  },
  '<strong>Use a secondary email address.</strong> These sites send confirmation messages. A secondary address keeps them, and anything that follows, out of your main inbox.': {
    es: '<strong>Use una dirección de correo electrónico secundaria.</strong> Estos sitios envían mensajes de confirmación. Una dirección secundaria los mantiene, junto con todo lo que llegue después, fuera de su bandeja de entrada principal.',
    vi: '<strong>Hãy dùng một địa chỉ email phụ.</strong> Các trang này gửi email xác nhận. Một địa chỉ phụ giúp những email đó, và mọi thứ đến sau, không lọt vào hộp thư chính của bạn.',
  },
  '<strong>In California:</strong> the state’s <a href="{url}">Delete Request and Opt-out Platform (DROP)</a>, run by the California Privacy Protection Agency, lets you send one deletion request to every registered data broker (over 600) at once.': {
    es: '<strong>En California:</strong> la <a href="{url}">Delete Request and Opt-out Platform (DROP)</a> (plataforma estatal de solicitudes de eliminación y exclusión), administrada por la California Privacy Protection Agency (agencia de protección de la privacidad de California), le permite enviar una sola solicitud de eliminación a todos los corredores de datos registrados (más de 600) a la vez.',
    vi: '<strong>Tại California:</strong> <a href="{url}">Delete Request and Opt-out Platform (DROP)</a> (nền tảng yêu cầu xóa và gỡ tên của tiểu bang), do California Privacy Protection Agency (cơ quan bảo vệ quyền riêng tư California) vận hành, cho phép bạn gửi một yêu cầu xóa duy nhất đến tất cả các công ty môi giới dữ liệu đã đăng ký (hơn 600 công ty) cùng một lúc.',
  },
  'Write the email': { es: 'Redactar el correo', vi: 'Soạn email' },
  'Nothing you type here is sent to this site: your browser builds the email and hands it to your own email app.': {
    es: 'Nada de lo que escriba aquí se envía a este sitio: su navegador redacta el correo y lo pasa a su propia aplicación de correo.',
    vi: 'Không có gì bạn nhập ở đây được gửi đến trang này: trình duyệt của bạn soạn email và chuyển nó sang ứng dụng email của chính bạn.',
  },
  'The email builder needs JavaScript. You can still use the addresses and forms in the list below.': {
    es: 'El generador de correos necesita JavaScript. Aun así, puede usar las direcciones y los formularios de la lista de abajo.',
    vi: 'Công cụ soạn email cần JavaScript. Bạn vẫn có thể dùng các địa chỉ và biểu mẫu trong danh sách bên dưới.',
  },
  'Your full name': { es: 'Su nombre completo', vi: 'Họ và tên đầy đủ của bạn' },
  'The site you want to contact': { es: 'El sitio con el que quiere comunicarse', vi: 'Trang bạn muốn liên hệ' },
  'The URL of your listing on that site <span class="optional">(optional)</span>': {
    es: 'La URL de su ficha en ese sitio <span class="optional">(opcional)</span>',
    vi: 'URL trang hồ sơ của bạn trên trang đó <span class="optional">(không bắt buộc)</span>',
  },
  'Search for yourself on the site and copy the address of your listing page.': {
    es: 'Búsquese en el sitio y copie la dirección de la página de su ficha.',
    vi: 'Hãy tự tìm tên mình trên trang đó và sao chép địa chỉ trang hồ sơ của bạn.',
  },
  'The email address you want the reply sent to': {
    es: 'La dirección de correo electrónico a la que quiere recibir la respuesta',
    vi: 'Địa chỉ email bạn muốn nhận thư trả lời',
  },
  'Write my email': { es: 'Redactar mi correo', vi: 'Soạn email của tôi' },
  'Your email': { es: 'Su correo', vi: 'Email của bạn' },
  'Read it before you send it. It opens in your email app; nothing is sent until you send it there.': {
    es: 'Léalo antes de enviarlo. Se abre en su aplicación de correo; no se envía nada hasta que usted lo envíe desde allí.',
    vi: 'Hãy đọc kỹ trước khi gửi. Email sẽ mở trong ứng dụng email của bạn; không có gì được gửi đi cho đến khi bạn bấm gửi ở đó.',
  },
  '<dt>To</dt><dd id="o-to"></dd><dt>Subject</dt><dd id="o-subject"></dd>': {
    es: '<dt>Para</dt><dd id="o-to"></dd><dt>Asunto</dt><dd id="o-subject"></dd>',
    vi: '<dt>Người nhận</dt><dd id="o-to"></dd><dt>Tiêu đề</dt><dd id="o-subject"></dd>',
  },
  'Open in my email': { es: 'Abrir en mi correo', vi: 'Mở trong ứng dụng email' },
  '<span id="o-fo-name"></span> takes opt-outs only through its web form.': {
    es: '<span id="o-fo-name"></span> solo acepta solicitudes de baja a través de su formulario web.',
    vi: '<span id="o-fo-name"></span> chỉ nhận yêu cầu gỡ qua biểu mẫu web của mình.',
  },
  'The sites and their opt-out routes': {
    es: 'Los sitios y sus vías para darse de baja',
    vi: 'Các trang và cách gỡ tên trên từng trang',
  },
  'Other sites, including TruePeopleSearch, FastPeopleSearch and Radaris, blocked our automated checks, so we could not confirm their opt-out pages and do not list them here.': {
    es: 'Otros sitios, como TruePeopleSearch, FastPeopleSearch y Radaris, bloquearon nuestras verificaciones automáticas, así que no pudimos confirmar sus páginas para darse de baja y no los incluimos aquí.',
    vi: 'Các trang khác, gồm TruePeopleSearch, FastPeopleSearch và Radaris, đã chặn việc kiểm tra tự động của chúng tôi, nên chúng tôi không thể xác nhận trang gỡ tên của họ và không liệt kê ở đây.',
  },
  'Other opt-outs': { es: 'Otras formas de darse de baja', vi: 'Các cách gỡ tên khác' },
  'These cover calls, mail and ads rather than people-search listings. Each one takes a form or a phone call, not an email.': {
    es: 'Estas cubren llamadas, correo postal y anuncios, no fichas de búsqueda de personas. Cada una se hace con un formulario o una llamada, no por correo electrónico.',
    vi: 'Những cách này áp dụng cho cuộc gọi, thư bưu điện và quảng cáo, chứ không phải trang hồ sơ trên trang tra cứu thông tin cá nhân. Mỗi cách cần điền biểu mẫu hoặc gọi điện, không phải gửi email.',
  },
  'OptOutPrescreen.com (prescreened credit and insurance offers) and the Digital Advertising Alliance’s ad opt-out blocked our automated checks, so we do not link them here. The <a href="/junk-mail#prescreened">junk mail guide</a> describes OptOutPrescreen.': {
    es: 'OptOutPrescreen.com (ofertas preseleccionadas de crédito y seguros) y el sistema de exclusión de anuncios de la Digital Advertising Alliance bloquearon nuestras verificaciones automáticas, así que no los enlazamos aquí. La <a href="/junk-mail#prescreened">guía sobre el correo basura</a> describe OptOutPrescreen.',
    vi: 'OptOutPrescreen.com (lời mời tín dụng và bảo hiểm được sàng lọc trước) và công cụ từ chối quảng cáo của Digital Advertising Alliance đã chặn việc kiểm tra tự động của chúng tôi, nên chúng tôi không dẫn liên kết ở đây. <a href="/junk-mail#prescreened">Hướng dẫn về thư quảng cáo rác</a> có mô tả OptOutPrescreen.',
  },
  'This page collects no information and links only to the sites named. Routes checked {date}; each site sets its own process and can change it. For spam texts, <a href="/report">file a report here</a> and forward the original to <strong>7726</strong>.': {
    es: 'Esta página no recopila ninguna información y solo enlaza a los sitios mencionados. Vías verificadas el {date}; cada sitio fija su propio proceso y puede cambiarlo. Para los mensajes de spam, <a href="/report">envíe un reporte aquí</a> y reenvíe el original al <strong>7726</strong>.',
    vi: 'Trang này không thu thập thông tin nào và chỉ dẫn liên kết đến các trang được nêu tên. Các cách gỡ tên được kiểm tra ngày {date}; mỗi trang tự đặt quy trình riêng và có thể thay đổi. Với tin nhắn rác, hãy <a href="/report">gửi báo cáo tại đây</a> và chuyển tiếp tin nhắn gốc đến <strong>7726</strong>.',
  },
  'How to get your listing off the major people-search sites, with an email builder that runs in your browser, and the limits of opting out.': {
    es: 'Cómo retirar su ficha de los principales sitios de búsqueda de personas, con un generador de correos que funciona en su navegador, y los límites de darse de baja.',
    vi: 'Cách gỡ trang hồ sơ của bạn khỏi các trang tra cứu thông tin cá nhân lớn, kèm công cụ soạn email chạy ngay trong trình duyệt, và giới hạn của việc gỡ tên.',
  },

  // ---- /opt-out: OPT_OUT_SITES rows (covers, emailSource, formLabel, note) ----
  'Also covers {list}.': { es: 'También cubre {list}.', vi: 'Áp dụng luôn cho {list}.' },
  '<dt>Email</dt><dd>{link} <span class="meta">({source})</span></dd>': {
    es: '<dt>Correo electrónico</dt><dd>{link} <span class="meta">({source})</span></dd>',
    vi: '<dt>Email</dt><dd>{link} <span class="meta">({source})</span></dd>',
  },
  '<dt>Web form</dt><dd>{link}</dd>': {
    es: '<dt>Formulario web</dt><dd>{link}</dd>',
    vi: '<dt>Biểu mẫu web</dt><dd>{link}</dd>',
  },
  'listed on its Suppression Center page': {
    es: 'publicada en su página del Suppression Center',
    vi: 'được nêu trên trang Suppression Center của họ',
  },
  'listed in its privacy policy and its California registry filing': {
    es: 'publicada en su política de privacidad y en su inscripción en el registro de California',
    vi: 'được nêu trong chính sách quyền riêng tư và hồ sơ đăng ký tại California của họ',
  },
  'listed on its opt-out page': {
    es: 'publicada en su página para darse de baja',
    vi: 'được nêu trên trang gỡ tên của họ',
  },
  'PeopleConnect Suppression Center': {
    es: 'Centro de supresión de PeopleConnect (Suppression Center)',
    vi: 'Trung tâm ẩn thông tin của PeopleConnect (Suppression Center)',
  },
  'BeenVerified privacy policy (links to its opt-out form)': {
    es: 'Política de privacidad de BeenVerified (enlaza a su formulario para darse de baja)',
    vi: 'Chính sách quyền riêng tư của BeenVerified (có liên kết đến biểu mẫu gỡ tên)',
  },
  'Spokeo opt-out': { es: 'Formulario de baja de Spokeo', vi: 'Trang gỡ tên của Spokeo' },
  'Whitepages opt-out': { es: 'Formulario de baja de Whitepages', vi: 'Trang gỡ tên của Whitepages' },
  'The form starts with your email address and sends a verification link; one suppression covers all four sites.': {
    es: 'El formulario empieza pidiendo su dirección de correo electrónico y le envía un enlace de verificación; una sola supresión cubre los cuatro sitios.',
    vi: 'Biểu mẫu bắt đầu bằng địa chỉ email của bạn và gửi một đường liên kết xác minh; một lần ẩn áp dụng cho cả bốn trang.',
  },
  'BeenVerified verifies your identity before it acts on a request.': {
    es: 'BeenVerified verifica su identidad antes de tramitar una solicitud.',
    vi: 'BeenVerified xác minh danh tính của bạn trước khi xử lý yêu cầu.',
  },
  'The form asks for the URL of your listing and an email address, then sends a confirmation link. Each listing is opted out separately.': {
    es: 'El formulario pide la URL de su ficha y una dirección de correo electrónico, y luego envía un enlace de confirmación. Cada ficha se da de baja por separado.',
    vi: 'Biểu mẫu yêu cầu URL trang hồ sơ của bạn và một địa chỉ email, rồi gửi đường liên kết xác nhận. Mỗi trang hồ sơ phải được gỡ riêng.',
  },
  'The form asks for the URL of your listing, then verifies you with an automated phone call and a 4-digit code.': {
    es: 'El formulario pide la URL de su ficha y luego verifica su identidad con una llamada automática y un código de 4 dígitos.',
    vi: 'Biểu mẫu yêu cầu URL trang hồ sơ của bạn, rồi xác minh bạn bằng một cuộc gọi tự động và mã gồm 4 chữ số.',
  },
  'MyLife verifies your identity before it acts, for example by confirming your email or home address.': {
    es: 'MyLife verifica su identidad antes de actuar, por ejemplo confirmando su correo electrónico o su domicilio.',
    vi: 'MyLife xác minh danh tính của bạn trước khi xử lý, ví dụ bằng cách xác nhận email hoặc địa chỉ nhà của bạn.',
  },

  // ---- /opt-out: OTHER_OPT_OUTS rows (stops, urlLabel, note) ----
  '<dt>Stops</dt><dd>{stops}</dd><dt>Route</dt><dd>{link}</dd>': {
    es: '<dt>Qué frena</dt><dd>{stops}</dd><dt>Vía</dt><dd>{link}</dd>',
    vi: '<dt>Chặn được</dt><dd>{stops}</dd><dt>Cách thực hiện</dt><dd>{link}</dd>',
  },
  '<dt>Phone</dt><dd>{link}</dd>': {
    es: '<dt>Teléfono</dt><dd>{link}</dd>',
    vi: '<dt>Điện thoại</dt><dd>{link}</dd>',
  },
  'Telemarketing calls': { es: 'Llamadas de telemercadeo', vi: 'Cuộc gọi tiếp thị qua điện thoại' },
  'Unsolicited marketing mail': { es: 'Correo publicitario no solicitado', vi: 'Thư tiếp thị không mong muốn' },
  'Valpak’s blue-envelope coupon mailings': {
    es: 'Los envíos de cupones de Valpak en sobre azul',
    vi: 'Thư phiếu giảm giá trong phong bì xanh của Valpak',
  },
  'Some targeted online ads, one setting at a time': {
    es: 'Algunos anuncios dirigidos en internet, un ajuste a la vez',
    vi: 'Một số quảng cáo nhắm mục tiêu trên mạng, chỉnh từng cài đặt một',
  },
  'Register a number at donotcall.gov': { es: 'Registre un número en donotcall.gov', vi: 'Đăng ký số điện thoại tại donotcall.gov' },
  'DMAchoice registration': { es: 'Inscripción en DMAchoice', vi: 'Đăng ký DMAchoice' },
  'Valpak address removal': { es: 'Retiro de dirección de Valpak', vi: 'Gỡ địa chỉ khỏi Valpak' },
  'NAI: How to opt out': { es: 'NAI: cómo darse de baja', vi: 'NAI: cách từ chối quảng cáo nhắm mục tiêu' },
  'Free, for home or mobile numbers. Most telemarketers should stop calling 31 days after you register; charities, political groups, debt collectors and surveys may still call.': {
    es: 'Gratis, para números fijos o móviles. La mayoría de las empresas de telemercadeo deben dejar de llamar 31 días después de que usted se registre; las organizaciones benéficas, los grupos políticos, los cobradores de deudas y las encuestas pueden seguir llamando.',
    vi: 'Miễn phí, cho số điện thoại bàn hoặc di động. Phần lớn các bên tiếp thị qua điện thoại phải ngừng gọi sau 31 ngày kể từ khi bạn đăng ký; các tổ chức từ thiện, nhóm chính trị, bên đòi nợ và các cuộc khảo sát vẫn có thể gọi.',
  },
  'Run by the ANA. A {fee} fee online ($9 by mail) for a 10-year registration. The site says it will not eliminate all promotional mail.': {
    es: 'Lo administra la ANA. Cuesta {fee} por internet ($9 por correo postal) por una inscripción de 10 años. El sitio advierte que no eliminará todo el correo promocional.',
    vi: 'Do ANA vận hành. Phí {fee} khi đăng ký qua mạng ($9 qua bưu điện) cho thời hạn 10 năm. Trang này cho biết dịch vụ sẽ không loại bỏ hết mọi thư khuyến mãi.',
  },
  'Covers Valpak mailings only. Valpak says it can take several weeks for them to stop, because mailings are prepared weeks in advance.': {
    es: 'Solo cubre los envíos de Valpak. Valpak indica que pueden pasar varias semanas hasta que dejen de llegar, porque los envíos se preparan con semanas de anticipación.',
    vi: 'Chỉ áp dụng cho thư của Valpak. Valpak cho biết có thể mất vài tuần thư mới ngừng đến, vì thư được chuẩn bị trước nhiều tuần.',
  },
  'There is no single switch: its old opt-out tool now redirects to this guide to the ad privacy settings in your browser, phone and TV, plus a Chrome extension that sends a Global Privacy Control signal.': {
    es: 'No hay un solo interruptor: su antigua herramienta de exclusión ahora redirige a esta guía sobre los ajustes de privacidad de anuncios de su navegador, teléfono y televisor, además de una extensión de Chrome que envía una señal Global Privacy Control (control global de privacidad).',
    vi: 'Không có một nút bấm duy nhất: công cụ từ chối cũ của họ nay chuyển hướng đến hướng dẫn này về cài đặt quyền riêng tư quảng cáo trên trình duyệt, điện thoại và TV của bạn, cùng một tiện ích Chrome gửi tín hiệu Global Privacy Control (yêu cầu không bán hay chia sẻ dữ liệu của bạn).',
  },

  // ---- /opt-out: Google and More places to opt out (GOOGLE_OPT_OUTS, MORE_OPT_OUTS) ----
  'Settings in your Google Account that change what Google keeps about you and what it shows about you in Search and Maps. Most of them need you to be signed in.': {
    es: 'Ajustes de su cuenta de Google que cambian lo que Google guarda sobre usted y lo que muestra sobre usted en el buscador y en Maps. Para la mayoría tiene que haber iniciado sesión.',
    vi: 'Các cài đặt trong Tài khoản Google quyết định Google lưu những gì về bạn và hiển thị những gì về bạn trên Google Tìm kiếm và Google Maps. Hầu hết đều cần bạn đăng nhập.',
  },
  'More places to opt out': { es: 'Más lugares donde darse de baja', vi: 'Những nơi khác để từ chối chia sẻ dữ liệu' },
  'Settings at other companies that collect data about you. Each link goes to the company’s own page.': {
    es: 'Ajustes en otras empresas que recopilan datos sobre usted. Cada enlace lleva a la página de la propia empresa.',
    vi: 'Các cài đặt tại những công ty khác thu thập dữ liệu về bạn. Mỗi đường liên kết dẫn đến trang của chính công ty đó.',
  },
  'LG and Roku TV settings, Meta (Facebook) ad settings and Bing’s removal request could not be checked automatically, so we do not list them here.': {
    es: 'No pudimos comprobar de forma automática los ajustes de los televisores LG y Roku, los ajustes de anuncios de Meta (Facebook) ni la solicitud de eliminación de Bing, así que no los incluimos aquí.',
    vi: 'Chúng tôi không kiểm tra tự động được cài đặt TV của LG và Roku, cài đặt quảng cáo của Meta (Facebook) và yêu cầu gỡ bỏ của Bing, nên không liệt kê ở đây.',
  },
  '<dt>Go to</dt><dd>{links}</dd>': {
    es: '<dt>Dónde</dt><dd>{links}</dd>',
    vi: '<dt>Truy cập</dt><dd>{links}</dd>',
  },
  '<dt>Email</dt><dd>{link}</dd>': {
    es: '<dt>Correo</dt><dd>{link}</dd>',
    vi: '<dt>Email</dt><dd>{link}</dd>',
  },
  // Google entries
  'Blur your house on Google Maps (Street View)': {
    es: 'Difuminar su casa en Google Maps (Street View)',
    vi: 'Làm mờ nhà bạn trên Google Maps (Street View)',
  },
  'Open Street View of your home in Google Maps, click “Report a Problem” in the bottom right and choose your home. Google asks for proof of address, such as a utility bill with your name blacked out, reviews the request, and the blur is permanent.': {
    es: 'Abra la vista de Street View de su casa en Google Maps, haga clic en la opción para informar de un problema, abajo a la derecha, y elija su casa. Google pide un comprobante de domicilio, como una factura de servicios con su nombre tachado, revisa la solicitud, y el difuminado es permanente.',
    vi: 'Mở hình ảnh Street View của nhà bạn trên Google Maps, bấm vào mục báo cáo sự cố ở góc dưới bên phải và chọn nhà của bạn. Google yêu cầu giấy tờ chứng minh địa chỉ, chẳng hạn hóa đơn điện nước đã che tên bạn, sẽ xem xét yêu cầu, và phần làm mờ là vĩnh viễn.',
  },
  'Google Maps Help: Blur Street View imagery': {
    es: 'Ayuda de Google Maps: difuminar imágenes de Street View',
    vi: 'Trợ giúp Google Maps: làm mờ hình ảnh Street View',
  },
  'Find your address or phone number in Search': {
    es: 'Encontrar su dirección o su teléfono en el buscador',
    vi: 'Tìm địa chỉ hoặc số điện thoại của bạn trên Google Tìm kiếm',
  },
  'Google’s Results about you tool finds Search results that show your home address, phone number or email address, and lets you ask for each one to be removed. It can also alert you when new ones appear.': {
    es: 'La herramienta Results about you de Google encuentra resultados de búsqueda que muestran su dirección, su teléfono o su correo electrónico, y le permite pedir que se quite cada uno. También puede avisarle cuando aparezcan otros nuevos.',
    vi: 'Công cụ Results about you của Google tìm các kết quả tìm kiếm có địa chỉ nhà, số điện thoại hoặc địa chỉ email của bạn, và cho phép bạn yêu cầu gỡ từng kết quả. Công cụ cũng có thể báo cho bạn khi có kết quả mới.',
  },
  'Results about you': { es: 'Results about you (resultados sobre usted)', vi: 'Results about you (kết quả về bạn)' },
  'Remove other personal information from Search': {
    es: 'Quitar otros datos personales del buscador',
    vi: 'Gỡ các thông tin cá nhân khác khỏi Google Tìm kiếm',
  },
  'For ID numbers, bank or card numbers, images of your signature or ID, private records or doxxing, send Google a removal request with the URL of each page. Google can only remove the result from Search; the page stays on the website.': {
    es: 'Para números de identificación, números de cuenta bancaria o de tarjeta, imágenes de su firma o de su identificación, registros privados o doxxing (publicar sus datos para hacerle daño), envíe a Google una solicitud de eliminación con la URL de cada página. Google solo puede quitar el resultado del buscador; la página sigue en el sitio web.',
    vi: 'Với số giấy tờ tùy thân, số tài khoản ngân hàng hoặc số thẻ, hình chữ ký hay giấy tờ tùy thân, hồ sơ riêng tư hoặc doxxing (công khai thông tin của bạn để gây hại), hãy gửi Google yêu cầu gỡ bỏ kèm URL của từng trang. Google chỉ gỡ được kết quả khỏi Google Tìm kiếm; trang đó vẫn còn trên trang web.',
  },
  'Google Search Help: Remove my private info': {
    es: 'Ayuda de la Búsqueda de Google: quitar mi información privada',
    vi: 'Trợ giúp Google Tìm kiếm: gỡ thông tin riêng tư của tôi',
  },
  'Turn off personalized ads': { es: 'Desactivar los anuncios personalizados', vi: 'Tắt quảng cáo được cá nhân hóa' },
  'Sign in, open My Ad Center and select Off next to Personalized ads. Google still shows ads, but they are no longer based on your saved info and activity.': {
    es: 'Inicie sesión, abra My Ad Center (Mi Centro de anuncios) y desactive la opción de anuncios personalizados. Google sigue mostrando anuncios, pero ya no se basan en su información y su actividad guardadas.',
    vi: 'Đăng nhập, mở My Ad Center (Trung tâm quảng cáo của tôi) và tắt mục quảng cáo được cá nhân hóa. Google vẫn hiển thị quảng cáo, nhưng không còn dựa trên thông tin và hoạt động đã lưu của bạn.',
  },
  'My Ad Center': { es: 'My Ad Center (Mi Centro de anuncios)', vi: 'My Ad Center (Trung tâm quảng cáo của tôi)' },
  'Turn off Web & App Activity, or auto-delete it': {
    es: 'Desactivar la Actividad en la Web y en Aplicaciones, o borrarla automáticamente',
    vi: 'Tắt Hoạt động trên web và ứng dụng, hoặc tự động xóa',
  },
  'In your Google Account’s activity controls, turn off Web & App Activity, and choose to delete past activity at the same time if you want. Or keep it on and set Auto-delete, so Google only keeps activity for the period you pick.': {
    es: 'En los controles de actividad de su cuenta de Google, desactive la Actividad en la Web y en Aplicaciones y, si quiere, elija borrar al mismo tiempo la actividad anterior. O déjela activada y configure el borrado automático, para que Google solo guarde la actividad durante el plazo que usted elija.',
    vi: 'Trong mục kiểm soát hoạt động của Tài khoản Google, tắt Hoạt động trên web và ứng dụng, và nếu muốn thì chọn xóa luôn hoạt động trước đây. Hoặc giữ nguyên và bật tự động xóa, để Google chỉ giữ hoạt động trong khoảng thời gian bạn chọn.',
  },
  'Google activity controls': { es: 'Controles de actividad de Google', vi: 'Kiểm soát hoạt động của Google' },
  'Pause YouTube watch and search history': {
    es: 'Pausar el historial de reproducciones y de búsquedas de YouTube',
    vi: 'Tạm dừng nhật ký xem và nhật ký tìm kiếm trên YouTube',
  },
  'In My Activity, open YouTube History, go to the Controls tab and turn it off. Videos you watch and your YouTube searches stop being saved; past history can be deleted on the same page.': {
    es: 'En Mi actividad, abra el historial de YouTube, vaya a la pestaña de controles y desactívelo. Dejan de guardarse los videos que ve y sus búsquedas en YouTube; el historial anterior se puede borrar en la misma página.',
    vi: 'Trong Hoạt động của tôi, mở nhật ký YouTube, vào thẻ kiểm soát và tắt đi. Video bạn xem và nội dung bạn tìm trên YouTube sẽ không còn được lưu; nhật ký cũ có thể xóa ngay trên trang đó.',
  },
  'YouTube History in My Activity': { es: 'Historial de YouTube en Mi actividad', vi: 'Nhật ký YouTube trong Hoạt động của tôi' },
  'Turn off Google Maps Timeline': { es: 'Desactivar Cronología de Google Maps', vi: 'Tắt Dòng thời gian của Google Maps' },
  'Timeline saves the places you go and the routes you take. Turn it off in the Timeline section of your Google Account, and delete past visits in the Google Maps app on each phone, because the data is kept on the phone.': {
    es: 'Cronología guarda los lugares a los que va y las rutas que toma. Desactívela en la sección Cronología de su cuenta de Google y borre las visitas anteriores en la app de Google Maps de cada teléfono, porque los datos se guardan en el teléfono.',
    vi: 'Dòng thời gian lưu những nơi bạn đến và các tuyến đường bạn đi. Tắt tính năng này trong mục Dòng thời gian của Tài khoản Google, và xóa các lượt ghé thăm cũ trong ứng dụng Google Maps trên từng điện thoại, vì dữ liệu được lưu trên điện thoại.',
  },
  'Timeline settings in your Google Account': {
    es: 'Ajustes de Cronología en su cuenta de Google',
    vi: 'Cài đặt Dòng thời gian trong Tài khoản Google',
  },
  // More places to opt out
  'Credit freeze': { es: 'Congelación del crédito', vi: 'Đóng băng hồ sơ tín dụng' },
  'A freeze is not an opt-out, it is a lock: nobody, you included, can open new credit in your name until you lift it yourself, which you do before you apply for credit. The FTC says it costs nothing to place or lift; freeze at each bureau separately, including TransUnion at transunion.com (its site blocked our automated checks, so we do not link it).': {
    es: 'Una congelación no es darse de baja, es un candado: nadie, ni siquiera usted, puede abrir un crédito nuevo a su nombre hasta que usted mismo la levante, cosa que hace antes de solicitar un crédito. Según la FTC, ponerla y levantarla no cuesta nada; congele su expediente en cada agencia por separado, incluida TransUnion en transunion.com (su sitio bloqueó nuestras comprobaciones automáticas, así que no lo enlazamos).',
    vi: 'Đóng băng không phải là từ chối chia sẻ dữ liệu, mà là khóa lại: không ai, kể cả bạn, mở được khoản tín dụng mới đứng tên bạn cho đến khi chính bạn mở khóa, việc bạn làm trước khi xin vay hay mở thẻ. Theo FTC, đóng băng và mở khóa đều không mất phí; hãy đóng băng riêng ở từng công ty báo cáo tín dụng, kể cả TransUnion tại transunion.com (trang này chặn việc kiểm tra tự động của chúng tôi, nên chúng tôi không đặt liên kết).',
  },
  'Equifax security freeze': { es: 'Congelación de seguridad en Equifax', vi: 'Đóng băng bảo mật tại Equifax' },
  'Experian security freeze': { es: 'Congelación de seguridad en Experian', vi: 'Đóng băng bảo mật tại Experian' },
  'Innovis security freeze': { es: 'Congelación de seguridad en Innovis', vi: 'Đóng băng bảo mật tại Innovis' },
  'FTC: Credit freezes and fraud alerts': {
    es: 'FTC: congelaciones de crédito y alertas de fraude',
    vi: 'FTC: đóng băng tín dụng và cảnh báo gian lận',
  },
  'Phone carriers': { es: 'Compañías telefónicas', vi: 'Nhà mạng điện thoại' },
  'Verizon’s Custom Experience (based on the websites and apps you use) and AT&T’s Personalized ad program are on unless you opt out in your account’s privacy settings; Verizon also takes opt-outs at 866-211-0874 (press 2). T-Mobile’s Privacy Dashboard lets you tell it to stop using your data for advertising.': {
    es: 'Custom Experience de Verizon (basado en los sitios web y las apps que usa) y el programa de anuncios Personalized de AT&T están activados a menos que se dé de baja en los ajustes de privacidad de su cuenta; Verizon también acepta bajas en el 866-211-0874 (marque 2). El Privacy Dashboard (panel de privacidad) de T-Mobile le permite pedir que dejen de usar sus datos para publicidad.',
    vi: 'Chương trình Custom Experience của Verizon (dựa trên các trang web và ứng dụng bạn dùng) và chương trình quảng cáo Personalized của AT&T luôn bật trừ khi bạn từ chối trong cài đặt quyền riêng tư của tài khoản; Verizon cũng nhận yêu cầu từ chối qua số 866-211-0874 (bấm phím 2). Privacy Dashboard (bảng quyền riêng tư) của T-Mobile cho phép bạn yêu cầu ngừng dùng dữ liệu của bạn cho quảng cáo.',
  },
  'Verizon Custom Experience FAQ (how to opt out)': {
    es: 'Preguntas frecuentes de Verizon Custom Experience (cómo darse de baja)',
    vi: 'Câu hỏi thường gặp về Verizon Custom Experience (cách từ chối)',
  },
  'AT&T privacy choices (sign in)': {
    es: 'Opciones de privacidad de AT&T (requiere iniciar sesión)',
    vi: 'Lựa chọn quyền riêng tư của AT&T (cần đăng nhập)',
  },
  'T-Mobile Privacy Dashboard': { es: 'Privacy Dashboard de T-Mobile', vi: 'Privacy Dashboard của T-Mobile' },
  'Samsung smart TVs': { es: 'Televisores inteligentes Samsung', vi: 'TV thông minh Samsung' },
  'If you agreed to Viewing Information Services when you set up the TV, it uses Automatic Content Recognition to record what you watch. You can turn it off at any time in the TV’s Settings menu.': {
    es: 'Si aceptó Viewing Information Services (servicios de información de visualización) al configurar el televisor, este usa Automatic Content Recognition (reconocimiento automático de contenido) para registrar lo que ve. Puede desactivarlo en cualquier momento en el menú de ajustes del televisor.',
    vi: 'Nếu bạn đã đồng ý với Viewing Information Services (dịch vụ thông tin xem) khi cài đặt TV, TV sẽ dùng Automatic Content Recognition (nhận dạng nội dung tự động) để ghi lại những gì bạn xem. Bạn có thể tắt tính năng này bất cứ lúc nào trong menu cài đặt của TV.',
  },
  'Samsung: Automatic Content Recognition': {
    es: 'Samsung: reconocimiento automático de contenido',
    vi: 'Samsung: nhận dạng nội dung tự động',
  },
  'Microsoft and Bing ads': { es: 'Anuncios de Microsoft y Bing', vi: 'Quảng cáo của Microsoft và Bing' },
  'Sign in to your Microsoft account’s ad settings and turn off personalized ads. Microsoft still shows ads, but not ones based on the searches, purchases and other activity it has collected.': {
    es: 'Inicie sesión en los ajustes de anuncios de su cuenta de Microsoft y desactive los anuncios personalizados. Microsoft sigue mostrando anuncios, pero no basados en las búsquedas, compras y demás actividad que ha recopilado.',
    vi: 'Đăng nhập vào cài đặt quảng cáo của tài khoản Microsoft và tắt quảng cáo được cá nhân hóa. Microsoft vẫn hiển thị quảng cáo, nhưng không dựa trên các lượt tìm kiếm, giao dịch mua và hoạt động khác mà họ đã thu thập.',
  },
  'Microsoft ad settings': { es: 'Ajustes de anuncios de Microsoft', vi: 'Cài đặt quảng cáo của Microsoft' },
  'Blur your house in Apple Maps (Look Around)': {
    es: 'Difuminar su casa en Apple Maps (Look Around)',
    vi: 'Làm mờ nhà bạn trên Apple Maps (Look Around)',
  },
  'Apple blurs faces and license plates in Look Around. To ask Apple to blur your house too, email the address on its image collection page.': {
    es: 'Apple difumina las caras y las placas de los vehículos en Look Around. Para pedir que también difumine su casa, escriba a la dirección de correo que aparece en su página sobre la recopilación de imágenes.',
    vi: 'Apple làm mờ khuôn mặt và biển số xe trong Look Around. Để yêu cầu Apple làm mờ cả nhà bạn, hãy gửi email đến địa chỉ ghi trên trang thu thập hình ảnh của họ.',
  },
  'Apple Maps Image Collection': {
    es: 'Recopilación de imágenes de Apple Maps',
    vi: 'Thu thập hình ảnh của Apple Maps',
  },
  'Payments set to Public or Friends show the names and the note. In the app, go to the Me tab, tap the Settings gear, then Privacy, and choose Private; the same menu can hide all your past payments.': {
    es: 'Los pagos marcados como públicos o para amigos muestran los nombres y la nota. En la app, vaya a la pestaña Me (Yo), toque el engranaje de ajustes, luego Privacy (Privacidad), y elija Private (Privado); en el mismo menú puede ocultar todos sus pagos anteriores.',
    vi: 'Các khoản thanh toán để chế độ công khai hoặc bạn bè sẽ hiện tên và ghi chú. Trong ứng dụng, vào thẻ Me (Tôi), chạm vào biểu tượng bánh răng cài đặt, rồi Privacy (Quyền riêng tư), và chọn Private (Riêng tư); cũng trong menu đó bạn có thể ẩn mọi khoản thanh toán trước đây.',
  },
  Venmo: { es: 'Venmo', vi: 'Venmo' },
  Strava: { es: 'Strava', vi: 'Strava' },
  'Venmo Help: Changing payment privacy': {
    es: 'Ayuda de Venmo: cambiar la privacidad de los pagos',
    vi: 'Trợ giúp Venmo: thay đổi quyền riêng tư của khoản thanh toán',
  },
  'In Settings, Privacy Controls, Map Visibility, enter your home address to hide the part of any activity that starts or ends near it, or hide the start and end of every activity. Strava warns this does not make a hidden place impossible to work out.': {
    es: 'En Settings (Ajustes), Privacy Controls (Controles de privacidad), Map Visibility (Visibilidad del mapa), escriba la dirección de su casa para ocultar el tramo de cualquier actividad que empiece o termine cerca, u oculte el inicio y el final de todas las actividades. Strava advierte que esto no impide del todo que alguien deduzca un lugar oculto.',
    vi: 'Trong Settings (Cài đặt), Privacy Controls (Kiểm soát quyền riêng tư), Map Visibility (Hiển thị bản đồ), nhập địa chỉ nhà để ẩn đoạn của mọi hoạt động bắt đầu hoặc kết thúc gần đó, hoặc ẩn điểm đầu và điểm cuối của mọi hoạt động. Strava lưu ý rằng việc này không khiến người khác hoàn toàn không thể đoán ra nơi đã ẩn.',
  },
  'Strava Support: Edit your map visibility': {
    es: 'Ayuda de Strava: editar la visibilidad del mapa',
    vi: 'Hỗ trợ Strava: chỉnh hiển thị bản đồ',
  },

  // ---- /scams ----
  'Common scams, by medium': { es: 'Estafas comunes, por medio', vi: 'Các kiểu lừa đảo phổ biến, theo kênh' },
  'The same few tricks show up again and again: something urgent, a link or number to use right now, and a request for money, a code or a login. Here is what the common ones look like on each channel.': {
    es: 'Los mismos pocos trucos aparecen una y otra vez: algo urgente, un enlace o un número que hay que usar ya, y una petición de dinero, de un código o de sus datos de acceso. Así se ven los más comunes en cada canal.',
    vi: 'Vẫn chỉ vài mánh khóe xuất hiện lặp đi lặp lại: một chuyện khẩn cấp, một đường liên kết hay số điện thoại cần dùng ngay, và lời đòi tiền, mã xác minh hoặc thông tin đăng nhập. Dưới đây là cách các chiêu phổ biến xuất hiện trên từng kênh.',
  },
  'Do not click the link or call the number in the message. Go to the official site or number yourself, typed in or taken from the back of your card or a statement.': {
    es: 'No haga clic en el enlace ni llame al número del mensaje. Vaya usted mismo al sitio o número oficial, escribiéndolo a mano o tomándolo del reverso de su tarjeta o de un estado de cuenta.',
    vi: 'Đừng bấm vào đường liên kết hay gọi số điện thoại trong tin nhắn. Hãy tự vào trang web hoặc gọi số chính thức, bằng cách tự gõ địa chỉ hoặc lấy số ở mặt sau thẻ hay trên bản sao kê.',
  },
  'Text messages': { es: 'Mensajes de texto', vi: 'Tin nhắn văn bản' },
  '<strong>Package or delivery.</strong> “Your parcel is held” or “we could not deliver,” with a link to pay a small fee or update your address. Check tracking on the carrier’s own site, not through the link.': {
    es: '<strong>Paquete o entrega.</strong> “Su paquete está retenido” o “no pudimos entregarlo”, con un enlace para pagar una pequeña tarifa o actualizar su dirección. Consulte el rastreo en el sitio de la propia empresa de envíos, no a través del enlace.',
    vi: '<strong>Bưu kiện hoặc giao hàng.</strong> “Bưu kiện của bạn đang bị giữ” hoặc “chúng tôi không giao được hàng”, kèm đường liên kết để trả một khoản phí nhỏ hoặc cập nhật địa chỉ. Hãy kiểm tra tình trạng đơn hàng trên trang web chính thức của hãng vận chuyển, không qua đường liên kết đó.',
  },
  '<strong>Bank or fraud alert.</strong> A text says there is suspicious activity and asks you to click a link or call a number. The link leads to a fake login page; the number reaches the scammer.': {
    es: '<strong>Alerta del banco o de fraude.</strong> Un mensaje dice que hay actividad sospechosa y le pide que haga clic en un enlace o llame a un número. El enlace lleva a una página de inicio de sesión falsa; el número lo comunica con el estafador.',
    vi: '<strong>Cảnh báo từ ngân hàng hoặc cảnh báo gian lận.</strong> Một tin nhắn báo có hoạt động đáng ngờ và yêu cầu bạn bấm vào đường liên kết hoặc gọi một số điện thoại. Đường liên kết dẫn đến trang đăng nhập giả; số điện thoại thì nối máy với kẻ lừa đảo.',
  },
  '<strong>Unpaid toll.</strong> A text claims you owe a toll-road fee and threatens penalties unless you pay through a link. Check your toll account on the agency’s own site instead.': {
    es: '<strong>Peaje sin pagar.</strong> Un mensaje afirma que usted debe un peaje y amenaza con multas si no paga a través de un enlace. Revise mejor su cuenta de peajes en el sitio de la propia agencia.',
    vi: '<strong>Phí cầu đường chưa trả.</strong> Một tin nhắn nói bạn còn nợ phí đường cao tốc và đe dọa phạt nếu bạn không trả tiền qua đường liên kết. Thay vào đó, hãy kiểm tra tài khoản phí cầu đường trên trang web chính thức của cơ quan quản lý.',
  },
  '<strong>Job offer or wrong number.</strong> An unsolicited job offer with easy pay, or a friendly “wrong number” chat that turns into an investment or crypto tip. Both end with a request for money or personal details.': {
    es: '<strong>Oferta de trabajo o número equivocado.</strong> Una oferta de trabajo no solicitada con dinero fácil, o una conversación amistosa por un “número equivocado” que termina en un consejo de inversión o de criptomonedas. Ambas acaban con una petición de dinero o de datos personales.',
    vi: '<strong>Lời mời việc làm hoặc nhắn nhầm số.</strong> Một lời mời việc làm không mong muốn với thu nhập dễ dàng, hoặc một cuộc trò chuyện thân thiện do “nhắn nhầm số” rồi chuyển sang gợi ý đầu tư hay tiền mã hóa. Cả hai đều kết thúc bằng việc đòi tiền hoặc thông tin cá nhân.',
  },
  '<strong>What to do:</strong> {selfServe} Forward the text to <strong>7726</strong> (SPAM) and <a href="/report">file a report here</a>.': {
    es: '<strong>Qué hacer:</strong> {selfServe} Reenvíe el mensaje al <strong>7726</strong> (SPAM) y <a href="/report">envíe un reporte aquí</a>.',
    vi: '<strong>Nên làm gì:</strong> {selfServe} Chuyển tiếp tin nhắn đến <strong>7726</strong> (SPAM) và <a href="/report">gửi báo cáo tại đây</a>.',
  },
  '<h2 id="email">Email</h2>': {
    es: '<h2 id="email">Correo electrónico</h2>',
    vi: '<h2 id="email">Email</h2>',
  },
  '<strong>Phishing.</strong> A fake invoice, an account warning or a password-reset email you did not ask for, with a link to a page that looks like the real login. Check the sender’s actual address and do not sign in from the link.': {
    es: '<strong>Phishing (suplantación de identidad).</strong> Una factura falsa, un aviso sobre su cuenta o un correo para restablecer una contraseña que usted no pidió, con un enlace a una página que se parece al inicio de sesión real. Revise la dirección real del remitente y no inicie sesión desde el enlace.',
    vi: '<strong>Lừa đảo giả mạo (phishing).</strong> Một hóa đơn giả, một cảnh báo về tài khoản hoặc một email đặt lại mật khẩu mà bạn không hề yêu cầu, kèm đường liên kết đến trang trông giống trang đăng nhập thật. Hãy kiểm tra địa chỉ thật của người gửi và đừng đăng nhập từ đường liên kết đó.',
  },
  '<strong>Refund or reimbursement.</strong> An email says you are owed a refund, or were charged for something and should call to cancel. The “agent” then asks for remote access, bank details or for you to send back an “overpayment.”': {
    es: '<strong>Reembolso o devolución.</strong> Un correo dice que le deben un reembolso, o que le cobraron algo y debe llamar para cancelarlo. Luego el “agente” le pide acceso remoto, sus datos bancarios o que usted devuelva un “pago en exceso”.',
    vi: '<strong>Hoàn tiền hoặc bồi hoàn.</strong> Một email nói bạn được hoàn tiền, hoặc bạn đã bị tính phí cho thứ gì đó và cần gọi điện để hủy. Sau đó “nhân viên” đòi truy cập từ xa, thông tin ngân hàng, hoặc yêu cầu bạn gửi lại “khoản tiền trả thừa”.',
  },
  '<strong>What to do:</strong> {selfServe} Use your email app’s report-phishing or spam button.': {
    es: '<strong>Qué hacer:</strong> {selfServe} Use el botón para reportar phishing o spam de su aplicación de correo.',
    vi: '<strong>Nên làm gì:</strong> {selfServe} Dùng nút báo cáo lừa đảo giả mạo hoặc thư rác trong ứng dụng email của bạn.',
  },
  'Phone calls': { es: 'Llamadas telefónicas', vi: 'Cuộc gọi điện thoại' },
  '<strong>Bank or tech-support caller.</strong> Someone claiming to be your bank, a tech company or its fraud team asks you to read back a code sent to your phone, or to install software so they can “fix” something. Those codes and that access let them into your accounts.': {
    es: '<strong>Llamada del banco o de soporte técnico.</strong> Alguien que dice ser de su banco, de una empresa de tecnología o de su equipo antifraude le pide que le lea un código enviado a su teléfono, o que instale un programa para “arreglar” algo. Esos códigos y ese acceso les permiten entrar en sus cuentas.',
    vi: '<strong>Cuộc gọi tự xưng ngân hàng hoặc hỗ trợ kỹ thuật.</strong> Một người tự nhận là ngân hàng của bạn, một công ty công nghệ hay bộ phận chống gian lận của họ, yêu cầu bạn đọc lại mã được gửi tới điện thoại, hoặc cài phần mềm để họ “sửa” một lỗi nào đó. Những mã đó và quyền truy cập đó cho phép họ vào tài khoản của bạn.',
  },
  '<strong>Robocall “press 1.”</strong> A recorded message tells you to press a number to speak to someone or be removed from a list. Hang up without pressing anything; pressing a number can lead to more calls.': {
    es: '<strong>Llamada automática “oprima 1”.</strong> Un mensaje grabado le dice que oprima un número para hablar con alguien o para que lo saquen de una lista. Cuelgue sin oprimir nada; oprimir un número puede traerle más llamadas.',
    vi: '<strong>Cuộc gọi tự động “bấm phím 1”.</strong> Một tin nhắn ghi âm bảo bạn bấm một phím để nói chuyện với ai đó hoặc để được xóa khỏi danh sách. Hãy cúp máy mà không bấm gì; bấm phím có thể khiến bạn nhận thêm nhiều cuộc gọi.',
  },
  '<strong>Family emergency.</strong> A caller says a grandchild or relative is in trouble and needs money now, often asking you to keep it secret. Hang up and call that person, or another relative, on a number you already know.': {
    es: '<strong>Emergencia familiar.</strong> Alguien llama y dice que un nieto o un familiar está en problemas y necesita dinero ya, y a menudo le pide que lo mantenga en secreto. Cuelgue y llame a esa persona, o a otro familiar, a un número que usted ya conozca.',
    vi: '<strong>Người thân gặp chuyện khẩn cấp.</strong> Người gọi nói cháu hoặc người thân của bạn đang gặp rắc rối và cần tiền ngay, thường dặn bạn giữ bí mật. Hãy cúp máy và gọi cho chính người đó, hoặc một người thân khác, bằng số điện thoại bạn đã biết.',
  },
  '<strong>What to do:</strong> Hang up. Call back on the official number, not one the caller gave you. Never share a one-time code over the phone.': {
    es: '<strong>Qué hacer:</strong> Cuelgue. Vuelva a llamar al número oficial, no al que le dio quien llamó. Nunca comparta un código de un solo uso por teléfono.',
    vi: '<strong>Nên làm gì:</strong> Cúp máy. Gọi lại bằng số chính thức, không phải số mà người gọi đưa cho bạn. Không bao giờ chia sẻ mã dùng một lần qua điện thoại.',
  },
  'Social media and messaging apps': { es: 'Redes sociales y aplicaciones de mensajería', vi: 'Mạng xã hội và ứng dụng nhắn tin' },
  '<strong>Romance or investment.</strong> A new online friend or match builds trust over weeks, then needs money or wants you on an investment platform they recommend. Anyone you have not met in person who asks for money or crypto is a red flag.': {
    es: '<strong>Romance o inversión.</strong> Un nuevo amigo o pareja en línea se gana su confianza durante semanas y luego necesita dinero o quiere que usted entre en una plataforma de inversión que le recomienda. Que alguien a quien no conoce en persona le pida dinero o criptomonedas es una señal de alerta.',
    vi: '<strong>Hẹn hò hoặc đầu tư.</strong> Một người bạn hay người hẹn hò mới quen trên mạng tạo dựng lòng tin trong nhiều tuần, rồi cần tiền hoặc muốn bạn tham gia một nền tảng đầu tư do họ giới thiệu. Bất kỳ ai bạn chưa gặp trực tiếp mà hỏi xin tiền hay tiền mã hóa đều là dấu hiệu đáng ngờ.',
  },
  '<strong>Fake marketplace listing.</strong> A great deal on an item or rental, with pressure to pay a deposit before you see it, often by gift card, wire or payment app. Meet in person and see the item before paying.': {
    es: '<strong>Anuncio falso en un mercado en línea.</strong> Una gran oferta de un artículo o un alquiler, con presión para pagar un depósito antes de verlo, a menudo con tarjeta de regalo, transferencia o aplicación de pagos. Reúnase en persona y vea el artículo antes de pagar.',
    vi: '<strong>Tin rao bán giả trên chợ trực tuyến.</strong> Một món hàng hoặc chỗ thuê giá cực hời, kèm áp lực phải đặt cọc trước khi xem, thường bằng thẻ quà tặng, chuyển khoản hoặc ứng dụng chuyển tiền. Hãy gặp trực tiếp và xem món hàng trước khi trả tiền.',
  },
  '<strong>Hacked friend’s account.</strong> A message from a friend asks for money or for a code that was “sent to your phone by mistake.” Contact the friend another way before doing anything.': {
    es: '<strong>Cuenta de un amigo hackeada.</strong> Un mensaje de un amigo le pide dinero o un código que le “enviaron a su teléfono por error”. Comuníquese con su amigo por otra vía antes de hacer nada.',
    vi: '<strong>Tài khoản của bạn bè bị chiếm.</strong> Một tin nhắn từ bạn bè xin tiền hoặc xin mã mà họ nói đã “gửi nhầm vào điện thoại của bạn”. Hãy liên lạc với người bạn đó bằng cách khác trước khi làm bất cứ điều gì.',
  },
  '<strong>Giveaway or celebrity endorsement.</strong> A post or ad promises a prize or uses a famous name to promote an investment, then asks for a fee, your login or crypto. Real giveaways do not ask you to pay.': {
    es: '<strong>Sorteo o recomendación de una celebridad.</strong> Una publicación o un anuncio promete un premio o usa un nombre famoso para promocionar una inversión, y luego pide una tarifa, sus datos de acceso o criptomonedas. Los sorteos reales no le piden que pague.',
    vi: '<strong>Tặng quà hoặc người nổi tiếng quảng bá.</strong> Một bài đăng hay quảng cáo hứa hẹn giải thưởng hoặc mượn tên người nổi tiếng để quảng bá một khoản đầu tư, rồi đòi phí, thông tin đăng nhập hoặc tiền mã hóa. Chương trình tặng quà thật không bắt bạn trả tiền.',
  },
  '<strong>What to do:</strong> {selfServe} Report the account or post in the app.': {
    es: '<strong>Qué hacer:</strong> {selfServe} Reporte la cuenta o la publicación en la aplicación.',
    vi: '<strong>Nên làm gì:</strong> {selfServe} Báo cáo tài khoản hoặc bài đăng đó ngay trong ứng dụng.',
  },
  'Paper mail': { es: 'Correo en papel', vi: 'Thư giấy' },
  '<strong>Fake check.</strong> A check arrives with instructions to deposit it and send part of the money back or on to someone else. The check can bounce days later, and you owe the bank the full amount.': {
    es: '<strong>Cheque falso.</strong> Llega un cheque con instrucciones de depositarlo y devolver parte del dinero o enviárselo a otra persona. El cheque puede rebotar días después, y usted le debe al banco el monto total.',
    vi: '<strong>Séc giả.</strong> Một tấm séc được gửi đến kèm hướng dẫn nộp séc vào ngân hàng rồi chuyển lại một phần tiền hoặc chuyển tiếp cho người khác. Vài ngày sau séc có thể bị trả về, và bạn sẽ nợ ngân hàng cả số tiền đó.',
  },
  '<strong>Sweepstakes or lottery win.</strong> A letter says you won but must pay a fee or taxes up front to collect. Legitimate sweepstakes do not make you pay to receive a prize.': {
    es: '<strong>Premio de sorteo o lotería.</strong> Una carta dice que usted ganó, pero que debe pagar por adelantado una tarifa o impuestos para cobrar. Los sorteos legítimos no le hacen pagar para recibir un premio.',
    vi: '<strong>Trúng thưởng hoặc trúng xổ số.</strong> Một lá thư báo bạn đã trúng thưởng nhưng phải trả trước một khoản phí hoặc thuế mới nhận được. Các chương trình rút thăm hợp pháp không bắt bạn trả tiền để nhận giải.',
  },
  '<strong>Government impersonation.</strong> A letter that looks official demands payment or personal details, sometimes by gift card, wire or crypto. Look up the agency’s number yourself and call to confirm.': {
    es: '<strong>Suplantación del gobierno.</strong> Una carta de aspecto oficial exige un pago o datos personales, a veces con tarjeta de regalo, transferencia o criptomonedas. Busque usted mismo el número de la agencia y llame para confirmarlo.',
    vi: '<strong>Mạo danh cơ quan nhà nước.</strong> Một lá thư trông như thư chính thức đòi trả tiền hoặc thông tin cá nhân, đôi khi bằng thẻ quà tặng, chuyển khoản hoặc tiền mã hóa. Hãy tự tra số điện thoại của cơ quan đó và gọi để xác nhận.',
  },
  '<strong>What to do:</strong> Do not call the number or visit the site printed on the letter. Look up the agency or company yourself. For ordinary junk mail, see <a href="/junk-mail">how to cut down junk mail</a>.': {
    es: '<strong>Qué hacer:</strong> No llame al número ni visite el sitio impreso en la carta. Busque usted mismo a la agencia o empresa. Para el correo basura común, vea <a href="/junk-mail">cómo reducir el correo basura</a>.',
    vi: '<strong>Nên làm gì:</strong> Đừng gọi số điện thoại hay vào trang web in trên thư. Hãy tự tra thông tin của cơ quan hoặc công ty đó. Với thư quảng cáo rác thông thường, xem <a href="/junk-mail">cách giảm thư quảng cáo rác</a>.',
  },
  'QR codes and links': { es: 'Códigos QR y enlaces', vi: 'Mã QR và đường liên kết' },
  '<strong>Parking meters and signs.</strong> A sticker with a QR code placed over the real one leads to a fake payment page. Pay through the city’s official app or the meter itself.': {
    es: '<strong>Parquímetros y letreros.</strong> Una calcomanía con un código QR pegada encima del verdadero lleva a una página de pago falsa. Pague con la aplicación oficial de la ciudad o en el propio parquímetro.',
    vi: '<strong>Đồng hồ đỗ xe và biển báo.</strong> Một miếng dán có mã QR được dán đè lên mã thật sẽ dẫn đến trang trả tiền giả. Hãy trả tiền qua ứng dụng chính thức của thành phố hoặc ngay tại đồng hồ đỗ xe.',
  },
  '<strong>QR codes in mail or email.</strong> A code that opens a login or payment page. A code hides the web address until you open it. Treat it like any unexpected link.': {
    es: '<strong>Códigos QR en el correo postal o electrónico.</strong> Un código que abre una página de inicio de sesión o de pago. Un código oculta la dirección web hasta que usted lo abre. Trátelo como cualquier enlace inesperado.',
    vi: '<strong>Mã QR trong thư giấy hoặc email.</strong> Một mã mở ra trang đăng nhập hoặc trang trả tiền. Mã QR che giấu địa chỉ web cho đến khi bạn mở nó. Hãy cảnh giác như với bất kỳ đường liên kết bất ngờ nào.',
  },
  '<strong>What to do:</strong> Before entering anything, check the web address your phone shows. When in doubt, close it and go to the official site yourself.': {
    es: '<strong>Qué hacer:</strong> Antes de escribir nada, revise la dirección web que muestra su teléfono. Si tiene dudas, ciérrela y vaya usted mismo al sitio oficial.',
    vi: '<strong>Nên làm gì:</strong> Trước khi nhập bất cứ thông tin gì, hãy kiểm tra địa chỉ web mà điện thoại hiển thị. Nếu còn nghi ngờ, hãy đóng trang đó và tự vào trang web chính thức.',
  },
  'If you already responded': { es: 'Si ya respondió', vi: 'Nếu bạn đã lỡ phản hồi' },
  'Contact your bank or card company using the number on your card, change any password you entered, and report it to the <a href="https://reportfraud.ftc.gov/">FTC</a>. If scammers seem to know your address or relatives’ names, people-search sites are a common source; see <a href="/opt-out">how to opt out of them</a>.': {
    es: 'Comuníquese con su banco o con la compañía de su tarjeta usando el número que aparece en la tarjeta, cambie cualquier contraseña que haya escrito y repórtelo a la <a href="https://reportfraud.ftc.gov/">FTC</a>. Si los estafadores parecen conocer su dirección o los nombres de sus familiares, los sitios de búsqueda de personas son una fuente común; vea <a href="/opt-out">cómo darse de baja de ellos</a>.',
    vi: 'Hãy liên hệ ngân hàng hoặc công ty phát hành thẻ bằng số điện thoại in trên thẻ, đổi mọi mật khẩu bạn đã nhập, và báo cáo vụ việc cho <a href="https://reportfraud.ftc.gov/">FTC</a>. Nếu kẻ lừa đảo có vẻ biết địa chỉ hoặc tên người thân của bạn, các trang tra cứu thông tin cá nhân thường là nguồn thông tin của họ; xem <a href="/opt-out">cách gỡ tên khỏi các trang đó</a>.',
  },
  'This page collects no information. For spam texts, <a href="/report">file a report here</a> and forward the original to <strong>7726</strong>.': {
    es: 'Esta página no recopila ninguna información. Para los mensajes de spam, <a href="/report">envíe un reporte aquí</a> y reenvíe el original al <strong>7726</strong>.',
    vi: 'Trang này không thu thập thông tin nào. Với tin nhắn rác, hãy <a href="/report">gửi báo cáo tại đây</a> và chuyển tiếp tin nhắn gốc đến <strong>7726</strong>.',
  },
  'What common scams look like by text, email, phone, social media, paper mail and QR code, and what to do about each.': {
    es: 'Cómo se ven las estafas comunes por mensaje de texto, correo electrónico, teléfono, redes sociales, correo en papel y código QR, y qué hacer ante cada una.',
    vi: 'Các kiểu lừa đảo phổ biến qua tin nhắn, email, điện thoại, mạng xã hội, thư giấy và mã QR trông như thế nào, và nên làm gì với từng loại.',
  },
};

/** Proper names and other English this section keeps on translated pages (test/i18n.test.ts). */
export const KEEP_GUIDES: string[] = [
  // Laws, organizations, programs and products, named as they are in the US.
  'Fair Credit Reporting Act',
  'Association of National Advertisers',
  'Every Door Direct Mail',
  'Delete Request and Opt-out Platform',
  'California Privacy Protection Agency',
  'National Do Not Call Registry',
  'Network Advertising Initiative',
  'Digital Advertising Alliance',
  'Global Privacy Control',
  'Suppression Center',
  // Product and setting names on /opt-out, as each company labels them in English.
  'Results about you',
  // Literal labels printed on mail.
  'Current Resident',
  'Postal Customer',
];
