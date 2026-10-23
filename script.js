'use strict';

const STORAGE_KEY = 'student-task-manager.tasks.v1';
const MAX_TASK_LENGTH = 200;
const form = document.getElementById('taskForm');
const input = document.getElementById('taskInput');
const error = document.getElementById('formError');
const list = document.getElementById('taskList');
const count = document.getElementById('taskCount');
const storageStatus = document.getElementById('storageStatus') || (() => {
  const status = document.createElement('p');
  status.className = 'error';
  status.setAttribute('role', 'status');
  count.after(status);
  return status;
})();
const filters = [...document.querySelectorAll('.filter-btn')];
let activeFilter = 'all';
let tasks = loadTasks();

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];
    const parsed = JSON.parse(saved);
    const ids = new Set();
    if (!Array.isArray(parsed) || !parsed.every(task => {
      if (!task || typeof task.id !== 'string' || !task.id.trim() || ids.has(task.id) ||
          typeof task.title !== 'string' || !task.title.trim() || task.title.length > MAX_TASK_LENGTH ||
          typeof task.completed !== 'boolean') return false;
      ids.add(task.id);
      return true;
    })) throw new Error('Invalid saved tasks');
    return parsed;
  } catch {
    storageStatus.textContent = 'Saved tasks could not be loaded. You can still use the task manager.';
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageStatus.textContent = '';
  } catch {
    storageStatus.textContent = 'Tasks could not be saved. Keep this page open to retain your changes.';
  }
}

function renderTasks() {
  list.replaceChildren();
  const visible = tasks.filter(task => activeFilter === 'all' ||
    (activeFilter === 'completed' ? task.completed : !task.completed));

  if (visible.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = activeFilter === 'all' ? 'No tasks yet. Add your first task!' : `No ${activeFilter} tasks.`;
    list.append(empty);
  }

  for (const task of visible) {
    const item = document.createElement('li');
    item.className = task.completed ? 'task completed' : 'task';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.id = `task-${task.id}`;
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      saveTasks();
      renderTasks();
      restoreFocus(task.id, 'input');
    });
    const title = document.createElement('label');
    title.className = 'title';
    title.htmlFor = checkbox.id;
    title.textContent = task.title;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-btn';
    remove.textContent = '\u00d7';
    remove.setAttribute('aria-label', `Delete ${task.title}`);
    remove.addEventListener('click', () => {
      const next = visible[visible.indexOf(task) + 1] || visible[visible.indexOf(task) - 1];
      tasks = tasks.filter(entry => entry.id !== task.id);
      saveTasks();
      renderTasks();
      restoreFocus(next?.id, 'button');
    });
    item.dataset.id = task.id;
    item.append(checkbox, title, remove);
    list.append(item);
  }
  const completed = tasks.filter(task => task.completed).length;
  count.textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} total · ${tasks.length - completed} pending · ${completed} completed`;
}

function restoreFocus(id, selector) {
  const row = [...list.children].find(item => item.dataset.id === id);
  (row?.querySelector(selector) || filters.find(button => button.dataset.filter === activeFilter)).focus();
}

function normalizeTitle(value) {
  return value.trim().replace(/\s+/gu, ' ');
}

function validationMessage(value) {
  const title = normalizeTitle(value);
  if (!title) return 'Please enter a task.';
  if (value.length > MAX_TASK_LENGTH) return `Please keep tasks within ${MAX_TASK_LENGTH} characters.`;
  if (tasks.some(task => normalizeTitle(task.title).toLowerCase() === title.toLowerCase())) {
    return 'This task already exists. Please enter a different task.';
  }
  return '';
}

function showValidation(message) {
  error.textContent = message;
  if (message) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const message = validationMessage(input.value);
  showValidation(message);
  if (message) {
    input.focus();
    return;
  }
  const title = normalizeTitle(input.value);
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  tasks.push({ id, title, completed: false });
  input.value = '';
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  // Show the new task even when the completed filter was selected.
  setFilter('all');
  saveTasks();
  input.focus();
});

input.addEventListener('input', () => {
  // Recheck an invalid entry as the student corrects it.
  if (error.textContent || input.value.length > MAX_TASK_LENGTH) {
    showValidation(validationMessage(input.value));
  }
});

function setFilter(filter) {
  activeFilter = filter;
  for (const button of filters) {
    const active = button.dataset.filter === filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  renderTasks();
}
for (const button of filters) button.addEventListener('click', () => setFilter(button.dataset.filter));

const tips = [
  'Break large assignments into small, manageable tasks.',
  'Study for 25 minutes, then take a short break.',
  'Start with the most important task on your list.',
  'Keep your phone out of reach during focused study.',
  'Review your notes soon after class to reinforce learning.',
  'Plan tomorrow\'s priorities before finishing today.',
  'Make time for rest, water, and a little movement.'
];
function updateDailyTip() {
  const now = new Date();
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  document.getElementById('dailyTip').textContent = tips[day % tips.length];
}
updateDailyTip();
setInterval(updateDailyTip, 60000);
renderTasks();
