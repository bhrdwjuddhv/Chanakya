import { useEffect, useImperativeHandle, useRef } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { useTheme } from '../../lib/theme';
import { STATUS_STYLES, entityColour, statusColour, token } from '../../lib/utils';

cytoscape.use(fcose);

// ponytail: cytoscape driven directly instead of react-cytoscapejs. One useEffect,
// no wrapper library pinned to React 18, and we keep the instance handle we need
// for fit/centre/path highlighting.

const LAYOUT = {
  name: 'fcose',
  quality: 'proof',
  animate: true,
  animationDuration: 600,
  randomize: false,
  nodeSeparation: 120,
  idealEdgeLength: 110,
  nodeRepulsion: 9000,
  padding: 40,
};

// Community colours are the semantic hues, not the accent — red stays reserved.
const COMMUNITY_PALETTE = [
  '#3B82F6', '#A855F7', '#22C55E', '#F59E0B', '#EC4899',
  '#0EA5E9', '#14B8A6', '#8B5CF6', '#84CC16', '#F97316',
];

export function RelationshipGraph({ elements, ref, selectedKey, onSelectNode, onSelectEdge, pathIds, focusKey }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const handlersRef = useRef({});
  handlersRef.current = { onSelectNode, onSelectEdge };
  const isDark = useTheme((s) => s.isDark);

  // Create once. Re-creating on every render throws away pan/zoom the user set.
  useEffect(() => {
    const cy = cytoscape({
      container: containerRef.current,
      style: buildStyle(),
      minZoom: 0.15,
      maxZoom: 3,
      boxSelectionEnabled: false,
    });
    cyRef.current = cy;

    cy.on('tap', 'node', (event) => handlersRef.current.onSelectNode?.(event.target.id()));
    cy.on('tap', 'edge', (event) => handlersRef.current.onSelectEdge?.(event.target.data()));
    cy.on('tap', (event) => {
      if (event.target === cy) handlersRef.current.onSelectNode?.(null);
    });

    return () => cy.destroy();
  }, []);

  // Cytoscape paints to canvas and cannot read CSS variables, so the stylesheet is
  // rebuilt with resolved token values whenever the theme flips.
  useEffect(() => {
    cyRef.current?.style(buildStyle());
  }, [isDark]);

  // Elements. Diffed against what's on screen so an expand doesn't relayout the world.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !elements) return;

    const incoming = [...elements.nodes, ...elements.edges];
    const incomingIds = new Set(incoming.map((el) => el.data.id));
    const existingIds = new Set(cy.elements().map((el) => el.id()));

    cy.batch(() => {
      cy.elements()
        .filter((el) => !incomingIds.has(el.id()))
        .remove();
      const added = incoming.filter((el) => !existingIds.has(el.data.id));
      if (added.length) cy.add(added);
      // Data can change without the id changing (a relationship gets confirmed).
      for (const el of incoming) {
        if (existingIds.has(el.data.id)) cy.$id(el.data.id).data(el.data);
      }
    });

    if (cy.elements().length) cy.layout(LAYOUT).run();
  }, [elements]);

  // Selection, path highlight and focus mode are all just classes.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass('selected faded on-path');

    if (pathIds?.length) {
      const path = cy.collection(pathIds.map((id) => cy.$id(id)).filter((el) => el.length));
      path.addClass('on-path');
      cy.elements().difference(path).addClass('faded');
    } else if (focusKey) {
      const node = cy.$id(focusKey);
      if (node.length) cy.elements().difference(node.closedNeighborhood()).addClass('faded');
    }

    if (selectedKey) cy.$id(selectedKey).addClass('selected');
  }, [selectedKey, pathIds, focusKey, elements]);

  useImperativeHandle(ref, () => ({
    fit: () => cyRef.current?.animate({ fit: { padding: 40 }, duration: 400 }),
    centreOn: (key) => {
      const node = cyRef.current?.$id(key);
      if (node?.length) cyRef.current.animate({ center: { eles: node }, zoom: 1.4 }, { duration: 400 });
    },
    relayout: () => cyRef.current?.layout(LAYOUT).run(),
    png: () => cyRef.current?.png({ full: true, scale: 2, bg: token('--graph-canvas') }),
  }));

  return <div ref={containerRef} className="w-full h-full bg-graph-canvas" />;
}

/**
 * Size and colour are baked onto each node before it reaches cytoscape — setting them
 * in a later effect leaves the first paint with unmapped `data(size)`/`data(colour)`.
 */
export function encodeNodes(nodes, { centrality = {}, colourBy = 'type', sizeBy = 'degree' } = {}) {
  const measureOf = (node) =>
    sizeBy === 'degree' ? node.data.degree || 0 : centrality[node.data.id]?.[sizeBy] || 0;
  const max = Math.max(...nodes.map(measureOf), 0) || 1;

  return nodes.map((node) => {
    const community = centrality[node.data.id]?.communityId;
    return {
      ...node,
      data: {
        ...node.data,
        size: 26 + Math.round(Math.sqrt(Math.max(measureOf(node) / max, 0)) * 40),
        colour:
          colourBy === 'community' && community != null
            ? COMMUNITY_PALETTE[community % COMMUNITY_PALETTE.length]
            : entityColour(node.data.type),
      },
    };
  });
}

function buildStyle() {
  const fg = token('--foreground') || '#DBDBDB';
  const dim = token('--muted-foreground') || '#8A8A8A';
  const canvas = token('--graph-canvas') || '#0C0C0C';
  const primary = token('--primary') || '#C90003';

  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(colour)',
        width: 'data(size)',
        height: 'data(size)',
        label: 'data(label)',
        'font-size': 11,
        'font-family': "'Mukta', 'Noto Sans Devanagari', 'Instrument Sans', system-ui, sans-serif",
        'font-weight': 500,
        color: fg,
        'text-valign': 'bottom',
        'text-margin-y': 6,
        'text-max-width': 110,
        'text-wrap': 'ellipsis',
        'border-width': 2,
        'border-color': canvas,
        'transition-property': 'opacity, border-width, border-color',
        'transition-duration': '150ms',
      },
    },
    {
      selector: 'node.selected',
      style: { 'border-width': 4, 'border-color': primary, 'font-weight': 600, 'z-index': 99 },
    },
    // Relationship state is carried by colour AND dash, so it survives a greyscale
    // print and colour-blind viewing.
    ...Object.entries(STATUS_STYLES).map(([status, style]) => ({
      selector: `edge[status = "${status}"]`,
      style: {
        'line-color': statusColour(status),
        'target-arrow-color': statusColour(status),
        'line-style': style.dash ? 'dashed' : 'solid',
        'line-dash-pattern': style.dash || undefined,
        opacity: status === 'UNVERIFIED' ? 0.4 : 0.8,
      },
    })),
    {
      selector: 'edge',
      style: {
        width: 'mapData(confidence, 0, 1, 1, 3.5)',
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'arrow-scale': 0.8,
        label: 'data(label)',
        'font-size': 8,
        'font-family': "'JetBrains Mono', ui-monospace, monospace",
        color: dim,
        'text-rotation': 'autorotate',
        'text-background-color': canvas,
        'text-background-opacity': 0.85,
        'text-background-padding': 2,
        'transition-property': 'opacity, width',
        'transition-duration': '150ms',
      },
    },
    { selector: '.faded', style: { opacity: 0.1, 'text-opacity': 0 } },
    {
      selector: 'edge.on-path',
      style: { width: 4, opacity: 1, 'line-color': primary, 'target-arrow-color': primary, 'z-index': 99 },
    },
    { selector: 'node.on-path', style: { 'border-width': 4, 'border-color': primary, 'z-index': 99 } },
  ];
}

export { COMMUNITY_PALETTE };
