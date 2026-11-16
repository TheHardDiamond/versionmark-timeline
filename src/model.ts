export type Category = 'ai' | 'games' | 'os' | 'hardware';
export type Metric = 'version' | 'build' | 'model' | 'week' | 'pack';
export interface Point {
  date: string; version: string; value: number; source: string;
  releaseKind?: 'announcement' | 'preview' | 'stable'; relatedVersion?: string;
}
export interface Series {
  id: string; name: string; category: Category; metric: Metric;
  description: string; coverage: string; updatedAt: string; points: Point[];
}
export interface DisplaySeries extends Series { origin: 'published' | 'temporary'; color: string }
export const REPO = 'TheHardDiamond/versionmark-timeline';
export const REPO_URL = `https://github.com/${REPO}`;
export const DISCLAIMER = '* 为用户临时加载的数据，未经本项目审核，不代表权威数据。';
export const BRANDING = `由 Versionmark Timeline 生成 · github.com/${REPO}`;
export const CATEGORY_LABELS: Record<Category, string> = { ai: 'AI 模型', games: '游戏', os: '操作系统', hardware: '硬件' };
export const METRIC_LABELS: Record<Metric, string> = { version: '版本号', build: 'Build 编号', model: '型号数字', week: '快照周数', pack: '包格式版本' };
export const CLASSIC = ['gpt','claude','glm','grok','deepseek','qwen','gemini','genshin','minecraft'];
export const PALETTE = ['#2f9367','#bd8642','#cf5266','#3f4854','#397dc4','#9360b2','#269995','#b7a336','#8d6c52','#cf548e','#5d71c8','#1c8191','#76923e','#ce7445','#7558a0','#a45d76','#4b7c7e','#668a35','#537cba','#9b7339','#39735e','#9b538e','#6c778d'];
export function displayName(s: DisplaySeries) { return s.origin === 'temporary' ? s.name.replace(/\*+\s*$/, '').trim() + ' *' : s.name; }
export function safeUrl(value: string): boolean { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }
export function escapeHtml(value: unknown): string { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!)); }
