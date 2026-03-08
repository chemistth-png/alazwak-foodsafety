import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowRight, GitBranch, LayoutGrid, ClipboardList } from "lucide-react";
import FlowChartBuilder from "@/components/plans/FlowChartBuilder";
import FactoryLayoutBuilder from "@/components/plans/FactoryLayoutBuilder";
import HACCPTables from "@/components/plans/HACCPTables";

const Plans = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("flowchart");

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              المخططات والخطط
            </h1>
            <p className="text-xs text-muted-foreground">
              مخططات التدفق، تخطيط المصنع، وجداول HACCP
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 pt-3">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="flowchart" className="gap-1.5 text-xs sm:text-sm">
                <GitBranch className="w-4 h-4" />
                <span className="hidden sm:inline">مخططات التدفق</span>
                <span className="sm:hidden">تدفق</span>
              </TabsTrigger>
              <TabsTrigger value="layout" className="gap-1.5 text-xs sm:text-sm">
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">تخطيط المصنع</span>
                <span className="sm:hidden">تخطيط</span>
              </TabsTrigger>
              <TabsTrigger value="haccp" className="gap-1.5 text-xs sm:text-sm">
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">جداول HACCP</span>
                <span className="sm:hidden">HACCP</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="flowchart" className="flex-1 overflow-hidden m-0 p-0">
            <FlowChartBuilder />
          </TabsContent>
          <TabsContent value="layout" className="flex-1 overflow-hidden m-0 p-0">
            <FactoryLayoutBuilder />
          </TabsContent>
          <TabsContent value="haccp" className="flex-1 overflow-hidden m-0 p-0">
            <HACCPTables />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Plans;
