const chips = [Object.values(Cell)];
let chipIndex = 0;

let map, memory;
let mapH, mapW, memoryH, memoryW;
let stateHistory = [];
let stateHistoryIndex = -1;

const mapCanvas = document.getElementById('map-canvas');
const mapCtx = mapCanvas.getContext('2d');
const memoryCanvas = document.getElementById('memory-canvas');
const memoryCtx = memoryCanvas.getContext('2d');
const chipsCanvas = document.getElementById('chips-canvas');
const chipsCtx = chipsCanvas.getContext('2d');
chipsCanvas.height = chips.length * D;
chipsCanvas.width = chips[0].length * D;

let data;
{
    const url = new URL(location.href);
    const dataParam = url.searchParams.get('data');
    data = JSON.parse(decodeURIComponent(dataParam));
    if (data === null) {
        data = {
            'title': 'Memory Puzzle',
            'creator': 'sugim48',
            'map': '----G----\n'+'---------\n'.repeat(7)+'----P----',
            'memory': '.....\n..#..\n..P..\n.....\n.....',
        }
    }
}
let title = data['title'] || '';
let creator = data['creator'] || '';
let mapStr = data['map'] || '';
let memoryStr = data['memory'] || '';
document.getElementById('data-title').value = title;
document.getElementById('data-creator').value = creator;
setStateFromStr(mapStr, memoryStr);
updateData();

function addHistory() {
    stateHistory.length = stateHistoryIndex + 1;
    _map = map.map(row => row.slice());
    _memory = memory.map(row => row.slice());
    stateHistory.push([_map,_memory]);
    stateHistoryIndex++;
}

function setStateFromStr(mapStr, memoryStr) {
    map = mapStr.split('\n').filter(s => s !== '').map(s => [...s]);
    memory = memoryStr.split('\n').filter(s => s !== '').map(s => [...s]);
    addHistory();
}

function toStr(data) {
    a = []
    for (var i = 0; i < data.length; i++) a.push(data[i].join(''));
    return a.join('\n');
}
function updateData() {
    mapH = map.length; mapW = map[0].length;
    memoryH = memory.length; memoryW = memory[0].length;
    mapCanvas.height = mapH * D;
    mapCanvas.width = mapW * D;
    memoryCanvas.height = memoryH * D;
    memoryCanvas.width = memoryW * D;
    document.getElementById('data-map').value = toStr(map);
    document.getElementById('data-memory').value = toStr(memory);
}

const onAnimationFrame = () => {
    draw(mapCanvas, mapCtx, map, memory);
    draw(memoryCanvas, memoryCtx, memory);
    draw(chipsCanvas, chipsCtx, chips);
    chipsCtx.strokeStyle = '#ff0000'; chipsCtx.lineWidth = 2;
    chipsCtx.strokeRect(chipIndex * D, 0, D, D);
    requestAnimationFrame(onAnimationFrame);
};
requestAnimationFrame(onAnimationFrame);

document.addEventListener('keydown', (e) => {
    const activeElm = document.activeElement;
    if (activeElm == document.getElementById('data-title')) return true;
    if (activeElm == document.getElementById('data-creator')) return true;
    if (activeElm == document.getElementById('data-map')) return true;
    if (activeElm == document.getElementById('data-memory')) return true;

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
    if (e.code === 'KeyR') stateHistoryIndex = 0;
    map = stateHistory[stateHistoryIndex][0].map(row => row.slice());
    memory = stateHistory[stateHistoryIndex][1].map(row => row.slice());
    updateData();
});

chipsCanvas.addEventListener("click", e => {
    const rect = chipsCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const i = Math.trunc(py/D);
    const j = Math.trunc(px/D);
    chipIndex = j;
});
function setDrawEvent(canvas, isMap) {
    function putChip(e, c) {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const i = Math.trunc(py/D);
        const j = Math.trunc(px/D);
        if (isMap) data = map; else data = memory;
        if (!c) {
            c = chips[0][chipIndex];
            if (data[i][j] === c) c = isMap?'-':'.'
        }
        if (data[i][j] !== c) {
            data[i][j] = c;
            updateData();
            addHistory();
        }
        return c;
    }
    var drawing = false, letter = '';
    canvas.addEventListener("mousedown", e => {
        drawing = true;
        letter = putChip(e);
    });
    canvas.addEventListener("mousemove", e => {
        if (drawing) putChip(e, letter);
    });
    document.addEventListener("mouseup", e => {
        drawing = false;
    });
}
setDrawEvent(mapCanvas, true);
setDrawEvent(memoryCanvas, false);

for (var m of ['map','memory']) {
    for (var dir of ['l','r','u','d','x']) {
        for (var op of ['a','d']) {
            ((m,dir,op) => {
                document.getElementById(`${m}-${dir}${op}`).addEventListener('click', () => {
                    h = (m == 'map')?mapH:memoryH;
                    w = (m == 'map')?mapW:memoryW;
                    if (op == 'd') {
                        if (dir == 'u' || dir == 'd') if (h <= 1) return;
                        if (dir == 'l' || dir == 'r') if (w <= 1) return;
                    }
                    _ = chips[0][chipIndex];
                    data = (m == 'map')?map:memory;
                    switch (dir+op) {
                        case 'la': data.forEach((row) => { row.unshift(_);}); break;
                        case 'ra': data.forEach((row) => { row.push(_);}); break;
                        case 'ua': data.unshift(Array(w).fill(_)); break;
                        case 'da': data.push(Array(w).fill(_)); break;
                        case 'ld': data.forEach((row) => { row.shift();}); break;
                        case 'rd': data.forEach((row) => { row.pop();}); break;
                        case 'ud': data.shift(); break;
                        case 'dd': data.pop(); break;
                        case 'xa': transpose(memory);
                                             if (m == 'map') transpose(map);
                                             break;
                        case 'xd': memory.forEach((row) => { row.reverse();});
                                             if (m == 'map') map.forEach((row) => { row.reverse();});
                                             break;
                    }
                    updateData();
                    addHistory();
                });
            })(m,dir,op);
        }
    }
}

document.getElementById('play').addEventListener('click', () => {
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
    url.searchParams.set('data', encodeURIComponent(JSON.stringify(data)));
    open(url.href, '_blank');
});
document.getElementById('apply').addEventListener('click', () => {
    const mapStr = document.getElementById('data-map').value;
    const memoryStr = document.getElementById('data-memory').value;
    setStateFromStr(mapStr, memoryStr);
    updateData();
});

document.getElementById('copy').addEventListener('click', () => {
    const title = document.getElementById('data-title').value.trim();
    const creator = document.getElementById('data-creator').value.trim();
    const mapStr = document.getElementById('data-map').value.trim();
    const memoryStr = document.getElementById('data-memory').value.trim();
    let s = `${title}\n`;
    if (creator) s += `${creator}\n`;
    s += `\n${mapStr}\n\n${memoryStr}\n`;
    navigator.clipboard.writeText(s);
});