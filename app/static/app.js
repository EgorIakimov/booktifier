import {applyLanguage, message, t} from './i18n.js';
import {cover, designs, doodlesReady} from './templates.js';
const $=id=>document.getElementById(id);
const status = text => message($('status'),text);
const isGmail = email => /^[^@\s<>]+@gmail\.com$/i.test(email);
let searchTimer;
let templateFrame;
let book, selected='original', image=null, templates=[], searchVersion=0, uploadVersion=0, choiceVersion=0, busy=false;
function dataURL(file){
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
}
async function api(path,body,raw=false){
  const binary=body instanceof Blob;
  // Escape Unicode metadata so large base64 requests stay compact in Python's decoder.
  const encoded = binary ? body : JSON.stringify(body).replace(/[^\x00-\x7f]/g, char =>
    '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
  const r=await fetch(path,{method:'POST',headers:{'Content-Type':binary?'application/epub+zip':'application/json'},body:encoded});
  if(!r.ok) throw Error((await r.json()).error || 'Не удалось выполнить запрос');
  return raw?r.blob():r.json();
}
function authors(){return $('authors').value.split('\n').map(a=>a.trim()).filter(Boolean)}
function img(src,alt=''){const el=new Image();el.alt=alt;el.src=src;return el}
function tile(key,art,label,choose){
  const b=document.createElement('button');b.className='tile';b.dataset.key=key;b.setAttribute('aria-pressed',String(key===selected));
  const caption=document.createElement('span');caption.textContent=label;b.append(art,caption);b.onclick=choose;return b;
}
function preview(){
  delete $('preview').dataset.message;
  const src=selected==='original'?book.cover:image;
  $('preview').replaceChildren();
  if(selected.startsWith('template-')){
    const canvas=templates[Number(selected.slice(9))];
    $('preview').append(img(canvas.toDataURL('image/jpeg',.93),t('Выбранный шаблон')));
  }else if(src) $('preview').append(img(src,t('Выбранная обложка')));
  else message($('preview'), 'Без обложки');
  document.querySelectorAll('.tile').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.key===selected)));
}
function select(key,src=null){choiceVersion++;selected=key;image=src;preview();status('')}
function renderTemplates(){
  templates=designs.map((name,i)=>cover(i,$('title').value,authors()));
  $('templates').replaceChildren(...templates.map((c,i)=>tile('template-'+i,c,t(designs[i]),()=>select('template-'+i))));
  preview();
}
async function openBook(file){
  if(!file || busy)return;
  const version=++uploadVersion;
  status('Читаем EPUB…');
  try{
    if(file.size>50_000_000)throw Error('Выберите EPUB до 50 МБ');
    const [info,uri]=await Promise.all([api('/inspect',file),dataURL(file),doodlesReady]);
    if(version!==uploadVersion)return;
    book={...info,epub:uri.split(',')[1]};choiceVersion++;selected='original';image=null;
    $('title').value=book.title||file.name.replace(/\.epub$/i,'');$('authors').value=book.authors.join('\n');
    message($('original'), book.cover?'Выбрать исходную обложку':'Оставить без обложки');
    clearTimeout(searchTimer);cancelAnimationFrame(templateFrame);
    $('start').hidden=true;$('editor').hidden=false;renderTemplates();status('');search();
  }catch(e){if(version===uploadVersion)status(e.message)}
}
async function search(){
  const version=++searchVersion;
  const title=$('title').value.trim(),people=authors().join('\n');
  $('online').replaceChildren();message($('catalogStatus'), 'Ищем в Open Library…');
  try{
    const rows=await api('/search',{title,language:book.language,authors:people,isbns:title===book.title && people===book.authors.join('\n')?book.isbns:[]});
    if(version!==searchVersion)return;
    message($('catalogStatus'), rows.length?'':'В Open Library не нашлось обложек для этой книги.');
    for(const r of rows){
      const thumb=img('/covers/'+r.id+'-M.jpg',r.title);
      const button=tile('ol-'+r.id,thumb,r.info||r.title,async()=>{
        const token=++choiceVersion;
        try{
          status('Загружаем обложку…');
          const uri=await dataURL(await api('/image',{id:r.id},true));
          if(token===choiceVersion)select('ol-'+r.id,uri);
        }catch(e){if(token===choiceVersion)status(e.message)}
      });
      thumb.onerror=()=>{button.remove();if(version===searchVersion && !$('online').childElementCount)message($('catalogStatus'),'Не удалось загрузить миниатюры.')};
      $('online').append(button);
    }
  }catch(e){if(version===searchVersion)message($('catalogStatus'),'Сейчас Open Library недоступна.')}
}
async function own(file){
  if(!file||!book||busy)return;
  const token=++choiceVersion;
  try{
    if(file.size>12_000_000 || !['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Выберите JPG, PNG или WebP до 12 МБ');
    const uri=await dataURL(file);const test=img(uri);await test.decode();
    if(token===choiceVersion)select('upload',uri);
  }catch(e){if(token===choiceVersion)status(e.message)}
}
function prefs(){try{return JSON.parse(localStorage.getItem('booktifier-mail')||'{}')}catch{return {}}}
let savedPassword = false;
function updateCredential(){
  const sender = $('sender').value.trim();
  const supported = isGmail(sender);
  const saved = prefs();
  savedPassword = sender === saved.sender && Boolean(saved.secret);
  $('secret').value = '';
  $('secret').placeholder = savedPassword ? '•••• •••• •••• ••••' : '';
  $('secret').required = supported && !savedPassword;
  $('credential').hidden = !supported;
  setPasswordHelp(false);
  message($('prefStatus'), '');
  $('sender').setCustomValidity(sender && !supported ? t('Укажите адрес Gmail.') : '');
  message($('providerHint'), sender && sender.includes('@') && !supported
    ? 'Этот сервис пока не поддерживается. Укажите адрес @gmail.com.'
    : 'Для отправки поддерживается Gmail.');
  message($('credentialHint'), savedPassword
    ? 'Пароль сохранён в этом браузере. Введите новый, чтобы заменить его.'
    : 'Введите 16 символов из пароля приложения Google.');
  $('savePrefs').disabled = !supported;
}
function setPasswordHelp(open){
  $('passwordGuide').hidden = !open;
  $('passwordHelp').setAttribute('aria-expanded', String(open));
}
$('passwordHelp').onclick = () => setPasswordHelp($('passwordGuide').hidden);
function settings(){
  const saved = prefs();
  $('kindle').value = saved.kindle || '';
  $('sender').value = saved.sender || '';
  $('dialog').showModal();
  updateCredential();
}
$('settings').onclick = settings;
$('close').onclick = () => $('dialog').close();
$('dialog').onclose = () => {$('secret').value=''};
$('sender').oninput = () => updateCredential();
$('prefs').onsubmit = async e => {
  e.preventDefault();
  if ($('savePrefs').disabled) return;
  const sender = $('sender').value.trim();
  const secret = $('secret').value.replace(/\s/g,'') || (sender===prefs().sender ? prefs().secret || '' : '');
  $('prefs').inert = true;
  try {
    if (!/^[a-zA-Z0-9]{16}$/.test(secret)) throw Error('Введите 16 символов пароля приложения Google');
    localStorage.setItem('booktifier-mail', JSON.stringify({kindle:$('kindle').value.trim(), sender, secret}));
    $('dialog').close();
    status('Настройки почты сохранены.');
  } catch(e) {
    message($('prefStatus'), e.message);
  } finally {
    $('prefs').inert = false;
  }
};
async function finish(send){
  if(busy||!book)return;
  const title=$('title').value.trim();
  if(!title){$('title').focus();status('Введите название книги');return}
  if(send && (!prefs().kindle || !prefs().secret || !isGmail(prefs().sender || ''))){settings();return}
  const filename=(title.replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').trim().slice(0,110)||'Книга')+'.epub';
  const uri=selected.startsWith('template-')?templates[Number(selected.slice(9))].toDataURL('image/jpeg',.94):image;
  busy=true;$('editor').inert=true;$('settings').disabled=true;status(send?'Готовим письмо…':'Собираем EPUB…');
  try{
    const result=await api('/export',{title,authors:authors(),epub:book.epub,image:uri?.split(',')[1]},true);
    if(send){
      if(result.size > 25_000_000)throw Error('Для Gmail книга должна быть не больше 25 МБ. Скачайте EPUB и загрузите через Send to Kindle.');
      await api('/send',{epub:(await dataURL(result)).split(',')[1],smtp:prefs(),title,filename});
      status('Письмо принято почтовым сервером. Проверьте библиотеку Kindle.');
    }else{
      const url=URL.createObjectURL(result);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Файл готов к скачиванию.');
    }
  }catch(e){status(e.message)}finally{busy=false;$('editor').inert=false;$('settings').disabled=false}
}
$('openBook').onchange=e=>{openBook(e.target.files[0]);e.target.value=''};
$('upload').onchange=e=>{own(e.target.files[0]);e.target.value=''};
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',e=>{
  e.preventDefault();const f=e.dataTransfer.files[0];if(!f||$('dialog').open)return;
  if(book&&f.type.startsWith('image/'))own(f);else openBook(f);
});
document.addEventListener('paste',e=>{const file=e.clipboardData.files[0];if(file&&book&&!$('dialog').open){e.preventDefault();own(file)}});
for(const key of ['title','authors']){
  $(key).oninput = () => {
    cancelAnimationFrame(templateFrame);
    templateFrame = requestAnimationFrame(renderTemplates);
    clearTimeout(searchTimer);
    searchVersion++;
    $('online').replaceChildren();
    const hasTitle = Boolean($('title').value.trim());
    message($('catalogStatus'), hasTitle ? 'Ищем обложки…' : 'Введите название книги для поиска.');
    if(hasTitle) searchTimer = setTimeout(search, 900);
  };
}
$('hintButton').onclick = () => {
  $('catalogHint').hidden = !$('catalogHint').hidden;
  $('hintButton').setAttribute('aria-expanded', String(!$('catalogHint').hidden));
};
$('original').onclick=()=>select('original');
$('download').onclick=()=>finish(false);
$('send').onclick=()=>finish(true);
function localize(choice){
  applyLanguage(choice);
  $('shelf').replaceChildren(cover(0,t('История с кладбищем'),[t('Нил Гейман')]),cover(4,t('Острие бритвы'),[t('Сомерсет Уильям Моэм')]));
  if(book)renderTemplates();
}
$('language').onchange=e=>localize(e.target.value);
localize();
