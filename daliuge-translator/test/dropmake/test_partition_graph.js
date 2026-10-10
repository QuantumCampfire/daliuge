const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadPartitionGraphModule() {
    const sourcePath = path.resolve(
        __dirname,
        "../../dlg/dropmake/web/src/partition_graph.js"
    );

    assert.equal(
        fs.existsSync(sourcePath),
        true,
        "partition_graph.js must provide the Partition renderer"
    );

    const source = fs.readFileSync(sourcePath, "utf8");
    const sandbox = {
        module: { exports: {} },
        exports: {}
    };
    vm.runInNewContext(source, sandbox, { filename: sourcePath });
    return sandbox.module.exports;
}

test("partition expansion state toggles partitions independently", () => {
    const { createPartitionExpansionState } = loadPartitionGraphModule();
    const state = createPartitionExpansionState();

    assert.equal(state.isExpanded("partition-1"), false);
    assert.equal(state.isExpanded("partition-2"), false);

    state.toggle("partition-1");

    assert.equal(state.isExpanded("partition-1"), true);
    assert.equal(state.isExpanded("partition-2"), false);

    state.toggle("partition-2");

    assert.equal(state.isExpanded("partition-1"), true);
    assert.equal(state.isExpanded("partition-2"), true);

    state.toggle("partition-1");

    assert.equal(state.isExpanded("partition-1"), false);
    assert.equal(state.isExpanded("partition-2"), true);
});

test("partition expansion state treats numeric and string keys as the same partition", () => {
    const { createPartitionExpansionState } = loadPartitionGraphModule();
    const state = createPartitionExpansionState();

    state.toggle(1);

    assert.equal(state.isExpanded("1"), true);
});

test("partition labels expose expand and collapse controls without internal content", () => {
    const { createPartitionNodeLabel } = loadPartitionGraphModule();
    const node = {
        key: 1,
        name: "Partition_1",
        nodeCount: 66
    };

    const collapsed = createPartitionNodeLabel(node, false);
    const expanded = createPartitionNodeLabel(node, true);

    assert.match(collapsed, /partition-node-label/);
    assert.doesNotMatch(collapsed, /is-expanded/);
    assert.match(collapsed, /Partition_1/);
    assert.match(collapsed, /66 nodes/);
    assert.match(collapsed, /aria-label="Expand Partition_1"/);
    assert.match(collapsed, />\+</);

    assert.match(expanded, /partition-node-label is-expanded/);
    assert.match(expanded, /aria-label="Collapse Partition_1"/);
    assert.match(expanded, />&minus;</);
    assert.doesNotMatch(expanded, /partition-node-content/);
});

test("viewer loads the Partition renderer before graph initialization", () => {
    const viewerPath = path.resolve(
        __dirname,
        "../../dlg/dropmake/web/pg_viewer.html"
    );
    const viewer = fs.readFileSync(viewerPath, "utf8");
    const dataScript = viewer.indexOf("/static/src/partition_data.js");
    const rendererScript = viewer.indexOf("/static/src/partition_graph.js");
    const graphInitScript = viewer.indexOf("/static/graph_init.js");

    assert.ok(dataScript >= 0);
    assert.ok(rendererScript > dataScript);
    assert.ok(graphInitScript > rendererScript);
});

test("Partition renderer is provided by its dedicated module", () => {
    const { renderPartitionGraph } = loadPartitionGraphModule();

    assert.equal(typeof renderPartitionGraph, "function");
});

test("Partition redraw clears the previous zoom transform before Dagre measures labels", () => {
    const rendererPath = path.resolve(
        __dirname,
        "../../dlg/dropmake/web/src/partition_graph.js"
    );
    const renderer = fs.readFileSync(rendererPath, "utf8");
    const clearTransform = renderer.indexOf('inner.attr("transform", null);');
    const renderGraph = renderer.indexOf("inner.call(getRender(), graph);");

    assert.ok(clearTransform >= 0);
    assert.ok(clearTransform < renderGraph);
});

test("expanded Partition styling reserves a larger blank content area", () => {
    const stylesheetPath = path.resolve(
        __dirname,
        "../../dlg/dropmake/web/src/main.css"
    );
    const stylesheet = fs.readFileSync(stylesheetPath, "utf8");

    assert.match(
        stylesheet,
        /\.partition-node-label\.is-expanded\s*\{[^}]*width:\s*360px;[^}]*height:\s*240px;/s
    );
    assert.match(
        stylesheet,
        /\.node\.partition-expanded rect\s*\{[^}]*height:\s*240px;/s
    );
    assert.match(
        stylesheet,
        /#partitionGraphArea \.node \.partition-node-label\s*\{[^}]*padding:\s*10px 34px;/s
    );
    assert.doesNotMatch(stylesheet, /(?:^|\n)\.node g div\s*\{/);
});
