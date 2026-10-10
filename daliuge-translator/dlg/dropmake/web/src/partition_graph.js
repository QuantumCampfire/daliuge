function createPartitionExpansionState() {
    const expandedPartitions = new Set();
    const normaliseKey = function (partitionKey) {
        return String(partitionKey);
    };

    return {
        isExpanded: function (partitionKey) {
            return expandedPartitions.has(normaliseKey(partitionKey));
        },
        toggle: function (partitionKey) {
            const key = normaliseKey(partitionKey);

            if (expandedPartitions.has(key)) {
                expandedPartitions.delete(key);
                return false;
            }

            expandedPartitions.add(key);
            return true;
        }
    };
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

function createPartitionNodeLabel(node, expanded) {
    const name = escapePartitionLabel(node.name);
    const nodeCount = Number(node.nodeCount);
    const labelClass = expanded
        ? "partition-node-label is-expanded"
        : "partition-node-label";
    const action = expanded ? "Collapse" : "Expand";
    const icon = expanded ? "&minus;" : "+";

    return [
        '<div class="' + labelClass + '" id="partition_' +
            escapePartitionLabel(node.key) + '">',
        '  <span class="partition-node-name">' + name + "</span>",
        '  <span class="partition-node-count">' + nodeCount + " node" +
            (nodeCount === 1 ? "" : "s") + "</span>",
        '  <span class="partition-node-toggle" aria-label="' + action +
            " " + name + '">' + icon + "</span>",
        "</div>"
    ].join("");
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
    const svg = d3.select("#partitionD3Graph");
    const zoom = d3.zoom().on("zoom", function () {
        inner.attr("transform", d3.event.transform);
    });

    svg.call(zoom);

    function drawPartitionGraph() {
        // Dagre measures HTML labels in screen coordinates. Clear the previous
        // zoom transform so repeated redraws do not progressively skew labels.
        inner.attr("transform", null);
        inner.selectAll("*").remove();

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
            const expanded = expansionState.isExpanded(node.key);

            graph.setNode(node.key, {
                labelType: "html",
                label: createPartitionNodeLabel(node, expanded),
                rx: 5,
                ry: 5,
                padding: 0,
                class: expanded
                    ? "partition partition-expanded"
                    : "partition partition-collapsed",
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
            .attr("aria-expanded", function (partitionKey) {
                return String(expansionState.isExpanded(partitionKey));
            })
            .attr("aria-label", function (partitionKey) {
                const node = partitionGraph.nodeDataArray.find(function (item) {
                    return String(item.key) === String(partitionKey);
                });
                const action = expansionState.isExpanded(partitionKey)
                    ? "Collapse "
                    : "Expand ";
                return action + (node ? node.name : "partition");
            })
            .on("click", function (partitionKey) {
                d3.event.stopPropagation();
                expansionState.toggle(partitionKey);
                drawPartitionGraph();
            })
            .on("keydown", function (partitionKey) {
                if (d3.event.key !== "Enter" && d3.event.key !== " ") {
                    return;
                }

                d3.event.preventDefault();
                d3.event.stopPropagation();
                expansionState.toggle(partitionKey);
                drawPartitionGraph();
            });

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
        createPartitionNodeLabel: createPartitionNodeLabel,
        renderPartitionGraph: renderPartitionGraph
    };
}
