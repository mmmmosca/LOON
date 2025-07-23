const fs = require('fs');

function inferValueType(value, labels = {}, hiddenLabels = {}) {
        value = value.trim();

        if (value.startsWith("[") && value.endsWith("]")) {
                return {
                        __ref__: value.slice(1, -1).trim()
                };
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

function resolveReference(value, labels, hiddenLabels) {
        const ref = value.startsWith("[") ? value.slice(1, -1).trim() : value.trim();
        const allLabels = {
                ...labels,
                ...hiddenLabels
        };

        if (ref.includes(".")) {
                const [scope, identity] = ref.split(".", 2);
                let data;
                if (scope.includes(":")) {
                        const [lbl, sp] = scope.split(":", 2);
                        data = allLabels[lbl][sp];
                } else {
                        data = allLabels[scope];
                }
                return data?.[identity];
        } else if (ref.includes(":")) {
                const [lbl, sp] = ref.split(":", 2);
                return allLabels[lbl][sp];
        } else {
                return allLabels[ref];
        }
}

function resolveLazyRefs(data, labels, hiddenLabels) {
        if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                        if (data[i]?.__ref__) {
                                data[i] = resolveReference(`[${data[i].__ref__}]`, labels, hiddenLabels);
                        } else {
                                resolveLazyRefs(data[i], labels, hiddenLabels);
                        }
                }
        } else if (typeof data === 'object' && data !== null) {
                for (const [k, v] of Object.entries(data)) {
                        if (v?.__ref__) {
                                data[k] = resolveReference(`[${v.__ref__}]`, labels, hiddenLabels);
                        } else {
                                resolveLazyRefs(v, labels, hiddenLabels);
                        }
                }
        }
}

function parseLoonFile(filename, labels = {}, spaces = {}) {
        if (!filename.endsWith('.loon')) {
                console.error("ERROR: file must be a .loon file");
                process.exit(1);
        }

        const code = fs.readFileSync(filename, 'utf-8')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('<'));

        const hiddenLabels = {};
        const labelHiddenMap = {};
        const labelStack = {};
        const spaceStack = {};

        let currentLabel = null;
        let currentSpace = null;
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
                        currentSpace = null;
                        insertInSpace = false;
                } else if (line === "end") {
                        const result = {};
                        for (const item of labelStack[currentLabel]) {
                                if (Array.isArray(item)) {
                                        const [key, val] = item;
                                        result[key] = val;
                                } else if (typeof item === 'object') {
                                        Object.assign(result, item);
                                } else {
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
                        let [k, v] = line.split("=", 2).map(str => str.trim());
                        if (k.startsWith("$")) {
                                k = k.slice(1);
                                const allLabels = {
                                        ...labels,
                                        ...hiddenLabels
                                };
                                if (k.includes(".")) {
                                        const [scope, identity] = k.split(".", 2);
                                        if (scope.includes(":")) {
                                                const [lbl, sp] = scope.split(":", 2);
                                                if (!(lbl in allLabels)) {
                                                        console.error(`ERROR: the label '${lbl}' was not found`);
                                                        process.exit(1);
                                                } else if (!(sp in allLabels[lbl])) {
                                                        console.error(`ERROR: the space '${sp}' was not found`);
                                                        process.exit(1);
                                                }
                                                k = identity;
                                        } else {
                                                if (!(scope in allLabels)) {
                                                        console.error(`ERROR: the label '${scope}' was not found`);
                                                        process.exit(1);
                                                }
                                                k = identity;
                                        }
                                }
                        }
                        const val = inferValueType(v, labels, hiddenLabels);
                        if (insertInSpace) {
                                let blk = spaceStack[currentSpace];
                                if (blk == null) {
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
                        const parsedImportFile = parseLoonFile(fileName, tempLabels, spaces);
                        if (!currentLabel) {
                                Object.assign(labels, parsedImportFile);
                        } else if (insertInSpace) {
                                let blk = spaceStack[currentSpace];
                                if (blk == null) {
                                        blk = [];
                                        spaceStack[currentSpace] = blk;
                                } else if (!Array.isArray(blk)) {
                                        throw new Error(`Cannot mix key-value with list in space '${currentSpace}'`);
                                }
                                blk.push({
                                        [currentLabel]: parsedImportFile
                                });
                        } else {
                                labelStack[currentLabel].push(parsedImportFile);
                        }
                } else if (!line.startsWith("->")) {
                        const val = inferValueType(line, labels, hiddenLabels);
                        if (insertInSpace) {
                                let blk = spaceStack[currentSpace];
                                if (blk == null) {
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
                                let data;
                                if (scope.includes(":")) {
                                        const [lbl, sp] = scope.split(":", 2);
                                        data = allLabels[lbl][sp];
                                } else {
                                        data = allLabels[scope];
                                }
                                const val = data?.[identity];
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

                        if (insertInSpace) {
                                let blk = spaceStack[currentSpace];
                                if (isValueOnly) {
                                        if (blk == null) {
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
                                        if (blk == null) {
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

        for (const label of Object.values(labels)) {
                resolveLazyRefs(label, labels, hiddenLabels);
        }

        return labels;
}

module.exports = {
        parseLoonFile
};
