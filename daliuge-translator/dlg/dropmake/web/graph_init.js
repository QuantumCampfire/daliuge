function partitionGraphInit(data) {
    $("#main").append("<div id='partitionGraphArea'></div>");

    var container = document.getElementById("partitionGraphArea");
    console.log("Partition input:", data);
    console.log("Partition nodes:", createPartitionGraphData(data));
    console.log("[partition] graphInit called with graphType=partition");
    console.log("[partition] raw data keys:", Object.keys(data || {}));
    console.log("[partition] nodeDataArray length:", (data && data.nodeDataArray) ? data.nodeDataArray.length : 0);
    console.log("[partition] linkDataArray length:", (data && data.linkDataArray) ? data.linkDataArray.length : 0);

    if (typeof renderPartitionGraph === "function") {
        console.log("[partition] renderPartitionGraph is available");
        var graphData = createPartitionGraphData(data);
        console.log("[partition] aggregated nodeDataArray:", graphData.nodeDataArray);
        console.log("[partition] aggregated linkDataArray:", graphData.linkDataArray);
        renderPartitionGraph(data, container);
    } else {
        console.log("[partition] renderPartitionGraph is NOT available");
        console.log("Partition renderer was not loaded");
        container.innerHTML = [
            "<div class='partition-placeholder' role='status'>",
            "<strong>Partition Graph renderer not available</strong>",
            "<span>The Partition view is ready. Its visualisation will appear here when the renderer is connected.</span>",
            "</div>"
        ].join("");
    }
}
