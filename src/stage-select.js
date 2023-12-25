function arrayToSet(a) {
    var s = new Set();
    for (var i in a) s.add(a[i]);
    return s;
}
function setToArray(s) {
    var a = [];
    s.forEach(function(val) { a.push(val);});
    return a;
}
function setLS(key, val) {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch(error) {
        console.log(error);
    }
}
function getLS(key) {
    var val = localStorage.getItem(key);
    return val?JSON.parse(val):val;
}
function delLS(key) {
    localStorage.removeItem(key);
}
const SOLVED_KEY = 'solved';
const ACHIEVEMENT_KEY = 'achievement';

const SOLVED_FILE_ICON = 'src/img/diy/file2.png';
const SOLVED_OPEN_ICON = 'src/img/diy/open2.png';
const SOLVED_CLOSE_ICON = 'src/img/diy/close2.png';


function addScore(pt) {
    totalScore += pt;
    $('#total-score span').text(totalScore);
}

const achieve = (key) => {
    let achievement = arrayToSet(getLS(ACHIEVEMENT_KEY));
    if (achievement.has(key)) return;
    achievement.add(key);
    setLS(ACHIEVEMENT_KEY, setToArray(achievement));
    addScore(1);
};
const hookFuncs = {
    'Dungeon Thief': () => {
        const [map, memory] = stateHistory[stateHistoryIndex];
        if (!memory.some(row => row.includes(Cell.GOLD))) return;
        const [y, x] = getPlayerPosition(map);
        if (y === mapH-1) achieve('Dungeon Thief');
    }
};


let tree;
let totalScore = 0;
function selectStage(node) {
    if (node.isParent) {
        tree.expandNode(node);
        return false;
    } else {
        const hash = Math.floor(Math.random()*1e9);
        $.get(`stages/${node.path}.txt?h=${hash}`, function(data) {
            let state = 0;
            let title, creator = '', map = '', memory = '', comment = '';
            title = node.path.match(/[^/]*$/)[0];
            for (const line of data.split('\n')) {
                if (line == '') { state++; continue;}
                if (state == 0) {
                    if (creator) title = creator;
                    creator = line; 
                }
                if (state == 1) map += line+'\n';
                if (state == 2) memory += line+'\n';
                if (state >= 3) comment += line+'\n';
            }
            const clearFunc = () => {
                let solved = arrayToSet(getLS(SOLVED_KEY));
                if (solved.has(node.path)) return;
                solved.add(node.path);
                setLS(SOLVED_KEY, setToArray(solved));
                updateSolved(node.path);
            };
            const stageData = {
                title:title,
                creator:creator,
                map:map,
                memory:memory,
                comment:comment,
                score:node.score,
                solved:node.solved,
                clearFunc:clearFunc,
                hookFunc:hookFuncs[node.name]
            };
            setStage(stageData);
            history.pushState('','',`?stage=${encodeURIComponent(node.path)}`);
        });
        return true;
    }
}
function updateSolved(path) {
    let node = tree.getNodeByParam('path', path);
    if (node === null) return;
    if (node.solved) return;
    node.solved = true;
    addScore(node.score);
    node.icon = SOLVED_FILE_ICON;
    tree.updateNode(node);
    while (node.parentTId !== null) {
        node = tree.getNodeByTId(node.parentTId);
        node.numSolved++;
        node.name = node.baseName+` (${node.numSolved}/${node.numStage})`;
        if (node.numStage === node.numSolved) {
            node.iconOpen = SOLVED_OPEN_ICON;
            node.iconClose = SOLVED_CLOSE_ICON;
            if (node.baseName === 'Bonus') addScore(5);
        }
        tree.updateNode(node);
    }
}

let setting = {
    view: {
        dblClickExpand: false,
    },
    data: {
        key: {
            title: 't'
        },
        simpleData: {
            enable: true
        }
    },
    callback: {
        beforeClick: function (treeId, treeNode) {
            selectStage(treeNode);
        }
    }
};

$.get('stages/index.txt', function(data) {
    let zNodes = [];
    let title2id = new Map();
    for (let line of data.split('\n')) {
        line = line.trim();
        if (line === '') continue;
        let score = 0;
        if (line.includes(':')) {
            [score,line] = line.split(':');
            score = parseInt(score);
        }
        let pid = 0, path = '';
        for (const s of line.split('/')) {
            path += s;
            let id = title2id.get(path);
            if (id === void 0) {
                id = title2id.size+1;
                title2id.set(path, id);
                zNodes.push({id:id, pId:pid, name:s, path:path, t: s});
            }
            pid = id; path += '/';
        }
        zNodes[pid-1]['score'] = score;
        if (score) zNodes[pid-1]['t'] = `${score} pt`;
    }
    tree = $.fn.zTree.init($("#stage-select"), setting, zNodes);
    for (const node of tree.getNodes()) {
        function dfs(node) {
            if (!node.isParent) {
                node.solved = false;
                return 1;
            }
            node.numStage = node.numSolved = 0;
            for (const child of node.children) {
                node.numStage += dfs(child);
            }
            node.baseName = node.name;
            node.name += ` (0/${node.numStage})`;
            if (node.baseName === 'Bonus') node.t = '5 pt';
            tree.updateNode(node);
            return node.numStage;
        }
        dfs(node);
    }

    {
        const solved = arrayToSet(getLS(SOLVED_KEY));
        for (const path of solved) updateSolved(path);
        const achievements = getLS(ACHIEVEMENT_KEY);
        if (achievements) addScore(achievements.length);
    }

    const url = new URL(location.href);
    let stagePath = url.searchParams.get('stage');
    if (stagePath !== null) {
        const node = tree.getNodeByParam('path', stagePath);
        if (node !== null) {
            tree.selectNode(node);
            selectStage(node);
        }
    }
});

$('#stage-select-nav .panel-heading').click(function() {
    $('#stage-select-nav .panel-block').slideToggle(300);
    $('#stage-select-nav').toggleClass('collapsed');
});