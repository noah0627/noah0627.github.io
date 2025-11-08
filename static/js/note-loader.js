// 配置项
const CONFIG = {
    NOTE_FILE_URL: "https://noah0627.github.io/files/website/note.txt",
    MAX_WORD_COUNT: 500, // 最大留言字数限制
    STORAGE_KEY: "noah_site_notes" // 本地存储键名
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化留言加载
    initNoteLoader();
    // 初始化留言提交
    initNoteSubmit();
});

/**
 * 初始化留言加载功能
 */
function initNoteLoader() {
    const noteContentElem = document.getElementById("noteContent");
    const noteUpdateTimeElem = document.getElementById("noteUpdateTime");

    if (!noteContentElem || !noteUpdateTimeElem) {
        console.error("留言展示元素未找到");
        return;
    }

    // 加载中状态
    noteContentElem.innerHTML = '<div class="note-error">留言加载中，请稍候...</div>';
    noteUpdateTimeElem.textContent = "加载中...";

    // 优先加载本地存储的留言（如果有）
    const localNotes = getLocalNotes();
    if (localNotes.length > 0) {
        renderNotes(localNotes);
        noteUpdateTimeElem.textContent = `最后更新：${new Date().toLocaleString()}`;
    }

    // 同时请求远程文件，更新最新留言
    fetch(CONFIG.NOTE_FILE_URL)
        .then(response => {
            if (!response.ok) throw new Error(`请求失败 (${response.status})`);
            return response.text();
        })
        .then(remoteNoteText => {
            const remoteNotes = parseRemoteNotes(remoteNoteText);
            // 合并本地和远程留言，去重后渲染
            const allNotes = mergeAndDeduplicateNotes(remoteNotes, localNotes);
            renderNotes(allNotes);
            noteUpdateTimeElem.textContent = `最后更新：${new Date().toLocaleString()}`;
        })
        .catch(error => {
            console.error("远程留言加载失败：", error);
            // 若本地有留言，保持本地留言显示；若无则显示错误
            if (localNotes.length === 0) {
                noteContentElem.innerHTML = `<div class="note-error">留言加载失败：${error.message}</div>`;
                noteUpdateTimeElem.textContent = "加载失败";
            }
        });
}

/**
 * 初始化留言提交功能
 */
function initNoteSubmit() {
    const form = document.getElementById("noteSubmitForm");
    const contentInput = document.getElementById("noteContentInput");
    const wordCountElem = document.getElementById("wordCount");
    const submitResultElem = document.getElementById("submitResult");

    if (!form || !contentInput || !wordCountElem || !submitResultElem) {
        console.error("留言提交表单元素未找到");
        return;
    }

    // 字数统计
    contentInput.addEventListener("input", function() {
        const length = this.value.length;
        const count = Math.min(length, CONFIG.MAX_WORD_COUNT);
        this.value = this.value.substring(0, CONFIG.MAX_WORD_COUNT); // 截断超出字数
        wordCountElem.textContent = `${count}/${CONFIG.MAX_WORD_COUNT}字`;
    });

    // 表单提交
    form.addEventListener("submit", function(e) {
        e.preventDefault(); // 阻止默认提交

        const author = document.getElementById("noteAuthor").value.trim();
        const content = contentInput.value.trim();

        // 验证
        if (!author) {
            showSubmitResult("请输入昵称", "error");
            return;
        }
        if (!content) {
            showSubmitResult("请输入留言内容", "error");
            return;
        }

        // 创建留言对象
        const newNote = {
            id: Date.now().toString(), // 用时间戳作为唯一ID
            author: author,
            content: content,
            time: new Date().toLocaleString()
        };

        // 保存到本地存储
        const localNotes = getLocalNotes();
        localNotes.unshift(newNote); // 新增留言放在最前面
        saveLocalNotes(localNotes);

        // 重新渲染留言列表
        const noteContentElem = document.getElementById("noteContent");
        const noteUpdateTimeElem = document.getElementById("noteUpdateTime");
        renderNotes(localNotes);
        noteUpdateTimeElem.textContent = `最后更新：${new Date().toLocaleString()}`;

        // 提交成功提示
        showSubmitResult("留言提交成功！", "success");
        // 重置表单
        form.reset();
        wordCountElem.textContent = `0/${CONFIG.MAX_WORD_COUNT}字`;

        // 3秒后清除提示
        setTimeout(() => {
            submitResultElem.textContent = "";
            submitResultElem.className = "";
        }, 3000);
    });

    // 显示提交结果
    function showSubmitResult(message, type) {
        submitResultElem.textContent = message;
        submitResultElem.className = type;
    }
}

/**
 * 从本地存储获取留言
 */
function getLocalNotes() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

/**
 * 保存留言到本地存储
 */
function saveLocalNotes(notes) {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(notes));
}

/**
 * 解析远程note.txt文件内容为留言数组
 */
function parseRemoteNotes(text) {
    if (!text.trim()) return [];
    const lines = text.split(/\n{2,}/); // 空行分隔不同留言
    return lines.map(line => {
        const parts = line.split(/\n/);
        const author = parts[0].replace(/^昵称：/, "").trim();
        const time = parts[1] ? parts[1].replace(/^时间：/, "").trim() : "";
        const content = parts.slice(2).join("\n").trim();
        return {
            id: `${author}-${time}`.replace(/\s/g, ""), // 生成唯一ID
            author: author,
            time: time,
            content: content
        };
    }).filter(note => note.author && note.content);
}

/**
 * 合并并去重留言（远程优先，本地新增补充）
 */
function mergeAndDeduplicateNotes(remoteNotes, localNotes) {
    const noteMap = new Map();
    // 先添加远程留言，保证远程优先
    remoteNotes.forEach(note => noteMap.set(note.id, note));
    // 再添加本地留言，不覆盖远程
    localNotes.forEach(note => {
        if (!noteMap.has(note.id)) {
            noteMap.set(note.id, note);
        }
    });
    // 转为数组并按时间倒序排序
    return Array.from(noteMap.values()).sort((a, b) => {
        return new Date(b.time) - new Date(a.time);
    });
}

/**
 * 渲染留言列表
 */
function renderNotes(notes) {
    const noteContentElem = document.getElementById("noteContent");
    if (!noteContentElem) return;

    if (notes.length === 0) {
        noteContentElem.innerHTML = '<div style="text-align: center; color: #64748b;">暂无留言，欢迎留言互动～</div>';
        return;
    }

    // 生成留言HTML
    const notesHtml = notes.map(note => `
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(59, 130, 246, 0.1);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #1e293b;">${note.author}</span>
                <span style="font-size: 13px; color: #64748b;">${note.time}</span>
            </div>
            <div style="color: #475569; line-height: 1.6; white-space: pre-wrap;">${note.content}</div>
        </div>
    `).join("");

    noteContentElem.innerHTML = notesHtml;
}