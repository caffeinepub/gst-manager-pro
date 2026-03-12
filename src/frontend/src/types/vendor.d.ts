// Type shims for packages without bundled or @types declarations

declare module "tesseract.js" {
  export interface LoggerMessage {
    status: string;
    progress?: number;
    jobId?: string;
    userJobId?: string;
  }

  export interface RecognizeResult {
    data: {
      text: string;
      words: Array<{
        text: string;
        confidence: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }>;
      lines: Array<{ text: string; confidence: number }>;
      confidence: number;
    };
  }

  export interface Worker {
    recognize(
      image: string | File | Blob | HTMLImageElement | HTMLCanvasElement,
    ): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  }

  export interface WorkerOptions {
    logger?: (message: LoggerMessage) => void;
    errorHandler?: (error: unknown) => void;
    langPath?: string;
    gzip?: boolean;
    cacheMethod?: string;
    workerPath?: string;
    corePath?: string;
    [key: string]: unknown;
  }

  export function createWorker(
    langs?: string,
    oem?: number,
    options?: WorkerOptions,
  ): Promise<Worker>;
}

declare module "pdfjs-dist" {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    destroy(): Promise<void>;
  }

  export interface PDFPageViewport {
    width: number;
    height: number;
  }

  export interface PDFPageProxy {
    getViewport(params: { scale: number }): PDFPageViewport;
    render(params: {
      canvasContext: CanvasRenderingContext2D;
      canvas?: HTMLCanvasElement;
      viewport: PDFPageViewport;
    }): { promise: Promise<void> };
  }

  export interface GlobalWorkerOptionsType {
    workerSrc: string;
  }

  export const GlobalWorkerOptions: GlobalWorkerOptionsType;

  export interface GetDocumentParams {
    data?: ArrayBuffer | Uint8Array | string;
    url?: string;
    [key: string]: unknown;
  }

  export function getDocument(
    src: string | ArrayBuffer | Uint8Array | GetDocumentParams,
  ): { promise: Promise<PDFDocumentProxy> };
}

declare module "jspdf" {
  export interface jsPDFOptions {
    orientation?: "portrait" | "landscape" | "p" | "l";
    unit?: "pt" | "mm" | "cm" | "in" | "px" | "pc" | "em" | "ex";
    format?: string | number[];
    compress?: boolean;
    precision?: number;
    userUnit?: number;
    encryption?: Record<string, unknown>;
    putOnlyUsedFonts?: boolean;
    hotfixes?: string[];
    floatPrecision?: number | "smart";
  }

  export default class jsPDF {
    constructor(options?: jsPDFOptions);
    constructor(
      orientation?: string,
      unit?: string,
      format?: string | number[],
    );

    internal: {
      pageSize: { getWidth(): number; getHeight(): number };
      pages: unknown[];
    };

    addPage(format?: string | number[], orientation?: string): jsPDF;
    deletePage(targetPage: number): jsPDF;
    setPage(pageNumber: number): jsPDF;
    getNumberOfPages(): number;

    text(
      text: string | string[],
      x: number,
      y: number,
      options?: Record<string, unknown>,
    ): jsPDF;
    setFont(
      fontName: string,
      fontStyle?: string,
      fontWeight?: string | number,
    ): jsPDF;
    setFontSize(size: number): jsPDF;
    setTextColor(r: number | string, g?: number, b?: number): jsPDF;
    setDrawColor(r: number | string, g?: number, b?: number): jsPDF;
    setFillColor(r: number | string, g?: number, b?: number): jsPDF;
    setLineWidth(width: number): jsPDF;

    rect(x: number, y: number, w: number, h: number, style?: string): jsPDF;
    line(x1: number, y1: number, x2: number, y2: number, style?: string): jsPDF;

    addImage(
      imageData: string | HTMLImageElement | HTMLCanvasElement,
      format: string,
      x: number,
      y: number,
      width: number,
      height: number,
      alias?: string,
      compression?: string,
      rotation?: number,
    ): jsPDF;

    getStringUnitWidth(text: string): number;
    getTextWidth(text: string): number;
    splitTextToSize(
      text: string,
      maxWidth: number,
      options?: Record<string, unknown>,
    ): string[];

    save(
      filename?: string,
      options?: { returnPromise?: boolean },
    ): jsPDF | Promise<jsPDF>;
    output(
      type?: string,
      options?: Record<string, unknown>,
    ): string | ArrayBuffer;

    lastAutoTable: {
      finalY: number;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
}

declare module "jspdf-autotable" {
  import type jsPDF from "jspdf";

  export interface CellDef {
    content?: string | number;
    colSpan?: number;
    rowSpan?: number;
    styles?: Partial<Styles>;
  }

  export interface Styles {
    font?: string;
    fontStyle?: "normal" | "bold" | "italic" | "bolditalic";
    overflow?: "linebreak" | "ellipsize" | "visible" | "hidden";
    fillColor?: number | number[] | false;
    textColor?: number | number[];
    halign?: "left" | "center" | "right" | "justify";
    valign?: "top" | "middle" | "bottom";
    fontSize?: number;
    cellPadding?:
      | number
      | { top?: number; right?: number; bottom?: number; left?: number };
    lineColor?: number | number[];
    lineWidth?:
      | number
      | { top?: number; right?: number; bottom?: number; left?: number };
    cellWidth?: "auto" | "wrap" | number;
    minCellHeight?: number;
    minCellWidth?: number;
  }

  export interface UserOptions {
    startY?: number;
    margin?:
      | number
      | { top?: number; right?: number; bottom?: number; left?: number };
    head?: (string | CellDef)[][];
    body?: (string | number | CellDef)[][];
    foot?: (string | CellDef)[][];
    columns?: Array<{ header?: string; dataKey?: string | number }>;
    styles?: Partial<Styles>;
    headStyles?: Partial<Styles>;
    bodyStyles?: Partial<Styles>;
    footStyles?: Partial<Styles>;
    alternateRowStyles?: Partial<Styles>;
    columnStyles?: Record<string | number, Partial<Styles>>;
    theme?: "striped" | "grid" | "plain";
    showHead?: "everyPage" | "firstPage" | "never";
    showFoot?: "everyPage" | "lastPage" | "never";
    tableWidth?: "auto" | "wrap" | number;
    tableLineColor?: number | number[];
    tableLineWidth?: number;
    didDrawPage?: (data: Record<string, unknown>) => void;
    didDrawCell?: (data: Record<string, unknown>) => void;
    willDrawCell?: (data: Record<string, unknown>) => void;
    didParseCell?: (data: Record<string, unknown>) => void;
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}
