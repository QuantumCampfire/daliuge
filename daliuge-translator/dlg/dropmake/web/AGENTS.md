# Translator Graph View Guidelines

These instructions apply to the Translator web interface in this directory.

## Current Partition Graph implementation

- `pg_viewer.html` exposes DAG, Sankey, and Partition view buttons.
- `graph_init.js` routes Partition selection through `partitionGraphInit(data)`.
- `partitionGraphInit(data)` creates the render container and delegates to the renderer.
- `src/partition_data.js` aggregates physical graph nodes and cross-partition edges.
- `src/partition_graph.js` owns Partition Graph rendering, zoom-to-fit, and
  independent expand/collapse state.
- Expanded partitions reserve a larger blank content area. Internal PG nodes
  are intentionally not rendered yet.
- Expanding or collapsing a partition redraws the complete Dagre layout so
  neighbouring partitions move to make room.
- `src/main.css` contains the Partition container, node, expansion-control,
  expanded-area, focus, and fallback styles.
- `../../../test/dropmake/test_tm.py` verifies that the rendered viewer page exposes the Partition entry point.
- `../../../test/dropmake/test_partition_graph.js` verifies renderer loading,
  independent expansion state, label controls, and expanded dimensions.

## View switching

- Keep `graphInit(graphType)` as the single entry point for selecting a graph view.
- Each view must render inside `#main`; `graphInit` clears that container before switching.
- View button IDs must follow `<graphType>Button` so the shared active-state logic works.
- Preserve the existing automatic default: DAG below 100 nodes, Sankey otherwise.
- For graphs above 600 nodes, hide only DAG; keep Sankey and Partition available.

## Partition integration

- `partitionGraphInit(data)` owns creation of `#partitionGraphArea`.
- The Partition renderer contract is `renderPartitionGraph(data, container)`.
- Guard calls to the renderer until it is available.
- When the renderer is unavailable, show a short placeholder message inside the container instead of leaving a blank view or raising an error.
- Keep the renderer in `src/partition_graph.js` and expose the agreed global function.
- Keep aggregation and data transformation in `src/partition_data.js`.
- Treat partition keys consistently as strings in interaction state because
  Dagre normalises graph keys.
- The complete partition node is clickable and keyboard-operable with Enter
  or Space.
- Keep the container full-size and center its placeholder state with styles in `src/main.css`.

## Validation

- Verify DAG, Sankey, and Partition can be selected repeatedly.
- Verify only the current graph container remains under `#main`.
- Verify the selected button receives the `active` class.
- Verify selecting Partition shows the placeholder and does not raise an error before its renderer is implemented.
- Verify an available renderer receives both the graph data and the Partition container.
- Verify graphs above 600 nodes still expose Sankey and Partition while hiding DAG.
- Verify each partition can be expanded and collapsed without changing the
  expansion state of other partitions.
- Verify expanded partitions remain empty and cause the whole graph to be
  laid out again.
- Run the JavaScript switching checks and the Translator page regression test in the Linux test container.
