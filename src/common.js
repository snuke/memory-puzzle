const D = 32;

const Cell = {
    NONE: '.',
    EMPTY: '-',
    WALL: '#',
    PLAYER: 'P',
    SLEEPING_PLAYER: 'Q',
    GOLD: 'G',
    FIXED: 'X',
};

const getPlayerPosition = (a) => {
    for (const [y, row] of a.entries()) {
        for (const [x, cell] of row.entries()) {
            if (cell === Cell.PLAYER) {
                return [y, x];
            }
        }
    }
    return [0,0];
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

const canSwap = () => {
    const [map, memory] = stateHistory[stateHistoryIndex];
    const [mapPlayerY, mapPlayerX] = getPlayerPosition(map);
    const [memoryPlayerY, memoryPlayerX] = getPlayerPosition(memory);

    for (const [memoryY, row] of memory.entries()) {
        for (const [memoryX, cell] of row.entries()) {
            if (cell !== Cell.NONE && cell !== Cell.PLAYER) {
                const mapY = mapPlayerY + (memoryY - memoryPlayerY);
                const mapX = mapPlayerX + (memoryX - memoryPlayerX);
                if (!((0 <= mapY) && (mapY < mapH) && (0 <= mapX) && (mapX < mapW)) || (map[mapY][mapX] === Cell.FIXED)) {
                    return false;
                }
            }
        }
    }

    return true;
}

const draw = (canvas, ctx, map, memory) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const [y, row] of map.entries()) {
        for (const [x, cell] of row.entries()) {
            if (cell === Cell.NONE) {
                ctx.strokeStyle = '#c0c0c0'
                ctx.lineWidth = 2; ctx.lineCap = 'round';
                const cx = (x+0.5)*D, cy = (y+0.5)*D;
                ctx.beginPath();
                ctx.moveTo(cx-3, cy-3); ctx.lineTo(cx+3, cy+3);
                ctx.moveTo(cx-3, cy+3); ctx.lineTo(cx+3, cy-3);
                ctx.stroke();
            }

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

            if (cell === Cell.GOLD) {
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.moveTo(x * D, (y + 1 / 2) * D);
                ctx.lineTo((x + 1 / 2) * D, y * D);
                ctx.lineTo((x + 1) * D, (y + 1 / 2) * D);
                ctx.lineTo((x + 1 / 2) * D, (y + 1) * D);
                ctx.fill();
            }

            if (cell === Cell.FIXED) {
                ctx.fillStyle = '#301090';
                ctx.fillRect(x * D, y * D, D, D);

                ctx.fillStyle = '#606060';
                ctx.fillRect(x * D +   3, y * D +   3, 3, 3);
                ctx.fillRect(x * D + D-6, y * D +   3, 3, 3);
                ctx.fillRect(x * D +   3, y * D + D-6, 3, 3);
                ctx.fillRect(x * D + D-6, y * D + D-6, 3, 3);
            }
        }
    }

    for (const y of Array(mapH).keys()) {
        for (const x of Array(mapW).keys()) {
            ctx.strokeStyle = '#60606080';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * D, y * D, D, D);
        }
    }

    if (memory) {
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
    }
}