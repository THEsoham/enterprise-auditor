import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SystemStats, DocumentItem, VerifyResult } from '../types';
import { api } from '../api/client';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface VerifyModalState {
  isOpen: boolean;
  finding: string;
  evidence: any;
  result: VerifyResult | null;
  loading: boolean;
  error?: string | null;
}

interface EvidenceModalState {
  isOpen: boolean;
  title: string;
  text: string;
}

interface AuditContextType {
  stats: SystemStats | null;
  documents: DocumentItem[];
  filteredDocuments: DocumentItem[];
  selectedDocument: string | null;
  searchQuery: string;
  activeTab: string;
  theme: 'dark' | 'light';
  verifyModal: VerifyModalState;
  evidenceModal: EvidenceModalState;
  toast: ToastState | null;
  setSelectedDocument: (doc: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: string) => void;
  toggleTheme: () => void;
  openVerifier: (finding: string, evidence: any) => Promise<void>;
  closeVerifier: () => void;
  openEvidenceModal: (title: string, text: string) => void;
  closeEvidenceModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  reloadDocuments: () => Promise<void>;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('copilot');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ea_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sync theme with HTML class and localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('ea_theme', theme);
    }
  }, [theme]);

  const [verifyModal, setVerifyModal] = useState<VerifyModalState>({
    isOpen: false,
    finding: '',
    evidence: null,
    result: null,
    loading: false,
  });

  const [evidenceModal, setEvidenceModal] = useState<EvidenceModalState>({
    isOpen: false,
    title: '',
    text: '',
  });

  // Load stats and documents on mount
  useEffect(() => {
    reloadStats();
    reloadDocuments();
  }, []);

  // Filter documents on search
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredDocuments(documents);
    } else {
      setFilteredDocuments(
        documents.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            (d.category && d.category.toLowerCase().includes(q))
        )
      );
    }
  }, [searchQuery, documents]);

  const reloadStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (e) {
      console.warn('Failed to load stats', e);
    }
  };

  const reloadDocuments = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data.documents);
      setFilteredDocuments(data.documents);
    } catch (e) {
      showToast('Failed to load contract catalog', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(`Switched to ${next} theme`, 'info');
      return next;
    });
  };

  const openVerifier = async (finding: string, evidence: any) => {
    setVerifyModal({
      isOpen: true,
      finding,
      evidence,
      result: null,
      loading: true,
      error: null,
    });

    try {
      const res = await api.verifyFinding(finding, evidence);
      setVerifyModal((prev) => ({
        ...prev,
        result: res,
        loading: false,
      }));
    } catch (err: any) {
      setVerifyModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Verification evaluation failed',
      }));
    }
  };

  const closeVerifier = () => {
    setVerifyModal((prev) => ({ ...prev, isOpen: false }));
  };

  const openEvidenceModal = (title: string, text: string) => {
    setEvidenceModal({ isOpen: true, title, text });
  };

  const closeEvidenceModal = () => {
    setEvidenceModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <AuditContext.Provider
      value={{
        stats,
        documents,
        filteredDocuments,
        selectedDocument,
        searchQuery,
        activeTab,
        theme,
        verifyModal,
        evidenceModal,
        toast,
        setSelectedDocument: (doc) => {
          setSelectedDocument(doc);
          if (doc) {
            showToast(`Scope: ${doc.replace(/\.pdf$/i, '').substring(0, 35)}...`, 'info');
          } else {
            showToast('Scope: All 257 Agreements (Cross-Document)', 'info');
          }
        },
        setSearchQuery,
        setActiveTab,
        toggleTheme,
        openVerifier,
        closeVerifier,
        openEvidenceModal,
        closeEvidenceModal,
        showToast,
        reloadDocuments,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
