import Papa from 'papaparse';
import { safeUrl, type Point } from './model';
export const MAX_BYTES = 256 * 1024;
export const MAX_ROWS = 2000;
export interface CsvResult { points: Point[]; errors: string[]; warnings: string[] }
export function parseDate(raw: string): string {
  const v = raw.trim();
  let ms: number;
  if (/^\d{10}$/.test(v)) ms = Number(v) * 1000;
  else if (/^\d{13}$/.test(v)) ms = Number(v);
  else {
    const dateOnly = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(v);
    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      const normalized = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      ms = Date.parse(normalized + 'T00:00:00Z');
      if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0,10) !== normalized) throw new Error('日期不存在');
    } else {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)) throw new Error('请使用 YYYY-MM-DD、带时区的 ISO 时间或 10/13 位时间戳');
      const day = v.slice(0,10);
      if (new Date(day + 'T00:00:00Z').toISOString().slice(0,10) !== day) throw new Error('日期不存在');
      ms = Date.parse(v);
    }
  }
  if (!Number.isFinite(ms) || ms < Date.UTC(1970,0,1) || ms > Date.UTC(2200,0,1)) throw new Error('日期超出支持范围');
  return new Date(ms).toISOString();
}
export function versionValue(raw: string): number {
  const v = raw.trim();
  if (!v || v.length > 120) throw new Error('版本号为空或过长');
  if (/^\d{2}w\d{2}[a-z]$/i.test(v)) throw new Error('快照周数属于特殊口径，请先将第二列改为要绘制的周数');
  const match = v.match(/\d+(?:\.\d+)?/);
  if (!match || /^-\d/.test(v)) throw new Error('版本号需要包含非负数字');
  const n = Number(match[0]);
  if (!Number.isFinite(n) || n > 1e9) throw new Error('版本数值超出范围');
  return n;
}
export function parseCsv(text: string): CsvResult {
  const result: CsvResult = { points: [], errors: [], warnings: [] };
  if (new TextEncoder().encode(text).length > MAX_BYTES) return {...result, errors:['文件超过 256 KiB']};
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/,''), { skipEmptyLines: 'greedy', dynamicTyping: false, delimitersToGuess:[',',';','\t','|'] });
  result.errors.push(...parsed.errors.filter(e=>e.code !== 'UndetectableDelimiter').map(e=>`第 ${(e.row ?? 0)+1} 行：${e.message}`));
  const rows = parsed.data;
  const hasHeader = rows.length > 0 && /^(date|time|timestamp|datetime|时间|日期|时间戳)$/i.test(rows[0][0]?.trim()) && /^(version|版本|版本号)$/i.test(rows[0][1]?.trim());
  const data = hasHeader ? rows.slice(1) : rows;
  if (!data.length) result.errors.push('没有可加载的记录');
  if (data.length > MAX_ROWS) return {...result, errors:[...result.errors, '最多支持 2,000 条记录']};
  const seen = new Set<string>();
  data.forEach((row, index) => {
    const line = index + (hasHeader ? 2 : 1);
    try {
      if (row.length < 2 || row.length > 3) throw new Error('需要 2 列，或包含 source_url 的 3 列');
      const date = parseDate(row[0]);
      const version = row[1].trim();
      const value = versionValue(version);
      const source = row[2]?.trim() ?? '';
      if (source && !safeUrl(source)) throw new Error('来源必须为有效 HTTPS 链接');
      const key = `${date}|${version}`;
      if (seen.has(key)) { result.warnings.push(`第 ${line} 行：重复记录已忽略`); return; }
      seen.add(key);
      result.points.push({date,version,value,source});
    } catch (e) { result.errors.push(`第 ${line} 行：${(e as Error).message}`); }
  });
  if (result.points.some(p=>Date.parse(p.date)>Date.now())) result.warnings.push('包含未来日期：可本地预览，但不能作为已发布数据收录。');
  result.points.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  return result;
}
export function normalizedCsv(points: Point[]) {
  return Papa.unparse({ fields:['date','version','source_url'], data:points.map(p=>[p.date,p.version,p.source]) }, {escapeFormulae:true});
}
