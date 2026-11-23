// The demo routes known tasks to local tools. No input leaves the browser.
const form = document.querySelector('#run-form');
const scenario = document.querySelector('#scenario');
const draft = document.querySelector('#draft');
const trace = document.querySelector('#trace-list');
const status = document.querySelector('#status');
const empty = document.querySelector('#empty');
const approval = document.querySelector('#approval');
const retry = document.querySelector('#retry');
let run;

function addStep(name, output) {
  const row = document.createElement('li');
  const tool = document.createElement('code');
  const detail = document.createElement('p');
  tool.textContent = name;
  detail.textContent = output;
  row.append(tool, detail);
  trace.append(row);
  empty.hidden = true;
}

function inspectDraft(text) {
  const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);
  return { lines: lines.length, characters: [...text.replace(/\s/g, '')].length, title: lines[0] };
}

function findPhrases(text) {
  const terms = ['全网第一', '史上最强', '百分之百', '包过'];
  return text.split(/\n/).flatMap((line, index) =>
    terms.filter(term => line.includes(term)).map(term => ({ line: index + 1, term }))
  );
}

function review() {
  run.findings = findPhrases(run.text);
  addStep('check_phrases', run.findings.length
    ? run.findings.map(hit => `第 ${hit.line} 行 · ${hit.term}`).join('\n')
    : '当前稿件未命中演示词表。');
  if (run.scenario === 'export') {
    status.textContent = '等待确认';
    addStep('export_report', '已准备检查报告，等待用户确认。');
    approval.hidden = false;
  } else {
    status.textContent = '检查完成';
  }
}

function reset() {
  run = null;
  trace.replaceChildren();
  empty.hidden = false;
  approval.hidden = true;
  retry.hidden = true;
  status.textContent = '等待运行';
}

form.addEventListener('input', reset);
form.addEventListener('submit', event => {
  event.preventDefault();
  reset();
  const text = draft.value.trim();
  if (!text) {
    status.textContent = '请输入稿件';
    draft.focus();
    return;
  }
  run = { text, scenario: scenario.value, stats: inspectDraft(text) };
  addStep('plan', run.scenario === 'export' ? '检查稿件 → 标记词汇 → 确认后导出' : '检查稿件 → 标记词汇');
  addStep('inspect_draft', `${run.stats.title} · ${run.stats.lines} 行 / ${run.stats.characters} 字符`);
  if (run.scenario === 'retry') {
    addStep('check_phrases', '演示故障：词库暂时不可用。已保留输入和上一步输出。');
    status.textContent = '检查中断';
    retry.hidden = false;
    return;
  }
  review();
});

retry.addEventListener('click', () => {
  retry.hidden = true;
  addStep('retry', '使用当前输入重试词汇检查。');
  review();
  status.focus({ preventScroll: true });
});

document.querySelector('#approve').addEventListener('click', () => {
  if (!run || approval.hidden) return;
  const report = { title: run.stats.title, characters: run.stats.characters, findings: run.findings };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'draft-check-report.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  approval.hidden = true;
  addStep('export_report', '已触发 JSON 下载。');
  status.textContent = '已确认导出';
  status.focus({ preventScroll: true });
});
document.querySelector('#reject').addEventListener('click', () => {
  if (!run || approval.hidden) return;
  approval.hidden = true;
  addStep('export_report', '用户取消导出。');
  status.textContent = '已取消导出';
  status.focus({ preventScroll: true });
});
