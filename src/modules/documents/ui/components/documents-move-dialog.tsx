"use client";

import { useEffect, useState } from "react";
import { CheckIcon, FilesIcon, FolderIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  buildFolderTree,
  collectDescendantIds,
  type DocumentFolderTreeNode,
} from "@/modules/documents/folder-tree";
import { trpc } from "@/trpc/client";

export type DocumentsMoveTarget =
  | { kind: "file"; id: string; name: string; folderId: string | null }
  | { kind: "folder"; id: string; name: string; parentId: string | null };

type DocumentsMoveDialogProps = {
  target: DocumentsMoveTarget | null;
  open: boolean;
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (folderId: string | null) => void;
};

const currentFolderId = (target: DocumentsMoveTarget | null) =>
  target?.kind === "file" ? target.folderId : (target?.parentId ?? null);

export const DocumentsMoveDialog = ({
  target,
  open,
  isSubmitting,
  onOpenChange,
  onMove,
}: DocumentsMoveDialogProps) => {
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const treeQuery = trpc.documents.listFolderTree.useQuery(undefined, {
    enabled: open,
  });
  const currentId = currentFolderId(target);
  const [selectedId, setSelectedId] = useState<string | null>(currentId);

  useEffect(() => {
    if (open) {
      setSelectedId(currentId);
    }
  }, [currentId, open]);

  const folders = treeQuery.data ?? [];
  const tree = buildFolderTree(folders);
  const blockedIds =
    target?.kind === "folder"
      ? collectDescendantIds(folders, target.id)
      : new Set<string>();
  const selectedBlocked = selectedId !== null && blockedIds.has(selectedId);
  const canMove =
    Boolean(target) &&
    !isSubmitting &&
    selectedId !== currentId &&
    !selectedBlocked;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("moveTitle")}</DialogTitle>
          <DialogDescription>
            {t("moveDescription", { name: target?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>

        {treeQuery.isLoading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border p-1">
            <FolderChoice
              selected={selectedId === null}
              current={currentId === null}
              onSelect={() => setSelectedId(null)}
              label={t("root")}
              isRoot
            />
            {tree.map((node) => (
              <FolderTreeList
                key={node.id}
                node={node}
                depth={1}
                selectedId={selectedId}
                currentId={currentId}
                blockedIds={blockedIds}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!canMove}
            onClick={() => onMove(selectedId)}
          >
            {t("move")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type FolderTreeListProps = {
  node: DocumentFolderTreeNode;
  depth: number;
  selectedId: string | null;
  currentId: string | null;
  blockedIds: Set<string>;
  onSelect: (id: string) => void;
};

const FolderTreeList = ({
  node,
  depth,
  selectedId,
  currentId,
  blockedIds,
  onSelect,
}: FolderTreeListProps) => {
  const blocked = blockedIds.has(node.id);

  return (
    <>
      <FolderChoice
        selected={selectedId === node.id}
        current={currentId === node.id}
        disabled={blocked}
        depth={depth}
        onSelect={() => onSelect(node.id)}
        label={node.name}
      />
      {node.children.map((child) => (
        <FolderTreeList
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          currentId={currentId}
          blockedIds={blockedIds}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};

type FolderChoiceProps = {
  selected: boolean;
  current: boolean;
  disabled?: boolean;
  depth?: number;
  isRoot?: boolean;
  label: string;
  onSelect: () => void;
};

const FolderChoice = ({
  selected,
  current,
  disabled,
  depth = 0,
  isRoot,
  label,
  onSelect,
}: FolderChoiceProps) => {
  const t = useTranslations("documents");
  const Icon = isRoot ? FilesIcon : FolderIcon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      style={{ paddingLeft: 8 + depth * 16 }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors",
        selected && "bg-orange-400/15",
        !selected && !disabled && "hover:bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          isRoot ? "text-muted-foreground" : "text-orange-400",
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {current ? (
        <span className="text-xs text-muted-foreground">{t("moveCurrent")}</span>
      ) : null}
      {selected && !disabled ? (
        <CheckIcon className="size-4 shrink-0 text-orange-400" />
      ) : null}
    </button>
  );
};
