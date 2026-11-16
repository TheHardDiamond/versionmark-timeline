import assert from 'node:assert/strict';
import test from 'node:test';
import {parseCsv,parseDate} from '../src/csv';
test('保留原始版本并按 UTC 时间排序',()=>{
  const result=parseCsv('\uFEFF日期;版本\n1718236800000;v1.21.4\n2023-06-07;1.10');
  assert.deepEqual(result.errors,[]);
  assert.deepEqual(result.points.map(p=>[p.version,p.value]),[['1.10',1.1],['v1.21.4',1.21]]);
});
test('拒绝无效日期和不安全来源',()=>{
  assert.throws(()=>parseDate('2025-02-29'));
  assert.throws(()=>parseDate('06/07/2023'));
  const result=parseCsv('date,version,source_url\n2024-01-01,1,javascript:alert(1)');
  assert.match(result.errors[0],/第 2 行/);
});
