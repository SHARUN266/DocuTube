"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import { MDXEditorMethods, MDXEditorProps } from "@mdxeditor/editor";

// Import the client-side editor component with SSR disabled
const Editor = dynamic(() => import("./InitializedMDXEditor"), { ssr: false });

// Expose the editor methods ref to parent components
const MarkdownEditor = forwardRef<MDXEditorMethods, MDXEditorProps>((props, ref) => (
  <Editor {...props} editorRef={ref} />
));

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor;
