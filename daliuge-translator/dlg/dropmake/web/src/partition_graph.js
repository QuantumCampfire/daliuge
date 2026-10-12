function createPartitionExpansionState() {
    let expandedPartition = null;
    const normaliseKey = function (partitionKey) {
        return String(partitionKey);
    };

    return {
        isExpanded: function (partitionKey) {
            return expandedPartition === normaliseKey(partitionKey);
        },
        getExpandedKey: function () {
            return expandedPartition;
        },
        open: function (partitionKey) {
            expandedPartition = normaliseKey(partitionKey);
            return expandedPartition;
        },
        close: function () {
            expandedPartition = null;
        },
        toggle: function (partitionKey) {
            const key = normaliseKey(partitionKey);

            if (expandedPartition === key) {
                expandedPartition = null;
                return false;
            }

            expandedPartition = key;
            return true;
        }
    };
}

function createPartitionExpansionRequest(data, partitionKey) {
    return {
        data: data,
        partitionKey: String(partitionKey)
    };
}

function createPartitionExpansionOverlayMarkup() {
    return [
        '<section id="partitionExpansionOverlay" role="dialog" ',
        'aria-modal="true" aria-labelledby="partitionExpansionTitle" hidden>',
        '  <div class="partition-expansion-panel">',
        '    <header class="partition-expansion-header">',
        '      <h2 id="partitionExpansionTitle">Partition expansion</h2>',
        '      <button type="button" class="partition-expansion-close" ',
        'aria-label="Close partition expansion">&times;</button>',
        "    </header>",
        '    <div id="partitionExpansionContent">',
        '      <div class="partition-expansion-placeholder" role="status">',
        "        <strong>Expanded Sankey placeholder</strong>",
        "        <span>The selected partition will render here.</span>",
        "      </div>",
        "    </div>",
        "  </div>",
        "</section>"
    ].join("");
}

function getPartitionExpansionName(data, partitionKey) {
    const group = data.nodeDataArray.find(function (node) {
        return (
            node.isGroup === true &&
            String(node.key) === String(partitionKey)
        );
    });

    return group ? group.name : "Partition_" + partitionKey;
}

function openPartitionExpansionOverlay(
    data,
    partitionKey,
    overlay,
    expansionState,
    triggerElement
) {
    const request = createPartitionExpansionRequest(data, partitionKey);
    const title = overlay.querySelector("#partitionExpansionTitle");

    expansionState.open(request.partitionKey);
    overlay.partitionExpansionRequest = request;
    overlay.dataset.partitionKey = request.partitionKey;
    overlay.hidden = false;
    overlay.triggerElement = triggerElement || null;
    title.textContent = getPartitionExpansionName(
        request.data,
        request.partitionKey
    );

    const closeButton = overlay.querySelector(".partition-expansion-close");
    if (closeButton) {
        closeButton.focus();
    }

    return request;
}

function closePartitionExpansionOverlay(overlay, expansionState) {
    const triggerElement = overlay.triggerElement;

    expansionState.close();
    overlay.hidden = true;
    overlay.removeAttribute("data-partition-key");
    overlay.partitionExpansionRequest = null;
    overlay.triggerElement = null;

    if (triggerElement && document.documentElement.contains(triggerElement)) {
        triggerElement.focus();
    }
}

function escapePartitionLabel(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[character];
    });
}

function createPartitionNodeLabel(node) {
    const name = escapePartitionLabel(node.name);
    const nodeCount = Number(node.nodeCount);

    return [
        '<div class="partition-node-label" id="partition_' +
            escapePartitionLabel(node.key) + '">',
        '  <span class="partition-node-name">' + name + "</span>",
        '  <span class="partition-node-count">' + nodeCount + " node" +
            (nodeCount === 1 ? "" : "s") + "</span>",
        '  <span class="partition-node-toggle" aria-label="Expand ' +
            name + '">+</span>',
        "</div>"
    ].join("");
}

function updatePartitionNodeSelection(inner, partitionGraph, expansionState) {
    inner.selectAll("g.node")
        .classed("partition-selected", function (partitionKey) {
            return expansionState.isExpanded(partitionKey);
        })
        .attr("aria-expanded", function (partitionKey) {
            return String(expansionState.isExpanded(partitionKey));
        })
        .attr("aria-label", function (partitionKey) {
            const node = partitionGraph.nodeDataArray.find(function (item) {
                return String(item.key) === String(partitionKey);
            });
            const action = expansionState.isExpanded(partitionKey)
                ? "Expansion open for "
                : "Expand ";
            return action + (node ? node.name : "partition");
        })
        .each(function (partitionKey) {
            const selected = expansionState.isExpanded(partitionKey);
            const node = partitionGraph.nodeDataArray.find(function (item) {
                return String(item.key) === String(partitionKey);
            });
            const name = node ? node.name : "partition";

            d3.select(this)
                .select(".partition-node-toggle")
                .text(selected ? "\u2212" : "+")
                .attr(
                    "aria-label",
                    (selected ? "Expansion open for " : "Expand ") + name
                );
        });
}

function renderPartitionGraph(data, container) {
    const partitionGraph = createPartitionGraphData(data);

    if (partitionGraph.nodeDataArray.length === 0) {
        container.innerHTML = [
            "<div class='partition-placeholder' role='status'>",
            "<strong>No partitions found</strong>",
            "<span>This physical graph does not contain any partition groups.</span>",
            "</div>"
        ].join("");
        return;
    }

    const expansionState = createPartitionExpansionState();

    const inner = d3.select(container)
        .append("div").attr("id", "partitionGraphAreaInner")
        .append("svg").attr("id", "partitionD3Graph")
        .append("g").attr("id", "partitionRoot");
    container.insertAdjacentHTML(
        "beforeend",
        createPartitionExpansionOverlayMarkup()
    );
    const overlay = container.querySelector("#partitionExpansionOverlay");
    const svg = d3.select("#partitionD3Graph");
    const zoom = d3.zoom().on("zoom", function () {
        inner.attr("transform", d3.event.transform);
    });

    svg.call(zoom);

    const closeOverlay = function () {
        closePartitionExpansionOverlay(overlay, expansionState);
        updatePartitionNodeSelection(
            inner,
            partitionGraph,
            expansionState
        );
    };

    overlay.querySelector(".partition-expansion-close")
        .addEventListener("click", closeOverlay);
    overlay.addEventListener("click", function (event) {
        if (event.target === overlay) {
            closeOverlay();
        }
    });
    overlay.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            event.preventDefault();
            closeOverlay();
        }
    });

    function drawPartitionGraph() {
        const graph = new dagreD3.graphlib.Graph({ compound: false })
            .setGraph({
                nodesep: 70,
                ranksep: 50,
                rankdir: "LR",
                marginx: 20,
                marginy: 20
            })
            .setDefaultEdgeLabel(function () { return {}; });
        let maxWeight = 1;

        partitionGraph.linkDataArray.forEach(function (link) {
            maxWeight = Math.max(maxWeight, link.weight);
        });

        partitionGraph.nodeDataArray.forEach(function (node) {
            graph.setNode(node.key, {
                labelType: "html",
                label: createPartitionNodeLabel(node),
                rx: 5,
                ry: 5,
                padding: 0,
                class: "partition",
                shape: "rect"
            });
        });

        partitionGraph.linkDataArray.forEach(function (link) {
            const ratio = maxWeight > 1 ? (link.weight / maxWeight) : 1;
            const strokeWidth = 1.5 + ratio * 12.5;
            const hue = 210 - Math.floor(ratio * 90);
            const strokeColor = "hsl(" + hue + ", 65%, 45%)";

            graph.setEdge(link.from, link.to, {
                style: "stroke: " + strokeColor +
                    "; stroke-width: " + strokeWidth + ";",
                curve: d3.curveBasis,
                arrowhead: "none",
                label: String(link.weight),
                labelStyle: "font-size: 11px; fill: #333;",
                labelType: "html"
            });
        });

        inner.call(getRender(), graph);

        inner.selectAll("g.node")
            .attr("role", "button")
            .attr("tabindex", 0)
            .on("click", function (partitionKey) {
                d3.event.stopPropagation();
                openPartitionExpansionOverlay(
                    data,
                    partitionKey,
                    overlay,
                    expansionState,
                    this
                );
                updatePartitionNodeSelection(
                    inner,
                    partitionGraph,
                    expansionState
                );
            })
            .on("keydown", function (partitionKey) {
                if (d3.event.key !== "Enter" && d3.event.key !== " ") {
                    return;
                }

                d3.event.preventDefault();
                d3.event.stopPropagation();
                openPartitionExpansionOverlay(
                    data,
                    partitionKey,
                    overlay,
                    expansionState,
                    this
                );
                updatePartitionNodeSelection(
                    inner,
                    partitionGraph,
                    expansionState
                );
            });

        updatePartitionNodeSelection(inner, partitionGraph, expansionState);
        fitPartitionGraph(svg, inner, zoom);
    }

    drawPartitionGraph();

    const resizeHandler = function () {
        if (!document.getElementById("partitionD3Graph")) {
            window.removeEventListener("resize", resizeHandler);
            return;
        }
        fitPartitionGraph(svg, inner, zoom);
    };
    window.addEventListener("resize", resizeHandler);
}

function fitPartitionGraph(svg, inner, zoom) {
    const svgNode = svg.node();
    const innerNode = inner.node();
    if (!svgNode || !innerNode) {
        return;
    }

    const bounds = innerNode.getBBox();
    const fullWidth = svgNode.clientWidth;
    const fullHeight = svgNode.clientHeight;
    if (
        bounds.width === 0 ||
        bounds.height === 0 ||
        fullWidth === 0 ||
        fullHeight === 0
    ) {
        return;
    }

    const widthScale = (fullWidth - 60) / bounds.width;
    const heightScale = (fullHeight - 60) / bounds.height;
    const scale = Math.max(Math.min(widthScale, heightScale, 1), 0.05);
    const translateX =
        (fullWidth - bounds.width * scale) / 2 - bounds.x * scale;
    const translateY =
        (fullHeight - bounds.height * scale) / 2 - bounds.y * scale;
    const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);

    svg.call(zoom.transform, transform);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        createPartitionExpansionState: createPartitionExpansionState,
        createPartitionExpansionRequest: createPartitionExpansionRequest,
        createPartitionExpansionOverlayMarkup:
            createPartitionExpansionOverlayMarkup,
        openPartitionExpansionOverlay: openPartitionExpansionOverlay,
        closePartitionExpansionOverlay: closePartitionExpansionOverlay,
        createPartitionNodeLabel: createPartitionNodeLabel,
        renderPartitionGraph: renderPartitionGraph
    };
}
