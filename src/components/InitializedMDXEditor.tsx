"use client";

import React, { ForwardedRef } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  markdownShortcutPlugin,
  MDXEditorMethods,
  MDXEditorProps,
  tablePlugin,
  linkPlugin,
  linkDialogPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  frontmatterPlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertTable,
  InsertCodeBlock,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

// This component receives the forwarded ref and MDXEditor props
export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  const plugins = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    codeBlockPlugin(),
    codeMirrorPlugin({
      codeBlockLanguages: {
        js: "JavaScript",
        ts: "TypeScript",
        tsx: "TypeScript React",
        jsx: "JavaScript React",
        json: "JSON",
        html: "HTML",
        css: "CSS",
        sh: "Shell/Bash",
        sql: "SQL",
        yaml: "YAML",
        md: "Markdown",
        mermaid: "Mermaid",
        ini: "INI",
      },
    }),
    frontmatterPlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
  ];

  // Only add the toolbar plugin if the editor is editable (not read-only)
  if (!props.readOnly) {
    plugins.push(
      toolbarPlugin({
        toolbarContents: () => (
          <div className="flex flex-wrap items-center gap-1">
            <UndoRedo />
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <BoldItalicUnderlineToggles />
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <BlockTypeSelect />
            <ListsToggle />
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <CreateLink />
            <InsertTable />
            <InsertCodeBlock />
          </div>
        ),
      })
    );
  }

  return (
    <MDXEditor
      ref={editorRef}
      plugins={plugins}
      {...props}
    />
  );
}

