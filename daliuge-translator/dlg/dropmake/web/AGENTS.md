# Translator Graph View Guidelines

These instructions apply to the Translator web interface in this directory.

## Current Partition Graph implementation

- `pg_viewer.html` exposes DAG, Sankey, and Partition view buttons.
- `graph_init.js` routes Partition selection through `partitionGraphInit(data)`.
- `partitionGraphInit(data)` creates the render container and delegates to the renderer.
- `src/partition_data.js` aggregates physical graph nodes and cross-partition edges.
- `src/partition_graph.js` owns Partition Graph rendering, zoom-to-fit, and
  exclusive expand/collapse state.
- The Dagre Partition Graph stays mounted and unchanged when a partition is
  selected. Do not filter its nodes or rerun its layout for expansion.
- `#partitionExpansionOverlay` is a separate HTML focus layer above the graph.
  Its content is currently an Expanded Sankey placeholder.
- `createPartitionExpansionRequest(data, partitionKey)` preserves the original
  graph data and normalises the selected key. Sprint 3 can pass that request
  into `createExpandedPartitionData` and the Expanded Sankey renderer.
- Closing the overlay returns to the unchanged graph and preserves its current
  zoom/pan transform.
- `src/main.css` contains the Partition container, node, expansion-control,
  overlay, focus, and fallback styles.
- `../../../test/dropmake/test_tm.py` verifies that the rendered viewer page exposes the Partition entry point.
- `../../../test/dropmake/test_partition_graph.js` verifies renderer loading,
  exclusive focus state, label controls, and expanded dimensions.

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
- Keep the expansion overlay separate from the Dagre SVG so Sankey can render
  into a normal HTML container.
- Keep the container full-size and center its placeholder state with styles in `src/main.css`.

## Validation

- Verify DAG, Sankey, and Partition can be selected repeatedly.
- Verify only the current graph container remains under `#main`.
- Verify the selected button receives the `active` class.
- Verify selecting Partition shows the placeholder and does not raise an error before its renderer is implemented.
- Verify an available renderer receives both the graph data and the Partition container.
- Verify graphs above 600 nodes still expose Sankey and Partition while hiding DAG.
- Verify opening and closing the overlay leaves all Partition nodes and links
  mounted.
- Verify the SVG zoom/pan transform is identical before opening and after
  closing the overlay.
- Verify the selected partition key and original graph data are available to
  the overlay content renderer.
- Run the JavaScript switching checks and the Translator page regression test in the Linux test container.
