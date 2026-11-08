const english = new Map(Object.entries({
  'Для Gmail книга должна быть не больше 25 МБ. Скачайте EPUB и загрузите через Send to Kindle.':'Gmail attachments must be 25 MB or smaller. Download the EPUB and upload it using Send to Kindle.',
  'Письмо превышает лимит Gmail с учётом кодирования вложения. Скачайте EPUB и загрузите через Send to Kindle.':'The encoded email exceeds Gmail’s limit. Download the EPUB and upload it using Send to Kindle.',

  'Сервис занят. Повторите через несколько секунд.':'The service is busy. Please try again in a few seconds.',

  'Booktifier - Книжная мастерская':'Booktifier - Book workshop',
  'Книжная':'Book', 'мастерская':'workshop',
  'Выберите обложку, поправьте название и отправьте книгу на Kindle.':'Choose a cover, edit the title, and send your book to Kindle.',
  'Выбрать EPUB':'Choose an EPUB','или перетащите книгу в окно':'or drop your book here',
  'Редактор книги':'Book editor','Открыть другую':'Open another book','Название книги':'Book title','Авторы':'Authors',
  'Каждый автор с новой строки':'One author per line','Шаблоны обложек':'Cover designs',
  'Вернуть исходную обложку':'Restore original cover','Выбрать исходную обложку':'Use original cover','Оставить без обложки':'Keep without a cover',
  'Обложки из Open Library':'Open Library covers','Своя обложка':'Your own cover',
  'Выбрать изображение':'Choose an image','Перетащите или вставьте JPG, PNG или WebP':'Drop or paste a JPG, PNG, or WebP image',
  'Настройки':'Settings','Сохранить почту':'Save email settings','Скачать EPUB':'Download EPUB','Отправить на Kindle':'Send to Kindle',
  'Почта Kindle':'Kindle email','Почта отправителя':'Sender email','Пароль приложения Google':'Google app password',
  'Для отправки поддерживается Gmail.':'Send books from your personal Gmail account.',
  'Добавьте почту отправителя в список разрешённых адресов Amazon для Kindle.':'Add the sender to your approved email addresses in Amazon’s Kindle settings.',
  'Как получить пароль приложения':'How to get an app password',
  'Откройте пароли приложений Google':'Open Google App Passwords',
  'и войдите в аккаунт отправителя.':'and sign in with the sender’s account.',
  'Введите название Booktifier и нажмите «Создать».':'Enter Booktifier as the app name and choose Create.',
  'Скопируйте пароль из 16 символов, вставьте в поле ниже и сохраните настройки почты.':'Copy the 16-character password, paste it into the field below, and save your email settings.',
  'Для создания пароля нужна двухэтапная аутентификация Google.':'Your Google account needs 2-Step Verification to create app passwords.',
  'Сохранить':'Save','имя@kindle.com':'name@kindle.com','имя@gmail.com':'name@gmail.com',
  'Предпросмотр обложки':'Cover preview','Об источнике обложек':'About Open Library','Закрыть':'Close','Язык':'Language',
  'Open Library - открытый книжный каталог. Мы ищем по ISBN, названию и автору. У некоторых изданий в каталоге пока нет обложки.':'Open Library is a public book catalog. We search by ISBN, title, and author. Some editions don’t have cover images.',
  'Тканевый переплёт':'Clothbound','Типографика':'Typography','Конструктивизм':'Constructivist','Гравюра':'Engraving','Классический титул':'Classic','Комикс':'Comic','Мультфильм':'Doodles',
  'Выбранный шаблон':'Selected design','Выбранная обложка':'Selected cover','Без обложки':'No cover',
  'Читаем EPUB…':'Reading EPUB…','Выберите EPUB до 50 МБ':'Choose an EPUB up to 50 MB',
  'Ищем в Open Library…':'Searching Open Library…','В Open Library не нашлось обложек для этой книги.':'No covers found for this book in Open Library.',
  'Загружаем обложку…':'Loading cover…','Не удалось загрузить миниатюры.':'Cover thumbnails could not be loaded.',
  'Сейчас Open Library недоступна.':'Open Library is currently unavailable.',
  'Выберите JPG, PNG или WebP до 12 МБ':'Choose a JPG, PNG, or WebP image up to 12 MB',
  'Укажите адрес Gmail.':'Enter a Gmail address.','Этот сервис пока не поддерживается. Укажите адрес @gmail.com.':'This provider is not supported yet. Enter an @gmail.com address.',
  'Пароль сохранён в этом браузере. Введите новый, чтобы заменить его.':'Password saved in this browser. Enter a new one to replace it.',
  'Настройки и пароль хранятся только в этом браузере. При отправке пароль передаётся серверу для подключения к Gmail.':'Settings and password are stored only in this browser. When sending a book, the password is passed to the server to connect to Gmail.',
  'Введите 16 символов из пароля приложения Google.':'Enter your 16-character Google app password.',
  'Введите пароль приложения Google.':'Enter your Google app password.','Настройки почты сохранены.':'Email settings saved.',
  'Введите название книги':'Enter a book title','Готовим письмо…':'Preparing email…','Собираем EPUB…':'Preparing EPUB…',
  'Письмо принято почтовым сервером. Проверьте библиотеку Kindle.':'Your email was accepted. Check your Kindle library.',
  'Файл готов к скачиванию.':'Your EPUB is ready to download.','Ищем обложки…':'Searching for covers…',
  'Введите название книги для поиска.':'Enter a title to search for covers.',
  'Не удалось выполнить запрос':'The request could not be completed.',
  'Сервис недоступен. Повторите позже.':'Service unavailable. Try again later.',
  'Связь с почтой прервана. Проверьте доставку перед повторной отправкой.':'The mail connection was interrupted. Check delivery before sending again.',
  'Ошибка SMTP. Проверьте настройки почты и допустимый размер вложения.':'Email could not be sent. Check your Gmail settings and attachment size.',
  'Не удалось обработать данные. Проверьте файл и настройки.':'Could not process the request. Check the file and settings.',
  'Файл слишком большой или пуст':'The file is empty or too large','Введите название':'Enter a title',

  'Укажите пароль SMTP в настройках':'Enter your app password in email settings','Введите 16 символов пароля приложения Google':'Enter your 16-character Google app password',
  'Для отправки укажите личный адрес @gmail.com':'Use a personal @gmail.com address to send books',
  'Неподдерживаемый XML':'Unsupported XML','Изображение слишком большое':'Image too large','EPUB слишком большой':'EPUB too large',
  'Формат исходной обложки не поддерживается для замены':'This cover format cannot be replaced','Ответ каталога слишком велик':'The catalog response is too large',
  'Обновите страницу и попробуйте снова.':'Reload the page and try again.',
  'История с кладбищем':'The Graveyard Book','Нил Гейман':'Neil Gaiman','Острие бритвы':'The Razor’s Edge','Сомерсет Уильям Моэм':'W. Somerset Maugham'
}));
const preferred = (navigator.languages || [navigator.language]).map(tag=>tag.split('-')[0]).find(code=>['ru','en'].includes(code));
let language = localStorage.getItem('booktifier-language') || preferred || 'en';
export const t = source => language === 'en' ? english.get(source) ?? source : source;
const staticBindings = [];
// Bind only interface copy present before any book is opened.
const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
while(walker.nextNode()){
  const node = walker.currentNode;
  const source = node.textContent.trim();
  if (english.has(source)) staticBindings.push(()=>{node.textContent=t(source)});
}
for(const el of document.querySelectorAll('[aria-label],[placeholder]')){
  for(const attr of ['aria-label','placeholder']){
    const source=el.getAttribute(attr);
    if(english.has(source)) staticBindings.push(()=>el.setAttribute(attr,t(source)));
  }
}
export function message(el, source){
  el.dataset.message = source;
  el.textContent = t(source);
}
export function applyLanguage(choice){
  if(choice){language=choice;localStorage.setItem('booktifier-language',choice)}
  document.documentElement.lang=language;
  document.querySelector('#language').value=language;
  for(const update of staticBindings)update();
  for(const el of document.querySelectorAll('[data-message]'))el.textContent=t(el.dataset.message);
}
