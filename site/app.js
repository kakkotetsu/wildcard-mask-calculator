import { calculate, formatIPv4, addressAt, addressesForPage } from './calculator.js';

const $ = id => document.getElementById(id);
const PAGE_SIZE = 64;
const EXPORT_LIMIT = 65536;
const number = value => value.toLocaleString('ja-JP');
let result = null;
let page = 0;
let revision = 0;
let displayed = [];

function renderPage() {
  displayed = addressesForPage(result, page, PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const fragment = document.createDocumentFragment();
  displayed.forEach((address, index) => {
    const item = document.createElement('li');
    const position = document.createElement('span');
    position.className = 'address-index';
    position.textContent = number(start + index + 1).padStart(2, '0');
    position.setAttribute('aria-hidden', 'true');
    const code = document.createElement('code');
    code.textContent = address;
    item.append(position, code);
    fragment.append(item);
  });
  $('address-list').replaceChildren(fragment);
  $('address-list').start = start + 1;
  $('page-range').textContent = `${number(start + 1)}–${number(start + displayed.length)} / ${number(result.count)} 件`;
  const pages = Math.ceil(result.count / PAGE_SIZE);
  $('page-number').textContent = `${number(page + 1)} / ${number(pages)}`;
  $('previous').disabled = page === 0;
  $('next').disabled = page + 1 === pages;
  $('announcement').textContent = `${number(result.count)}件が一致。${number(start + 1)}件目から${number(start + displayed.length)}件目を表示しています。`;
}

function submit() {
  revision += 1;
  try {
    result = calculate($('network').value, $('wildcard').value);
    page = 0;
    $('form-error').hidden = true;
    $('empty-state').hidden = true;
    $('result-content').hidden = false;
    $('result-badge').textContent = '一致するアドレス';
    $('total').textContent = number(result.count);
    $('variable-bits').textContent = result.positions.length;
    $('power').textContent = result.positions.length;
    $('network-result').textContent = `${formatIPv4(result.network)}/${result.prefix}`;
    $('normalized-note').hidden = result.base === result.address;
    $('normalized-note').textContent = `可変ビットを0にした ${formatIPv4(result.base)} を起点に列挙しています。`;
    $('download').disabled = result.count > EXPORT_LIMIT;
    $('export-note').textContent = result.count > EXPORT_LIMIT ? '全件保存は65,536件以下に対応。表示中のコピーは利用できます。' : '1行に1アドレスで保存';
    renderPage();
  } catch (error) {
    result = null;
    displayed = [];
    $('form-error').textContent = error.message;
    $('form-error').hidden = false;
    $('result-content').hidden = true;
    $('empty-state').hidden = false;
    $('result-badge').textContent = '入力を確認';
    $('announcement').textContent = '';
  }
}

$('calculator-form').addEventListener('submit', event => {
  event.preventDefault();
  submit();
});
// Hide stale results as soon as either input changes.
for (const id of ['network', 'wildcard']) {
  $(id).addEventListener('input', () => {
    revision += 1;
    result = null;
    displayed = [];
    $('result-content').hidden = true;
    $('empty-state').hidden = false;
    $('form-error').hidden = true;
    $('result-badge').textContent = '未計算';
    $('announcement').textContent = '';
  });
}
const examples = {
  sparse: ['192.168.1.0/24', '0.0.0.12'],
  subnet: ['192.168.1.0/24', '0.0.0.255'],
  single: ['192.168.1.10/32', '0.0.0.0'],
};
document.querySelectorAll('[data-example]').forEach(button => {
  button.addEventListener('click', () => {
    [$('network').value, $('wildcard').value] = examples[button.dataset.example];
    submit();
  });
});
$('previous').addEventListener('click', () => { if (result && page > 0) { page -= 1; renderPage(); } });
$('next').addEventListener('click', () => { if (result && (page + 1) * PAGE_SIZE < result.count) { page += 1; renderPage(); } });
$('copy').addEventListener('click', async () => {
  if (!result) return;
  const currentRevision = revision;
  const content = displayed.join('\n');
  try {
    await navigator.clipboard.writeText(content);
    if (currentRevision === revision) $('announcement').textContent = '表示中のアドレスをコピーしました。';
  } catch {
    if (currentRevision === revision) $('announcement').textContent = 'コピーできませんでした。アドレスを選択してコピーしてください。';
  }
  if (currentRevision === revision) showCopyMessage($('announcement').textContent);
});

let copyTimer;
function showCopyMessage(message) {
  clearTimeout(copyTimer);
  let toast = document.getElementById('copy-message');
  if (!toast) {
    toast = document.createElement('p');
    toast.id = 'copy-message';
    toast.className = 'toast';
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  copyTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}

$('download').addEventListener('click', () => {
  if (!result || result.count > EXPORT_LIMIT) return;
  const lines = Array.from({ length: result.count }, (_, index) => addressAt(result, index));
  const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `wildcard-${formatIPv4(result.base)}-${formatIPv4(result.wildcard)}.txt`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

submit();
