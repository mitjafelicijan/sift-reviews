const main = document.querySelector('main');

let project = null;
let root = null;

const htmlEntities = (str) => {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const humanFileSize = (bytes, si) => {
  let thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  let units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + ' ' + units[u];
}

const createCommentBox = (path, lineNumber, value = '', lineContent = '') => {
  let commentBox = document.createElement('textarea');
  commentBox.placeholder = 'Insert comment here ...';
  commentBox.spellcheck = true;
  commentBox.value = value;
  commentBox.dataset.path = path;
  commentBox.dataset.lineNumber = lineNumber;
  commentBox.addEventListener('keyup', (evt) => {
    const target = evt.target;
    const key = `${project}:${target.dataset.path}:${target.dataset.lineNumber}`;
    if (target.value !== '') {
      localStorage.setItem(key, JSON.stringify({
        path: target.dataset.path,
        lineContent: lineContent,
        comment: target.value,
        lineNumber: target.dataset.lineNumber,
        created: new Date().toISOString(),
      }));
    } else {
      localStorage.removeItem(key);
    }
  });
  return commentBox;
}

const toCSVSafe = (cell) => {
  return `"${cell.trim().replace(/"/g, '""')}"`;
}

document.querySelector('.export-report').addEventListener('click', (evt) => {
  let reportData = ['Filepath,Line Number,Review Comment,Line Content,Created'];
  for (var i = 0, len = localStorage.length; i < len; i++) {
    const key = localStorage.key(i);
    const data = JSON.parse(localStorage[key]);
    reportData.push([
      toCSVSafe(data.path),
      toCSVSafe(data.lineNumber),
      toCSVSafe(data.comment),
      toCSVSafe(data.lineContent),
      toCSVSafe(data.created),
    ].join());
  }

  window.URL = window.webkitURL || window.URL;
  const contentType = 'text/csv';
  const csvFile = new Blob([reportData.join('\n')], { type: contentType });
  const a = document.createElement('a');
  a.download = `${project}-${new Date().toISOString()}.csv`;
  a.href = window.URL.createObjectURL(csvFile);
  a.textContent = 'Download CSV';
  a.dataset.downloadurl = [contentType, a.download, a.href].join(':');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

document.querySelector('.clear-comments').addEventListener('click', (evt) => {
  if (confirm('Are you sure you want to delete all comments?')) {
    localStorage.clear();
  }
});

fetch('/filelist')
  .then((res) => res.json())
  .then((data) => {
    project = data.project;
    root = data.root;

    document.querySelector('header .project').textContent = data.project;
    document.querySelector('header .items').textContent = data.items.length;
    document.querySelector('header .comments').textContent = localStorage.length;

    setInterval(() => {
      document.querySelector('header .comments').textContent = localStorage.length;
    }, 2000);

    data.items.forEach((item) => {
      let placeholder = document.createElement('section');
      placeholder.classList.add(item.directory ? 'folder' : 'file');

      let element = document.createElement('div');
      let itemText = null;
      let itemIcon = null;

      switch (item.directory) {
        case true: {
          itemText = `${item.path}`;
          itemIcon = 'icon folder';
          break;
        }
        case false: {
          itemText = `${item.path} (${humanFileSize(parseInt(item.size))})`;
          itemIcon = 'icon file';
          break;
        }
      }

      element.innerHTML = `<i class="icon ${itemIcon}"></i> ${itemText}`;
      element.dataset.path = item.path;
      element.dataset.size = item.size;
      element.dataset.directory = item.directory;

      element.addEventListener('click', (evt) => {
        // remove if exists
        let cleanup = evt.target.parentElement.querySelector('summary');
        if (cleanup) {
          cleanup.parentNode.removeChild(cleanup);
        } else {
          if (!JSON.parse(evt.target.dataset.directory)) {
            fetch('/source', {
              mode: 'cors',
              method: 'post',
              headers: { 'Content-Type': 'text/plain' },
              body: evt.target.dataset.path,
            })
              .then((res) => res.text())
              .then((text) => {
                let code = document.createElement('summary');
                text.split('\n').forEach((line, idx) => {
                  // check for comment
                  const key = `${project}:${evt.target.dataset.path}:${idx + 1}`;
                  const originalLine = line;

                  // add line
                  line = htmlEntities(line);
                  line = line.split(/\s\s/).join('<u>▪▪</u>');
                  line = line.split('▪').join('<i>•</i>');
                  line = line.split(' ').join('<i>•</i>');
                  line = line.split('\t').join('<i>➝</i>');

                  let comment = localStorage.getItem(key);
                  let paragraph = document.createElement('p');
                  paragraph.dataset.originalLine = originalLine;
                  paragraph.innerHTML = `<b class="${comment ? 'comment' : ''}">${idx + 1}</b> ${line}`;
                  code.appendChild(paragraph);

                  // add textarea with comments from localstorage
                  if (comment) {
                    comment = JSON.parse(comment);
                    let commentBox = createCommentBox(
                      evt.target.dataset.path,
                      idx + 1,
                      comment.comment, ''
                    );
                    code.appendChild(commentBox);
                  }
                });

                code.querySelectorAll('p b').forEach((line) => {
                  line.addEventListener('click', (evt) => {
                    let parent = evt.target.parentElement.parentElement.parentElement.querySelector('div');
                    let line = evt.target.parentElement;
                    let commentBox = null;

                    if (evt.target.classList.contains('comment')) {
                      evt.target.classList.remove('comment');
                      commentBox = evt.target.parentElement.parentElement.querySelector(`[data-line-number="${evt.target.innerText}"]`);
                      if (commentBox.value !== '') {
                        if (confirm('Are you sure you want to delete this comment?')) {
                          localStorage.removeItem(`${project}:${commentBox.dataset.path}:${commentBox.dataset.lineNumber}`);
                          commentBox.parentNode.removeChild(commentBox);
                        }
                      } else {
                        commentBox.parentNode.removeChild(commentBox);
                      }
                    } else {
                      evt.target.classList.add('comment');
                      commentBox = createCommentBox(
                        parent.dataset.path,
                        line.querySelector('b').innerText,
                        '',
                        evt.target.parentElement.dataset.originalLine);
                      line.parentNode.insertBefore(commentBox, line.nextSibling);
                      commentBox.focus();
                    }
                  });
                });

                placeholder.appendChild(code);
              })
          }
        }
      });

      placeholder.appendChild(element);
      main.appendChild(placeholder);
    });
  });
