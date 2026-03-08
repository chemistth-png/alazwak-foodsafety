import { useState, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const TEMPLATES: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  haccp_flow: {
    nodes: [
      { id: "1", position: { x: 300, y: 0 }, data: { label: "استلام المواد الخام" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "2", position: { x: 300, y: 100 }, data: { label: "فحص الجودة الأولي" }, style: { background: "hsl(160 60% 90%)", border: "2px solid hsl(160 60% 45%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "3", position: { x: 300, y: 200 }, data: { label: "التخزين المبرّد" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "4", position: { x: 300, y: 300 }, data: { label: "المعالجة / الترشيح" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "5", position: { x: 300, y: 400 }, data: { label: "⚠️ CCP1: التعقيم بالأوزون/UV" }, style: { background: "hsl(0 84% 95%)", border: "2px solid hsl(0 84% 60%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 700 } },
      { id: "6", position: { x: 300, y: 500 }, data: { label: "التعبئة والتغليف" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "7", position: { x: 300, y: 600 }, data: { label: "⚠️ CCP2: فحص الجودة النهائي" }, style: { background: "hsl(0 84% 95%)", border: "2px solid hsl(0 84% 60%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 700 } },
      { id: "8", position: { x: 300, y: 700 }, data: { label: "التخزين والتوزيع" }, style: { background: "hsl(160 60% 90%)", border: "2px solid hsl(160 60% 45%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e2-3", source: "2", target: "3", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e3-4", source: "3", target: "4", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e4-5", source: "4", target: "5", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, animated: true },
      { id: "e5-6", source: "5", target: "6", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e6-7", source: "6", target: "7", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, animated: true },
      { id: "e7-8", source: "7", target: "8", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
    ],
  },
  decision_tree: {
    nodes: [
      { id: "1", position: { x: 300, y: 0 }, data: { label: "هل توجد مخاطر محتملة؟" }, style: { background: "hsl(45 93% 90%)", border: "2px solid hsl(45 93% 47%)", borderRadius: "50%", padding: 20, fontFamily: "Cairo", fontWeight: 600, width: 180, height: 80, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" } },
      { id: "2", position: { x: 100, y: 150 }, data: { label: "ليست CCP" }, style: { background: "hsl(160 60% 90%)", border: "2px solid hsl(160 60% 45%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "3", position: { x: 500, y: 150 }, data: { label: "هل يمكن التحكم؟" }, style: { background: "hsl(45 93% 90%)", border: "2px solid hsl(45 93% 47%)", borderRadius: "50%", padding: 20, fontFamily: "Cairo", fontWeight: 600, width: 180, height: 80, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" } },
      { id: "4", position: { x: 350, y: 300 }, data: { label: "تعديل العملية" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "5", position: { x: 650, y: 300 }, data: { label: "⚠️ نقطة تحكم حرجة CCP" }, style: { background: "hsl(0 84% 95%)", border: "2px solid hsl(0 84% 60%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 700 } },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", label: "لا", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e1-3", source: "1", target: "3", label: "نعم", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e3-4", source: "3", target: "4", label: "لا", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e3-5", source: "3", target: "5", label: "نعم", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
    ],
  },
  water_process: {
    nodes: [
      { id: "1", position: { x: 300, y: 0 }, data: { label: "🔵 مصدر المياه (بئر/شبكة)" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "2", position: { x: 300, y: 100 }, data: { label: "ترشيح رملي" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "3", position: { x: 300, y: 200 }, data: { label: "ترشيح كربوني" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "4", position: { x: 300, y: 300 }, data: { label: "تناضح عكسي (RO)" }, style: { background: "hsl(160 60% 90%)", border: "2px solid hsl(160 60% 45%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "5", position: { x: 300, y: 400 }, data: { label: "⚠️ CCP: تعقيم بالأوزون" }, style: { background: "hsl(0 84% 95%)", border: "2px solid hsl(0 84% 60%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 700 } },
      { id: "6", position: { x: 300, y: 500 }, data: { label: "⚠️ CCP: تعقيم UV" }, style: { background: "hsl(0 84% 95%)", border: "2px solid hsl(0 84% 60%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 700 } },
      { id: "7", position: { x: 300, y: 600 }, data: { label: "خزان المياه المعالجة" }, style: { background: "hsl(199 89% 93%)", border: "2px solid hsl(199 89% 48%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "8", position: { x: 300, y: 700 }, data: { label: "التعبئة الآلية" }, style: { background: "hsl(160 60% 90%)", border: "2px solid hsl(160 60% 45%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
      { id: "9", position: { x: 300, y: 800 }, data: { label: "✅ فحص الجودة والتوزيع" }, style: { background: "hsl(160 60% 90%)", border: "2px solid hsl(160 60% 45%)", borderRadius: 12, padding: 12, fontFamily: "Cairo", fontWeight: 600 } },
    ],
    edges: [
      { id: "e1-2", source: "1", target: "2", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e2-3", source: "2", target: "3", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e3-4", source: "3", target: "4", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e4-5", source: "4", target: "5", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, animated: true },
      { id: "e5-6", source: "5", target: "6", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, animated: true },
      { id: "e6-7", source: "6", target: "7", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e7-8", source: "7", target: "8", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
      { id: "e8-9", source: "8", target: "9", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } },
    ],
  },
};

let nodeId = 100;

const FlowChartBuilder = () => {
  const [nodes, setNodes] = useState<Node[]>(TEMPLATES.haccp_flow.nodes);
  const [edges, setEdges] = useState<Edge[]>(TEMPLATES.haccp_flow.edges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect: OnConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } }, eds)
      ),
    []
  );

  const addNode = () => {
    const id = String(++nodeId);
    const newNode: Node = {
      id,
      position: { x: 200 + Math.random() * 200, y: 100 + Math.random() * 300 },
      data: { label: "خطوة جديدة" },
      style: {
        background: "hsl(199 89% 93%)",
        border: "2px solid hsl(199 89% 48%)",
        borderRadius: 12,
        padding: 12,
        fontFamily: "Cairo",
        fontWeight: 600,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const loadTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (t) {
      setNodes(t.nodes);
      setEdges(t.edges);
    }
  };

  const exportImage = () => {
    toast.success("يمكنك أخذ لقطة شاشة للمخطط الحالي (Ctrl+Shift+S)");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-card flex-wrap">
        <Select defaultValue="haccp_flow" onValueChange={loadTemplate}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="اختر قالب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="haccp_flow">مخطط تدفق HACCP</SelectItem>
            <SelectItem value="decision_tree">شجرة القرارات</SelectItem>
            <SelectItem value="water_process">خطوات معالجة المياه</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={addNode} className="gap-1.5">
          <Plus className="w-4 h-4" />
          إضافة خطوة
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setNodes([]); setEdges([]); }} className="gap-1.5">
          <RotateCcw className="w-4 h-4" />
          مسح
        </Button>
        <Button variant="outline" size="sm" onClick={exportImage} className="gap-1.5">
          <Download className="w-4 h-4" />
          تصدير
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="bottom-left"
          style={{ direction: "ltr" }}
        >
          <Controls position="bottom-right" />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowChartBuilder;
