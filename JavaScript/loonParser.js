const fs = require("fs");
const path = require("path");

function inferValueType(value, labels) {
    value = value.trim();
    if (value.startsWith("[") && value.endsWith("]") && labels) {
        return resolveReference(value, labels);
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

function resolveReference(value, labels) {
    const ref = value.slice(1, -1).trim();

    if (ref.includes(".")) {
        const [scope, identity] = ref.split(".", 2);
        const data = scope.includes(":") ?
            labels[scope.split(":")[0]][scope.split(":")[1]] :
            labels[scope];
        return data?.[identity];
    } else if (ref.includes(":")) {
        const [lbl, sp] = ref.split(":", 2);
        return labels[lbl][sp];
    } else {
        return labels[ref];
    }
}

function parseLoonFile(filename, labels = {}, spaces = {}) {
    if (!filename.endsWith(".loon")) {
        console.error("ERROR: file must be a .loon file");
        process.exit(1);
    }

    const lines = fs.readFileSync(filename, "utf-8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("<"));

    let currentLabel = null;
    let currentSpace = null;
    const labelStack = {};
    const spaceStack = {};
    let insertInSpace = false;

    for (const line of lines) {
        if (line.startsWith("(") && line.endsWith(")")) {
            currentLabel = line.slice(1, -1);
            labelStack[currentLabel] = [];
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
            currentSpace = null;
            insertInSpace = false;

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
            labels[currentLabel] = result;
            currentLabel = null;

        } else if (line.includes("=")) {
            const [k, v] = line.split("=").map(s => s.trim());
            const val = inferValueType(v, labels);
            if (insertInSpace) {
                let blk = spaceStack[currentSpace];
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
                process.exit(1);
            }
            const tempLabels = {};
            const parsedImport = parseLoonFile(fileName, tempLabels, spaces);
            if (currentLabel === null) {
                Object.assign(labels, parsedImport);
            } else if (insertInSpace) {
                let blk = spaceStack[currentSpace];
                if (blk === null) {
                    blk = [];
                    spaceStack[currentSpace] = blk;
                } else if (!Array.isArray(blk)) {
                    throw new Error(`Cannot mix structured injection with key-value in space '${currentSpace}'`);
                }
                blk.push({
                    [currentLabel]: parsedImport
                });
            } else {
                labelStack[currentLabel].push(parsedImport);
            }

        } else if (!line.startsWith("->")) {
            const val = inferValueType(line, labels);
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
            let isValueOnly = false;

            if (raw.endsWith("&")) {
                isValueOnly = true;
                raw = raw.slice(0, -1).trim();
            }

            let injected;
            if (raw.includes(".")) {
                const [scope, identity] = raw.split(".", 2);
                const data = scope.includes(":") ?
                    labels[scope.split(":")[0]][scope.split(":")[1]] :
                    labels[scope];
                const val = data?.[identity];
                injected = isValueOnly ? val : {
                    [identity]: val
                };

            } else if (raw.includes(":")) {
                const [lbl, sp] = raw.split(":", 2);
                const data = labels[lbl][sp];
                injected = isValueOnly ? data : {
                    [sp]: data
                };

            } else {
                const data = labels[raw];
                injected = isValueOnly ? data : {
                    [raw]: data
                };
            }

            if (insertInSpace) {
                let blk = spaceStack[currentSpace];
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
