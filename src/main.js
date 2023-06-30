const canvas = document.getElementById('canvas');
canvas.focus();
const ctx = canvas.getContext('2d');

let data;
{
    const url = new URL(location.href);
    const dataParam = url.searchParams.get('data');
    data = JSON.parse(dataParam);
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
}

let title, creator, mapStr, memoryStr;
let clearFunc, cleared;
let initialMap, mapH, mapW;
let initialMemory, memoryH, memoryW;
let stateHistory, stateHistoryIndex;
const setStage = (stageData) => {
    data = stageData;
    title = data['title'] || '';
    creator = data['creator'] || '';
    mapStr = data['map'] || '';
    memoryStr = data['memory'] || '';
    clearFunc = data['clearFunc']; cleared = false;

    document.getElementById('data-title').value = title;
    document.getElementById('data-creator').value = creator;
    document.getElementById('data-map').value = mapStr;
    document.getElementById('data-memory').value = memoryStr;

    document.title = `${title} - Memory Puzzle`;
    document.getElementById('title').textContent = title;
    document.getElementById('creator').textContent = creator?'by '+creator:'';

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
setStage(data);

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
    let same = true;

    for (const y of Array(mapH).keys()) {
        for (const x of Array(mapW).keys()) {
            if (map[y][x] !== newMap[y][x]) {
                same = false;
            }
        }
    }

    for (const y of Array(memoryH).keys()) {
        for (const x of Array(memoryW).keys()) {
            if (memory[y][x] !== newMemory[y][x]) {
                same = false;
            }
        }
    }

    if (same) {
        return;
    }

    stateHistory.length = stateHistoryIndex + 1;
    stateHistory.push([newMap, newMemory]);
    stateHistoryIndex++;

    updateTextarea();
};

const movePlayer = (dy, dx) => {
    const [map, memory] = stateHistory[stateHistoryIndex];

    const [y, x] = getPlayerPosition(map);
    const newY = y + dy;
    const newX = x + dx;

    if ((0 <= newY) && (newY < mapH) && (0 <= newX) && (newX < mapW) && ([Cell.EMPTY, Cell.GOAL].includes(map[newY][newX]))) {
        const newMap = map.map(row => row.slice());
        const newMemory = memory.map(row => row.slice());

        newMap[y][x] = Cell.EMPTY;
        newMap[newY][newX] = Cell.PLAYER;

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
                if (cell !== Cell.NONE && cell !== Cell.PLAYER) {
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

    const map_has_goal = map.some(row => row.includes(Cell.GOAL));
    const memory_has_goal = memory.some(row => row.includes(Cell.GOAL));
    if (!map_has_goal && !memory_has_goal) {
        if (!cleared) {
            cleared = true;
            if (clearFunc !== void 0) clearFunc();
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

    const data = {
        'title': title,
        'creator': creator,
        'map': mapStr,
        'memory': memoryStr,
    };

    const url = new URL('/', location.href);
    url.searchParams.set('data', JSON.stringify(data));
    url.searchParams.set('edit', 'true');
    location.href = url.href;
});

document.getElementById('editor').addEventListener('click', () => {
    const url = new URL('edit.html', location.href);
    url.searchParams.set('data', JSON.stringify(data));
    open(url.href, '_blank');
});
document.getElementById('editor-current').addEventListener('click', () => {
    const url = new URL('edit.html', location.href);
    const currentData = {
        'title': document.getElementById('data-title').value,
        'creator': document.getElementById('data-creator').value,
        'map': document.getElementById('data-map').value,
        'memory': document.getElementById('data-memory').value,
    };
    url.searchParams.set('data', JSON.stringify(currentData));
    open(url.href, '_blank');
});