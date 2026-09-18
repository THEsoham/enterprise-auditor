import React from 'react';
import { AuditProvider, useAudit } from './context/AuditContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { VerifyModal } from './components/common/VerifyModal';
import { EvidenceModal } from './components/common/EvidenceModal';
import { Toast } from './components/common/Toast';

import { DocumentHealthTab } from './components/tabs/DocumentHealthTab';
import { CourtroomDebateTab } from './components/tabs/CourtroomDebateTab';
import { VisualScannerTab } from './components/tabs/VisualScannerTab';

import { CopilotTab } from './components/tabs/CopilotTab';
import { ClauseStudioTab } from './components/tabs/ClauseStudioTab';
import { ComparatorTab } from './components/tabs/ComparatorTab';
import { ObligationsTab } from './components/tabs/ObligationsTab';
import { AuditMemoTab } from './components/tabs/AuditMemoTab';
import { BenchmarkTab } from './components/tabs/BenchmarkTab';

const AppContent: React.FC = () => {
  const { activeTab } = useAudit();

  const renderActiveTab = () => {
    switch (activeTab) {
      // 3 Core USPs
      case 'health':
      case 'document-health':
      case 'redflags':
        return <DocumentHealthTab />;
      case 'debate':
      case 'courtroom':
      case 'courtroom-debate':
        return <CourtroomDebateTab />;
      case 'scanner':
      case 'visual':
      case 'signatures':
        return <VisualScannerTab />;

      // Advanced & Reports
      case 'copilot':
        return <CopilotTab />;
      case 'report':
      case 'memo':
        return <AuditMemoTab />;
      case 'eval':
      case 'benchmark':
        return <BenchmarkTab />;

      // Legacy fallbacks
      case 'clauses':
      case 'clause-studio':
        return <ClauseStudioTab />;
      case 'risks':
      case 'risk-audit':
        return <DocumentHealthTab />;
      case 'missing':
      case 'missing-clauses':
        return <DocumentHealthTab />;
      case 'compare':
      case 'comparator':
        return <ComparatorTab />;
      case 'graph':
      case 'knowledge-graph':
        return <DocumentHealthTab />;
      case 'obligations':
        return <ObligationsTab />;
      case 'tables':
      case 'tables-images':
        return <VisualScannerTab />;
      default:
        return <DocumentHealthTab />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <Header />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Contract & Capability Sidebar */}
        <Sidebar />

        {/* Central Workspace Tab Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 custom-scrollbar">
          <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-150">
            {renderActiveTab()}
          </div>
        </main>
      </div>

      {/* Global Modals & Overlays */}
      <VerifyModal />
      <EvidenceModal />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AuditProvider>
      <AppContent />
    </AuditProvider>
  );
}
