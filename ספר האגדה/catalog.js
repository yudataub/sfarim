const scriptBase=new URL('.',document.currentScript.src);
const input=document.getElementById('catalog-search'),results=document.getElementById('catalog-results'),statusLine=document.getElementById('search-status');
const fold=s=>s.normalize('NFD').replace(/[\u0591-\u05bd\u05bf-\u05c7]/g,'').replace(/[־–—]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const loose=s=>fold(s).replace(/[וי]/g,'');
// the loose spelling (19.10): no ו/י, and a word-final ה/ת as one letter – the construct form is the same word
// (עֲקֵדַת יִצְחָק is עקידה, אהבת is אהבה)
const looseW=s=>loose(s).replace(/[הת](?=[^\u05d0-\u05ea]|$)/g,'ה');
let exact=false;try{exact=localStorage.getItem('kt-exact-search')==='1'}catch(e){}
if(input){const lab=document.createElement('label');lab.className='kt-exact';lab.style.cssText='display:inline-flex;width:auto;align-items:center;gap:.4rem;font-size:.85rem;font-weight:400;margin:.5rem .1rem 0;cursor:pointer;opacity:.85';lab.innerHTML='<input type="checkbox" style="width:auto;height:auto;margin:0;padding:0;flex:none"'+(exact?' checked':'')+'><span>חיפוש מדויק (רק האותיות שהוקלדו)</span>';input.insertAdjacentElement('afterend',lab);lab.querySelector('input').addEventListener('change',e=>{exact=e.target.checked;try{localStorage.setItem('kt-exact-search',exact?'1':'0')}catch(err){}if(input.value.trim())search();input.focus()})}
let loading,index,timer,searchVersion=0;
function loadIndex(){
 if(index)return Promise.resolve(index);
 if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('search-data.js',scriptBase);s.onload=()=>{const data=window.AGGADAH_SEARCH;index=data.items.map(r=>{const meta=data.titles[r[0].split('/').pop().split('.html')[0]];return {url:r[0],title:meta[0],chapter:meta[1],text:r[1],f:fold(r[1]),t:fold(meta[0]),l:loose(r[1]),lt:looseW(meta[0]),lx:looseW(r[1])}});resolve(index)};s.onerror=()=>{loading=null;reject(Error('לא ניתן לטעון את החיפוש. יש לשמור את כל תיקיות הספר יחד.'))};document.head.append(s)});
 return loading;
}
function snippet(text,query){const f=fold(text),at=f.indexOf(fold(query));const pos=at<0?0:at;return (pos>65?'…':'')+f.slice(Math.max(0,pos-65),pos+170)+(f.length>pos+170?'…':'')}
async function search(){
 const version=++searchVersion,q=input.value.trim();results.replaceChildren();if(!q){statusLine.textContent='';return}
 statusLine.textContent='טוען חיפוש…';
 try{
 const rows=await loadIndex();if(version!==searchVersion)return;
 // the title and the text, in the spelling as typed and (unless "חיפוש מדויק") the loose one; a story whose title
 // matches is one result, first (19.10)
 const alt=exact?q:q.replace(/(^|\s)רבי(?=\s)/g,"$1ר'");
 const sets=[fold(q).split(' ').filter(Boolean)];if(alt!==q)sets.push(fold(alt).split(' ').filter(Boolean));
 const lsets=exact?[]:sets.map(ts=>ts.map(looseW).filter(t=>t.length>=2)).filter(ts=>ts.length);
 const has=(hay,ts)=>ts.length&&ts.every(t=>hay.includes(t));
 const seen=new Set(),inTitle=[],inText=[];
 for(const r of rows){
  const sid=r.url.split('#')[0];
  const te=sets.some(ts=>has(r.t,ts)),tl=!te&&lsets.some(ts=>has(r.lt,ts));
  if((te||tl)&&!seen.has(sid)){seen.add(sid);inTitle.push({...r,url:sid,rank:te?0:1,story:true})}
  const xe=sets.some(ts=>has(r.f,ts)),xl=!xe&&lsets.some(ts=>has(r.lx,ts));
  if(xe||xl)inText.push({...r,rank:xe?2:3});
 }
 const matches=inTitle.concat(inText).sort((a,b)=>a.rank-b.rank);
 statusLine.textContent=matches.length?(inTitle.length?`${inTitle.length} סיפורים בשם, `:'')+`${inText.length} פסקאות נמצאו. כל תוצאה פותחת את הסיפור או את הפסקה המתאימה.`:'לא נמצאו תוצאות'+(exact?' – נסו בלי "חיפוש מדויק".':'.');
 let limit=0;
 function more(){const batch=matches.slice(limit,limit+40);limit+=batch.length;for(const r of batch){const a=document.createElement('a');a.className='result';const [file,hash]=r.url.split('#');a.href=new URL(file+'?q='+encodeURIComponent(q)+(hash?'#'+hash:''),scriptBase);if(r.story)a.classList.add('story-hit');const h=document.createElement('strong');h.textContent=r.title;const c=document.createElement('small');c.textContent=r.chapter;const p=document.createElement('p');p.textContent=snippet(r.text,q);a.append(h,c,p);results.append(a)}if(limit<matches.length){const button=document.createElement('button');button.textContent='הצג תוצאות נוספות';button.onclick=()=>{button.remove();more()};results.append(button)}}
 more();
 }catch(e){statusLine.textContent=e.message}
}
input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,180)});
function land(){const id=decodeURIComponent(location.hash.slice(1));const target=document.getElementById(id);if(!target)return;for(let p=target.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;requestAnimationFrame(()=>target.scrollIntoView({behavior:'instant',block:'start'}));target.classList.add('reading-target')}
window.addEventListener('load',()=>{
 const old=decodeURIComponent(location.hash.slice(1));
 if(!location.pathname.includes('/pages/')&&/^(story-|illustrated-|list-source-|note-|ref-)/.test(old)){
  const script=document.createElement('script');script.src=new URL('catalog-routes.js',scriptBase);script.onload=()=>{const file=window.AGGADAH_ROUTES[old];if(file)location.replace(new URL(file+'#'+old,scriptBase))};document.head.append(script);return;
 }
 const q=new URLSearchParams(location.search).get('q');
 if(q&&location.hash){const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(target){const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){const text=n.textContent;let normalized='',map=[];for(let i=0;i<text.length;i++){const ch=fold(text[i]);if(ch){normalized+=ch;for(let j=0;j<ch.length;j++)map.push(i)}}const at=normalized.indexOf(fold(q));if(at>=0){const range=document.createRange();range.setStart(n,map[at]);range.setEnd(n,map[at+fold(q).length-1]+1);const mark=document.createElement('mark');range.surroundContents(mark)}}}}
 land();
});
window.addEventListener('hashchange',land);
const dialog=document.getElementById('note-dialog'),preview=document.getElementById('note-preview');
function noteContent(a){const note=document.getElementById(a.hash.slice(1));if(!note)return null;const clone=note.cloneNode(true);clone.querySelectorAll('.footnote-back').forEach(e=>e.remove());clone.removeAttribute('id');return clone}
document.addEventListener('click',e=>{const a=e.target.closest('.footnote-ref');if(!a)return;const note=noteContent(a);if(!note)return;e.preventDefault();preview.hidden=true;document.getElementById('note-body').replaceChildren(note);dialog.showModal()});
document.getElementById('close-note').onclick=()=>dialog.close();
function showPreview(a){const note=noteContent(a);if(!note)return;preview.replaceChildren(note);preview.hidden=false;const r=a.getBoundingClientRect();preview.style.left=Math.max(10,Math.min(r.left,innerWidth-preview.offsetWidth-10))+'px';preview.style.top=Math.max(10,Math.min(r.bottom+8,innerHeight-preview.offsetHeight-10))+'px'}
document.addEventListener('pointerover',e=>{const a=e.target.closest('.footnote-ref');if(a&&e.pointerType!=='touch')showPreview(a)});
document.addEventListener('pointerout',e=>{if(e.target.closest('.footnote-ref'))preview.hidden=true});
document.addEventListener('focusin',e=>{if(e.target.matches('.footnote-ref'))showPreview(e.target)});
document.addEventListener('focusout',()=>preview.hidden=true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')preview.hidden=true});
