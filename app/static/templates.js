export const designs = ['Тканевый переплёт','Типографика','Конструктивизм','Гравюра','Классический титул','Комикс','Мультфильм'];
const screenWidth = 1072, screenHeight = 1448;
const H = 1080, W = H * screenWidth / screenHeight;
const doodles = new Image();
doodles.src = '/doodles.jpg';
export const doodlesReady = doodles.decode();

function block(ctx,text,x,y,width,height,maxSize,family,align='center',weight='normal') {
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined,{granularity:'grapheme'}) : null;
  const graphemes = word => segmenter ? Array.from(segmenter.segment(word), part=>part.segment) : Array.from(word);
  const rtl = /^[^\p{Letter}]*[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u.test(text);
  ctx.direction = rtl ? 'rtl' : 'ltr';
  if(rtl && align==='left') align='right';
  const words=text.trim().split(/\s+/);
  let lines=[], size=maxSize;
  for (;size>=8;size-=2) {
    ctx.font=weight+' '+size+'px '+family;
    lines=[''];
    for (const word of words) {
      const last=lines.length-1, joined=[lines[last],word].filter(Boolean).join(' ');
      if(ctx.measureText(joined).width <= width){lines[last]=joined;continue}
      if(lines[last])lines.push('');
      if(ctx.measureText(word).width <= width){lines[lines.length-1]=word;continue}
      for(const glyph of graphemes(word)){
        const tail=lines.length-1;
        if(lines[tail] && ctx.measureText(lines[tail]+glyph).width>width)lines.push(glyph);
        else lines[tail]+=glyph;
      }
    }
    if (lines.length*size*1.16<=height) break;
  }
  ctx.textAlign=align;
  ctx.textBaseline='middle';
  lines.forEach((line,i)=>ctx.fillText(line,x+(align==='center'?width/2:align==='right'?width:0),y+height/2+(i-(lines.length-1)/2)*size*1.16,width));
}
export function cover(index,title,authors) {
  const canvas=document.createElement('canvas');
  canvas.width=screenWidth; canvas.height=screenHeight;
  const c=canvas.getContext('2d');
  c.scale(screenHeight/H, screenHeight/H);
  const rect=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
  const stroke=(color,width,...points)=>{
    c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...points[0]);
    for(const p of points.slice(1)) c.lineTo(...p);
    c.stroke();
  };
  const frame=(color,inset,width)=>{c.strokeStyle=color;c.lineWidth=width;c.strokeRect(inset,inset,W-2*inset,H-2*inset)};
  const serif='Georgia, "Times New Roman", serif', sans='Arial, sans-serif';
  const author=authors.filter(Boolean).join(' · ');
  if(index===0){
    const green='#163f36', gold='#dec992';
    rect(green,0,0,W,H);
    for(let row=-1;row<11;row++) for(let col=-1;col<10;col++) {
      const x=col*99+(row%2)*48, y=row*114;
      stroke(gold,2,[x,y+52],[x+10,y+26],[x+8,y]);
      for(let i=0;i<4;i++){
        const s=i%2===0?1:-1;
        c.save();c.translate(x+8+s*7,y+5+i*9);c.rotate(s*.72);
        c.beginPath();c.ellipse(0,0,4,12,0,0,2*Math.PI);c.fillStyle=gold;c.fill();c.restore();
      }
    }
    rect(green,46,315,W-92,445);c.strokeStyle=gold;c.lineWidth=2;c.strokeRect(59,329,W-118,418);
    c.fillStyle=gold;block(c,title,83,360,W-166,230,82,serif);block(c,author,90,608,W-180,94,32,serif);
  } else if(index===1){
    rect('#f4e9d1',0,0,W,H);c.fillStyle='#352e2b';block(c,author,54,66,W-108,125,37,sans,'left');
    rect('#b9432c',56,248,155,14);blockColor('#222123',title,54,315,W-108,560,157,sans,'left','bold');
    stroke('#352e2b',3,[55,990],[W-55,990]);
  } else if(index===2){
    rect('#eeddb5',0,0,W,H);c.fillStyle='#a04028';c.beginPath();c.arc(W-146,255,204,0,Math.PI*2);c.fill();
    c.fillStyle='#292c30';c.beginPath();c.moveTo(0,235);c.lineTo(W,540);c.lineTo(W,H);c.lineTo(0,H);c.fill();
    blockColor('#f8ebcf',title,49,542,W-98,300,99,sans,'left','bold');
    blockColor('#f8ebcf',author,52,890,W-104,115,33,sans,'left');
  } else if(index===3){
    rect('#142c42',0,0,W,H);
    for(let n=0;n<78;n++){
      c.beginPath();for(let x=0;x<=W;x+=5){let y=780+n*5+94*Math.sin(x/150+n/19)+47*Math.sin(x/72-n/16);if(x===0)c.moveTo(x,y);else c.lineTo(x,y)}
      c.strokeStyle=n%4?'#829caa':'#cad6ca';c.lineWidth=1.6;c.stroke();
    }
    blockColor('#e8e4d4',title,61,206,W-122,294,88,serif);blockColor('#d2d4ca',author,68,500,W-136,108,34,serif);
  } else if(index===4){
    rect('#f2e4c7',0,0,W,H);frame('#584631',37,3);frame('#866d4a',48,1);
    blockColor('#4b3a30',author,85,210,W-170,125,38,serif);
    stroke('#866d4a',2,[W/2-120,391],[W/2-25,391]);stroke('#866d4a',2,[W/2+25,391],[W/2+120,391]);
    c.save();c.translate(W/2,391);c.rotate(Math.PI/4);rect('#87624b',-8,-8,16,16);c.restore();
    blockColor('#322c27',title,83,429,W-166,325,89,serif);
  } else if(index===5){
    const ink='#231e28', paper='#fff4d4';
    const headline='Impact, "Arial Black", sans-serif';
    rect('#f4ba45',0,0,W,H);
    // Alternating wedges and a dot screen imitate two-colour comic printing.
    for(let ray=0;ray<22;ray++){
      const angle=ray*2*Math.PI/22;
      c.fillStyle='#ce533b';
      c.beginPath();c.moveTo(W/2,570);
      for(const edge of [angle,angle+.12]) c.lineTo(W/2+1250*Math.cos(edge),570+1250*Math.sin(edge));
      c.closePath();c.fill();
    }
    c.fillStyle=ink;c.beginPath();
    for(let row=0;row<55;row++) for(let col=0;col<Math.ceil(W/20);col++){
      const x=20*col+(row%2)*10,y=20*row;
      c.moveTo(x+2.5,y);c.arc(x,y,2.5,0,2*Math.PI);
    }
    c.fill();
    c.save();c.translate(W/2,520);c.rotate(-.045);
    c.beginPath();
    for(let n=0;n<40;n++){
      const a=n*Math.PI/20, radius=n%2?.85:1;
      const x=Math.cos(a)*(W/2-5)*radius,y=Math.sin(a)*345*radius;
      if(n===0)c.moveTo(x,y);else c.lineTo(x,y);
    }
    c.closePath();c.fillStyle=paper;c.fill();c.strokeStyle=ink;c.lineWidth=8;c.stroke();
    blockColor(ink,title,-225,-164,450,328,112,headline,'center','bold');
    c.restore();
    rect(ink,56,873,W-112,126);rect(paper,50,865,W-112,126);
    c.strokeStyle=ink;c.lineWidth=5;c.strokeRect(50,865,W-112,126);
    blockColor(ink,author,64,878,W-140,101,38,'"Comic Sans MS", "Trebuchet MS", sans-serif','center','bold');
    frame(ink,12,10);
  } else if(index===6){
    c.drawImage(doodles, 0, 0, W, H);
    // Reserve the lettering area while keeping the original ink border and doodles.
    rect('#fff', W * .08, H * .32, W * .84, H * .33);
    const marker = '"Marker Felt", "Chalkboard SE", "Comic Sans MS", sans-serif';
    blockColor('#141414', title, W*.11, H*.33, W*.78, H*.21, 95, marker, 'center', 'bold');
    blockColor('#141414', author, W*.13, H*.55, W*.74, H*.09, 40, marker);
  }
  function blockColor(color,...args){c.fillStyle=color;block(c,...args)}
  return canvas;
}
