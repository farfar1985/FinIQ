/**
 * FinIQ App — Main React Application
 * Unified Financial Analytics Hub with Sidebar Navigation
 * FR4: NL Query Interface | FR5: Job Board | FR3: CI | Voice Input
 */

import { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000/api';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
}

interface QueryResponse {
  success: boolean;
  query: string;
  intent: string;
  entity: string;
  period: string | null;
  summary: string;
  kpis: Array<{
    label: string;
    value: number;
    format: 'currency' | 'percentage';
    trend?: 'up' | 'down';
  }>;
  data: any[];
  dataSource: string;
  rowCount: number;
  timestamp: string;
  llmUsed?: boolean;
  error?: string;
}

interface Job {
  id: string;
  query: string;
  status: 'submitted' | 'processing' | 'completed' | 'failed';
  submittedAt: string;
  completedAt?: string;
  priority: 'high' | 'normal' | 'low';
  elapsedMs: number;
}

interface Competitor {
  id: string;
  company: string;
  quarter: string;
  year: string;
  uploadedAt: string;
  pageCount: number;
  summaryCount: number;
  summaries?: ThemedSummary[];
  p2pData?: P2PData;
}

interface ThemedSummary {
  theme: string;
  content: string;
}

interface P2PData {
  company: string;
  metrics: Array<{
    metric: string;
    value: number;
    unit: string;
  }>;
}

interface AdminStatus {
  dataMode: string;
  connections: {
    database: {
      status: string;
      type: string;
      recordCount?: number;
      message: string;
    };
    anthropic: {
      status: string;
      message: string;
    };
  };
}

interface TableSchema {
  name: string;
  type: 'table' | 'view';
  description: string;
  columns?: Array<{ name: string; type: string }>;
}

type Page = 'dashboard' | 'chat' | 'jobs' | 'ci' | 'data-explorer' | 'admin';

// LoadingSpinner Component
function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Processing your query...</p>
    </div>
  );
}

// ConnectionStatus Component (now in sidebar footer)
function ConnectionStatus({ dataMode, dbStatus, llmStatus }: any) {
  return (
    <div className="sidebar-status">
      <div className={`status-dot ${dbStatus === 'connected' ? 'dot-online' : 'dot-offline'}`} title={`Database: ${dbStatus}`}></div>
      <div className={`status-dot ${llmStatus === 'ok' ? 'dot-online' : 'dot-warning'}`} title={`LLM: ${llmStatus}`}></div>
      <div className="status-text">{dataMode === 'simulated' ? 'Demo Mode' : 'Live Mode'}</div>
    </div>
  );
}

// DataTable Component with sorting, formatting, and pagination
function DataTable({ data }: { data: any[] }) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  // Sort data
  let sortedData = [...data];
  if (sortColumn) {
    sortedData.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const paginatedData = sortedData.slice(startIdx, endIdx);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const formatValue = (val: any, column: string) => {
    if (val == null) return '-';

    if (typeof val === 'number') {
      // Currency columns
      if (column.includes('USD') || column.includes('Value') || column.includes('CY') || column.includes('LY') || column.includes('Actual') || column.includes('Replan')) {
        return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      // Percentage columns
      if (column.includes('Pct') || column.includes('Shape') || column.includes('%') || column.includes('Growth')) {
        return `${val.toFixed(2)}%`;
      }
      // Regular numbers
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return String(val);
  };

  const getCellClass = (val: any, column: string) => {
    if (typeof val !== 'number') return '';

    if (column.includes('Growth') || column.includes('Variance') || column.includes('Change')) {
      return val >= 0 ? 'cell-positive' : 'cell-negative';
    }

    return '';
  };

  return (
    <details className="data-details" open>
      <summary>View data ({data.length} rows)</summary>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} onClick={() => handleSort(col)} className="sortable-header">
                  {col}
                  {sortColumn === col && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <tr key={i}>
                {columns.map((col, j) => (
                  <td key={j} className={getCellClass(row[col], col)}>
                    {formatValue(row[col], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="table-pagination">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages} ({data.length} total rows)
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </details>
  );
}

function App() {
  // Navigation
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Welcome to FinIQ. Ask me anything about your financial performance, budget variance, or competitive intelligence.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // CI state
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);

  // Admin state
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

  // Stats state
  const [stats, setStats] = useState<any>(null);

  // Data Explorer state
  const [tableSchemas, setTableSchemas] = useState<TableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tablePreview, setTablePreview] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Load data on page switch
  useEffect(() => {
    if (activePage === 'jobs') {
      loadJobs();
    } else if (activePage === 'ci') {
      loadCompetitors();
    } else if (activePage === 'admin') {
      loadAdminStatus();
    } else if (activePage === 'data-explorer' && tableSchemas.length === 0) {
      loadTableSchemas();
    }
  }, [activePage]);

  // Auto-refresh jobs every 2 seconds when on jobs page
  useEffect(() => {
    if (activePage === 'jobs') {
      const interval = setInterval(loadJobs, 2000);
      return () => clearInterval(interval);
    }
  }, [activePage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result: QueryResponse = await response.json();

      if (result.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: result.summary,
          timestamp: new Date(),
          data: result,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(result.error || 'Query processing failed');
      }
    } catch (error) {
      console.error('Query error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `❌ Unable to process your query. ${error instanceof Error ? error.message : 'Please check your connection and try again.'}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const loadJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const response = await fetch(`${API_URL}/jobs`);
      const result = await response.json();
      if (result.success) {
        setJobs(result.jobs);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const exportJob = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/export/${jobId}?format=csv`);

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Export failed');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${jobId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting job:', error);
      alert('Export failed');
    }
  };

  const loadCompetitors = async () => {
    setIsLoadingCompetitors(true);
    try {
      const response = await fetch(`${API_URL}/ci/competitors`);
      const result = await response.json();
      if (result.success) {
        setCompetitors(result.competitors);
      }
    } catch (error) {
      console.error('Error loading competitors:', error);
    } finally {
      setIsLoadingCompetitors(false);
    }
  };

  const loadAdminStatus = async () => {
    setIsLoadingAdmin(true);
    try {
      const response = await fetch(`${API_URL}/admin/status`);
      const result = await response.json();
      if (result.success) {
        setAdminStatus(result);
      }
    } catch (error) {
      console.error('Error loading admin status:', error);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const result = await response.json();
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTableSchemas = () => {
    // Hard-coded schema information for all 20 finiq tables
    const schemas: TableSchema[] = [
      { name: 'finiq_date', type: 'table', description: 'Date dimension with fiscal periods and calendar hierarchy' },
      { name: 'finiq_dim_entity', type: 'table', description: 'Organizational hierarchy (150+ units: Mars Inc > GBUs > Divisions > Regions)' },
      { name: 'finiq_dim_account', type: 'table', description: 'Chart of accounts with parent-child relationships and sign conversion' },
      { name: 'finiq_account_formula', type: 'table', description: 'KPI calculation formulas (numerator/denominator logic)' },
      { name: 'finiq_account_input', type: 'table', description: 'Account input mappings' },
      { name: 'finiq_composite_item', type: 'table', description: 'Product master (brands, categories, 12 columns)' },
      { name: 'finiq_item', type: 'table', description: 'Granular product details (15 columns)' },
      { name: 'finiq_item_composite_item', type: 'table', description: 'Product hierarchy bridge table' },
      { name: 'finiq_customer', type: 'table', description: 'Customer master (11 columns)' },
      { name: 'finiq_customer_map', type: 'table', description: 'Customer hierarchy mappings' },
      { name: 'finiq_economic_cell', type: 'table', description: 'Economic cell dimension' },
      { name: 'finiq_financial', type: 'table', description: 'Main financial fact table (39 columns, denormalized)' },
      { name: 'finiq_financial_base', type: 'table', description: 'Normalized financial base (7 columns)' },
      { name: 'finiq_financial_cons', type: 'table', description: 'Consolidated financials with currency (9 columns)' },
      { name: 'finiq_financial_replan', type: 'table', description: 'Actual vs budget/replan comparison (18 columns)' },
      { name: 'finiq_financial_replan_cons', type: 'table', description: 'Consolidated replan (6 columns)' },
      { name: 'finiq_vw_pl_entity', type: 'view', description: 'P&L by entity view (maps to PES Excel P&L sheet)' },
      { name: 'finiq_vw_pl_brand_product', type: 'view', description: 'P&L by brand/product (maps to Product/Brand sheets)' },
      { name: 'finiq_vw_ncfo_entity', type: 'view', description: 'NCFO by entity (maps to PES Excel NCFO sheet)' },
      { name: 'finiq_rls_tracking', type: 'table', description: 'Row-level security tracking' },
    ];

    setTableSchemas(schemas);
  };

  const loadTablePreview = async (tableName: string) => {
    setIsLoadingPreview(true);
    setSelectedTable(tableName);
    try {
      // Use a generic query to preview the table
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `SELECT * FROM ${tableName} LIMIT 20` }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setTablePreview(result.data);
      } else {
        setTablePreview([]);
      }
    } catch (error) {
      console.error('Error loading table preview:', error);
      setTablePreview([]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExampleQuery = (exampleQuery: string) => {
    setInput(exampleQuery);
    setActivePage('chat');
  };

  const loadSampleCompetitorData = () => {
    const sampleCompetitor: Competitor = {
      id: 'sample-nestle-q2-2024',
      company: 'Nestle',
      quarter: 'Q2',
      year: '2024',
      uploadedAt: new Date().toISOString(),
      pageCount: 24,
      summaryCount: 7,
      summaries: [
        {
          theme: 'Organic Growth',
          content: 'Nestle reported 2.1% organic growth driven by 3.2% pricing partially offset by -1.1% real internal growth. Zone Europe led with 3.8% growth, while Zone Americas showed 1.5% growth. Strong performance in coffee (+5.2%) and pet care (+4.1%) offset challenges in confectionery (-1.3%).'
        },
        {
          theme: 'Margins',
          content: 'Gross margin expanded 120bps to 48.2% driven by favorable product mix and productivity initiatives. Trading operating profit margin reached 17.1%, up 80bps year-over-year. The company maintained disciplined cost control while investing in strategic growth initiatives.'
        },
        {
          theme: 'Projections',
          content: 'Nestle reaffirmed full-year guidance of mid-single digit organic sales growth and modest operating margin improvement. Management expects H2 performance to strengthen driven by innovation pipeline launch and continued pricing discipline.'
        },
        {
          theme: 'Consumer Trends',
          content: 'Strong consumer demand observed in premium segments and health-focused products. Out-of-home consumption recovering to pre-pandemic levels. E-commerce penetration increased to 14.5% of total sales, up 180bps year-over-year.'
        },
        {
          theme: 'Product Launches',
          content: 'Launched 47 new products across categories including plant-based alternatives, premium coffee blends, and functional nutrition. Key innovation: Nespresso Vertuo Pop targeting younger consumers, Garden Gourmet v2.0 plant-based range expansion.'
        },
        {
          theme: 'Product Summary',
          content: 'Product portfolio performance: Coffee (+5.2%), Petcare (+4.1%), Dairy (+2.8%), Nutrition (+2.3%), Water (flat), Confectionery (-1.3%). Premiumization strategy delivering results with premium products growing 8.4% above portfolio average.'
        },
        {
          theme: 'Miscellaneous',
          content: 'Completed strategic review of non-core assets. Announced partnership with Starbucks to expand ready-to-drink coffee globally. Sustainability commitments on track: 30% reduction in GHG emissions vs 2018 baseline, 95% of packaging recyclable or reusable.'
        }
      ],
      p2pData: {
        company: 'Nestle',
        metrics: [
          { metric: 'Organic Growth %', value: 2.1, unit: '%' },
          { metric: 'Price %', value: 3.2, unit: '%' },
          { metric: 'Volume %', value: -1.1, unit: '%' },
          { metric: 'Mix %', value: 0.0, unit: '%' },
          { metric: 'Operating Margin %', value: 17.1, unit: '%' },
        ]
      }
    };

    setCompetitors([sampleCompetitor]);
    alert('✅ Sample competitor data loaded: Nestle Q2 2024 with 7 themed summaries and P2P benchmarking.');
  };

  // Load stats and admin status on mount
  useEffect(() => {
    loadStats();
    loadAdminStatus();
  }, []);

  return (
    <div className="app">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="logo-icon">📊</span>
            {!sidebarCollapsed && <span className="logo-text">FinIQ</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activePage === 'dashboard' ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage('dashboard')}
            title="Dashboard"
          >
            <span className="nav-icon">🏠</span>
            {!sidebarCollapsed && <span className="nav-label">Dashboard</span>}
          </button>
          <button
            className={`nav-item ${activePage === 'chat' ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage('chat')}
            title="Chat"
          >
            <span className="nav-icon">💬</span>
            {!sidebarCollapsed && <span className="nav-label">Chat</span>}
          </button>
          <button
            className={`nav-item ${activePage === 'jobs' ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage('jobs')}
            title="Jobs"
          >
            <span className="nav-icon">📋</span>
            {!sidebarCollapsed && <span className="nav-label">Jobs</span>}
          </button>
          <button
            className={`nav-item ${activePage === 'ci' ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage('ci')}
            title="Competitive Intelligence"
          >
            <span className="nav-icon">🔍</span>
            {!sidebarCollapsed && <span className="nav-label">CI</span>}
          </button>
          <button
            className={`nav-item ${activePage === 'data-explorer' ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage('data-explorer')}
            title="Data Explorer"
          >
            <span className="nav-icon">🗄️</span>
            {!sidebarCollapsed && <span className="nav-label">Data Explorer</span>}
          </button>
          <button
            className={`nav-item ${activePage === 'admin' ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage('admin')}
            title="Admin"
          >
            <span className="nav-icon">⚙️</span>
            {!sidebarCollapsed && <span className="nav-label">Admin</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          {adminStatus && (
            <ConnectionStatus
              dataMode={adminStatus.dataMode}
              dbStatus={adminStatus.connections.database.status}
              llmStatus={adminStatus.connections.anthropic.status}
            />
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="content">
        <header className="content-header">
          <div>
            <h1 className="page-title">
              {activePage === 'dashboard' && 'Dashboard'}
              {activePage === 'chat' && 'Chat'}
              {activePage === 'jobs' && 'Job Queue'}
              {activePage === 'ci' && 'Competitive Intelligence'}
              {activePage === 'data-explorer' && 'Data Explorer'}
              {activePage === 'admin' && 'System Administration'}
            </h1>
            <p className="page-subtitle">Unified Financial Analytics Hub • Mars, Incorporated</p>
          </div>
        </header>

        <main className="content-body">
          {/* Dashboard Page */}
          {activePage === 'dashboard' && (
            <div className="page-dashboard">
              <div className="welcome-banner">
                <h2>Welcome to FinIQ</h2>
                <p>Your unified financial analytics hub consolidating performance reporting, budget variance analysis, and competitive intelligence.</p>
              </div>

              {stats && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.orgUnits}</div>
                      <div className="stat-label">Organizational Units</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.accounts}</div>
                      <div className="stat-label">Financial Accounts</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                      <div className="stat-value">{(stats.financialRecords / 1000).toFixed(1)}K</div>
                      <div className="stat-label">Financial Records</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                      <div className="stat-value">{stats.dataMode === 'simulated' ? 'Demo' : 'Live'}</div>
                      <div className="stat-label">Data Mode</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="dashboard-section">
                <h3>Try Example Queries</h3>
                <div className="example-grid">
                  <button
                    className="example-card"
                    onClick={() => handleExampleQuery('How did Mars Inc perform in P06?')}
                  >
                    <div className="example-icon">📈</div>
                    <div className="example-text">How did Mars Inc perform in P06?</div>
                  </button>
                  <button
                    className="example-card"
                    onClick={() => handleExampleQuery('Show me budget variance for Petcare')}
                  >
                    <div className="example-icon">💵</div>
                    <div className="example-text">Show me budget variance for Petcare</div>
                  </button>
                  <button
                    className="example-card"
                    onClick={() => handleExampleQuery('What is the NCFO for Snacking in P12?')}
                  >
                    <div className="example-icon">🍫</div>
                    <div className="example-text">What is the NCFO for Snacking in P12?</div>
                  </button>
                  <button
                    className="example-card"
                    onClick={() => handleExampleQuery('Compare Mars product performance')}
                  >
                    <div className="example-icon">🔬</div>
                    <div className="example-text">Compare Mars product performance</div>
                  </button>
                </div>
              </div>

              <div className="dashboard-section">
                <h3>Recent Activity</h3>
                <div className="activity-summary">
                  <div className="activity-item">
                    <span className="activity-icon">💬</span>
                    <span>{messages.length - 1} queries processed</span>
                  </div>
                  <div className="activity-item">
                    <span className="activity-icon">📋</span>
                    <span>{jobs.length} jobs in queue</span>
                  </div>
                  <div className="activity-item">
                    <span className="activity-icon">🔍</span>
                    <span>{competitors.length} competitor documents</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Page */}
          {activePage === 'chat' && (
            <div className="page-chat">
              <div className="messages">
                {messages.map((message) => (
                  <div key={message.id} className={`message message-${message.type}`}>
                    <div className="message-header">
                      <span className="message-role">
                        {message.type === 'user' ? 'You' : 'FinIQ Agent'}
                      </span>
                      <span className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="message-content">
                      <p>{message.content}</p>

                      {message.data && (
                        <div className="message-data">
                          {message.data.llmUsed && (
                            <div className="llm-indicator">
                              <span className="llm-badge">✨ Powered by Claude</span>
                            </div>
                          )}

                          <div className="kpis">
                            {message.data.kpis?.map((kpi: any, idx: number) => (
                              <div key={idx} className={`kpi ${kpi.trend ? `kpi-${kpi.trend}` : ''}`}>
                                <div className="kpi-label">{kpi.label}</div>
                                <div className="kpi-value">
                                  {kpi.trend && (
                                    <span className="trend-arrow">
                                      {kpi.trend === 'up' ? '↑' : '↓'}
                                    </span>
                                  )}
                                  {kpi.format === 'currency'
                                    ? `$${(kpi.value / 1000000).toFixed(2)}M`
                                    : `${kpi.value.toFixed(2)}%`}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="metadata">
                            <span>Intent: {message.data.intent}</span>
                            <span>Entity: {message.data.entity}</span>
                            {message.data.period && <span>Period: {message.data.period}</span>}
                            <span>Rows: {message.data.rowCount}</span>
                          </div>

                          {message.data.data && message.data.data.length > 0 && (
                            <DataTable data={message.data.data} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && <LoadingSpinner />}
              </div>

              <form className="input-form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  className="input"
                  placeholder="Ask about financial performance, budget variance, or competitive intelligence..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={`voice-button ${isListening ? 'listening' : ''}`}
                  onClick={handleVoiceInput}
                  disabled={isLoading}
                  title="Voice input"
                >
                  🎤
                </button>
                <button type="submit" className="submit-button" disabled={isLoading || !input.trim()}>
                  Send
                </button>
              </form>
            </div>
          )}

          {/* Jobs Page */}
          {activePage === 'jobs' && (
            <div className="page-jobs">
              <div className="page-header-actions">
                <button onClick={loadJobs} disabled={isLoadingJobs} className="refresh-button">
                  {isLoadingJobs ? '⏳' : '🔄'} Refresh
                </button>
              </div>

              <form className="job-submit-form" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const queryInput = form.elements.namedItem('jobQuery') as HTMLInputElement;
                const prioritySelect = form.elements.namedItem('jobPriority') as HTMLSelectElement;
                const query = queryInput.value.trim();
                if (!query) return;
                try {
                  const response = await fetch(`${API_URL}/jobs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, priority: prioritySelect.value }),
                  });
                  const result = await response.json();
                  if (result.success) {
                    queryInput.value = '';
                    loadJobs();
                  }
                } catch (error) {
                  console.error('Error submitting job:', error);
                }
              }}>
                <input type="text" name="jobQuery" placeholder="Enter a financial query..." className="job-query-input" />
                <select name="jobPriority" className="job-priority-select">
                  <option value="high">🔴 High</option>
                  <option value="normal">🟡 Normal</option>
                  <option value="low">🟢 Low</option>
                </select>
                <button type="submit" className="job-submit-button">Submit Job</button>
              </form>

              {jobs.length === 0 ? (
                <div className="empty-state">
                  <p>No jobs yet. Submit a query above to get started.</p>
                </div>
              ) : (
                <div className="jobs-list">
                  {jobs.map((job) => (
                    <div key={job.id} className={`job-card job-${job.status}`}>
                      <div className="job-header">
                        <span className={`job-status status-${job.status}`}>
                          {job.status === 'submitted' && '⏳'}
                          {job.status === 'processing' && '🔄'}
                          {job.status === 'completed' && '✅'}
                          {job.status === 'failed' && '❌'}
                          {' '}
                          {job.status.toUpperCase()}
                        </span>
                        <span className="job-priority">
                          {job.priority === 'high' && '🔴'}
                          {job.priority === 'normal' && '🟡'}
                          {job.priority === 'low' && '🟢'}
                          {' '}
                          {job.priority}
                        </span>
                      </div>

                      <div className="job-query">{job.query}</div>

                      <div className="job-meta">
                        <span>Submitted: {new Date(job.submittedAt).toLocaleString()}</span>
                        <span>Elapsed: {(job.elapsedMs / 1000).toFixed(1)}s</span>
                        {job.completedAt && (
                          <span>Completed: {new Date(job.completedAt).toLocaleString()}</span>
                        )}
                      </div>

                      {job.status === 'completed' && (
                        <div className="job-actions">
                          <button
                            className="export-button"
                            onClick={() => exportJob(job.id)}
                          >
                            📥 Export CSV
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CI Page */}
          {activePage === 'ci' && (
            <div className="page-ci">
              <div className="page-header-actions">
                <button onClick={loadCompetitors} disabled={isLoadingCompetitors} className="refresh-button">
                  {isLoadingCompetitors ? '⏳' : '🔄'} Refresh
                </button>
                <button onClick={loadSampleCompetitorData} className="sample-data-button">
                  📥 Load Sample Data
                </button>
              </div>

              <div className="upload-zone">
                <div className="upload-zone-content">
                  <div className="upload-icon">📄</div>
                  <p className="upload-text">Drag and drop competitor PDFs here or click to browse</p>
                  <p className="upload-subtext">Supports earnings reports, press releases, and financial presentations</p>
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    style={{ display: 'none' }}
                    id="pdf-upload"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;

                      for (const file of Array.from(files)) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const base64 = event.target?.result as string;
                          try {
                            const response = await fetch(`${API_URL}/ci/upload`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                filename: file.name,
                                content: base64.split(',')[1],
                                company: 'Unknown',
                                quarter: 'Q1',
                                year: '2024'
                              }),
                            });
                            const result = await response.json();
                            if (result.success) {
                              alert(`✅ ${file.name} uploaded successfully`);
                              loadCompetitors();
                            }
                          } catch (error) {
                            console.error('Upload error:', error);
                            alert(`❌ Failed to upload ${file.name}`);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    className="upload-button"
                    onClick={() => document.getElementById('pdf-upload')?.click()}
                  >
                    Select Files
                  </button>
                </div>
              </div>

              {competitors.length === 0 ? (
                <div className="empty-state">
                  <p>No competitor documents ingested yet.</p>
                  <p className="empty-state-hint">Click "Load Sample Data" to see example Nestle Q2 2024 analysis, or upload PDFs above.</p>
                </div>
              ) : (
                <div className="competitors-grid">
                  {competitors.map((comp) => (
                    <div key={comp.id} className="competitor-card-full">
                      <div className="competitor-header">
                        <h3>{comp.company}</h3>
                        <span className="competitor-period">{comp.quarter} {comp.year}</span>
                      </div>
                      <div className="competitor-meta">
                        <span>📄 {comp.pageCount} pages</span>
                        <span>📊 {comp.summaryCount} summaries</span>
                        <span>📅 {new Date(comp.uploadedAt).toLocaleDateString()}</span>
                      </div>

                      {comp.summaries && (
                        <div className="themed-summaries">
                          <h4>Themed Summaries</h4>
                          {comp.summaries.map((summary, idx) => (
                            <details key={idx} className="summary-card">
                              <summary className="summary-theme">{summary.theme}</summary>
                              <p className="summary-content">{summary.content}</p>
                            </details>
                          ))}
                        </div>
                      )}

                      {comp.p2pData && (
                        <div className="p2p-section">
                          <h4>P2P Benchmarking</h4>
                          <div className="p2p-table">
                            <table>
                              <thead>
                                <tr>
                                  <th>Metric</th>
                                  <th>Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {comp.p2pData.metrics.map((metric, idx) => (
                                  <tr key={idx}>
                                    <td>{metric.metric}</td>
                                    <td className={metric.value >= 0 ? 'cell-positive' : 'cell-negative'}>
                                      {metric.value.toFixed(1)}{metric.unit}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Data Explorer Page */}
          {activePage === 'data-explorer' && (
            <div className="page-data-explorer">
              <div className="explorer-controls">
                <label htmlFor="table-select">Select Table/View:</label>
                <select
                  id="table-select"
                  className="table-select"
                  value={selectedTable || ''}
                  onChange={(e) => {
                    const tableName = e.target.value;
                    if (tableName) {
                      loadTablePreview(tableName);
                    } else {
                      setSelectedTable(null);
                      setTablePreview([]);
                    }
                  }}
                >
                  <option value="">-- Select a table --</option>
                  {tableSchemas.map((schema) => (
                    <option key={schema.name} value={schema.name}>
                      {schema.name} ({schema.type})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTable && (
                <div className="table-info">
                  <h3>{selectedTable}</h3>
                  <p>
                    {tableSchemas.find(s => s.name === selectedTable)?.description}
                  </p>
                </div>
              )}

              {isLoadingPreview && (
                <div className="loading-state">
                  <LoadingSpinner />
                </div>
              )}

              {!isLoadingPreview && tablePreview.length > 0 && (
                <div className="table-preview">
                  <h4>Preview (first 20 rows)</h4>
                  <DataTable data={tablePreview} />
                </div>
              )}

              <div className="schema-dictionary">
                <h3>Data Dictionary</h3>
                <p>All 20 tables and views in the finiq_ schema:</p>
                <div className="dictionary-grid">
                  {tableSchemas.map((schema) => (
                    <div key={schema.name} className="dictionary-item">
                      <div className="dictionary-name">
                        {schema.name}
                        <span className={`type-badge type-${schema.type}`}>{schema.type}</span>
                      </div>
                      <div className="dictionary-description">{schema.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Admin Page */}
          {activePage === 'admin' && (
            <div className="page-admin">
              <div className="page-header-actions">
                <button onClick={loadAdminStatus} disabled={isLoadingAdmin} className="refresh-button">
                  {isLoadingAdmin ? '⏳' : '🔄'} Refresh
                </button>
              </div>

              {!adminStatus ? (
                <div className="loading-state">Loading...</div>
              ) : (
                <>
                  <div className="admin-section">
                    <h3>Connection Status</h3>
                    <div className="status-grid">
                      <div className={`status-card status-${adminStatus.connections.database.status}`}>
                        <h4>Database</h4>
                        <p className="status-badge">{adminStatus.connections.database.status.toUpperCase()}</p>
                        <p>{adminStatus.connections.database.message}</p>
                        {adminStatus.connections.database.recordCount && (
                          <p className="status-detail">{adminStatus.connections.database.recordCount.toLocaleString()} records</p>
                        )}
                      </div>
                      <div className={`status-card status-${adminStatus.connections.anthropic.status}`}>
                        <h4>LLM (Anthropic)</h4>
                        <p className="status-badge">{adminStatus.connections.anthropic.status.replace('_', ' ').toUpperCase()}</p>
                        <p>{adminStatus.connections.anthropic.message}</p>
                      </div>
                    </div>
                  </div>

                  <div className="admin-section">
                    <h3>Configuration</h3>
                    <div className="config-grid">
                      <div className="config-item">
                        <label>Data Mode:</label>
                        <span className="config-value">{adminStatus.dataMode}</span>
                      </div>
                    </div>
                    <p className="config-note">Note: Changing data mode requires server restart</p>
                  </div>

                  <div className="admin-section">
                    <h3>Quick Actions</h3>
                    <div className="admin-actions">
                      <button
                        className="admin-button"
                        onClick={async () => {
                          const res = await fetch(`${API_URL}/admin/org-hierarchy`);
                          const data = await res.json();
                          alert(`${data.hierarchy.total} org units found`);
                        }}
                      >
                        📂 View Org Hierarchy
                      </button>
                      <button
                        className="admin-button"
                        onClick={async () => {
                          const res = await fetch(`${API_URL}/admin/accounts`);
                          const data = await res.json();
                          alert(`${data.count} accounts found`);
                        }}
                      >
                        📋 View Accounts
                      </button>
                      <button
                        className="admin-button"
                        onClick={async () => {
                          const res = await fetch(`${API_URL}/admin/test-connection`, { method: 'POST' });
                          const data = await res.json();
                          alert(data.message || data.error);
                        }}
                      >
                        🔌 Test Connection
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        <footer className="content-footer">
          <p>FinIQ v0.2.0 — Amira Technologies (QDT) for Mars, Incorporated</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
