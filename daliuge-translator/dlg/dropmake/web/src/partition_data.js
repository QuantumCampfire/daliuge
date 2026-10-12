function createPartitionGraphData(data) {
    const partitionGraph = {
        nodeDataArray: [],
        linkDataArray: []
    };

    // Metadata for the group/partition objects already produced by the translator.
    const groupInfo = new Map();

    // PG node key -> partition key.
    const nodeToPartition = new Map();

    // Partition key -> number of PG nodes inside it.
    const partitionNodeCounts = new Map();

    // "partitionA-partitionB" -> undirected partition edge.
    const partitionEdges = new Map();

    // Store information about existing partition/group objects.
    data.nodeDataArray.forEach(function (node) {
        if (node.isGroup === true) {
            groupInfo.set(node.key, node);
        }
    });

    // Determine which partition each physical node belongs to.
    data.nodeDataArray.forEach(function (node) {
        if (node.isGroup === true) {
            return;
        }

        if (node.group === undefined) {
            return;
        }

        nodeToPartition.set(node.key, node.group);

        if (!partitionNodeCounts.has(node.group)) {
            partitionNodeCounts.set(node.group, 0);
        }

        partitionNodeCounts.set(
            node.group,
            partitionNodeCounts.get(node.group) + 1
        );
    });

    // Create one Partition Graph node for every partition that actually contains PG nodes.
    partitionNodeCounts.forEach(function (nodeCount, partitionKey) {
        const group = groupInfo.get(partitionKey);

        partitionGraph.nodeDataArray.push({
            key: partitionKey,
            name: group ? group.name : "Partition_" + partitionKey,
            nodeCount: nodeCount
        });
    });

    // Examine every PG connection.
    data.linkDataArray.forEach(function (link) {
        const fromPartition = nodeToPartition.get(link.from);
        const toPartition = nodeToPartition.get(link.to);

        if (
            fromPartition === undefined ||
            toPartition === undefined
        ) {
            return;
        }

        // Ignore connections within the same partition.
        if (fromPartition === toPartition) {
            return;
        }

        // Normalise the pair so P1->P2 and P2->P1 become the same undirected partition edge.
        const firstPartition = Math.min(fromPartition, toPartition);
        const secondPartition = Math.max(fromPartition, toPartition);

        const edgeKey = firstPartition + "-" + secondPartition;

        if (!partitionEdges.has(edgeKey)) {
            partitionEdges.set(edgeKey, {
                from: firstPartition,
                to: secondPartition,
                weight: 1
            });
        } else {
            partitionEdges.get(edgeKey).weight += 1;
        }
    });

    partitionGraph.linkDataArray =
        Array.from(partitionEdges.values());

    return partitionGraph;
}

function createExpandedPartitionData(data, selectedPartitionKey) {
    const expandedPartition = {
        nodeDataArray: [],
        linkDataArray: []
    };

    // Convert the selected partition key to a string so that numeric and string partition keys can be compared consistently.
    const selectedPartition = String(selectedPartitionKey);

    // Partition key -> partition/group information.
    const groupInfo = new Map();

    // PG node key -> partition key.
    const nodeToPartition = new Map();

    // Boundary key -> generated inbound/outbound boundary node.
    const boundaryNodes = new Map();

    // "source->target" -> expanded Sankey edge.
    const expandedLinks = new Map();

    // Store information about existing partition/group objects.
    data.nodeDataArray.forEach(function (node) {
        if (node.isGroup === true) {
            groupInfo.set(String(node.key), node);
        }
    });

    // Determine which partition each physical node belongs to and add PG nodes belonging to the selected partition.
    data.nodeDataArray.forEach(function (node) {
        if (node.isGroup === true) {
            return;
        }

        if (node.group === undefined) {
            return;
        }

        const nodeKey = String(node.key);
        const partitionKey = String(node.group);

        nodeToPartition.set(nodeKey, partitionKey);

        if (partitionKey === selectedPartition) {
            const sankeyNode = Object.assign({}, node);

            // ECharts uses "name" as the node identifier. Keep the original PG name separately for displaying to the user.
            sankeyNode.displayName = node.name;
            sankeyNode.name = nodeKey;

            expandedPartition.nodeDataArray.push(sankeyNode);
        }
    });

    // Create a boundary node if it does not already exist.
    function addBoundaryNode(direction, partitionKey) {
        const boundaryKey =
            direction + "-partition-" + partitionKey;

        if (!boundaryNodes.has(boundaryKey)) {
            const group = groupInfo.get(partitionKey);

            const partitionName = group
                ? group.name
                : "Partition_" + partitionKey;

            const boundaryNode = {
                key: boundaryKey,

                // ECharts node identifier.
                name: boundaryKey,

                // Text displayed to the user.
                displayName:
                    (direction === "from" ? "From " : "To ") +
                    partitionName,

                boundary: true,
                direction: direction,
                partitionKey: partitionKey
            };

            boundaryNodes.set(boundaryKey, boundaryNode);
        }

        return boundaryKey;
    }

    // Add a connection or increase its value if the same connection has already been found.
    function addExpandedLink(source, target) {
        const sourceKey = String(source);
        const targetKey = String(target);
        const edgeKey = sourceKey + "->" + targetKey;

        if (!expandedLinks.has(edgeKey)) {
            expandedLinks.set(edgeKey, {
                source: sourceKey,
                target: targetKey,
                value: 1
            });
        } else {
            expandedLinks.get(edgeKey).value += 1;
        }
    }

    // Examine every PG connection.
    data.linkDataArray.forEach(function (link) {
        const fromPartition =
            nodeToPartition.get(String(link.from));

        const toPartition =
            nodeToPartition.get(String(link.to));

        if (
            fromPartition === undefined ||
            toPartition === undefined
        ) {
            return;
        }

        // Connection between two PG nodes inside the selected partition.
        if (
            fromPartition === selectedPartition &&
            toPartition === selectedPartition
        ) {
            addExpandedLink(link.from, link.to);
            return;
        }

        // Connection coming into the selected partition from another partition.
        if (
            fromPartition !== selectedPartition &&
            toPartition === selectedPartition
        ) {
            const boundaryKey =
                addBoundaryNode("from", fromPartition);

            addExpandedLink(
                boundaryKey,
                link.to
            );

            return;
        }

        // Connection leaving the selected partition and going to another partition.
        if (
            fromPartition === selectedPartition &&
            toPartition !== selectedPartition
        ) {
            const boundaryKey =
                addBoundaryNode("to", toPartition);

            addExpandedLink(
                link.from,
                boundaryKey
            );
        }
    });

    // Add generated boundary nodes to the expanded graph.
    boundaryNodes.forEach(function (node) {
        expandedPartition.nodeDataArray.push(node);
    });

    // Convert the Map of connections into the final link array.
    expandedPartition.linkDataArray =
        Array.from(expandedLinks.values());


    return expandedPartition;
}