import React, { useEffect, useState, useCallback } from "react";
import { fsTree } from "../api";

function TreeNode({ node, depth, onOpen, expandedMap, toggle }) {
  const isDir = node.type === "dir";
  const isExpanded = !!expandedMap[node.path];
  return (
    <div>
      <div
        className={`flex items-center px-2 py-1 cursor-pointer hover:bg-[#2d2d2d] text-[#e0e0e0]`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => (isDir ? toggle(node.path) : onOpen(node.path))}
      >
        {isDir ? (
          <span className="w-4 inline-block mr-1">{isExpanded ? "▾" : "▸"}</span>
        ) : (
          <span className="w-4 inline-block mr-1">📄</span>
        )}
        <span className="truncate text-sm">{node.name}</span>
      </div>
      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onOpen={onOpen}
              expandedMap={expandedMap}
              toggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ onOpen, onToggleCollapse }) {
  const [tree, setTree] = useState([]);
  const [expandedMap, setExpandedMap] = useState({});

  const load = useCallback(async () => {
    const data = await fsTree(".", 3);
    setTree(data.tree || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (path) => {
    setExpandedMap((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <div className="h-full overflow-auto bg-[#1e1e1e] text-[#e0e0e0]">
      <div className="px-2 py-2 text-xs uppercase tracking-wider text-[#858585] border-b border-[#252525] flex items-center justify-between">
        <span>Explorer</span>
        {onToggleCollapse && (
          <button
            className="text-[#858585] hover:text-[#e0e0e0] text-xs px-2 py-0.5 rounded hover:bg-[#2d2d2d]"
            onClick={() => onToggleCollapse()}
            title="Hide Explorer"
          >
            Hide
          </button>
        )}
      </div>
      <div>
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            onOpen={onOpen}
            expandedMap={expandedMap}
            toggle={toggle}
          />
        ))}
      </div>
    </div>
  );
}


