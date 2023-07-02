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


const SOLVED_FILE_ICON = 'src/img/diy/file2.png';
const SOLVED_OPEN_ICON = 'src/img/diy/open2.png';
const SOLVED_CLOSE_ICON = 'src/img/diy/close2.png';


let tree;
function selectStage(node) {
    if (node.isParent) {
        tree.expandNode(node);
        return false;
    } else {
        $.get(`stages/${node.path}.txt`, function(data) {
            let state = 0;
            let title, creator = '', map = '', memory = '';
            title = node.path.match(/[^/]*$/)[0];
            for (const line of data.split('\n')) {
                if (line == '') { state++; continue;}
                if (state == 0) {
                    if (creator) title = creator;
                    creator = line; 
                }
                if (state == 1) map += line+'\n';
                if (state == 2) memory += line+'\n';
            }
            let clearFunc = () => {
                let solved = arrayToSet(getLS(SOLVED_KEY));
                if (solved.has(node.path)) return;
                solved.add(node.path);
                setLS(SOLVED_KEY, setToArray(solved));
                updateSolved(node.path);
            };
            setStage({title:title, creator:creator, map:map, memory:memory, clearFunc:clearFunc});
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
    node.icon = SOLVED_FILE_ICON;
    tree.updateNode(node);
    while (node.parentTId !== null) {
        node = tree.getNodeByTId(node.parentTId);
        node.numSolved++;
        node.name = node.name.split(' (')[0];
        node.name += ` (${node.numSolved}/${node.numStage})`;
        if (node.numStage == node.numSolved) {
            node.iconOpen = SOLVED_OPEN_ICON;
            node.iconClose = SOLVED_CLOSE_ICON;
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
            title:"Stage Select"
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
        let pid = 0, path = '';
        for (const s of line.split('/')) {
            path += s;
            let id = title2id.get(path);
            if (id === void 0) {
                id = title2id.size+1;
                title2id.set(path, id);
                zNodes.push({id:id, pId:pid, name:s, path:path});
            }
            pid = id; path += '/';
        }
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
            node.name += ` (0/${node.numStage})`;
            tree.updateNode(node);
            return node.numStage;
        }
        dfs(node);
    }

    let solved = arrayToSet(getLS(SOLVED_KEY));
    for (const path of solved) updateSolved(path);

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