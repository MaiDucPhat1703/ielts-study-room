'use strict';

const get = id => document.getElementById(id);
const settingsKey = 'ielts-study-room/v1';
const drive = 'https://drive.google.com/';
const nameParts = name => {
  const ext = name.split('.').at(-1).toLowerCase();
  const title = name.slice(0, -(ext.length + 1)).replace(/^\d+\s*[-.]?\s*/, '');
  return {ext, title};
};

function prepareCourse(raw) {
  return raw.map(chapter => {
    const files = chapter.files.map(([id, name]) => ({id, name, ...nameParts(name)}));
    const captions = new Map(files.filter(file => file.ext === 'srt').map(file =>
      [file.title.replace(/[_-][a-z]{2}(?:[-_][a-z]{2})?$/i, '').toLowerCase(), file]));
    const lessons = files.filter(file => file.ext !== 'srt').map(file => ({
      ...file, caption: file.ext === 'mp4' ? captions.get(file.title.toLowerCase()) : null,
      chapterId: chapter.id
    }));
    return {...chapter, lessons};
  });
}

function start(raw) {
  const chapters = prepareCourse(raw);
  const lessons = chapters.flatMap(chapter => chapter.lessons);
  const chapterById = new Map(chapters.map(chapter => [chapter.id, chapter]));
  const indexes = new Map(lessons.map((lesson, index) => [lesson.id, index]));
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(settingsKey) || '{}') || {};
  } catch {
    get('feedback').textContent = 'Trình duyệt hiện không đọc được tiến độ đã lưu.';
  }
  const completed = new Set(Array.isArray(saved.completed) ? saved.completed.filter(id => indexes.has(id)) : []);
  const notes = Object.assign(Object.create(null), saved.notes);
  let current;
  let persistenceFailed = false;

  function save() {
    try {
      localStorage.setItem(settingsKey, JSON.stringify({last: current.id, completed: [...completed], notes}));
    } catch {
      if (persistenceFailed) return;
      persistenceFailed = true;
      const notice = get('notes').nextElementSibling;
      notice.textContent = 'Trình duyệt hiện không cho lưu. Ghi chú và tiến độ chỉ giữ đến khi đóng trang.';
    }
  }

  function link(id, text, folder = false) {
    const anchor = document.createElement('a');
    anchor.href = folder ? drive + 'drive/folders/' + id : drive + 'file/d/' + id + '/view';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = text;
    return anchor;
  }

  function renderProgress() {
    const percent = Math.round(completed.size / lessons.length * 100);
    get('progress').value = percent;
    get('progress-text').textContent = percent + '%';
    get('stats').textContent = chapters.length + ' chương · ' + completed.size + '/' + lessons.length + ' bài đã học';
    get('done').textContent = completed.has(current.id) ? '✓ Đã học' : 'Đánh dấu đã học';
    get('done').setAttribute('aria-pressed', String(completed.has(current.id)));
  }

  function renderOutline(forceCurrentOpen = false) {
    const container = get('chapters');
    const oldScroll = container.scrollTop;
    const open = new Set([...container.querySelectorAll('details[open]')].map(node => node.dataset.id));
    const search = get('search').value.trim().toLowerCase();
    const unfinished = get('unfinished').checked;
    const blocks = [];
    for (const chapter of chapters) {
      const matching = chapter.lessons.filter(lesson =>
        (!unfinished || !completed.has(lesson.id)) &&
        (chapter.title.toLowerCase().includes(search) || lesson.name.toLowerCase().includes(search)));
      if (!matching.length) continue;
      const details = document.createElement('details');
      details.dataset.id = chapter.id;
      details.open = Boolean(search) || open.has(chapter.id) || (forceCurrentOpen && chapter.id === current.chapterId);
      const summary = document.createElement('summary');
      summary.append(chapter.title);
      const count = document.createElement('span');
      count.textContent = chapter.lessons.filter(lesson => completed.has(lesson.id)).length + '/' + chapter.lessons.length;
      summary.append(count);
      const list = document.createElement('ul');
      list.className = 'chapter-list';
      for (const lesson of matching) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.lesson = lesson.id;
        if (lesson.id === current.id) button.setAttribute('aria-current', 'step');
        const mark = document.createElement('span');
        mark.className = 'marker';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = completed.has(lesson.id) ? '✓' : ({mp4: '▷', pdf: '▤', html: '↗'}[lesson.ext] || '•');
        button.append(mark, lesson.title);
        item.append(button);
        list.append(item);
      }
      details.append(summary, list);
      blocks.push(details);
    }
    if (!blocks.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Không có bài phù hợp.';
      blocks.push(empty);
    }
    container.replaceChildren(...blocks);
    container.scrollTop = oldScroll;
  }

  function renderLesson() {
    const player = get('player');
    player.replaceChildren();
    const chapter = chapterById.get(current.chapterId);
    get('breadcrumb').textContent = chapter.title;
    get('lesson-title').textContent = current.title;
    document.title = current.title + ' · IELTS Study Room';
    get('notes').value = notes[current.id] || '';
    if (current.ext === 'mp4' || current.ext === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.title = current.title;
      iframe.allow = 'fullscreen';
      iframe.allowFullscreen = true;
      iframe.src = drive + 'file/d/' + current.id + '/preview';
      iframe.referrerPolicy = 'no-referrer';
      if (current.ext === 'pdf') iframe.className = 'document';
      player.append(iframe);
    } else {
      const resource = document.createElement('div');
      resource.className = 'resource-view';
      const label = document.createElement('p');
      label.textContent = 'Mở tài liệu này trong Google Drive.';
      resource.append(label, link(current.id, 'Mở tài liệu ↗'));
      player.append(resource);
    }

    const items = [link(current.id, 'Mở bài trong Drive ↗'), link(chapter.id, 'Xem thư mục chương ↗', true)];
    if (current.caption) items.splice(1, 0, link(current.caption.id, 'Phụ đề tiếng Anh (.srt) ↗'));
    get('materials').replaceChildren(...items.map(anchor => {
      const item = document.createElement('li');
      item.append(anchor);
      return item;
    }));
    const index = indexes.get(current.id);
    get('previous').disabled = index === 0;
    get('next').disabled = index === lessons.length - 1;
  }

  function select(lesson, focus = true) {
    if (!lesson) return;
    current = lesson;
    save();
    renderLesson();
    renderProgress();
    renderOutline(true);
    if (focus) get('lesson-title').focus();
  }

  get('chapters').addEventListener('click', event => {
    const button = event.target.closest('[data-lesson]');
    if (button) select(lessons[indexes.get(button.dataset.lesson)]);
  });
  get('previous').addEventListener('click', () => select(lessons[indexes.get(current.id) - 1]));
  get('next').addEventListener('click', () => select(lessons[indexes.get(current.id) + 1]));
  get('resume').addEventListener('click', () => {
    if (!completed.has(current.id)) return get('lesson-title').focus();
    const next = lessons.slice(indexes.get(current.id) + 1).find(lesson => !completed.has(lesson.id));
    const firstOpen = lessons.find(lesson => !completed.has(lesson.id));
    if (next || firstOpen) select(next || firstOpen);
    else get('feedback').textContent = 'Bạn đã hoàn thành tất cả bài học.';
  });
  get('done').addEventListener('click', () => {
    if (completed.has(current.id)) completed.delete(current.id);
    else completed.add(current.id);
    save();
    renderProgress();
    renderOutline();
    get('feedback').textContent = completed.has(current.id) ? 'Đã lưu hoàn thành bài.' : 'Đã bỏ đánh dấu hoàn thành.';
  });
  get('notes').addEventListener('input', event => {
    const value = event.target.value;
    if (value) notes[current.id] = value;
    else delete notes[current.id];
    save();
  });
  get('search').addEventListener('input', () => renderOutline(true));
  get('unfinished').addEventListener('change', () => renderOutline(true));

  select(lessons[indexes.get(saved.last)] || lessons[0], false);
}

if (Array.isArray(window.IELTS_COURSE) && window.IELTS_COURSE.some(ch => ch.files.length > 0)) {
  start(window.IELTS_COURSE);
} else {
  get('lesson-title').textContent = 'Chưa có danh mục bài học';
  const message = document.createElement('p');
  message.className = 'resource-view';
  message.textContent = 'Cần tệp course.js đi kèm bộ mã nguồn.';
  get('player').append(message);
  for (const id of ['resume', 'previous', 'next', 'done', 'search', 'unfinished', 'notes']) get(id).disabled = true;
}
