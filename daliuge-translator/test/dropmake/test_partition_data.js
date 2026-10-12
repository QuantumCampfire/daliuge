const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");


function loadPartitionDataModule() {
    const sourcePath = path.resolve(
        __dirname,
        "../../dlg/dropmake/web/src/partition_data.js"
    );

    assert.equal(
        fs.existsSync(sourcePath),
        true,
        "partition_data.js must exist"
    );

    const source = fs.readFileSync(sourcePath, "utf8");

    const sandbox = {};

    vm.runInNewContext(
        source,
        sandbox,
        { filename: sourcePath }
    );

    return {
        createPartitionGraphData:
            sandbox.createPartitionGraphData,

        createExpandedPartitionData:
            sandbox.createExpandedPartitionData
    };
}


test("Sprint 2 creates partition nodes with correct node counts", () => {
    const {
        createPartitionGraphData
    } = loadPartitionDataModule();

    const data = {
        nodeDataArray: [
            {
                key: 100,
                name: "Partition_1",
                isGroup: true
            },
            {
                key: 200,
                name: "Partition_2",
                isGroup: true
            },

            {
                key: 1,
                name: "Node_1",
                group: 100
            },
            {
                key: 2,
                name: "Node_2",
                group: 100
            },
            {
                key: 3,
                name: "Node_3",
                group: 200
            }
        ],

        linkDataArray: []
    };

    const result =
        createPartitionGraphData(data);

    assert.equal(
        result.nodeDataArray.length,
        2
    );

    const partition1 =
        result.nodeDataArray.find(function (node) {
            return node.key === 100;
        });

    const partition2 =
        result.nodeDataArray.find(function (node) {
            return node.key === 200;
        });

    assert.equal(
        partition1.name,
        "Partition_1"
    );

    assert.equal(
        partition1.nodeCount,
        2
    );

    assert.equal(
        partition2.name,
        "Partition_2"
    );

    assert.equal(
        partition2.nodeCount,
        1
    );
});


test("Sprint 2 combines cross-partition links into one undirected weighted edge", () => {
    const {
        createPartitionGraphData
    } = loadPartitionDataModule();

    const data = {
        nodeDataArray: [
            {
                key: 100,
                name: "Partition_1",
                isGroup: true
            },
            {
                key: 200,
                name: "Partition_2",
                isGroup: true
            },

            {
                key: 1,
                group: 100
            },
            {
                key: 2,
                group: 100
            },
            {
                key: 3,
                group: 200
            }
        ],

        linkDataArray: [
            {
                from: 1,
                to: 3
            },

            // Reverse direction should still count towards the same partition edge.
            {
                from: 3,
                to: 2
            }
        ]
    };

    const result =
        createPartitionGraphData(data);

    assert.equal(
        result.linkDataArray.length,
        1
    );

    const edge =
        result.linkDataArray[0];

    assert.equal(
        edge.from,
        100
    );

    assert.equal(
        edge.to,
        200
    );

    assert.equal(
        edge.weight,
        2
    );
});


test("Sprint 3 returns selected partition nodes and internal links", () => {
    const {
        createExpandedPartitionData
    } = loadPartitionDataModule();

    const data = {
        nodeDataArray: [
            {
                key: 100,
                name: "Partition_1",
                isGroup: true
            },
            {
                key: 200,
                name: "Partition_2",
                isGroup: true
            },

            {
                key: 1,
                name: "Node_1",
                group: 100
            },
            {
                key: 2,
                name: "Node_2",
                group: 100
            },
            {
                key: 3,
                name: "Node_3",
                group: 200
            }
        ],

        linkDataArray: [
            {
                from: 1,
                to: 2
            }
        ]
    };

    const result =
        createExpandedPartitionData(
            data,
            100
        );

    assert.equal(
        result.nodeDataArray.length,
        2
    );

    const node1 =
        result.nodeDataArray.find(function (node) {
            return node.key === 1;
        });

    const node2 =
        result.nodeDataArray.find(function (node) {
            return node.key === 2;
        });

    const node3 =
        result.nodeDataArray.find(function (node) {
            return node.key === 3;
        });

    assert.ok(node1);
    assert.ok(node2);

    // Node 3 belongs to another partition, so it should not appear as a normal PG node.
    assert.equal(
        node3,
        undefined
    );

    assert.equal(
        node1.name,
        "1"
    );

    assert.equal(
        node1.displayName,
        "Node_1"
    );

    assert.equal(
        result.linkDataArray.length,
        1
    );

    const link =
        result.linkDataArray[0];

    assert.equal(
        link.source,
        "1"
    );

    assert.equal(
        link.target,
        "2"
    );

    assert.equal(
        link.value,
        1
    );
});


test("Sprint 3 creates From and To boundary nodes for cross-partition links", () => {
    const {
        createExpandedPartitionData
    } = loadPartitionDataModule();

    const data = {
        nodeDataArray: [
            {
                key: 100,
                name: "Partition_1",
                isGroup: true
            },
            {
                key: 200,
                name: "Partition_2",
                isGroup: true
            },
            {
                key: 300,
                name: "Partition_3",
                isGroup: true
            },

            {
                key: 1,
                name: "External_In",
                group: 100
            },
            {
                key: 2,
                name: "Selected_Node",
                group: 200
            },
            {
                key: 3,
                name: "External_Out",
                group: 300
            }
        ],

        linkDataArray: [
            // Incoming connection from Partition 1.
            {
                from: 1,
                to: 2
            },

            // Outgoing connection to Partition 3.
            {
                from: 2,
                to: 3
            }
        ]
    };

    const result =
        createExpandedPartitionData(
            data,
            200
        );

    const fromBoundary =
        result.nodeDataArray.find(function (node) {
            return node.key ===
                "from-partition-100";
        });

    const toBoundary =
        result.nodeDataArray.find(function (node) {
            return node.key ===
                "to-partition-300";
        });

    assert.ok(fromBoundary);
    assert.ok(toBoundary);

    assert.equal(
        fromBoundary.displayName,
        "From Partition_1"
    );

    assert.equal(
        fromBoundary.direction,
        "from"
    );

    assert.equal(
        toBoundary.displayName,
        "To Partition_3"
    );

    assert.equal(
        toBoundary.direction,
        "to"
    );

    const incomingLink =
        result.linkDataArray.find(function (link) {
            return (
                link.source ===
                    "from-partition-100" &&
                link.target === "2"
            );
        });

    const outgoingLink =
        result.linkDataArray.find(function (link) {
            return (
                link.source === "2" &&
                link.target ===
                    "to-partition-300"
            );
        });

    assert.ok(incomingLink);
    assert.ok(outgoingLink);

    assert.equal(
        incomingLink.value,
        1
    );

    assert.equal(
        outgoingLink.value,
        1
    );
});