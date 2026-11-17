import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { CATEGORY_LABELS, METRIC_LABELS, safeUrl, type Series } from '../src/model';
import { parseDate } from '../src/csv';

const ids = new Set<string>();
let points = 0;
for (const file of readdirSync('data').filter(name=>name.endsWith('.json'))) {
  const series = JSON.parse(readFileSync('data/'+file,'utf8').replace(/^\uFEFF/,'')) as Series[];
  assert(Array.isArray(series), file);
  assert(series.length === 1 && file === series[0].id+'.json', file+' 必须且只能存放同名曲线');
  for (const line of series) {
    assert(/^[a-z0-9][a-z0-9-]*$/.test(line.id) && !ids.has(line.id), line.id);
    ids.add(line.id);
    assert(Object.hasOwn(CATEGORY_LABELS,line.category) && Object.hasOwn(METRIC_LABELS,line.metric), line.id);
    assert(line.name && line.description && line.coverage && line.points.length, line.id);
    let previous = '';
    const seen = new Set<string>();
    for (const point of line.points) {
      const time = parseDate(point.date);
      assert(time >= previous && time <= new Date().toISOString(), line.id+' '+point.date);
      assert(point.version && Number.isFinite(point.value) && point.value >= 0 && safeUrl(point.source), line.id+' '+point.version);
      const key = time+'|'+point.version;
      assert(!seen.has(key), line.id+' 重复：'+key);
      seen.add(key);
      previous=time;
      points++;
    }
  }
}
console.log(ids.size+' 条曲线，'+points+' 个节点通过结构检查');
