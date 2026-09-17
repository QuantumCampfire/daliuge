/* Render the partition-level graph with the same DAG-style layout as the DAG view. */
function renderPartitionGraph(data, container) {
    var graphData = createPartitionGraphData(data);

    container.innerHTML = "";

    if (!graphData.nodeDataArray.length) {
        container.innerHTML = [
            "<div class='partition-placeholder' role='status'>",
            "<strong>No partition data available</strong>",
            "<span>The physical graph does not contain any partitioned nodes.</span>",
            "</div>"
        ].join("");
        return;
    }

    var svg = d3.select(container)
        .append("svg")
        .attr("class", "partition-graph")
        .attr("role", "img")
        .attr("aria-label", "Partition Graph")
        .append("g");

    var graph = new dagreD3.graphlib.Graph()
        .setGraph({
            rankdir: "LR",
            nodesep: 60,
            ranksep: 90,
            marginx: 30,
            marginy: 30
        })
        .setDefaultEdgeLabel(function () { return {}; });

    graphData.nodeDataArray.forEach(function (node) {
        graph.setNode(String(node.key), {
            labelType: "html",
            label: "<div class='partition-node-label'>" +
                escapePartitionGraphText(node.name) +
                "<span>" + node.nodeCount + " PG nodes</span></div>",
            class: "partition-node",
            rx: 6,
            ry: 6,
            padding: 12
        });
    });

    var maximumWeight = graphData.linkDataArray.reduce(function (maximum, link) {
        return Math.max(maximum, Number(link.weight) || 0);
    }, 1);

    graphData.linkDataArray.forEach(function (link) {
        var weight = Math.max(1, Number(link.weight) || 1);
        graph.setEdge(String(link.from), String(link.to), {
            label: "weight: " + weight,
            class: "partition-edge",
            style: "stroke-width: " + partitionEdgeWidth(weight, maximumWeight) + "px",
            arrowheadStyle: "fill: #65788b; stroke: #65788b;"
        });
    });

    var render = new dagreD3.render();
    svg.call(render, graph);

    var svgElement = d3.select(container).select("svg");
    var inner = svgElement.select("g");
    var zoom = d3.zoom().on("zoom", function () {
        inner.attr("transform", d3.event.transform);
    });
    svgElement.call(zoom);

    var bounds = inner.node().getBBox();
    var width = container.clientWidth || 1;
    var height = container.clientHeight || 1;
    var scale = Math.min(
        (width - 60) / Math.max(bounds.width, 1),
        (height - 60) / Math.max(bounds.height, 1),
        1
    );
    scale = Math.max(scale, 0.1);

    var x = (width - bounds.width * scale) / 2 - bounds.x * scale;
    var y = (height - bounds.height * scale) / 2 - bounds.y * scale;
    svgElement.call(
        zoom.transform,
        d3.zoomIdentity.translate(x, y).scale(scale)
    );
}

function partitionEdgeWidth(weight, maximumWeight) {
    if (maximumWeight <= 1) {
        return 3;
    }
    return 2 + (8 * (weight - 1) / (maximumWeight - 1));
}

function escapePartitionGraphText(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
