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
        document: {
            documentElement: {
                contains: function () { return true; }
            }
        },
        module: { exports: {} },
        exports: {}
    };
    vm.runInNewContext(source, sandbox, { filename: sourcePath });
    return sandbox.module.exports;
}

test("partition expansion state keeps only the latest overlay open", () => {
    const { createPartitionExpansionState } = loadPartitionGraphModule();
    const state = createPartitionExpansionState();

    assert.equal(state.isExpanded("partition-1"), false);
    assert.equal(state.isExpanded("partition-2"), false);

    state.open("partition-1");

    assert.equal(state.isExpanded("partition-1"), true);
    assert.equal(state.isExpanded("partition-2"), false);

    state.open("partition-2");

    assert.equal(state.isExpanded("partition-1"), false);
    assert.equal(state.isExpanded("partition-2"), true);

    state.close();

    assert.equal(state.isExpanded("partition-1"), false);
    assert.equal(state.isExpanded("partition-2"), false);
});

test("partition expansion state treats numeric and string keys as the same partition", () => {
    const { createPartitionExpansionState } = loadPartitionGraphModule();
    const state = createPartitionExpansionState();

    state.open(1);

    assert.equal(state.isExpanded("1"), true);
});

test("partition expansion request preserves graph data and selected key", () => {
    const { createPartitionExpansionRequest } = loadPartitionGraphModule();
    const data = {
        nodeDataArray: [{ key: 1 }, { key: 2 }],
        linkDataArray: [{ from: 1, to: 2 }]
    };

    const request = createPartitionExpansionRequest(data, 2);

    assert.equal(request.data, data);
    assert.equal(request.partitionKey, "2");
});

test("partition expansion overlay provides a separate Sankey placeholder", () => {
    const { createPartitionExpansionOverlayMarkup } =
        loadPartitionGraphModule();

    const markup = createPartitionExpansionOverlayMarkup();

    assert.match(markup, /id="partitionExpansionOverlay"/);
    assert.match(markup, /role="dialog"/);
    assert.match(markup, /hidden/);
    assert.match(markup, /id="partitionExpansionContent"/);
    assert.match(markup, /Expanded Sankey/);
    assert.match(markup, /class="partition-expansion-close"/);
});

test("opening and closing the overlay exposes the Sprint 3 expansion request", () => {
    const {
        closePartitionExpansionOverlay,
        createPartitionExpansionState,
        openPartitionExpansionOverlay
    } = loadPartitionGraphModule();
    const data = {
        nodeDataArray: [
            { key: 2, name: "Partition_2", isGroup: true }
        ],
        linkDataArray: []
    };
    const state = createPartitionExpansionState();
    const title = { textContent: "" };
    let closeFocused = false;
    let triggerFocused = false;
    const closeButton = {
        focus: function () { closeFocused = true; }
    };
    const overlay = {
        dataset: {},
        hidden: true,
        partitionExpansionRequest: null,
        querySelector: function (selector) {
            return selector === "#partitionExpansionTitle"
                ? title
                : closeButton;
        },
        removeAttribute: function (attribute) {
            if (attribute === "data-partition-key") {
                delete this.dataset.partitionKey;
            }
        }
    };
    const trigger = {
        focus: function () { triggerFocused = true; }
    };

    const request = openPartitionExpansionOverlay(
        data,
        2,
        overlay,
        state,
        trigger
    );

    assert.equal(request.data, data);
    assert.equal(request.partitionKey, "2");
    assert.equal(overlay.partitionExpansionRequest, request);
    assert.equal(overlay.dataset.partitionKey, "2");
    assert.equal(overlay.hidden, false);
    assert.equal(title.textContent, "Partition_2");
    assert.equal(state.isExpanded(2), true);
    assert.equal(closeFocused, true);

    closePartitionExpansionOverlay(overlay, state);

    assert.equal(overlay.hidden, true);
    assert.equal(overlay.partitionExpansionRequest, null);
    assert.equal(state.getExpandedKey(), null);
    assert.equal(triggerFocused, true);
});

test("partition labels remain compact when their overlay is open", () => {
    const { createPartitionNodeLabel } = loadPartitionGraphModule();
    const node = {
        key: 1,
        name: "Partition_1",
        nodeCount: 66
    };

    const label = createPartitionNodeLabel(node);

    assert.match(label, /partition-node-label/);
    assert.doesNotMatch(label, /is-expanded/);
    assert.match(label, /Partition_1/);
    assert.match(label, /66 nodes/);
    assert.match(label, /aria-label="Expand Partition_1"/);
    assert.match(label, />\+</);
    assert.doesNotMatch(label, /partition-node-content/);
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

test("partition clicks open the overlay without filtering or redrawing Dagre", () => {
    const rendererPath = path.resolve(
        __dirname,
        "../../dlg/dropmake/web/src/partition_graph.js"
    );
    const renderer = fs.readFileSync(rendererPath, "utf8");

    assert.doesNotMatch(renderer, /function createVisiblePartitionGraph/);
    assert.match(
        renderer,
        /openPartitionExpansionOverlay\(\s*data,\s*partitionKey/
    );
    assert.doesNotMatch(
        renderer,
        /expansionState\.toggle\(partitionKey\);\s*drawPartitionGraph\(\);/
    );
    assert.equal(
        (renderer.match(/drawPartitionGraph\(\);/g) || []).length,
        1
    );
});

test("expanded Partition styling uses a separate focus overlay", () => {
    const stylesheetPath = path.resolve(
        __dirname,
        "../../dlg/dropmake/web/src/main.css"
    );
    const stylesheet = fs.readFileSync(stylesheetPath, "utf8");

    assert.match(
        stylesheet,
        /#partitionExpansionOverlay\s*\{[^}]*position:\s*absolute;/s
    );
    assert.match(stylesheet, /\.partition-expansion-panel\s*\{/);
    assert.match(stylesheet, /#partitionExpansionContent\s*\{/);
    assert.doesNotMatch(stylesheet, /\.partition-node-label\.is-expanded/);
    assert.doesNotMatch(stylesheet, /\.node\.partition-expanded/);
    assert.match(
        stylesheet,
        /#partitionGraphArea \.node \.partition-node-label\s*\{[^}]*padding:\s*10px 34px;/s
    );
    assert.doesNotMatch(stylesheet, /(?:^|\n)\.node g div\s*\{/);
});
