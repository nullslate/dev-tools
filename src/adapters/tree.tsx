import {
  Fragment,
  memo,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { DevToolFloating } from '../DevToolFloating';
import { useDevToolbarContext } from '../DevToolbarContext';
import { useDevTool } from '../useDevTool';
import type { DevToolRegistration } from '../types';

export interface TreeToolNode<TData = unknown> {
  id: string;
  label: string;
  description?: string;
  status?: string;
  badge?: string | number;
  metadata?: Record<string, unknown>;
  children?: TreeToolNode<TData>[];
  data?: TData;
}

export interface TreeToolAdapter<TInput, TData = unknown> {
  getNodes: (input: TInput) => TreeToolNode<TData>[];
  getSearchText?: (node: TreeToolNode<TData>) => string;
  renderDetail?: (node: TreeToolNode<TData>) => ReactNode;
}

export interface TreeToolProps<TInput, TData = unknown> {
  id: string;
  label: string;
  input: TInput;
  adapter: TreeToolAdapter<TInput, TData>;
  icon?: ReactNode;
  order?: number;
  scope?: DevToolRegistration['scope'];
  width?: number;
}

const colors = {
  bg: '#020617',
  bg2: '#0f172a',
  bg3: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  dim: '#64748b',
  blue: '#93c5fd',
  green: '#34d399',
  amber: '#fbbf24',
};

const iconButtonStyle: CSSProperties = {
  cursor: 'pointer',
  border: 0,
  borderRadius: 4,
  background: 'transparent',
  color: colors.blue,
  padding: '2px 6px',
  fontSize: 11,
};

function getDefaultSearchText<TData>(node: TreeToolNode<TData>): string {
  return [
    node.label,
    node.description,
    node.status,
    node.badge,
    node.metadata ? JSON.stringify(node.metadata) : '',
  ].filter(Boolean).join(' ');
}

function flattenNodeIds<TData>(nodes: TreeToolNode<TData>[]): string[] {
  return nodes.flatMap((node) => [node.id, ...flattenNodeIds(node.children ?? [])]);
}

function filterTree<TData>(
  nodes: TreeToolNode<TData>[],
  search: string,
  getSearchText: (node: TreeToolNode<TData>) => string,
): TreeToolNode<TData>[] {
  const term = search.trim().toLowerCase();
  if (!term) return nodes;

  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], search, getSearchText);
    const matches = getSearchText(node).toLowerCase().includes(term);
    if (!matches && children.length === 0) return [];
    return [{ ...node, children }];
  });
}

function countNodes<TData>(nodes: TreeToolNode<TData>[]): number {
  return nodes.reduce((count, node) => count + 1 + countNodes(node.children ?? []), 0);
}

interface TreeNodeRowProps<TData> {
  node: TreeToolNode<TData>;
  depth: number;
  expanded: Set<string>;
  detailed: Set<string>;
  renderDetail?: (node: TreeToolNode<TData>) => ReactNode;
  onToggleExpand: (id: string) => void;
  onToggleDetail: (id: string) => void;
}

const TreeNodeRow = <TData, >({
  node,
  depth,
  expanded,
  detailed,
  renderDetail,
  onToggleExpand,
  onToggleDetail,
}: TreeNodeRowProps<TData>): JSX.Element => {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expanded.has(node.id);
  const isDetailed = detailed.has(node.id);
  const detail = renderDetail?.(node);

  return (
    <Fragment>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 8,
          borderBottom: `1px solid ${colors.border}`,
          padding: '6px 10px',
          paddingLeft: 10 + depth * 18,
          fontSize: 11,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 6 }}>
          {hasChildren ? (
            <button
              type="button"
              style={{ ...iconButtonStyle, width: 22, color: colors.muted }}
              onClick={() => onToggleExpand(node.id)}
              aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
            >
              {isExpanded ? '-' : '+'}
            </button>
          ) : (
            <span style={{ width: 22, color: colors.dim, textAlign: 'center' }}>·</span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: colors.text, fontWeight: 700 }}>{node.label}</span>
              {node.badge !== undefined && (
                <span style={{ flexShrink: 0, borderRadius: 999, background: colors.bg3, padding: '1px 6px', color: colors.muted, fontSize: 10 }}>{node.badge}</span>
              )}
            </div>
            {node.description && (
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: colors.dim }}>{node.description}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {node.status && <span style={{ color: colors.green, fontSize: 10, fontWeight: 700 }}>{node.status}</span>}
          {detail && (
            <button type="button" style={iconButtonStyle} onClick={() => onToggleDetail(node.id)}>
              {isDetailed ? 'Hide' : 'View'}
            </button>
          )}
        </div>
      </div>
      {isDetailed && detail && (
        <div style={{ borderBottom: `1px solid ${colors.border}`, background: colors.bg2, padding: '8px 10px', paddingLeft: 32 + depth * 18, fontSize: 11 }}>
          {detail}
        </div>
      )}
      {hasChildren && isExpanded && node.children?.map((child) => (
        <TreeNodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          detailed={detailed}
          renderDetail={renderDetail}
          onToggleExpand={onToggleExpand}
          onToggleDetail={onToggleDetail}
        />
      ))}
    </Fragment>
  );
};

const TreeToolComponent = <TInput, TData = unknown>({
  id,
  label,
  input,
  adapter,
  icon = 'TR',
  order = 60,
  scope = 'global',
  width = 520,
}: TreeToolProps<TInput, TData>): null => {
  const { closePanel } = useDevToolbarContext();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailed, setDetailed] = useState<Set<string>>(new Set());

  const nodes = useMemo(() => adapter.getNodes(input), [adapter, input]);
  const searchText = adapter.getSearchText ?? getDefaultSearchText;
  const filteredNodes = useMemo(() => filterTree(nodes, search, searchText), [nodes, search, searchText]);
  const visibleCount = useMemo(() => countNodes(filteredNodes), [filteredNodes]);
  const totalCount = useMemo(() => countNodes(nodes), [nodes]);

  const expandAll = (): void => setExpanded(new Set(flattenNodeIds(filteredNodes)));
  const collapseAll = (): void => setExpanded(new Set());
  const toggleExpand = (nodeId: string): void => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    return next;
  });
  const toggleDetail = (nodeId: string): void => setDetailed((current) => {
    const next = new Set(current);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    return next;
  });

  useDevTool({
    id,
    icon,
    label,
    scope,
    panelType: 'floating',
    order,
    alert: false,
    panel: (
      <DevToolFloating title={label} onClose={() => closePanel(id)} width={width}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${colors.border}`, padding: 8 }}>
          <input
            type="text"
            placeholder="Search tree..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ flex: 1, minWidth: 0, height: 28, border: `1px solid ${colors.border}`, borderRadius: 6, background: colors.bg2, color: colors.text, padding: '0 8px', outline: 'none' }}
          />
          <button type="button" style={iconButtonStyle} onClick={expandAll}>Expand</button>
          <button type="button" style={iconButtonStyle} onClick={collapseAll}>Collapse</button>
        </div>
        <div style={{ borderBottom: `1px solid ${colors.border}`, padding: '5px 10px', color: colors.dim, fontSize: 10 }}>
          {visibleCount} of {totalCount} node{totalCount === 1 ? '' : 's'}
        </div>
        <div style={{ maxHeight: 460, overflowY: 'auto' }}>
          {filteredNodes.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: colors.dim }}>No nodes match.</div>
          ) : filteredNodes.map((node) => (
            <TreeNodeRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              detailed={detailed}
              renderDetail={adapter.renderDetail}
              onToggleExpand={toggleExpand}
              onToggleDetail={toggleDetail}
            />
          ))}
        </div>
      </DevToolFloating>
    ),
  });

  return null;
};

export const TreeTool = memo(TreeToolComponent) as typeof TreeToolComponent;

(TreeTool as unknown as { displayName?: string }).displayName = 'TreeTool';

export function createTreeToolAdapter<TInput, TData = unknown>(
  adapter: TreeToolAdapter<TInput, TData>,
): TreeToolAdapter<TInput, TData> {
  return adapter;
}

export function createTreeTool<TInput, TData = unknown>(
  defaults: Omit<TreeToolProps<TInput, TData>, 'input'>,
): (props: { input: TInput }) => JSX.Element {
  const CreatedTreeTool = ({ input }: { input: TInput }): JSX.Element => (
    <TreeTool {...defaults} input={input} />
  );
  CreatedTreeTool.displayName = `${defaults.label.replace(/\s+/g, '')}TreeTool`;
  return CreatedTreeTool;
}
