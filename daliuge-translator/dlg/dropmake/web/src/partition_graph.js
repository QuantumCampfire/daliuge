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

    // "fromPartition->toPartition" -> partition edge.
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
