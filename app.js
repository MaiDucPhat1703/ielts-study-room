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

const practice = {
  task1: {
    question: 'Sales rose from 40 units in 2020 to 70 in 2023. Which sentence reports that trend accurately?',
    options: ['Sales rose by 70 units.', 'Sales increased by 30 units.', 'Sales fell to 40 units.'],
    answer: 1,
    reason: '70 − 40 = 30. Use “by” for the amount of change and “to” for the final value.',
    task: 'Viết thêm một câu so sánh nếu sản phẩm thứ hai giữ nguyên ở mức 55 đơn vị.'
  },
  task2: {
    question: 'Which sentence develops an argument with a clear mechanism?',
    options: ['Libraries are very important.', 'Libraries should be better.', 'Libraries provide internet access to students who lack a connection at home.'],
    answer: 2,
    reason: 'The sentence explains who benefits and how, so you can support it with an example.',
    task: 'Viết một đoạn 4 câu về lợi ích của thư viện công, có luận điểm, giải thích và ví dụ.'
  },
  speaking: {
    question: 'Which response best develops an answer to “Do you enjoy cooking?”',
    options: ['Yes, I do, especially on weekends because I get to try new recipes.', 'Yes.', 'Cooking is a very popular activity in many countries.'],
    answer: 0,
    reason: 'It answers the question directly and develops it with a specific detail and a reason.',
    task: 'Ghi âm 30 giây trả lời câu hỏi trên, rồi nghe lại để xem bạn đã nêu một chi tiết cụ thể chưa.'
  },
  listening: {
    question: 'You hear “We planned to meet at nine fifteen, but nine fifty works better. Let’s do that.” What time is confirmed?',
    options: ['9:15', '9:50', '10:15'],
    answer: 1,
    reason: 'The first time is the original plan. “Let’s do that” confirms the revised time.',
    task: 'Nhờ một người đọc câu trên một lần. Ghi lại giờ đã chốt và cụm từ báo hiệu lịch thay đổi.'
  },
  reading: {
    question: 'The passage says a museum reopened in May. The statement says it reopened in June. Which answer fits?',
    options: ['True', 'False', 'Not Given'],
    answer: 1,
    reason: 'The passage gives a date that contradicts the statement.',
    task: 'Tự viết một câu True, một câu False và một câu Not Given từ một đoạn đọc bạn vừa học.'
  },
  general: {
    question: 'Which opening fits a formal letter to a building manager you have never met?',
    options: ['Hey, what’s up?', 'Thanks for hanging out.', 'I am writing to report a problem with the heating in my apartment.'],
    answer: 2,
    reason: 'The opening states the purpose politely and uses a formal register.',
    task: 'Viết phần mở đầu của một lá thư yêu cầu sửa chữa, nêu rõ vấn đề và thời điểm bắt đầu.'
  },
  grammar: {
    question: 'Which sentence uses a past tense correctly for a completed event in 2019?',
    options: ['In 2019, the figure rose sharply.', 'In 2019, the figure has risen sharply.', 'In 2019, the figure rises sharply.'],
    answer: 0,
    reason: 'The finished time “in 2019” calls for the past simple in this sentence.',
    task: 'Chọn ba mốc thời gian trong một biểu đồ và viết ba câu mô tả bằng thì phù hợp.'
  },
  vocabulary: {
    question: 'Which collocation sounds natural?',
    options: ['Do progress', 'Make progress', 'Take progress'],
    answer: 1,
    reason: 'In this context, “progress” naturally follows “make”.',
    task: 'Chọn ba cụm từ vừa học. Viết mỗi cụm một câu có ngữ cảnh riêng.'
  },
  overview: {
    question: 'You want to improve how clearly you support an opinion in an essay. Which topic is the best starting point?',
    options: ['Writing Task 2', 'Listening', 'Speaking pronunciation'],
    answer: 0,
    reason: 'Writing Task 2 is where you practise developing and supporting a written argument.',
    task: 'Ghi một kỹ năng cần ưu tiên và chọn một bài cụ thể để luyện trong tuần này.'
  }
};

function practiceFor(chapter) {
  const title = chapter.title.toLowerCase();
  const keyword = Object.entries({
    task1: 'task 1', task2: 'task 2', general: 'general',
    listening: 'listening', reading: 'reading', grammar: 'grammar',
    vocabulary: 'vocabulary', speaking: 'speaking'
  }).find(([, part]) => title.includes(part))?.[0];
  return practice[keyword || (title.includes('phrasal') ? 'vocabulary' : 'overview')];
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

  let activePractice;

  function renderPractice(chapter) {
    activePractice = practiceFor(chapter);
    const legend = document.createElement('legend');
    legend.textContent = activePractice.question;
    const choices = activePractice.options.map((option, index) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'choice';
      radio.value = String(index);
      radio.required = true;
      label.append(radio, option);
      return label;
    });
    get('practice-options').replaceChildren(legend, ...choices);
    get('practice-feedback').textContent = '';
    get('practice-task').textContent = activePractice.task;
  }

  get('practice-form').addEventListener('submit', event => {
    event.preventDefault();
    const answer = Number(new FormData(event.currentTarget).get('choice'));
    get('practice-feedback').textContent =
      (answer === activePractice.answer ? 'Đúng rồi. ' : 'Thử lại nhé. ') + activePractice.reason;
  });

  function renderLesson() {
    const player = get('player');
    player.replaceChildren();
    const chapter = chapterById.get(current.chapterId);
    get('breadcrumb').textContent = chapter.title;
    renderPractice(chapter);
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
  get('practice-form').parentElement.hidden = true;
  for (const id of ['resume', 'previous', 'next', 'done', 'search', 'unfinished', 'notes']) get(id).disabled = true;
}
