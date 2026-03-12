import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type * as Monaco from 'monaco-editor';

@Component({
  selector: 'app-monaco-yaml-viewer',
  standalone: true,
  template: `<div #editorContainer class="editor-container"></div>`,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
      }
      .editor-container {
        height: 100%;
        width: 100%;
      }
    `,
  ],
})
export class MonacoYamlViewerComponent implements OnInit, OnDestroy {
  readonly content = input<string>('');
  readonly readOnly = input<boolean>(true);
  readonly editorContainer = viewChild.required<ElementRef<HTMLDivElement>>('editorContainer');
  readonly contentChanged = output<string>();

  private readonly editorReady = signal<Monaco.editor.IStandaloneCodeEditor | null>(null);
  private monaco: typeof Monaco | null = null;

  constructor() {
    effect(() => {
      const editor = this.editorReady();
      const newContent = this.content();
      console.log('[Monaco] content effect:', { hasEditor: !!editor, contentLen: newContent?.length, readOnly: this.readOnly() });
      if (editor && newContent !== undefined) {
        const currentValue = editor.getValue();
        if (currentValue !== newContent) {
          console.log('[Monaco] setValue called, content length:', newContent.length);
          editor.setValue(newContent);
        }
      }
    });

    effect(() => {
      const editor = this.editorReady();
      const isReadOnly = this.readOnly();
      console.log('[Monaco] readOnly effect:', { hasEditor: !!editor, isReadOnly });
      if (editor) {
        editor.updateOptions({ readOnly: isReadOnly });
      }
    });
  }

  ngOnInit(): void {
    this.loadMonaco();
  }

  ngOnDestroy(): void {
    const editor = this.editorReady();
    if (editor) {
      editor.dispose();
    }
  }

  getValue(): string {
    return this.editorReady()?.getValue() ?? '';
  }

  private loadMonaco(): void {
    const onGotAmdLoader = () => {
      (window as any).require.config({
        paths: { vs: 'assets/monaco/vs' },
      });

      (window as any).require(['vs/editor/editor.main'], () => {
        this.monaco = (window as any).monaco;
        this.initEditor();
      });
    };

    if (!(window as any).require) {
      const loaderScript = document.createElement('script');
      loaderScript.type = 'text/javascript';
      loaderScript.src = 'assets/monaco/vs/loader.js';
      loaderScript.addEventListener('load', onGotAmdLoader);
      document.body.appendChild(loaderScript);
    } else {
      onGotAmdLoader();
    }
  }

  private initEditor(): void {
    if (!this.monaco) return;

    const container = this.editorContainer().nativeElement;
    console.log('[Monaco] initEditor called, content():', this.content()?.substring(0, 50), 'readOnly():', this.readOnly());

    const editor = this.monaco.editor.create(container, {
      value: this.content(),
      language: 'yaml',
      theme: this.getTheme(),
      readOnly: this.readOnly(),
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      foldingStrategy: 'indentation',
      automaticLayout: true,
      fontSize: 13,
      fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace",
      lineHeight: 20,
      padding: { top: 8, bottom: 8 },
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      },
      renderLineHighlight: this.readOnly() ? 'none' : 'line',
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      contextmenu: !this.readOnly(),
    });

    editor.onDidChangeModelContent(() => {
      if (!this.readOnly()) {
        this.contentChanged.emit(editor.getValue() ?? '');
      }
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.monaco) {
        this.monaco.editor.setTheme(this.getTheme());
      }
    });

    // Signal that editor is ready — triggers effects to sync content and readOnly
    console.log('[Monaco] editor created, setting editorReady signal');
    this.editorReady.set(editor);
  }

  private getTheme(): string {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs';
  }
}
