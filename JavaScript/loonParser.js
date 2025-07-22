// JavaScript version of the Python LOON parser 
const fs = require("fs");

function inferValueType(value, labels = {}, hiddenLabels = {}) {
    value = value.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
        return resolveReference(value, labels, hiddenLabels);
    }
    if ((value.startsWith(""
            ") && value.endsWith("
            "")) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    } else if (value.toLowerCase() === "true") {
        return true;
    } else if (value.toLowerCase() === "false") {
        return false;
    } else {
        const num = Number(value);
        return isNaN(num) ? value : num;
    }
}

function resolveReference(value, labels = {}, hiddenLabels = {}) {
    const ref = value.slice(1, -1).trim();
    const allLabels = {
        ...labels,
        ...hiddenLabels
    };

    if (ref.includes(".")) {
        const [scope, identity] = ref.split(".", 2);
        const data = scope.includes(":") ? allLabels?.[scope.split(":")[0]]?.[scope.split(":")[1]] || {} : allLabels?.[scope] || {};
        return data?.[identity];
    } else if (ref.includes(":")) {
        const [lbl, sp] = ref.split(":", 2);
        return allLabels?.[lbl]?.[sp] || {};
    } else {
        return allLabels?.[ref];
    }
}

function parseLoonFile(filename, labels = {}, spaces = {}, hiddenLabels = {}, labelHiddenMap = {}) {
    if (!filename.endsWith(".loon")) {
        console.error("ERROR: file must be a .loon file");
        process.exit();
    }

    const code = fs.readFileSync(filename, "utf-8").split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith("<"));

    let currentLabel = null;
    let currentSpace = null;
    const labelStack = {};
    const spaceStack = {};
    let insertInSpace = false;

    for (const line of code) {
        if ((line.startsWith("%(") || line.startsWith("(")) && line.endsWith(")")) {
            const isHidden = line.startsWith("%(");
            const labelName = isHidden ? line.slice(2, -1) : line.slice(1, -1);
            currentLabel = labelName;
            labelStack[currentLabel] = [];
            labelHiddenMap[currentLabel] = isHidden;
            currentSpace = null;
            insertInSpace = false;

        } else if (line.startsWith(":")) {
            currentSpace = line.slice(1);
            spaceStack[currentSpace] = null;
            insertInSpace = true;

        } else if (line === "end:") {
            const result = spaceStack[currentSpace];
            labelStack[currentLabel].push([currentSpace, result]);
            spaces[currentSpace] = result;
            insertInSpace = false;
            currentSpace = null;

        } else if (line === "end") {
            const result = {};
            for (const item of labelStack[currentLabel]) {
                if (Array.isArray(item)) {
                    const [key, val] = item;
                    result[key] = val;
                } else if (typeof item === "object") {
                    Object.assign(result, item);
                } else if (typeof item === "string") {
                    result[item] = null;
                }
            }
            if (labelHiddenMap[currentLabel]) {
                hiddenLabels[currentLabel] = result;
            } else {
                labels[currentLabel] = result;
            }
            currentLabel = null;

        } else if (line.includes("=")) {
            const [k, v] = line.split("=", 2).map(s => s.trim());
            const val = inferValueType(v, labels, hiddenLabels);
            let blk = spaceStack[currentSpace];
            if (insertInSpace) {
                if (blk === null) {
                    blk = {};
                    spaceStack[currentSpace] = blk;
                } else if (Array.isArray(blk)) {
                    throw new Error(`Cannot mix key-value with list in space '${currentSpace}'`);
                }
                blk[k] = val;
            } else {
                labelStack[currentLabel].push({
                    [k]: val
                });
            }

        } else if (line.startsWith("@")) {
            const fileName = line.slice(1);
            if (!fileName.endsWith(".loon")) {
                console.error("ERROR: file must be a .loon file");
                process.exit();
            }
            const tempLabels = {};
            const tempHidden = {};
            const tempHiddenMap = {};
            parseLoonFile(fileName, tempLabels, spaces, tempHidden, tempHiddenMap);
            Object.assign(labels, tempLabels);
            Object.assign(hiddenLabels, tempHidden);
            Object.assign(labelHiddenMap, tempHiddenMap);

        } else if (!line.startsWith("->")) {
            const val = inferValueType(line, labels, hiddenLabels);
            let blk = spaceStack[currentSpace];
            if (insertInSpace) {
                if (blk === null) {
                    blk = [];
                    spaceStack[currentSpace] = blk;
                } else if (!Array.isArray(blk)) {
                    blk = Object.entries(blk).map(([k, v]) => ({
                        [k]: v
                    }));
                    spaceStack[currentSpace] = blk;
                }
                blk.push(val);
            } else {
                labelStack[currentLabel].push(val);
            }

        } else if (line.startsWith("->")) {
            let raw = line.slice(2).trim();
            const isValueOnly = raw.endsWith("&");
            if (isValueOnly) raw = raw.slice(0, -1).trim();

            const allLabels = {
                ...labels,
                ...hiddenLabels
            };
            let injected;

            if (raw.includes(".")) {
                const [scope, identity] = raw.split(".", 2);
                const data = scope.includes(":") ?
                    allLabels[scope.split(":")[0]][scope.split(":")[1]] :
                    allLabels[scope];
                const val = data[identity];
                injected = isValueOnly ? val : {
                    [identity]: val
                };

            } else if (raw.includes(":")) {
                const [lbl, sp] = raw.split(":", 2);
                const data = allLabels[lbl][sp];
                injected = isValueOnly ? data : {
                    [sp]: data
                };

            } else {
                const data = allLabels[raw];
                injected = isValueOnly ? data : {
                    [raw]: data
                };
            }

            let blk = spaceStack[currentSpace];
            if (insertInSpace) {
                if (isValueOnly) {
                    if (blk === null) {
                        blk = [];
                        spaceStack[currentSpace] = blk;
                    } else if (!Array.isArray(blk)) {
                        blk = Object.entries(blk).map(([k, v]) => ({
                            [k]: v
                        }));
                        spaceStack[currentSpace] = blk;
                    }
                    blk.push(injected);
                } else {
                    if (blk === null) {
                        blk = {};
                        spaceStack[currentSpace] = blk;
                    } else if (Array.isArray(blk)) {
                        throw new Error(`Cannot mix structured injection with list in space '${currentSpace}'`);
                    }
                    Object.assign(blk, injected);
                }
            } else {
                labelStack[currentLabel].push(injected);
            }
        }

    }

    return labels;
}

module.exports = {
    parseLoonFile
};
