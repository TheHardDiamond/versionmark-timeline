import * as echarts from 'echarts/core';
import { LineChart, type LineSeriesOption } from 'echarts/charts';
import { DataZoomComponent, GridComponent, GraphicComponent, LegendComponent, TitleComponent, TooltipComponent, type DataZoomComponentOption, type GridComponentOption, type GraphicComponentOption, type LegendComponentOption, type TitleComponentOption, type TooltipComponentOption } from 'echarts/components';
import { AxisBreak, LabelLayout } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';
import { parseCsv, MAX_BYTES } from './csv';
import { BRANDING, DISCLAIMER, REPO_URL, CLASSIC, PALETTE, CATEGORY_LABELS, displayName, escapeHtml as esc, safeUrl, type Series, type DisplaySeries } from './model';
import './style.css';

echarts.use([LineChart, DataZoomComponent, GridComponent, GraphicComponent, LegendComponent, TitleComponent, TooltipComponent, AxisBreak, LabelLayout, SVGRenderer]);
type ChartOptions = echarts.ComposeOption<LineSeriesOption | DataZoomComponentOption | GridComponentOption | GraphicComponentOption | LegendComponentOption | TitleComponentOption | TooltipComponentOption>;

const datasets = import.meta.glob<{default: Series[]}>('../data/*.json', {eager:true});
const published: DisplaySeries[] = Object.values(datasets).flatMap(m=>m.default).map((s,i)=>({...s,origin:'published',color:PALETTE[i%PALETTE.length]}));
let temporary: DisplaySeries[] = [];
function savedSelection(): Set<string> {
  try {
    const saved:unknown=JSON.parse(localStorage.getItem('versionmark:series')??'null');
    if(Array.isArray(saved) && saved.every(id=>typeof id==='string')) return new Set(saved);
  } catch { /* Storage may be unavailable in private sessions. */ }
  return new Set(CLASSIC);
}
let selected = savedSelection();
let range: {start:number;end:number} = {start:0,end:100};
const app = document.querySelector('#app')!;
const defaultTitle = 'Versionmark Timeline';
app.innerHTML = `<header><a href="${REPO_URL}">↗ GitHub</a><h1 id="page-title">Versionmark Timeline</h1><p>纵轴为版本号，仅供整活。</p></header>
<main><details open><summary>曲线与数据</summary><input id="search" type="search" placeholder="搜索曲线" aria-label="搜索曲线">
<div class="tools"><button id="classic">原版九条</button><button id="all">全部扩展</button><button id="mc">Minecraft 专场</button><button id="clear">清空</button></div>
<div id="series"></div><label class="file">临时加载 CSV<input id="csv" type="file" accept=".csv" multiple></label>
<p class="small">仅本次页面有效，刷新后清除。<a href="${import.meta.env.BASE_URL}example.csv" download>下载示例</a></p><p role="status" id="status"></p><a href="${REPO_URL}/issues/new?template=timeline.yml">投稿公共数据 ↗</a></details>
<section><div class="tools"><label>图表标题 <input id="chart-title" type="text" maxlength="80" placeholder="Versionmark Timeline"></label><label><input id="axis" type="checkbox" checked> 自动断轴</label><label><input id="point-values" type="checkbox"> 显示节点数值</label><button id="export">导出图表</button></div>
<div id="chart" aria-label="版本号时间线"></div><p id="foot"></p><p id="point" aria-live="polite">点击节点查看发布来源。</p></section></main>
<dialog id="export-dialog"><form method="dialog"><button aria-label="关闭">关闭</button></form><h2>导出图表</h2>
<div class="tools"><select id="format" aria-label="格式"><option>PNG</option><option>SVG</option></select><select id="orientation" aria-label="版式"><option value="landscape">横版</option><option value="portrait">竖版</option></select>
<label><input id="branding" type="checkbox" checked> 显示项目标识</label><button id="download">下载</button></div><img id="preview" alt="导出预览"></dialog>`;
const get = <T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const titleInput = get<HTMLInputElement>('chart-title');
const pageTitle = () => titleInput.value.trim() || defaultTitle;
try { titleInput.value = localStorage.getItem('versionmark:title') ?? ''; } catch { /* Optional storage. */ }
function updateTitle() {
  get('page-title').textContent = pageTitle();
  document.title = pageTitle() + ' · Versionmark Timeline';
}
titleInput.addEventListener('input', () => {
  updateTitle();
  try { localStorage.setItem('versionmark:title', titleInput.value); } catch { /* Optional storage. */ }
});
updateTitle();
const chartNode=get('chart');
const chart=echarts.init(chartNode,undefined,{renderer:'svg'});
const visible=()=>[...published,...temporary].filter(s=>selected.has(s.id));
const marked=(lines:DisplaySeries[])=>lines.some(s=>s.origin==='temporary');
const branding=()=>get<HTMLInputElement>('branding').checked;
const formatNumber=new Intl.NumberFormat('en',{maximumFractionDigits:2,useGrouping:false});
const snapshotNote='MCJE 快照绘制旧命名的周数，新命名启用后停止更新。';
const gpuNote='显卡曲线取各代消费级桌面系列的首发旗舰型号。';
const notesFor=(lines:DisplaySeries[])=>[
  lines.some(s=>s.metric==='week')?snapshotNote:'',
  lines.some(s=>s.id==='nvidia'||s.id==='amd')?gpuNote:'',
  marked(lines)?DISCLAIMER:'',
].filter(Boolean);
function options(lines:DisplaySeries[], exported=false): ChartOptions {
  const showPointValues=get<HTMLInputElement>('point-values').checked;
  const values=[...new Set(lines.flatMap(s=>s.points.map(p=>p.value)))].sort((a,b)=>a-b);
  const breaks:{start:number;end:number;gap:string}[]=[];
  if(get<HTMLInputElement>('axis').checked && values.length>1){
    const span=values.at(-1)!-values[0];
    for(let i=1;i<values.length;i++){
      const gap=values[i]-values[i-1];
      if(gap>Math.max(4,span*.045) && gap>values[i-1]*.6) breaks.push({start:Number((values[i-1]+gap*.08).toFixed(2)),end:Number((values[i]-gap*.08).toFixed(2)),gap:'2%'});
    }
  }
  const notes=[...notesFor(lines),...(branding()?[BRANDING]:[])];
  const footer=exported?notes.length*23:0;
  return {
    backgroundColor:'#fff', animation:false, useUTC:true,
    title:exported?{text:pageTitle(),textStyle:{width:1000,overflow:'truncate'},subtext:'纵轴为版本号，仅供整活',left:'center',top:15}:undefined,
    legend:{type:'plain',top:exported?70:12,left:16,right:16,selectedMode:false,
      formatter:id=>displayName(lines.find(s=>s.id===id)!)},
    grid:{top:(exported?111:54)+Math.ceil(lines.length/(exported?6:4))*22,left:64,right:exported?220:chartNode.clientWidth<600?78:154,bottom:72+footer},
    tooltip:{trigger:'item',renderMode:'richText',formatter:(raw)=>{
      const p=raw as unknown as {seriesName:string;data:[number,number,string]};
      const series=lines.find(s=>s.id===p.seriesName);
      return `${series?displayName(series):''}\n${p.data[2]} · ${new Date(p.data[0]).toISOString().slice(0,10)}`;
    }},
    xAxis:{type:'time',boundaryGap:['2%','3%']},
    yAxis:{type:'value',scale:true,name:'版本号 / 编号',axisLabel:{formatter:value=>formatNumber.format(Number(value))},breaks,breakArea:{expandOnClick:false}},
    dataZoom:[{type:'inside',...range},{type:'slider',show:!exported,bottom:12,...range}],
    graphic:exported?notes.map((text,i)=>({type:'text',left:24,bottom:19+(notes.length-i-1)*23,style:{text,fill:'#465655',font:'14px sans-serif'}})):[],
    series:lines.map(s=>({id:s.id,name:s.id,type:'line',color:s.color,showSymbol:true,symbolSize:5,clip:true,
      lineStyle:{type:s.metric==='week'||s.id==='ios'?'dashed':'solid'},
      label:{show:showPointValues,position:'top',distance:4,color:s.color,fontSize:10,
        formatter:p=>{
          const [,value,version]=p.value as [number,number,string];
          const numericVersion=version.match(/^v?(\d+(?:\.\d+)?)(?:\.\d+)*$/i)?.[1];
          return numericVersion && Number(numericVersion)===value ? numericVersion : String(value);
        }},
      endLabel:{show:true,color:s.color,backgroundColor:'#fff',padding:[3,5],borderColor:s.color,borderWidth:1,borderRadius:3,
        formatter:(p)=>`${displayName(s)} ${(p.value as [number,number,string])[2]}`},
      // ECharts lays out point labels and end labels together. Keep every
      // label at its anchor when showing point values.
      labelLayout:showPointValues?undefined:{moveOverlap:'shiftY',hideOverlap:true},
      data:s.points.map(p=>[Date.parse(p.date),p.value,p.version])}))
  };
}
function draw(){
  const lines=visible();
  try { localStorage.setItem('versionmark:series',JSON.stringify(published.filter(s=>selected.has(s.id)).map(s=>s.id))); }
  catch { /* The chart works without persistent storage. */ }
  chart.setOption(options(lines),true);
  const notes=notesFor(lines).map(esc);
  if(branding())notes.push(`<a href="${REPO_URL}">${BRANDING}</a>`);
  get('foot').innerHTML=notes.join('<br>');
}
function list(){
  const query=get<HTMLInputElement>('search').value.trim().toLowerCase();
  const groups=[...Object.entries(CATEGORY_LABELS),['temporary','自定义']];
  get('series').innerHTML=groups.map(([id,label])=>{
    const items=(id==='temporary'?temporary:published.filter(s=>s.category===id)).filter(s=>s.name.toLowerCase().includes(query)||s.id.includes(query));
    if(!items.length && id!=='temporary') return '';
    return `<div class="group"><div><strong>${label}</strong> ${items.length?`<button data-group="${id}">全选</button>`:''}</div>
      ${items.map(s=>`<div class="row"><label><input type="checkbox" data-series="${s.id}" ${selected.has(s.id)?'checked':''}><i style="background:${s.color}"></i>${esc(displayName(s))}</label>${id==='temporary'?`<button data-remove="${s.id}" aria-label="移除曲线">×</button><a href="${REPO_URL}/issues/new?template=timeline.yml&name=${encodeURIComponent(s.name)}">投稿</a>`:''}</div>`).join('')||'<small>尚未加载 CSV</small>'}</div>`;
  }).join('');
}
function refresh(){list();draw();}
get('search').addEventListener('input',list);
get('series').addEventListener('change',event=>{
  const input=event.target as HTMLInputElement;
  const id=input.dataset.series;
  if(id){if(input.checked) selected.add(id);else selected.delete(id);draw();}
});
get('series').addEventListener('click',event=>{
  const {group,remove}=(event.target as HTMLElement).dataset;
  if(group){
    const query=get<HTMLInputElement>('search').value.trim().toLowerCase();
    const items=(group==='temporary'?temporary:published.filter(s=>s.category===group)).filter(s=>s.name.toLowerCase().includes(query)||s.id.includes(query));
    items.forEach(s=>selected.add(s.id));
  }else if(remove){temporary=temporary.filter(s=>s.id!==remove);selected.delete(remove);}else return;
  refresh();
});
get('classic').onclick=()=>{selected=new Set(CLASSIC);range={start:0,end:100};refresh();};
get('all').onclick=()=>{selected=new Set([...published,...temporary].map(s=>s.id));range={start:0,end:100};refresh();};
get('mc').onclick=()=>{selected=new Set(published.filter(s=>s.id.startsWith('minecraft')).map(s=>s.id));range={start:0,end:100};refresh();};
get('clear').onclick=()=>{selected.clear();refresh();};
get('axis').onchange=draw;
get('point-values').onchange=draw;
const csvInput=get<HTMLInputElement>('csv');
csvInput.onchange=async ()=>{
  const messages:string[]=[];
  for(const file of Array.from(csvInput.files??[])){
    try {
      if(file.size>MAX_BYTES) throw new Error('文件超过 256 KiB');
      const parsed=parseCsv(new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()));
      if(parsed.errors.length) throw new Error(parsed.errors.slice(0,5).join('；'));
      const id='temp-'+crypto.randomUUID();
      temporary.push({id,name:file.name.replace(/\.csv$/i,'').slice(0,60)||'临时曲线',category:'games',metric:'version',description:'本地 CSV',coverage:'当前页面',updatedAt:'',points:parsed.points,origin:'temporary',color:PALETTE[(published.length+temporary.length)%PALETTE.length]});
      selected.add(id);
      messages.push(`${file.name}：已加载 ${parsed.points.length} 条。前五条：${parsed.points.slice(0,5).map(p=>`${p.version} → ${p.value}`).join('、')}。${parsed.warnings.slice(0,3).join('；')}`);
    }catch(e){messages.push(`${file.name}：${(e as Error).message}`);}
  }
  csvInput.value='';
  get('status').textContent=messages.join('\n');refresh();
};
chart.on('datazoom',(raw:unknown)=>{
  const e=raw as {start:number;end:number;batch?:{start:number;end:number}[]};
  const zoom=e.batch?.[0]??e;
  if(Number.isFinite(zoom.start)&&Number.isFinite(zoom.end))range={start:zoom.start,end:zoom.end};
});
chart.on('click',event=>{
  const s=visible()[event.seriesIndex??-1];
  const p=s?.points[event.dataIndex];
  if(!p)return;
  get('point').innerHTML=`<strong>${esc(displayName(s))} · ${esc(p.version)}</strong> · ${esc(p.date.slice(0,10))} · 绘图值 ${p.value} ${p.relatedVersion?esc(p.relatedVersion):''} ${p.releaseKind?esc({stable:'正式',preview:'预览',announcement:'公告'}[p.releaseKind]):''} ${safeUrl(p.source)?`<a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">来源 ↗</a>`:''}<br>${esc(s.description)} ${esc(s.coverage)}`;
});
const dialog=get<HTMLDialogElement>('export-dialog');
let svg='',width=1600,height=900,previewUrl='';
function preview(){
  const portrait=get<HTMLSelectElement>('orientation').value==='portrait';
  width=portrait?1200:1600;
  height=Math.max(portrait?1600:900,650+visible().length*19);
  const instance=echarts.init(null,undefined,{renderer:'svg',ssr:true,width,height});
  instance.setOption(options(visible(),true));
  svg=instance.renderToSVGString();
  instance.dispose();
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  get<HTMLImageElement>('preview').src=previewUrl;
}
get('export').onclick=()=>{dialog.showModal();preview();};
get('orientation').onchange=preview;
get('branding').onchange=()=>{draw();preview();};
function download(blob:Blob,extension:string){
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='versionmark-timeline.'+extension;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
get('download').onclick=async()=>{
  if(get<HTMLSelectElement>('format').value==='SVG'){download(new Blob([svg],{type:'image/svg+xml'}),'svg');return;}
  const img=get<HTMLImageElement>('preview');
  await img.decode();
  const canvas=document.createElement('canvas');
  canvas.width=width*2;canvas.height=height*2;
  canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);
  canvas.toBlob(blob=>{if(blob)download(blob,'png');});
};
new ResizeObserver(()=>{chart.resize();draw();}).observe(chartNode);
refresh();


