const main = () => {
    const D = 32;

    const Cell = {
        NONE: '.',
        EMPTY: '-',
        WALL: '#',
        PLAYER: 'P',
        SLEEPING_PLAYER: 'Q',
        GOAL: 'G',
        KEY: 'K',
        LOCK: 'L',
        X: 'X',
    };

    const canvas = document.getElementById('canvas');
    canvas.focus();
    const ctx = canvas.getContext('2d');

    document.getElementById('apply').addEventListener('click', () => {
        const title = document.getElementById('data-title').value;
        const mapStr = document.getElementById('data-map').value;
        const memoryStr = document.getElementById('data-memory').value;

        const data = {
            'title': title,
            'map': mapStr,
            'memory': memoryStr,
        };

        const url = new URL(location.href);
        url.searchParams.set('data', encodeURIComponent(JSON.stringify(data)));
        url.searchParams.set('edit', 'true');
        location.href = url.href;
    });

    const url = new URL(location.href);
    const dataParam = url.searchParams.get('data');
    let data = JSON.parse(decodeURIComponent(dataParam));
    if (data === null) {
        data = {
            'title': 'Memory Puzzle',
            'map': '--G--\n#####\n#####\n-----\n--P--\n-----\n',
            'memory': '.#.\n#P#\n.-.\n',
        }
    }

    const title = data['title'];
    const mapStr = data['map'];
    const memoryStr = data['memory'];

    document.getElementById('data-title').value = title;
    document.getElementById('data-map').value = mapStr;
    document.getElementById('data-memory').value = memoryStr;

    if (url.searchParams.get('edit') === 'true') {
        document.getElementById('edit').open = true;
    }
    url.searchParams.delete('edit');
    history.replaceState(null, '', url.href);

    document.title = `${title} - Memory Puzzle`;
    document.getElementById('title').textContent = title;

    const initialMap = mapStr.split('\n').filter(s => s !== '').map(s => [...s]);
    let mapH = initialMap.length;
    let mapW = initialMap[0].length;

    const initialMemory = memoryStr.split('\n').filter(s => s !== '').map(s => [...s]);
    let memoryH = initialMemory.length;
    let memoryW = initialMemory[0].length;

    const stateHistory = [[initialMap, initialMemory]];
    let stateHistoryIndex = 0;

    canvas.height = mapH * D;
    canvas.width = mapW * D;

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
    };

    const getPlayerPosition = (a) => {
        for (const [y, row] of a.entries()) {
            for (const [x, cell] of row.entries()) {
                if (cell === Cell.PLAYER) {
                    return [y, x];
                }
            }
        }
    };

    const getNextSleepingPlayerPosition = () => {
        const [map, memory] = stateHistory[stateHistoryIndex];
        const [mapPlayerY, mapPlayerX] = getPlayerPosition(map);
        const [memoryPlayerY, memoryPlayerX] = getPlayerPosition(memory);

        for (const dz of Array(memoryH * memoryW).keys()) {
            const z = ((memoryPlayerY * memoryW + memoryPlayerX) + dz) % (memoryH * memoryW);
            const memoryY = Math.trunc(z / memoryW);
            const memoryX = z % memoryW;
            const mapY = mapPlayerY + (memoryY - memoryPlayerY);
            const mapX = mapPlayerX + (memoryX - memoryPlayerX);

            if ((memory[memoryY][memoryX] !== Cell.NONE) && (map[mapY][mapX] === Cell.SLEEPING_PLAYER)) {
                return [mapY, mapX];
            }
        }

        return null;
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

    const canSwap = () => {
        const [map, memory] = stateHistory[stateHistoryIndex];
        const [mapPlayerY, mapPlayerX] = getPlayerPosition(map);
        const [memoryPlayerY, memoryPlayerX] = getPlayerPosition(memory);

        for (const [memoryY, row] of memory.entries()) {
            for (const [memoryX, cell] of row.entries()) {
                if (cell !== Cell.NONE && cell !== Cell.PLAYER) {
                    const mapY = mapPlayerY + (memoryY - memoryPlayerY);
                    const mapX = mapPlayerX + (memoryX - memoryPlayerX);
                    if (!((0 <= mapY) && (mapY < mapH) && (0 <= mapX) && (mapX < mapW)) || (map[mapY][mapX] === Cell.X)) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const [map, memory] = stateHistory[stateHistoryIndex];

        for (const [y, row] of map.entries()) {
            for (const [x, cell] of row.entries()) {
                if (cell === Cell.WALL) {
                    ctx.fillStyle = '#808080';
                    ctx.fillRect(x * D, y * D, D, D);
                }

                if (cell === Cell.PLAYER) {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc((x + 1 / 2) * D, (y + 1 / 2) * D, D / 2, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.ellipse((x + 5 / 16) * D, (y + 1 / 2) * D, D / 16, D / 8, 0, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = '#000000';
                    ctx.beginPath();
                    ctx.ellipse((x + 11 / 16) * D, (y + 1 / 2) * D, D / 16, D / 8, 0, 0, 2 * Math.PI);
                    ctx.fill();
                }

                if (cell === Cell.SLEEPING_PLAYER) {
                    ctx.fillStyle = '#80a0a0';
                    ctx.beginPath();
                    ctx.arc((x + 1 / 2) * D, (y + 1 / 2) * D, D / 2, 0, 2 * Math.PI);
                    ctx.fill();

                    ctx.fillStyle = '#000000';
                    ctx.fillRect((x + 5 / 32) * D, (y + 29 / 64) * D, D / 4, D * 3 / 32);
                    ctx.fillRect((x + 19 / 32) * D, (y + 29 / 64) * D, D / 4, D * 3 / 32);
                }

                if (cell === Cell.GOAL) {
                    ctx.fillStyle = '#ffff00';
                    ctx.beginPath();
                    ctx.moveTo(x * D, (y + 1 / 2) * D);
                    ctx.lineTo((x + 1 / 2) * D, y * D);
                    ctx.lineTo((x + 1) * D, (y + 1 / 2) * D);
                    ctx.lineTo((x + 1 / 2) * D, (y + 1) * D);
                    ctx.fill();
                }

                if (cell === Cell.X) {
                    ctx.fillStyle = '#808080';
                    ctx.fillRect(x * D, y * D, D, D);

                    ctx.strokeStyle = '#c00000'
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';

                    ctx.beginPath();
                    ctx.moveTo(x * D + 2, y * D + 2);
                    ctx.lineTo((x + 1) * D - 2, (y + 1) * D - 2);
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.moveTo((x + 1) * D - 2, y * D + 2);
                    ctx.lineTo(x * D + 2, (y + 1) * D - 2);
                    ctx.stroke();
                }
            }
        }

        for (const y of Array(mapH).keys()) {
            for (const x of Array(mapW).keys()) {
                ctx.strokeStyle = '#c0c0c0';
                ctx.lineWidth = 2;
                ctx.strokeRect(x * D, y * D, D, D);
            }
        }

        const [mapPlayerY, mapPlayerX] = getPlayerPosition(map);
        const [memoryPlayerY, memoryPlayerX] = getPlayerPosition(memory);
        const canSwapFlag = canSwap();

        for (const [memoryY, row] of memory.entries()) {
            for (const [memoryX, cell] of row.entries()) {
                const mapY = mapPlayerY + (memoryY - memoryPlayerY);
                const mapX = mapPlayerX + (memoryX - memoryPlayerX);

                if (cell !== Cell.NONE && cell !== Cell.PLAYER) {
                    if (canSwapFlag) {
                        ctx.strokeStyle = '#00c000';
                    } else {
                        ctx.strokeStyle = '#c00000';
                    }
                    ctx.lineWidth = 2;
                    ctx.strokeRect(mapX * D, mapY * D, D, D);

                    if (canSwapFlag) {
                        ctx.fillStyle = '#00c000';
                    } else {
                        ctx.fillStyle = '#c00000';
                    }
                    ctx.font = '32px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(cell, (mapX + 1 / 2) * D, (mapY + 1 / 2) * D);
                }
            }
        }

        if (canSwapFlag) {
            for (const [memoryY, row] of memory.entries()) {
                for (const [memoryX, cell] of row.entries()) {
                    const mapY = mapPlayerY + (memoryY - memoryPlayerY);
                    const mapX = mapPlayerX + (memoryX - memoryPlayerX);

                    if (cell !== Cell.NONE && cell !== Cell.PLAYER && map[mapY][mapX] === Cell.SLEEPING_PLAYER) {
                        ctx.strokeStyle = '#00ffff';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(mapX * D, mapY * D, D, D);

                        ctx.fillStyle = '#00ffff';
                        ctx.font = '32px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(cell, (mapX + 1 / 2) * D, (mapY + 1 / 2) * D);
                    }
                }
            }
        }

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
        if (!map_has_goal && !memory_has_goal && (document.activeElement === canvas)) {
            ctx.fillStyle = '#000000c0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Congratulations!', canvas.width / 2, canvas.height / 2);
        }

        requestAnimationFrame(onAnimationFrame);
    };

    requestAnimationFrame(onAnimationFrame);
};

main();
