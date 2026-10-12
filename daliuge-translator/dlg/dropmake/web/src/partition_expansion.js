function renderPartitionExpansion(data, partitionKey, overlay) {
    const content =
        overlay.querySelector("#partitionExpansionContent");

    if (!content) {
        return;
    }

    // Dispose the Sankey for the previously selected partition.
    const existingChart =
        echarts.getInstanceByDom(content);

    if (existingChart) {
        existingChart.dispose();
    }

    const expandedData =
        createExpandedPartitionData(data, partitionKey);

    console.log(
        "Expanded partition:",
        partitionKey,
        expandedData
    );

    // Remove the placeholder or previous Sankey content.
    content.innerHTML = "";

    if (expandedData.nodeDataArray.length === 0) {
        content.innerHTML = [
            '<div class="partition-expansion-placeholder" role="status">',
            "  <strong>No nodes found</strong>",
            "  <span>This partition does not contain any physical graph nodes.</span>",
            "</div>"
        ].join("");

        return;
    }

    renderExpandedPartitionSankey(
        expandedData,
        content
    );
}

function disposeExpandedPartitionSankey(overlay) {
    const content =
        overlay.querySelector("#partitionExpansionContent");

    if (!content) {
        return;
    }

    const chart =
        echarts.getInstanceByDom(content);

    if (chart) {
        chart.dispose();
    }
}

function renderExpandedPartitionSankey(
    expandedData,
    container
) {
    // Add visual styling to the generated Sankey nodes.
    const sankeyNodes =
        expandedData.nodeDataArray.map(function (node) {
            const sankeyNode =
                Object.assign({}, node);

            // Style boundary nodes differently from normal PG nodes.
            if (node.boundary === true) {
                sankeyNode.itemStyle = {
                    color: "#d9e2ec"
                };
            } else {
                sankeyNode.itemStyle = {
                    color:
                        node.category === "Data"
                            ? "#9ab4d0"
                            : "#7f9cbb"
                };
            }

            return sankeyNode;
        });

    const chart = echarts.init(
        container,
        null,
        {
            renderer: "svg"
        }
    );

    chart.setOption({
        tooltip: {
            trigger: "item",
            triggerOn: "mousemove"
        },

        series: [{
            type: "sankey",
            data: sankeyNodes,

            // Already generated as source, target, value.
            links: expandedData.linkDataArray,
            orient: "horizontal",
            nodeAlign: "justify",

            label: {
                show: true,

                // Show the real PG/boundary label instead of the internal Sankey identifier.
                formatter: function (params) {
                    return params.data.displayName;
                }
            },

            lineStyle: {
                color: "source",
                curveness: 0.5
            },

            emphasis: {
                focus: "adjacency"
            }
        }]
    });

    return chart;
}