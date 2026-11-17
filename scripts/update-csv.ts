import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/csv';
import { safeUrl, type Series } from '../src/model';

const [, , file, id, source = ''] = process.argv;
if (!file || !/^[a-z0-9][a-z0-9-]*$/.test(id ?? '')) {
  throw new Error('用法：npm run update:csv -- 更新.csv 曲线ID [默认来源]');
}
const path = 'data/'+id+'.json';
const [series] = JSON.parse(readFileSync(path, 'utf8')) as Series[];
if (series?.id !== id) throw new Error('曲线文件与 ID 不匹配');
if (series.metric !== 'version') throw new Error('该曲线有专用绘图规则，请直接修改数据文件并核对 value');
const result = parseCsv(readFileSync(file, 'utf8'));
if (result.errors.length) throw new Error(result.errors.join('\n'));
const points = [...series.points];
const now = new Date().toISOString();
for (const point of result.points) {
  point.source ||= source;
  if (!safeUrl(point.source) || point.date > now) throw new Error('每条记录必须有 HTTPS 来源且发布日期已到');
  const matches = points.flatMap((old, index) => old.version === point.version ? [index] : []);
  if (matches.length > 1) throw new Error('版本重复，请手动指定更新的原节点：'+point.version);
  if (matches.length) {
    const index = matches[0];
    points[index] = { ...points[index], date: point.date, source: point.source };
  } else {
    points.push(point);
  }
}
series.points = points.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
series.updatedAt = now.slice(0,10);
writeFileSync(path, JSON.stringify([series], null, 2)+'\n');
