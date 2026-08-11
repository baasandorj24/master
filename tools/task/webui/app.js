'use strict';

// CSRF token нь зөвхөн энэ хуудасны HTML дотор ирдэг. Өөр origin түүнийг
// уншиж чадахгүй тул өгөгдөл өөрчлөх хүсэлт гаднаас илгээгдэх боломжгүй.
const CSRF = document.querySelector('meta[name="csrf-token"]').content;
const READ_ONLY = document.querySelector('meta[name="read-only"]').content === '1';

const PRIORITY_LABEL = { low: 'бага', med: 'дунд', high: 'өндөр', urgent: 'яаралтай' };
const STATUS_LABEL = {
  todo: 'хүлээгдэж буй', doing: 'хийгдэж буй',
  done: 'дууссан', cancelled: 'цуцлагдсан',
};
const VIEWS = [
  { key: 'open', label: 'Нээлттэй', count: 'open' },
  { key: 'today', label: 'Өнөөдөр', count: 'today' },
  { key: 'overdue', label: 'Хоцорсон', count: 'overdue', alert: true },
  { key: 'week', label: '7 хоног', count: 'week' },
  { key: 'done', label: 'Дууссан', count: 'done' },
  { key: 'all', label: 'Бүгд', count: 'total' },
];

const el = (id) => document.getElementById(id);
const state = { view: 'open', query: '', tag: '', data: null, editing: null };

// ---------------------------------------------------------------- сүлжээ

async function api(path, options = {}) {
  const opts = {
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': CSRF },
    ...options,
  };
  if (options.body !== undefined) {
    opts.headers = { ...opts.headers, 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(options.body);
  }
  const response = await fetch(path, opts);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Алдаа ${response.status}`);
  return payload;
}

function apply(data) {
  state.data = data;
  render();
}

async function refresh() {
  const params = new URLSearchParams({ view: state.view });
  if (state.query) params.set('q', state.query);
  if (state.tag) params.set('tag', state.tag);
  try {
    apply(await api(`/api/state?${params}`));
  } catch (err) {
    toast(err.message);
  }
}

async function mutate(path, options) {
  try {
    await api(path, options);
    await refresh();
    return true;
  } catch (err) {
    toast(err.message);
    return false;
  }
}

// --------------------------------------------------------------- дүрслэл

function dueText(task) {
  if (!task.due) return { text: '', cls: '' };
  const left = task.days_left;
  if (!task.open) return { text: task.due, cls: '' };
  if (left < 0) return { text: `${Math.abs(left)} хоног хоцорсон`, cls: 'overdue' };
  if (left === 0) return { text: 'өнөөдөр', cls: 'soon' };
  if (left === 1) return { text: 'маргааш', cls: 'soon' };
  if (left <= 7) return { text: `${left} хоногийн дараа`, cls: 'soon' };
  return { text: task.due, cls: '' };
}

function taskRow(task) {
  const li = document.createElement('li');
  li.className = 'task' + (task.open ? '' : ' closed');
  li.dataset.id = task.id;

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = !task.open;
  box.disabled = READ_ONLY;
  box.title = 'Дууссан болгох';
  box.addEventListener('change', () => setStatus(task.id, box.checked ? 'done' : 'todo'));
  li.append(box);

  const id = document.createElement('span');
  id.className = 'id';
  id.textContent = '#' + task.id;
  li.append(id);

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = task.title;
  title.title = 'Засах бол дарна уу';
  title.addEventListener('click', () => openEditor(task));
  if (task.note) {
    const note = document.createElement('small');
    note.className = 'note';
    note.textContent = task.note;
    title.append(note);
  }
  li.append(title);

  if (task.status === 'doing') {
    const mark = document.createElement('span');
    mark.className = 'badge doing';
    mark.textContent = 'хийгдэж буй';
    li.append(mark);
  }

  const prio = document.createElement('span');
  prio.className = `badge p-${task.priority}`;
  prio.textContent = PRIORITY_LABEL[task.priority];
  li.append(prio);

  const due = dueText(task);
  if (due.text) {
    const chip = document.createElement('span');
    chip.className = 'due ' + due.cls;
    chip.textContent = due.text;
    chip.title = task.due;
    li.append(chip);
  }

  if (task.tags.length) {
    const tags = document.createElement('span');
    tags.className = 'tags';
    task.tags.forEach((name) => {
      const chip = document.createElement('span');
      chip.textContent = '#' + name;
      tags.append(chip);
    });
    li.append(tags);
  }

  if (!READ_ONLY) {
    const actions = document.createElement('span');
    actions.className = 'actions';
    if (task.open) {
      actions.append(button(task.status === 'doing' ? '⏸' : '▶',
        task.status === 'doing' ? 'Хүлээлгэх' : 'Эхлүүлэх',
        () => setStatus(task.id, task.status === 'doing' ? 'todo' : 'doing')));
    }
    const remove = button('✕', 'Устгах', () => removeTask(task));
    remove.classList.add('del');
    actions.append(remove);
    li.append(actions);
  }

  return li;
}

function button(label, title, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.title = title;
  btn.addEventListener('click', onClick);
  return btn;
}

function renderViews() {
  const nav = el('views');
  nav.replaceChildren();
  VIEWS.forEach((view) => {
    const count = state.data.counts[view.count] || 0;
    const btn = button(view.label, '', () => { state.view = view.key; refresh(); });
    btn.setAttribute('aria-current', String(state.view === view.key));
    if (view.alert && count > 0) btn.classList.add('alert');
    const badge = document.createElement('span');
    badge.className = 'count';
    badge.textContent = count;
    btn.append(badge);
    nav.append(btn);
  });
}

function renderTags() {
  const bar = el('tagbar');
  bar.replaceChildren();
  state.data.tags.forEach(([name, count]) => {
    const btn = button(`#${name} ${count}`, '', () => {
      state.tag = state.tag === name ? '' : name;
      refresh();
    });
    btn.setAttribute('aria-pressed', String(state.tag === name));
    bar.append(btn);
  });
}

function render() {
  const { tasks, counts } = state.data;
  renderViews();
  renderTags();

  el('tasks').replaceChildren(...tasks.map(taskRow));
  el('empty').hidden = tasks.length > 0;

  const summary = el('summary');
  summary.replaceChildren();
  const parts = [
    `${tasks.length} таск харагдаж байна`,
    `нээлттэй ${counts.open}`,
    `дууссан ${counts.done}`,
  ];
  if (counts.overdue) parts.push(`хоцорсон ${counts.overdue}`);
  if (READ_ONLY) parts.push('зөвхөн унших горим');
  summary.append(document.createTextNode(parts.join(' · ')));
  const file = document.createElement('code');
  file.textContent = state.data.storeFile;
  summary.append(file);

  document.title = counts.open ? `(${counts.open}) Таск удирдлага` : 'Таск удирдлага';
}

// ---------------------------------------------------------------- үйлдэл

function setStatus(id, status) {
  return mutate(`/api/tasks/${id}?view=${state.view}`,
    { method: 'PATCH', body: { status } });
}

function removeTask(task) {
  if (!confirm(`#${task.id} "${task.title}" — устгах уу?`)) return;
  mutate(`/api/tasks/${task.id}?view=${state.view}`, { method: 'DELETE' });
}

async function addTask(event) {
  event.preventDefault();
  const title = el('new-title').value.trim();
  if (!title) return;
  const ok = await mutate('/api/tasks', {
    method: 'POST',
    body: {
      title,
      priority: el('new-priority').value,
      due: el('new-due').value.trim(),
      tags: el('new-tags').value,
    },
  });
  if (ok) {
    el('new-title').value = '';
    el('new-due').value = '';
    el('new-tags').value = '';
    el('new-title').focus();
    toast('Нэмэгдлээ', true);
  }
}

function openEditor(task) {
  if (READ_ONLY) return;
  state.editing = task.id;
  el('edit-id').textContent = '#' + task.id;
  el('edit-title').value = task.title;
  el('edit-priority').value = task.priority;
  el('edit-status').value = task.status;
  el('edit-due').value = task.due || '';
  el('edit-tags').value = task.tags.join(', ');
  el('edit-note').value = task.note || '';
  el('edit-dialog').showModal();
  el('edit-title').focus();
}

async function saveEditor() {
  const title = el('edit-title').value.trim();
  if (!title) { toast('Гарчиг хоосон байна.'); return; }
  const ok = await mutate(`/api/tasks/${state.editing}?view=${state.view}`, {
    method: 'PATCH',
    body: {
      title,
      priority: el('edit-priority').value,
      status: el('edit-status').value,
      due: el('edit-due').value.trim(),
      tags: el('edit-tags').value,
      note: el('edit-note').value,
    },
  });
  if (ok) el('edit-dialog').close();
}

let toastTimer = null;
function toast(message, ok = false) {
  const box = el('toast');
  box.textContent = message;
  box.classList.toggle('ok', ok);
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, ok ? 1500 : 4000);
}

// -------------------------------------------------------------- эхлүүлэх

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

el('new-task').addEventListener('submit', addTask);
if (READ_ONLY) el('new-task').classList.add('readonly');

el('search').addEventListener('input', debounce((event) => {
  state.query = event.target.value.trim();
  refresh();
}, 200));

el('edit-save').addEventListener('click', saveEditor);
el('edit-cancel').addEventListener('click', () => el('edit-dialog').close());
el('edit-form').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
    event.preventDefault();
    saveEditor();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, select')) return;
  if (event.key === '/') { event.preventDefault(); el('search').focus(); }
  if (event.key === 'n' && !READ_ONLY) { event.preventDefault(); el('new-title').focus(); }
  if (event.key === 'r') refresh();
});

window.addEventListener('focus', refresh);
setInterval(() => { if (!document.hidden) refresh(); }, 20000);

refresh();
