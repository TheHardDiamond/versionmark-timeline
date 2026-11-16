import {createHash} from 'node:crypto';
import {MAX_BYTES} from '../src/csv';
import {importCsv} from './import-csv';
import type {Category} from '../src/model';

const issueNumber=process.env.ISSUE_NUMBER ?? '';
const repo=process.env.GITHUB_REPOSITORY ?? '';
if(!/^[1-9]\d{0,9}$/.test(issueNumber)||!/^[-\w]+\/[-\w.]+$/.test(repo)) throw new Error('无效的仓库或 Issue 编号');
const response=await fetch('https://api.github.com/repos/'+repo+'/issues/'+issueNumber,{
  headers:{Authorization:'Bearer '+process.env.GH_TOKEN},signal:AbortSignal.timeout(12000)
});
if(!response.ok) throw new Error('读取 Issue 失败：'+response.status);
const issue=await response.json() as {body?:string;state:string;pull_request?:unknown};
if(issue.state!=='open'||issue.pull_request)throw new Error('请选择尚未关闭的数据投稿 Issue');
const fields=new Map<string,string>();
for(const match of (issue.body??'').matchAll(/^### ([^\r\n]+)\r?\n([\s\S]*?)(?=^### |$(?![\s\S]))/gm)) fields.set(match[1],match[2].trim());
const category=({'AI':'ai','游戏':'games','操作系统':'os','硬件':'hardware'} as Record<string,Category>)[fields.get('建议分类')??''];
const links=[...(fields.get('CSV 附件')??'').matchAll(/\[[^\]\n]+\.csv\]\((https:\/\/github\.com\/user-attachments\/files\/\d+\/[^\s)]+)\)/gi)];
if(links.length!==1 || !category)throw new Error('需要恰好一个 GitHub CSV 附件及有效分类');
let url=new URL(links[0][1]);
let attachment:Response|undefined;
for(let redirects=0;redirects<=3;redirects++){
  if(url.protocol!=='https:'||url.username||url.password||url.port||!(url.hostname==='github.com'||url.hostname==='objects.githubusercontent.com'||url.hostname==='github-production-user-asset-6210df.s3.amazonaws.com')) throw new Error('附件跳转目标不受支持');
  attachment=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});
  if(attachment.status<300||attachment.status>=400)break;
  const next=attachment.headers.get('location');
  await attachment.body?.cancel();
  if(!next)throw new Error('附件跳转缺少地址');
  url=new URL(next,url);
}
if(!attachment?.ok||!attachment.body)throw new Error('下载附件失败');
if(Number(attachment.headers.get('content-length'))>MAX_BYTES)throw new Error('附件超过 256 KiB');
const parts:Uint8Array[]=[];
let size=0;
const reader=attachment.body.getReader();
for(;;){
  const {done,value}=await reader.read();
  if(done)break;
  size+=value.length;
  if(size>MAX_BYTES){await reader.cancel();throw new Error('附件超过 256 KiB');}
  parts.push(value);
}
const bytes=Buffer.concat(parts);
const source=(fields.get('来源')??'').match(/https:\/\/[^\s<>)]+/)?.[0]??'';
importCsv(new TextDecoder('utf-8',{fatal:true}).decode(bytes),'issue-'+issueNumber,fields.get('曲线名称')??'',category,source);
console.log(createHash('sha256').update(bytes).digest('hex'));
