const main = document.querySelector('main');

let project = null;
let root = null;

const htmlEntities = (str) => {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const createCommentBox = (path, lineNumber, value = '') => {
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
      localStorage.setItem(key, target.value);
    } else {
      localStorage.removeItem(key);
    }
  });
  return commentBox;
}

document.querySelector('.export-report').addEventListener('click', (evt) => {
  let reportData = ['Filepath,Line Number,Review Comment'];
  for (var i = 0, len = localStorage.length; i < len; i++) {
    const key = localStorage.key(i);
    const value = localStorage[key];
    let data = key.split(':');
    if (data[0] === project) {
      data.shift();
      data.push(value);
      reportData.push(data.join());
    }
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
      let icon = item.directory ? 'fas fa-folder' : 'far fa-sticky-note';
      element.innerHTML = `<i class="icon ${icon}"></i> ${item.path}`;
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
                  const key = `${project}:${evt.target.dataset.path}:${idx + 1}`
                  const comment = localStorage.getItem(key);

                  // add line
                  line = htmlEntities(line);
                  line = line.split(' ').join('<i>•</i>');
                  line = line.split('\t').join('<i>➝</i>');
                  let paragraph = document.createElement('p');
                  paragraph.innerHTML = `<b class="${comment ? 'comment' : ''}">${idx + 1}</b> ${line}`;
                  code.appendChild(paragraph);

                  // add textarea with comments from localstorage
                  if (comment) {
                    let commentBox = createCommentBox(evt.target.dataset.path, idx + 1, comment);
                    code.appendChild(commentBox);
                  }
                });

                code.querySelectorAll('p b').forEach((line) => {
                  line.addEventListener('click', (evt) => {
                    if (evt.target.classList.contains('comment')) {
                      console.log('already has it');
                    } else {
                      evt.target.classList.add('comment');

                      let parent = evt.target.parentElement.parentElement.parentElement.querySelector('div');
                      let line = evt.target.parentElement;
                      let commentBox = createCommentBox(parent.dataset.path, line.querySelector('b').innerText);

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
