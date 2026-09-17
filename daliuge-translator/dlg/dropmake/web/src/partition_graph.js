/* Partition graph renderer.
 *
 * The input remains the physical graph template.  Aggregation is deliberately
 * kept in partition_data.js so this module only owns layout and drawing.
 */
function renderPartitionGraph(data, container) {
    var partitionData = createPartitionGraphData(data);
    var width = Math.max(container.clientWidth || 0, 1);
    var height = Math.max(container.clientHeight || 0, 1);

    container.innerHTML = "";

    var svg = d3.select(container)
        .append("svg")
        .attr("id", "partitionGraph")
        .attr("role", "img")
        .attr("aria-label", "Partition graph")
        .attr("width", width)
        .attr("height", height)
        .style("width", "100%")
        .style("height", "100%");

    var root = svg.append("g").attr("id", "partitionGraphRoot");
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
            label: [
                "<div class=\"partition-node\">",
                "<strong>", escapePartitionLabel(partition.name), "</strong>",
                "<span>", nodeCount, " PG nodes</span>",
                "</div>"
            ].join(""),
            class: "partition-node-container",
            rx: 6,
            ry: 6,
            padding: 0
        });
    });

    partitionData.linkDataArray.forEach(function (link) {
        var weight = Math.max(1, Number(link.weight) || 1);
        graph.setEdge(link.from, link.to, {
            label: String(link.weight),
            width: weight,
            lineInterpolate: "basis",
            arrowhead: "vee"
        });
    });

    root.call(new dagreD3.render(), graph);

    var zoom = d3.zoom().on("zoom", function () {
        root.attr("transform", d3.event.transform);
    });
    svg.call(zoom);

    function fitGraph() {
        var graphRoot = root.node();
        if (!graphRoot || !graphRoot.getBBox) {
            return;
        }

        var bounds = graphRoot.getBBox();
        var availableWidth = container.clientWidth;
        var availableHeight = container.clientHeight;
        if (!bounds.width || !bounds.height || !availableWidth || !availableHeight) {
            return;
        }

        var scale = Math.min(
            (availableWidth - 40) / bounds.width,
            (availableHeight - 40) / bounds.height,
            1
        );
        var x = (availableWidth - bounds.width * scale) / 2 - bounds.x * scale;
        var y = (availableHeight - bounds.height * scale) / 2 - bounds.y * scale;
        svg.call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    }

    fitGraph();

    // The viewer can be resized without recreating the graph.
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
