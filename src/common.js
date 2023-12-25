const D = 32;

const Cell = {
    NONE: '.',
    EMPTY: '-',
    WALL: '#',
    PLAYER: 'P',
    SLEEPING_PLAYER: 'Q',
    GOLD: 'G',
    FIXED: 'X',
    KEY: 'K',
    LOCK: 'L',
    PLAYER_ON_LOCK: 'R',
};

const isPlayerCell = (cell) => {
    return cell === Cell.PLAYER || cell === Cell.PLAYER_ON_LOCK;
};
const isMemoryCell = (cell) => {
    return cell !== Cell.NONE && !isPlayerCell(cell);
};

const getPlayerPosition = (a) => {
    for (const [y, row] of a.entries()) {
        for (const [x, cell] of row.entries()) {
            if (isPlayerCell(cell)) {
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

        if (isMemoryCell(memory[memoryY][memoryX]) && (map[mapY][mapX] === Cell.SLEEPING_PLAYER)) {
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
            if (isMemoryCell(cell)) {
                const mapY = mapPlayerY + (memoryY - memoryPlayerY);
                const mapX = mapPlayerX + (memoryX - memoryPlayerX);
                if (!((0 <= mapY) && (mapY < mapH) && (0 <= mapX) && (mapX < mapW)) || (map[mapY][mapX] === Cell.FIXED)) {
                    return false;
                }
            }
        }
    }

    return true;
};

const draw = (canvas, ctx, map, memory) => {
    const hasKey = memory && memory.some(row => row.includes(Cell.KEY));

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

            if (cell === Cell.LOCK || cell === Cell.PLAYER_ON_LOCK) {
                if (cell === Cell.LOCK && !hasKey) {
                    ctx.fillStyle = '#808080';
                    ctx.fillRect(x * D, y * D, D, D);

                    ctx.fillStyle = '#000000';
                    ctx.strokeStyle = '#000000';
                } else {
                    ctx.fillStyle = '#808080';
                    ctx.strokeStyle = '#808080';
                }
                ctx.lineWidth = 2; ctx.lineCap = 'butt';
                ctx.strokeRect((x + 3/32) * D, (y + 3/32) * D, 26/32 * D, 26/32 * D);
                ctx.beginPath();
                ctx.arc((x + 1/2) * D, (y + 12/32) * D, D/8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillRect((x + 14/32) * D, (y + 1/2) * D, D/8, D/4);
            }

            if (cell === Cell.PLAYER || cell === Cell.PLAYER_ON_LOCK) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc((x + 1/2) * D, (y + 1/2) * D, D/2 - 1, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.ellipse((x + 5/16) * D, (y + 1/2) * D, D/16, D/8, 0, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.ellipse((x + 11/16) * D, (y + 1/2) * D, D/16, D/8, 0, 0, 2 * Math.PI);
                ctx.fill();
            }

            if (cell === Cell.SLEEPING_PLAYER) {
                ctx.fillStyle = '#80a0a0';
                ctx.beginPath();
                ctx.arc((x + 1/2) * D, (y + 1/2) * D, D/2 - 1, 0, 2 * Math.PI);
                ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.fillRect((x +  5/32) * D, (y + 29/64) * D, 7/32 * D, 3/32 * D);
                ctx.fillRect((x + 19/32) * D, (y + 29/64) * D, 7/32 * D, 3/32 * D);
            }

            if (cell === Cell.GOLD) {
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.moveTo((x      ) * D, (y + 1/2) * D);
                ctx.lineTo((x + 1/2) * D, (y      ) * D);
                ctx.lineTo((x +   1) * D, (y + 1/2) * D);
                ctx.lineTo((x + 1/2) * D, (y +   1) * D);
                ctx.fill();
            }

            if (cell === Cell.FIXED) {
                ctx.fillStyle = '#301090';
                ctx.fillRect(x * D, y * D, D, D);

                ctx.fillStyle = '#606060';
                ctx.fillRect((x +  3/32) * D, (y +  3/32) * D, 3/32 * D, 3/32 * D);
                ctx.fillRect((x + 26/32) * D, (y +  3/32) * D, 3/32 * D, 3/32 * D);
                ctx.fillRect((x +  3/32) * D, (y + 26/32) * D, 3/32 * D, 3/32 * D);
                ctx.fillRect((x + 26/32) * D, (y + 26/32) * D, 3/32 * D, 3/32 * D);
            }

            if (cell === Cell.KEY) {
                ctx.strokeStyle = '#c0c0c0';
                ctx.lineWidth = 4/32 * D; ctx.lineCap = 'butt';
                ctx.beginPath();
                ctx.arc((x + 22/32) * D, (y + 10/32) * D, 6/32 * D, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo((x +  4/32) * D, (y + 28/32) * D);
                ctx.lineTo((x + 18/32) * D, (y + 14/32) * D);
                ctx.stroke();
                ctx.lineWidth = 3/32 * D; ctx.lineCap = 'butt';
                ctx.beginPath();
                ctx.moveTo((x + 12/32) * D, (y + 20/32) * D);
                ctx.lineTo((x + 17/32) * D, (y + 25/32) * D);
                ctx.moveTo((x +  8/32) * D, (y + 24/32) * D);
                ctx.lineTo((x + 13/32) * D, (y + 29/32) * D);
                ctx.moveTo((x + 10/32) * D, (y + 22/32) * D);
                ctx.lineTo((x + 13/32) * D, (y + 25/32) * D);
                ctx.stroke();
            }

            if (!Object.values(Cell).includes(cell)) {
                ctx.fillStyle = '#fff';
                ctx.font = '32px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cell, (x + 1 / 2) * D, (y + 1 / 2) * D);
            }
        }
    }

    for (const [y, row] of map.entries()) {
        for (const [x, cell] of row.entries()) {
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

                if (isMemoryCell(cell)) {
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

                    if (isMemoryCell(cell) && map[mapY][mapX] === Cell.SLEEPING_PLAYER) {
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

const isSame = (a, b) => {
    for (const y of a.keys()) {
        for (const x of a[y].keys()) {
            if (a[y][x] !== b[y][x]) {
                return false;
            }
        }
    }
    return true;
}

function transpose(a) {
  let h = a.length, w = a[0].length;
  if (w < h) {
    for (var i = 0; i < w; i++) {
      while (a[i].length < h) a[i].push('');
    }
    for (var i = 0; i < h; i++) {
      for (var j = 0; j < w; j++) if (j < i) {
        var tmp = a[i][j];
        a[i][j] = a[j][i];
        a[j][i] = tmp;
      }
    }
    while (a.length > w) a.pop();
  } else {
    while (a.length < w) a.push(Array(h).fill(''));
    for (var i = 0; i < h; i++) {
      for (var j = 0; j < w; j++) if (j > i) {
        var tmp = a[i][j];
        a[i][j] = a[j][i];
        a[j][i] = tmp;
      }
    }
    for (var i = 0; i < h; i++) {
      while (a[i].length > h) a[i].pop();
    }
  }
}