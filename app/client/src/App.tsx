/**
 * FinIQ App — Main React Application
 * Chat-based interface for natural language financial queries
 * FR4: NL Query Interface | FR5: Job Board | Voice Input
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

type Tab = 'chat' | 'jobs' | 'ci' | 'admin';

// LoadingSpinner Component
function LoadingSpinner() {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Processing your query...</p>
    </div>
  );
}

// ConnectionStatus Component
function ConnectionStatus({ dataMode, dbStatus, llmStatus }: any) {
  return (
    <div className="connection-status">
      <div className={`status-indicator ${dbStatus === 'connected' ? 'status-online' : 'status-offline'}`}>
        <span className="status-dot"></span>
        Database: {dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
      </div>
      <div className={`status-indicator ${llmStatus === 'ok' ? 'status-online' : 'status-warning'}`}>
        <span className="status-dot"></span>
        LLM: {llmStatus === 'ok' ? 'Active' : 'Fallback Mode'}
      </div>
      <div className="status-indicator status-info">
        <span className="status-dot"></span>
        Mode: {dataMode === 'simulated' ? 'Demo Data' : 'Live Data'}
      </div>
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
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Welcome to FinIQ — Unified Financial Analytics Hub for Mars, Incorporated. Ask me anything about your financial performance, budget variance, or competitive intelligence.',
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

  // Stats state for landing page
  const [stats, setStats] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(true);

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

  // Load data on tab switch
  useEffect(() => {
    if (activeTab === 'jobs') {
      loadJobs();
    } else if (activeTab === 'ci') {
      loadCompetitors();
    } else if (activeTab === 'admin') {
      loadAdminStatus();
    }
  }, [activeTab]);

  // Auto-refresh jobs every 2 seconds when on jobs tab
  useEffect(() => {
    if (activeTab === 'jobs') {
      const interval = setInterval(loadJobs, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    setShowWelcome(false); // Hide welcome screen on first query

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

  // Unused for now, but available for future direct job submission
  // const submitJob = async (query: string, priority: 'high' | 'normal' | 'low' = 'normal') => {
  //   try {
  //     const response = await fetch(`${API_URL}/jobs`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ query, priority }),
  //     });
  //
  //     const result = await response.json();
  //     if (result.success) {
  //       await loadJobs();
  //       return result.jobId;
  //     }
  //   } catch (error) {
  //     console.error('Error submitting job:', error);
  //   }
  // };

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

  const handleExampleQuery = (exampleQuery: string) => {
    setInput(exampleQuery);
    setShowWelcome(false);
  };

  // Load stats and admin status on mount
  useEffect(() => {
    loadStats();
    loadAdminStatus();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="header-brand">
            <h1>
              <span className="logo-icon">📊</span>
              FinIQ
            </h1>
            <p>Unified Financial Analytics Hub • Mars, Incorporated</p>
          </div>
          {adminStatus && (
            <ConnectionStatus
              dataMode={adminStatus.dataMode}
              dbStatus={adminStatus.connections.database.status}
              llmStatus={adminStatus.connections.anthropic.status}
            />
          )}
        </div>

        {/* Tab Navigation */}
        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          <button
            className={`tab ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            📋 Jobs
          </button>
          <button
            className={`tab ${activeTab === 'ci' ? 'active' : ''}`}
            onClick={() => setActiveTab('ci')}
          >
            🔍 CI
          </button>
          <button
            className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            ⚙️ Admin
          </button>
        </nav>
      </header>

      <main className="main">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <>
        {showWelcome && messages.length === 1 && (
          <div className="welcome-screen">
            <div className="welcome-header">
              <h2>Welcome to FinIQ</h2>
              <p>Unified Financial Analytics Hub for Mars, Incorporated</p>
            </div>

            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{stats.orgUnits}</div>
                  <div className="stat-label">Organizational Units</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.accounts}</div>
                  <div className="stat-label">Financial Accounts</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{(stats.financialRecords / 1000).toFixed(1)}K</div>
                  <div className="stat-label">Financial Records</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.dataMode === 'simulated' ? 'Demo' : 'Live'}</div>
                  <div className="stat-label">Data Mode</div>
                </div>
              </div>
            )}

            <div className="example-queries">
              <h3>Try these example queries:</h3>
              <div className="example-buttons">
                <button
                  className="example-button"
                  onClick={() => handleExampleQuery('How did Mars Inc perform in P06?')}
                >
                  How did Mars Inc perform in P06?
                </button>
                <button
                  className="example-button"
                  onClick={() => handleExampleQuery('Show me budget variance for Petcare')}
                >
                  Show me budget variance for Petcare
                </button>
                <button
                  className="example-button"
                  onClick={() => handleExampleQuery('What is the NCFO for Snacking in P12?')}
                >
                  What is the NCFO for Snacking in P12?
                </button>
                <button
                  className="example-button"
                  onClick={() => handleExampleQuery('Compare Mars product performance')}
                >
                  Compare Mars product performance
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`messages ${showWelcome && messages.length === 1 ? 'messages-hidden' : ''}`}>
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
                    {/* LLM Indicator */}
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
          </>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="jobs-container">
            <div className="jobs-header">
              <h2>Job Queue</h2>
              <button onClick={loadJobs} disabled={isLoadingJobs} className="refresh-button">
                {isLoadingJobs ? '⏳' : '🔄'} Refresh
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="jobs-empty">
                <p>No jobs yet. Submit a query from the Chat tab to get started.</p>
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

        {/* CI Tab */}
        {activeTab === 'ci' && (
          <div className="ci-container">
            <div className="ci-header">
              <h2>Competitive Intelligence</h2>
              <button onClick={loadCompetitors} disabled={isLoadingCompetitors} className="refresh-button">
                {isLoadingCompetitors ? '⏳' : '🔄'} Refresh
              </button>
            </div>

            {competitors.length === 0 ? (
              <div className="ci-empty">
                <p>No competitor documents ingested yet.</p>
                <p className="ci-note">MVP: Document upload via API. See FR3 for full CI pipeline.</p>
              </div>
            ) : (
              <div className="competitors-list">
                {competitors.map((comp) => (
                  <div key={comp.id} className="competitor-card">
                    <div className="competitor-header">
                      <h3>{comp.company}</h3>
                      <span className="competitor-period">{comp.quarter} {comp.year}</span>
                    </div>
                    <div className="competitor-meta">
                      <span>📄 {comp.pageCount} pages</span>
                      <span>📊 {comp.summaryCount} summaries</span>
                      <span>📅 {new Date(comp.uploadedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="competitor-actions">
                      <button
                        className="view-summaries-button"
                        onClick={async () => {
                          const res = await fetch(`${API_URL}/ci/summaries/${comp.id}`);
                          const data = await res.json();
                          alert(JSON.stringify(data, null, 2));
                        }}
                      >
                        📝 View Summaries
                      </button>
                      <button
                        className="view-p2p-button"
                        onClick={async () => {
                          const res = await fetch(`${API_URL}/ci/p2p/${comp.id}`);
                          const data = await res.json();
                          alert(JSON.stringify(data, null, 2));
                        }}
                      >
                        📈 P2P Benchmark
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && (
          <div className="admin-container">
            <div className="admin-header">
              <h2>System Administration</h2>
              <button onClick={loadAdminStatus} disabled={isLoadingAdmin} className="refresh-button">
                {isLoadingAdmin ? '⏳' : '🔄'} Refresh
              </button>
            </div>

            {!adminStatus ? (
              <div className="admin-loading">Loading...</div>
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
                        <p className="status-detail">{adminStatus.connections.database.recordCount} records</p>
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

      <footer className="footer">
        <p>FinIQ v0.1.0 — Amira Technologies (QDT) for Mars, Incorporated</p>
      </footer>
    </div>
  );
}

export default App;
