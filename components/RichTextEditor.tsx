'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { uploadImageFile } from '@/lib/imageUpload';

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
};

const isImageFile = (file: File) => file.type.startsWith('image/');

const createUploadId = () => `upload-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const insertNodeAtCursor = (node: Node) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();

  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);

  return true;
};

const createImageNode = (url: string, alt: string) => {
  const image = document.createElement('img');
  image.src = url;
  image.alt = alt;
  image.loading = 'lazy';
  image.className = 'rich-editor__image';
  image.contentEditable = 'false';
  return image;
};

const createPlaceholderNode = (uploadId: string) => {
  const placeholder = document.createElement('div');
  placeholder.dataset.uploadId = uploadId;
  placeholder.contentEditable = 'false';
  placeholder.className = 'rich-editor__image-placeholder';
  placeholder.innerHTML = '<span>Uploading image…</span>';
  return placeholder;
};

const createErrorNode = (uploadId: string, message: string, retry: () => void) => {
  const wrapper = document.createElement('div');
  wrapper.dataset.uploadId = uploadId;
  wrapper.contentEditable = 'false';
  wrapper.className = 'rich-editor__image-error';

  const messageNode = document.createElement('div');
  messageNode.className = 'rich-editor__image-error-message';
  messageNode.textContent = `Upload failed: ${message}`;

  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'rich-editor__retry-button';
  retryButton.textContent = 'Retry';
  retryButton.addEventListener('click', retry);

  wrapper.appendChild(messageNode);
  wrapper.appendChild(retryButton);

  return wrapper;
};

export default function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadFilesRef = useRef<Map<string, File>>(new Map());
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
      setCurrentValue(value);
    }
  }, [value]);

  const updateValueFromDom = () => {
    if (!editorRef.current) return;
    const nextValue = editorRef.current.innerHTML;
    setCurrentValue(nextValue);
    onChange(nextValue);
  };

  const replacePlaceholder = (uploadId: string, replacement: Node) => {
    const editor = editorRef.current;
    if (!editor) return;
    const placeholder = editor.querySelector(`[data-upload-id="${uploadId}"]`);
    if (!placeholder) return;
    placeholder.replaceWith(replacement);
    updateValueFromDom();
  };

  const replacePlaceholderWithError = (uploadId: string, message: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const file = uploadFilesRef.current.get(uploadId);
    const placeholder = editor.querySelector(`[data-upload-id="${uploadId}"]`);
    if (!placeholder) return;

    const retry = () => {
      if (!file) return;
      placeholder.replaceWith(createPlaceholderNode(uploadId));
      uploadImage(uploadId, file);
    };

    const errorNode = createErrorNode(uploadId, message, retry);
    placeholder.replaceWith(errorNode);
    updateValueFromDom();
  };

  const uploadImage = async (uploadId: string, file: File) => {
    try {
      const url = await uploadImageFile(file);
      const imageElement = createImageNode(url, file.name);
      replacePlaceholder(uploadId, imageElement);
      uploadFilesRef.current.delete(uploadId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      replacePlaceholderWithError(uploadId, message);
    }
  };

  const insertFiles = (files: File[]) => {
    for (const file of files) {
      if (!isImageFile(file)) continue;
      const uploadId = createUploadId();
      uploadFilesRef.current.set(uploadId, file);

      const placeholder = createPlaceholderNode(uploadId);
      const inserted = insertNodeAtCursor(placeholder);
      if (!inserted && editorRef.current) {
        editorRef.current.appendChild(placeholder);
      }

      updateValueFromDom();
      uploadImage(uploadId, file);
    }
  };

  const handleFileInputChange = (event: FormEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files) return;
    insertFiles(Array.from(files));
    event.currentTarget.value = '';
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData.items || []);
    const imageFiles = items
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file != null);

    if (imageFiles.length > 0) {
      event.preventDefault();
      insertFiles(imageFiles);
      return;
    }

    // Keep normal paste behavior for text
    requestAnimationFrame(updateValueFromDom);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const files = Array.from(event.dataTransfer.files || []);
    const imageFiles = files.filter((file) => isImageFile(file));
    if (imageFiles.length > 0) {
      event.preventDefault();
      insertFiles(imageFiles);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (Array.from(event.dataTransfer.types || []).includes('Files')) {
      event.preventDefault();
    }
  };

  const handleInput = () => {
    updateValueFromDom();
  };

  return (
    <div className={className}>
      <div className="rich-editor-toolbar mb-3 flex items-center gap-2">
        <button
          type="button"
          className="folio-button folio-button--secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Insert image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileInputChange}
        />
      </div>
      <div
        id={id}
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        contentEditable
        className="rich-editor min-h-[200px] rounded-2xl border border-[#e7e8e3] bg-white px-4 py-4 text-body outline-none transition focus:border-[#b35a35] focus:ring-2 focus:ring-[#b35a35]/15"
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        data-placeholder={placeholder}
      />
    </div>
  );
}
