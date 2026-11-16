import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/csv';
import { safeUrl, CATEGORY_LABELS, type Category, type Series } from '../src/model';
export function importCsv(csv: string, id: string, name: string, category: Category, source: string): string {
  if (!/^issue-[1-9]\d*$/.test(id) || !name.trim() || name.length>80 || !Object.hasOwn(CATEGORY_LABELS,category)) throw new Error('曲线元数据无效');
  const {points,errors}=parseCsv(csv);
  if(errors.length) throw new Error(errors.slice(0,10).join('\n'));
  const today=new Date().toISOString();
  for(const point of points){
    point.source ||= source;
    if(!safeUrl(point.source) || point.date>today) throw new Error('每个节点必须有 HTTPS 来源以及已经发生的发布时间');
  }
  const series:Series={id,name:name.trim(),category,metric:'version',description:'社区投稿',coverage:'收录投稿中通过审核的版本。',updatedAt:points.at(-1)!.date.slice(0,10),points};
  const file='data/'+id+'.json';
  writeFileSync(file,JSON.stringify([series],null,2)+'\n');
  return file;
}
if(process.argv[1]?.endsWith('import-csv.ts')){
  const [, ,file,id,name,category,source='']=process.argv;
  console.log(importCsv(readFileSync(file,'utf8'),id,name,category as Category,source));
}
