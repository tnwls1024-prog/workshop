export type Tool = 'select' | 'pen' | 'eraser' | 'rect' | 'circle' | 'text' | 'sticky' | 'arrow';

export interface Point {
  x: number;
  y: number;
}

export interface DrawingElement {
  id: string;
  type: Tool;
  points?: number[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  rotation?: number;
  fill?: string;
}

export interface WorkshopTemplate {
  name: string;
  description: string;
  elements: DrawingElement[];
}
