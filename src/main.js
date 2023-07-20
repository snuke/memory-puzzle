const canvas = document.getElementById('canvas');
canvas.focus();
const ctx = canvas.getContext('2d');

let title, creator, mapStr, memoryStr, comment;
let clearFunc, cleared;
let initialData;
let initialMap, mapH, mapW;
let initialMemory, memoryH, memoryW;
let stateHistory, stateHistoryIndex;
const setStage = (data) => {
    title = data['title'] || '';
    creator = data['creator'] || '';
    mapStr = data['map'] || '';
    memoryStr = data['memory'] || '';
    comment = data['comment'] || '';
    const score = data['score'] || 0;
    const solved = data['solved'] || false;
    clearFunc = data['clearFunc']; cleared = false;
    initialData = data;

    document.getElementById('data-title').value = title;
    document.getElementById('data-creator').value = creator;
    document.getElementById('data-map').value = mapStr;
    document.getElementById('data-memory').value = memoryStr;
    document.getElementById('data-comment').value = comment;

    document.title = `${title} - Memory Puzzle`;
    document.getElementById('title').textContent = title;
    document.getElementById('creator').textContent = creator?'by '+creator:'';
    if (comment) {
        document.getElementById('comment').textContent = comment;
        document.getElementById('comment').classList.remove('is-hidden');
    } else {
        document.getElementById('comment').classList.add('is-hidden');
    }
    if (score) {
        const scoreDom = document.getElementById('score');
        scoreDom.textContent = score+' pt';
        scoreDom.classList.remove('is-hidden');
        if (solved) {
            scoreDom.classList.remove('is-dark');
            scoreDom.classList.add('is-success');
        } else {
            scoreDom.classList.remove('is-success');
            scoreDom.classList.add('is-dark');
        }
    } else {
        document.getElementById('score').classList.add('is-hidden');
    }

    initialMap = mapStr.split('\n').filter(s => s !== '').map(s => [...s]);
    mapH = initialMap.length;
    mapW = initialMap[0].length;
    canvas.height = mapH * D;
    canvas.width = mapW * D;

    initialMemory = memoryStr.split('\n').filter(s => s !== '').map(s => [...s]);
    memoryH = initialMemory.length;
    memoryW = initialMemory[0].length;

    stateHistory = [[initialMap, initialMemory]];
    stateHistoryIndex = 0;
};

{
    const url = new URL(location.href);
    let data = url.searchParams.get('data');
    data = JSON.parse(data);
    if (data === null) {
        data = {
            'title': '',
            'creator': '',
            'map': '---\n-P-\n---G',
            'memory': 'P',
        }
    }

    if (url.searchParams.get('edit') === 'true') {
        document.getElementById('edit').open = true;
    }
    url.searchParams.delete('edit');
    history.replaceState(null, '', url.href);
    initialData = data;
    setStage(data);
}

function updateTextarea() {
    const [map, memory] = stateHistory[stateHistoryIndex];
    function toStr(arr) {
      return arr.map((row) => row.join('')).join('\n');
    }
    document.getElementById('data-map').value = toStr(map);
    document.getElementById('data-memory').value = toStr(memory);
}

const updateState = (newMap, newMemory) => {
    const [map, memory] = stateHistory[stateHistoryIndex];
    if (isSame(map, newMap) && isSame(memory, newMemory)) {
        return;
    }

    stateHistory.length = stateHistoryIndex + 1;
    stateHistory.push([newMap, newMemory]);
    stateHistoryIndex++;

    if (hookFunc) hookFunc();

    updateTextarea();
};

const movePlayer = (dy, dx) => {
    const [map, memory] = stateHistory[stateHistoryIndex];

    const [y, x] = getPlayerPosition(map);
    const newY = y + dy;
    const newX = x + dx;

    if ((0 > newY) || (newY >= mapH) || (0 > newX) || (newX >= mapW)) return;

    const cell = map[newY][newX];
    const hasKey = memory.some(row => row.includes(Cell.KEY));
    if (cell === Cell.EMPTY || cell === Cell.GOLD || (hasKey && cell === Cell.LOCK)) {
        const newMap = map.map(row => row.slice());
        const newMemory = memory.map(row => row.slice());

        newMap[y][x] = (map[y][x] === Cell.PLAYER_ON_LOCK) ? Cell.LOCK : Cell.EMPTY;
        newMap[newY][newX] = (cell === Cell.LOCK) ? Cell.PLAYER_ON_LOCK : Cell.PLAYER;

        updateState(newMap, newMemory);
    }
};

const swap = () => {
    const [map, memory] = stateHistory[stateHistoryIndex];
    const [mapPlayerY, mapPlayerX] = getPlayerPosition(map);
    const [memoryPlayerY, memoryPlayerX] = getPlayerPosition(memory);
    const mapSleepingPlayerPosition = getNextSleepingPlayerPosition();

    const newMap = map.map(row => row.slice());
    const newMemory = memory.map(row => row.slice());

    if (mapSleepingPlayerPosition === null) {
        for (const [memoryY, row] of memory.entries()) {
            for (const [memoryX, cell] of row.entries()) {
                if (isMemoryCell(cell)) {
                    const mapY = mapPlayerY + (memoryY - memoryPlayerY);
                    const mapX = mapPlayerX + (memoryX - memoryPlayerX);

                    newMap[mapY][mapX] = memory[memoryY][memoryX];
                    newMemory[memoryY][memoryX] = map[mapY][mapX];
                }
            }
        }
    } else {
        const [mapSleepingPlayerY, mapSleepingPlayerX] = mapSleepingPlayerPosition;
        newMap[mapPlayerY][mapPlayerX] = Cell.SLEEPING_PLAYER;
        newMap[mapSleepingPlayerY][mapSleepingPlayerX] = Cell.PLAYER;

        const memorySleepingPlayerY = memoryPlayerY + (mapSleepingPlayerY - mapPlayerY);
        const memorySleepingPlayerX = memoryPlayerX + (mapSleepingPlayerX - mapPlayerX);
        newMemory[memoryPlayerY][memoryPlayerX] = memory[memorySleepingPlayerY][memorySleepingPlayerX];
        newMemory[memorySleepingPlayerY][memorySleepingPlayerX] = memory[memoryPlayerY][memoryPlayerX];
    }

    updateState(newMap, newMemory);
};

canvas.addEventListener('keydown', (e) => {
    e.preventDefault();

    if (e.code === 'ArrowLeft') {
        movePlayer(0, -1);
    }
    if (e.code === 'ArrowUp') {
        movePlayer(-1, 0);
    }
    if (e.code === 'ArrowRight') {
        movePlayer(0, 1);
    }
    if (e.code === 'ArrowDown') {
        movePlayer(1, 0);
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Space') {
        if (canSwap()) {
            swap();
        }
    }
    if (e.code === 'KeyZ') {
        if (stateHistoryIndex - 1 >= 0) {
            stateHistoryIndex--;
        }
    }
    if (e.code === 'KeyX') {
        if (stateHistoryIndex + 1 < stateHistory.length) {
            stateHistoryIndex++;
        }
    }
    if (e.code === 'KeyR') {
        const [map, memory] = stateHistory[0];
        updateState(map, memory);
    }
});

const onAnimationFrame = () => {
    const [map, memory] = stateHistory[stateHistoryIndex];
    draw(canvas, ctx, map, memory);

    if (document.activeElement !== canvas) {
        ctx.fillStyle = '#000000c0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Click to resume', canvas.width / 2, canvas.height / 2);
    }

    const map_has_goal = map.some(row => row.includes(Cell.GOLD));
    const memory_has_goal = memory.some(row => row.includes(Cell.GOLD));
    if (!map_has_goal && !memory_has_goal) {
        if (!cleared) {
            cleared = true;
            if (clearFunc) clearFunc();
            document.getElementById('score').classList.remove('is-dark');
            document.getElementById('score').classList.add('is-success');
        }
        if (document.activeElement === canvas) {
            ctx.fillStyle = '#000000c0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2);
        }
    }

    requestAnimationFrame(onAnimationFrame);
};
requestAnimationFrame(onAnimationFrame);

document.getElementById('apply').addEventListener('click', () => {
    const title = document.getElementById('data-title').value;
    const creator = document.getElementById('data-creator').value;
    const mapStr = document.getElementById('data-map').value;
    const memoryStr = document.getElementById('data-memory').value;
    const comment = document.getElementById('data-comment').value;

    const data = {
        'title': title,
        'creator': creator,
        'map': mapStr,
        'memory': memoryStr,
        'comment': comment,
    };

    const url = new URL('/', location.href);
    url.searchParams.set('data', JSON.stringify(data));
    url.searchParams.set('edit', 'true');
    location.href = url.href;
});

document.getElementById('editor').addEventListener('click', () => {
    const url = new URL('edit.html', location.href);
    url.searchParams.set('data', JSON.stringify(initialData));
    open(url.href, '_blank');
});
document.getElementById('editor-current').addEventListener('click', () => {
    const url = new URL('edit.html', location.href);
    const currentData = {
        'title': document.getElementById('data-title').value,
        'creator': document.getElementById('data-creator').value,
        'map': document.getElementById('data-map').value,
        'memory': document.getElementById('data-memory').value,
        'comment': document.getElementById('data-comment').value,
    };
    url.searchParams.set('data', JSON.stringify(currentData));
    open(url.href, '_blank');
});