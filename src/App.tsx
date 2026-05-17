/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group, Arrow, Transformer } from 'react-konva';
import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  StickyNote, 
  MousePointer2, 
  Trash2, 
  Download, 
  Sparkles,
  LayoutTemplate,
  ChevronRight,
  ChevronLeft,
  X,
  Send,
  Loader2,
  ArrowRight,
  Target
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Tool, DrawingElement, Point } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Custom components
const WorkshopToolbar = ({ 
  currentTool, 
  setTool, 
  color, 
  setColor, 
  clearBoard,
  onDownload,
  onTemplates
}: { 
  currentTool: Tool, 
  setTool: (t: Tool) => void,
  color: string,
  setColor: (c: string) => void,
  clearBoard: () => void,
  onDownload: () => void,
  onTemplates: () => void
}) => {
  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'pen', icon: Pencil, label: 'Pen' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: CircleIcon, label: 'Circle' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#0f172a'];

  return (
    <div className="col-span-1 flex flex-col gap-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm h-fit">
      <div className="flex flex-col gap-3">
        {tools.map((t) => (
          <button
            id={`tool-${t.id}`}
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-xl transition-all",
              currentTool === t.id ? "bg-indigo-600 text-white shadow-md" : "hover:bg-slate-50 text-slate-400"
            )}
          >
            <t.icon size={22} />
          </button>
        ))}
      </div>
      <div className="w-full h-px bg-slate-100" />
      <div className="grid grid-cols-2 gap-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={cn(
              "w-5 h-5 rounded-full mx-auto border-2 transition-transform hover:scale-110 shadow-sm",
              color === c ? "border-slate-900 scale-110" : "border-white"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="w-full h-px bg-slate-100" />
      <div className="flex flex-col gap-3">
        <button onClick={onTemplates} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors text-indigo-600" title="Templates">
          <LayoutTemplate size={22} />
        </button>
        <button onClick={onDownload} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors text-slate-600" title="Download">
          <Download size={22} />
        </button>
        <button onClick={clearBoard} className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors text-red-500" title="Clear All">
          <Trash2 size={22} />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#0f172a');
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setCanvasDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []);

  const handleMouseDown = (e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const id = Math.random().toString(36).substr(2, 9);
    
    let newElement: DrawingElement = {
      id,
      type: tool,
      x: pos.x,
      y: pos.y,
      color: tool === 'eraser' ? '#ffffff' : color,
      strokeWidth: tool === 'pen' || tool === 'eraser' ? 4 : 2,
      points: tool === 'pen' || tool === 'eraser' ? [pos.x, pos.y] : [],
      width: 0,
      height: 0,
      fill: tool === 'sticky' ? '#fef3c7' : 'transparent',
    };

    if (tool === 'sticky') {
      newElement.width = 150;
      newElement.height = 150;
      newElement.text = 'Double click to edit';
    } else if (tool === 'text') {
      newElement.text = 'Type here';
    }

    setElements([...elements, newElement]);
    setSelectedId(id);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || tool === 'select') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastElement = elements[elements.length - 1];

    if (!lastElement) return;

    if (tool === 'pen' || tool === 'eraser') {
      lastElement.points = lastElement.points!.concat([point.x, point.y]);
    } else if (tool === 'rect' || tool === 'sticky' || tool === 'circle' || tool === 'arrow') {
      lastElement.width = point.x - lastElement.x;
      lastElement.height = point.y - lastElement.y;
    }

    setElements([...elements.slice(0, elements.length - 1), lastElement]);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    if (tool !== 'select') {
      // Small cleanup for text/sticky that didn't drag
      let lastElement = elements[elements.length - 1];
      if (lastElement && (lastElement.type === 'sticky' || lastElement.type === 'text') && Math.abs(lastElement.width || 0) < 5) {
         if (lastElement.type === 'sticky') {
            lastElement.width = 150;
            lastElement.height = 150;
         }
      }
    }
  };

  const handleElementChange = (id: string, attrs: Partial<DrawingElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...attrs } : el));
  };

  const handleDownload = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'workshop-board.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAIAnalyze = async () => {
    if (!chatInput.trim() && chatHistory.length > 0) return;
    
    setIsLoading(true);
    const text = chatInput || "이 보드에 있는 내용들을 분석해서 워크숍 진행을 위한 인사이트를 줘.";
    const currentInput = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: currentInput || "분석 요청" }]);

    try {
      const stage = stageRef.current;
      const dataUrl = stage.toDataURL();
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, image: dataUrl })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'ai', text: "미안해, 분석 중에 오류가 발생했어." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplate = (type: string) => {
    const newElements: DrawingElement[] = [];
    const width = canvasDimensions.width;
    const height = canvasDimensions.height;

    if (type === 'SWOT') {
      const centerX = width / 2;
      const centerY = height / 2;
      const size = Math.min(width, height) / 3;
      
      // Quadrants
      newElements.push({ id: 's1', type: 'rect', x: centerX - size, y: centerY - size, width: size, height: size, color: '#e2e8f0', strokeWidth: 1, fill: '#f8fafc' });
      newElements.push({ id: 's2', type: 'rect', x: centerX, y: centerY - size, width: size, height: size, color: '#e2e8f0', strokeWidth: 1, fill: '#f1f5f9' });
      newElements.push({ id: 's3', type: 'rect', x: centerX - size, y: centerY, width: size, height: size, color: '#e2e8f0', strokeWidth: 1, fill: '#f1f5f9' });
      newElements.push({ id: 's4', type: 'rect', x: centerX, y: centerY, width: size, height: size, color: '#e2e8f0', strokeWidth: 1, fill: '#ffffff' });
      
      // Labels
      newElements.push({ id: 'l1', type: 'text', x: centerX - size + 20, y: centerY - size + 20, text: 'Strengths', color: '#6366f1', strokeWidth: 1 });
      newElements.push({ id: 'l2', type: 'text', x: centerX + 20, y: centerY - size + 20, text: 'Weaknesses', color: '#64748b', strokeWidth: 1 });
      newElements.push({ id: 'l3', type: 'text', x: centerX - size + 20, y: centerY + 20, text: 'Opportunities', color: '#64748b', strokeWidth: 1 });
      newElements.push({ id: 'l4', type: 'text', x: centerX + 20, y: centerY + 20, text: 'Threats', color: '#e11d48', strokeWidth: 1 });
    }

    setElements(newElements);
    setIsTemplateMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Header Navigation */}
      <nav className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Smart Workshop Studio</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Pro Creative Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold">LIVE SESSION</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
          <div className="hidden lg:flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm">JD</div>
            <div className="w-8 h-8 rounded-full bg-green-400 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm">SK</div>
            <div className="w-8 h-8 rounded-full bg-indigo-400 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm">ME</div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-500 font-bold shadow-sm">+8</div>
          </div>
          <button 
            onClick={handleDownload}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </nav>

      {/* Main Content Area - Bento Grid */}
      <div className="flex-1 p-6 grid grid-cols-12 grid-rows-6 gap-4 overflow-hidden min-h-0">
        
        {/* Toolbar Bento */}
        <WorkshopToolbar 
          currentTool={tool} 
          setTool={setTool} 
          color={color} 
          setColor={setColor}
          clearBoard={() => setElements([])}
          onDownload={handleDownload}
          onTemplates={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
        />

        {/* Primary Canvas Bento */}
        <div className="col-span-8 row-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 canvas-grid pointer-events-none" />
          
          <div ref={containerRef} className="w-full h-full cursor-crosshair">
            <Stage
              id="workshop-canvas"
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              ref={stageRef}
            >
              <Layer>
                {/* ... existing canvas rendering logic ... */}
                {elements.map((el) => {
                  if (el.type === 'pen' || el.type === 'eraser') {
                    return (
                      <Line
                        key={el.id}
                        points={el.points}
                        stroke={el.color}
                        strokeWidth={el.strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        globalCompositeOperation={
                          el.type === 'eraser' ? 'destination-out' : 'source-over'
                        }
                      />
                    );
                  }
                  if (el.type === 'rect') {
                    return (
                      <Rect
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        stroke={el.color}
                        strokeWidth={el.strokeWidth}
                        fill={el.fill}
                        draggable={tool === 'select'}
                        onClick={() => setSelectedId(el.id)}
                        onDragEnd={(e) => handleElementChange(el.id, { x: e.target.x(), y: e.target.y() })}
                      />
                    );
                  }
                  if (el.type === 'circle') {
                    return (
                      <Circle
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        radius={Math.sqrt(Math.pow(el.width || 0, 2) + Math.pow(el.height || 0, 2))}
                        stroke={el.color}
                        strokeWidth={el.strokeWidth}
                        draggable={tool === 'select'}
                        onClick={() => setSelectedId(el.id)}
                        onDragEnd={(e) => handleElementChange(el.id, { x: e.target.x(), y: e.target.y() })}
                      />
                    );
                  }
                  if (el.type === 'sticky') {
                    return (
                      <Group
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        draggable={tool === 'select'}
                        onDragEnd={(e) => handleElementChange(el.id, { x: e.target.x(), y: e.target.y() })}
                      >
                        <Rect
                          width={el.width}
                          height={el.height}
                          fill={el.fill}
                          shadowColor="black"
                          shadowBlur={10}
                          shadowOpacity={0.08}
                          shadowOffset={{ x: 2, y: 2 }}
                        />
                        <Text
                          text={el.text}
                          fontSize={14}
                          fontFamily="Inter"
                          padding={15}
                          width={el.width}
                          height={el.height}
                          align="left"
                          verticalAlign="top"
                          onDblClick={() => {
                            const newText = prompt('Enter note text:', el.text);
                            if (newText !== null) handleElementChange(el.id, { text: newText });
                          }}
                        />
                      </Group>
                    );
                  }
                  if (el.type === 'text') {
                    return (
                      <Text
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        text={el.text}
                        fontSize={24}
                        fill={el.color}
                        fontFamily="Playfair Display, serif"
                        fontStyle="italic"
                        draggable={tool === 'select'}
                        onDblClick={() => {
                          const newText = prompt('Enter text:', el.text);
                          if (newText !== null) handleElementChange(el.id, { text: newText });
                        }}
                        onDragEnd={(e) => handleElementChange(el.id, { x: e.target.x(), y: e.target.y() })}
                      />
                    );
                  }
                  if (el.type === 'arrow') {
                     return (
                        <Arrow
                          key={el.id}
                          points={[el.x, el.y, el.x + (el.width || 0), el.y + (el.height || 0)]}
                          stroke={el.color}
                          fill={el.color}
                          strokeWidth={el.strokeWidth}
                          draggable={tool === 'select'}
                          onDragEnd={(e) => handleElementChange(el.id, { x: e.target.x(), y: e.target.y() })}
                        />
                     );
                  }
                  return null;
                })}
              </Layer>
            </Stage>
          </div>

          <div className="absolute bottom-4 left-4 flex gap-2 pointer-events-none">
            <span className="px-3 py-1 bg-slate-800/90 text-white text-[10px] rounded-full pointer-events-auto shadow-sm">Canvas 100%</span>
            <button className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] rounded-full pointer-events-auto hover:bg-slate-50">Grid On</button>
          </div>

          {isTemplateMenuOpen && (
            <div className="absolute left-4 top-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-xl z-[60] w-64 animate-in fade-in slide-in-from-left-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Choose Template</h3>
              <button 
                onClick={() => applyTemplate('SWOT')}
                className="w-full text-left p-3 rounded-xl hover:bg-indigo-50 group transition-colors"
              >
                <div className="font-semibold text-slate-900 group-hover:text-indigo-600">SWOT Analysis</div>
                <div className="text-[10px] text-slate-500">4 quadrants for strategic planning</div>
              </button>
            </div>
          )}
        </div>

        {/* AI Assistant Bento */}
        <div className="col-span-3 row-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden relative">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 uppercase tracking-tight">
              <Sparkles className="text-indigo-600" size={18} />
              Workshop AI
            </h2>
            {isLoading && <Loader2 className="animate-spin text-indigo-400" size={16} />}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
            {chatHistory.length === 0 && (
              <div className="bg-indigo-50/50 p-4 rounded-xl text-xs text-indigo-800 leading-relaxed border border-indigo-100 flex items-start gap-3">
                <LayoutTemplate className="shrink-0 text-indigo-500" size={16} />
                <span>워크숍 중 막히는 부분이 있나요? 보드를 분석해 인사이트를 드릴게요.</span>
              </div>
            )}
            
            {chatHistory.map((msg, i) => (
              <div key={i} className={cn(
                "p-4 rounded-2xl text-xs leading-relaxed",
                msg.role === 'user' ? "bg-slate-100 ml-auto max-w-[85%] text-slate-800 font-medium" : "bg-white border border-slate-100 text-slate-900 shadow-sm"
              )}>
                {msg.text}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
            <div className="relative">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAIAnalyze()}
                placeholder="Ask for ideas..."
                className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-xs shadow-sm transition-all focus:border-indigo-400 outline-none"
              />
              <button 
                onClick={handleAIAnalyze}
                disabled={isLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Goals Bento */}
        <div className="col-span-4 row-span-2 bg-indigo-600 rounded-2xl p-6 text-white flex flex-col shadow-lg shadow-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <Target size={120} className="rotate-12" />
          </div>
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <StickyNote className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Session Goal</span>
          </div>
          <p className="text-xl font-bold leading-tight relative z-10 font-serif italic">"워크숍을 통해 더 나은 기업 문화를 함께 설계합니다."</p>
          <div className="mt-auto flex items-center gap-2 text-indigo-200 text-[10px] uppercase font-bold tracking-widest relative z-10">
            <span className="bg-indigo-500/50 px-2.5 py-1 rounded-lg">CULTURE</span>
            <span className="bg-indigo-500/50 px-2.5 py-1 rounded-lg">STRATEGY</span>
          </div>
        </div>

        {/* Participants Bento */}
        <div className="col-span-4 row-span-2 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Active Attendees</h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">12</span>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1">
            {[
              { name: '강석훈 강사', role: 'Facilitator', color: 'indigo' },
              { name: '이미래 대리', role: 'Attendee', color: 'green' },
              { name: '최진우 과장', role: 'Attendee', color: 'orange' }
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform group-hover:scale-105",
                  `bg-${p.color}-500`
                )}>
                  {p.name.substring(0, 1)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-700">{p.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{p.role}</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-200"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings/Status Bento */}
        <div className="col-span-4 row-span-2 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm relative overflow-hidden">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Canvas Settings</h4>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 tracking-tight">Stroke Fidelity</span>
              <span className="text-xs font-black text-indigo-600">4px</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="w-[40%] h-full bg-indigo-600 rounded-full shadow-sm"></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button className="flex-1 h-10 border-2 border-slate-900 rounded-xl flex items-center justify-center transition-all hover:bg-slate-50">
                 <div className="w-6 h-0.5 bg-slate-900"></div>
              </button>
              <button className="flex-1 h-10 border-2 border-slate-100 rounded-xl flex items-center justify-center transition-all hover:border-slate-200">
                 <div className="w-6 h-1 bg-slate-300 rounded-full"></div>
              </button>
              <button className="flex-1 h-10 border-2 border-slate-100 rounded-xl flex items-center justify-center transition-all hover:border-slate-200">
                 <div className="w-6 h-2 bg-slate-300 rounded-full"></div>
              </button>
            </div>
          </div>
          <div className="mt-auto flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            <span>Server Response: 24ms</span>
            <div className="flex gap-1">
               <div className="w-1 h-3 bg-slate-200 rounded-full"></div>
               <div className="w-1 h-2 bg-slate-200 rounded-full mt-1"></div>
               <div className="w-1 h-4 bg-slate-200 rounded-full -mt-1"></div>
            </div>
          </div>
        </div>

      </div>

      {/* Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=JetBrains+Mono:wght@400;700&display=swap');
      `}</style>
    </div>
  );
}
