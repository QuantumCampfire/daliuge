# Translator Graph View Guidelines

These instructions apply to the Translator web interface in this directory.

## Current Task 2 implementation

- `pg_viewer.html` exposes DAG, Sankey, and Partition view buttons.
- `graph_init.js` routes Partition selection through `partitionGraphInit(data)`.
- `partitionGraphInit(data)` creates the render container and shows a fallback message until Task 3 supplies the renderer.
- `src/main.css` contains the full-size Partition container and centered fallback styles.
- `../../../test/dropmake/test_tm.py` verifies that the rendered viewer page exposes the Partition entry point.
- Task 2 is complete; actual Partition Graph data generation and drawing belong to Tasks 1 and 3.

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
- Task 2 must not add Partition Graph aggregation, data transformation, or visualisation logic.
- Keep the container full-size and center its placeholder state with styles in `src/main.css`.

## Validation

- Verify DAG, Sankey, and Partition can be selected repeatedly.
- Verify only the current graph container remains under `#main`.
- Verify the selected button receives the `active` class.
- Verify selecting Partition shows the placeholder and does not raise an error before its renderer is implemented.
- Verify an available renderer receives both the graph data and the Partition container.
- Verify graphs above 600 nodes still expose Sankey and Partition while hiding DAG.
- Run the JavaScript switching checks and the Translator page regression test in the Linux test container.
