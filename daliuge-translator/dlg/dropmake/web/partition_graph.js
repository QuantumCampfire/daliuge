/* Partition graph renderer.
 *
 * The partition graph is aggregated by createPartitionGraphData. Keep the
 * layout here on the same dagre-d3 stack as the physical graph so both views
 * have the same zooming and left-to-right DAG behaviour.
 */
function renderPartitionGraph(data, container) {
    var partitionData = createPartitionGraphData(data);
    var svg = d3.select(container)
        .append("svg")
        .attr("id", "partitionGraph")
        .attr("role", "img")
        .attr("aria-label", "Partition graph")
        .append("g")
        .attr("id", "partitionGraphRoot");

    var graph = new dagreD3.graphlib.Graph()
        .setGraph({
            rankdir: "LR",
            nodesep: 70,
            ranksep: 100,
            marginx: 40,
            marginy: 40
        })
        .setDefaultEdgeLabel(function () { return {}; });

    partitionData.nodeDataArray.forEach(function (partition) {
        var nodeCount = Number(partition.nodeCount) || 0;
        graph.setNode(partition.key, {
            labelType: "html",
            label: "<div class=\"partition-node\"><strong>" +
                escapePartitionLabel(partition.name) +
                "</strong><span>" + nodeCount + " PG nodes</span></div>",
            class: "partition-node-container",
            rx: 6,
            ry: 6,
            padding: 0
        });
    });

    partitionData.linkDataArray.forEach(function (link) {
        // The aggregated edge weight is deliberately used as the rendered
        // stroke width: more cross-partition connections are more prominent.
        var weight = Math.max(1, Number(link.weight) || 1);
        graph.setEdge(link.from, link.to, {
            label: String(link.weight),
            width: weight,
            lineInterpolate: "basis",
            arrowhead: "vee"
        });
    });

    var render = getRender();
    svg.call(render, graph);

    var svgElement = d3.select(container).select("svg");
    var zoomLayer = svgElement.select("g");
    var zoom = d3.zoom().on("zoom", function () {
        zoomLayer.attr("transform", d3.event.transform);
    });
    svgElement.call(zoom);

    function fitGraph() {
        var root = zoomLayer.node();
        if (!root || !root.getBBox) {
            return;
        }
        var bounds = root.getBBox();
        var width = container.clientWidth;
        var height = container.clientHeight;
        if (!bounds.width || !bounds.height || !width || !height) {
            return;
        }
        var scale = Math.min(
            (width - 40) / bounds.width,
            (height - 40) / bounds.height,
            1
        );
        var x = (width - bounds.width * scale) / 2 - bounds.x * scale;
        var y = (height - bounds.height * scale) / 2 - bounds.y * scale;
        svgElement.call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    }

    fitGraph();
    window.addEventListener("resize", fitGraph);
}

function escapePartitionLabel(value) {
    return String(value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
