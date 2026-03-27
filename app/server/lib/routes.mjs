/**
 * FinIQ HTTP API Routes
 * REST endpoints for query submission, data retrieval, health checks
 */

import * as db from './databricks.mjs';
import { processQuery as agentProcessQuery } from '../agents/finiq-agent.mjs';
import * as ciAgent from '../agents/ci-agent.mjs';
import * as ciPipeline from './ci-pipeline.mjs';
import * as admin from './admin.mjs';
import * as jobBoard from './job-board.mjs';

/**
 * Setup all HTTP routes
 * @param {Express} app - Express application
 * @param {Object} ctx - Shared context object
 */
export function setupRoutes(app, ctx) {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      mode: ctx.config.DATA_MODE,
      timestamp: new Date().toISOString() 
    });
  });
  
  // Get system stats for landing page
  app.get('/api/stats', async (req, res) => {
    try {
      const [orgUnits, accounts, financialData] = await Promise.all([
        db.query('SELECT COUNT(*) as count FROM finiq_dim_entity'),
        db.query('SELECT COUNT(*) as count FROM finiq_dim_account'),
        db.query('SELECT COUNT(*) as count FROM finiq_financial')
      ]);

      res.json({
        success: true,
        stats: {
          orgUnits: orgUnits[0].count,
          accounts: accounts[0].count,
          financialRecords: financialData[0].count,
          dataMode: ctx.config.DATA_MODE
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get all org units
  app.get('/api/org-units', async (req, res) => {
    try {
      const orgUnits = await db.getOrgUnits();
      res.json({ success: true, data: orgUnits, count: orgUnits.length });
    } catch (error) {
      console.error('Error fetching org units:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Submit natural language query
  app.post('/api/query', async (req, res) => {
    try {
      const { query: userQuery } = req.body;

      if (!userQuery) {
        return res.status(400).json({ success: false, error: 'Query is required' });
      }

      console.log(`📝 Query received: "${userQuery}"`);

      // Use FinIQ agent for processing
      const result = await agentProcessQuery(userQuery, ctx);

      res.json(result);
    } catch (error) {
      console.error('Error processing query:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get P&L data for an entity
  app.get('/api/pl/:entity', async (req, res) => {
    try {
      const { entity } = req.params;
      const { dateId } = req.query;

      const data = await db.getPLData(entity, dateId ? parseInt(dateId) : null);
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      console.error('Error fetching P&L data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get NCFO data for an entity
  app.get('/api/ncfo/:entity', async (req, res) => {
    try {
      const { entity } = req.params;
      const { dateId } = req.query;

      const data = await db.getNCFOData(entity, dateId ? parseInt(dateId) : null);
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      console.error('Error fetching NCFO data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get budget variance data
  app.get('/api/variance/:entity', async (req, res) => {
    try {
      const { entity } = req.params;
      const { dateId } = req.query;

      const data = await db.getBudgetVariance(entity, dateId ? parseInt(dateId) : null);
      res.json({ success: true, data, count: data.length });
    } catch (error) {
      console.error('Error fetching variance data:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============= JOB BOARD ROUTES (FR5) =============

  // Submit a job
  app.post('/api/jobs', (req, res) => {
    try {
      const { query, userId, priority } = req.body;

      if (!query) {
        return res.status(400).json({ success: false, error: 'Query is required' });
      }

      const result = jobBoard.submitJob(query, userId, priority);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error submitting job:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get job status/result
  app.get('/api/jobs/:jobId', (req, res) => {
    try {
      const { jobId } = req.params;
      const job = jobBoard.getJob(jobId);

      if (job.error) {
        return res.status(404).json({ success: false, error: job.error });
      }

      res.json({ success: true, job });
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // List all jobs (with optional filters)
  app.get('/api/jobs', (req, res) => {
    try {
      const { userId, status } = req.query;
      const jobs = jobBoard.listJobs({ userId, status });

      res.json({ success: true, jobs, count: jobs.length });
    } catch (error) {
      console.error('Error listing jobs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get queue stats
  app.get('/api/jobs/stats/queue', (req, res) => {
    try {
      const stats = jobBoard.getQueueStats();
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Cancel a job
  app.delete('/api/jobs/:jobId', (req, res) => {
    try {
      const { jobId } = req.params;
      const result = jobBoard.cancelJob(jobId);

      if (result.error) {
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error cancelling job:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============= COMPETITIVE INTELLIGENCE ROUTES (FR3) =============

  // Compare with competitor
  app.post('/api/ci/compare', async (req, res) => {
    try {
      const { competitor, metric, period } = req.body;

      if (!competitor) {
        return res.status(400).json({ success: false, error: 'Competitor name is required' });
      }

      console.log(`🔍 CI: Comparing with ${competitor}`);

      const result = await ciAgent.compareWithCompetitor(competitor, metric, period);
      res.json(result);
    } catch (error) {
      console.error('Error in CI comparison:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Search competitor info
  app.post('/api/ci/search', async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({ success: false, error: 'Search query is required' });
      }

      const result = await ciAgent.searchCompetitorInfo(query);
      res.json(result);
    } catch (error) {
      console.error('Error in CI search:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Upload competitor document (FR3.1)
  app.post('/api/ci/upload', async (req, res) => {
    try {
      // In a real implementation, this would use multer for file uploads
      // For MVP, we'll accept base64 encoded PDF in JSON
      const { fileData, company, quarter, year, docType } = req.body;

      if (!fileData || !company || !quarter || !year) {
        return res.status(400).json({
          success: false,
          error: 'File data, company, quarter, and year are required'
        });
      }

      console.log(`📄 CI: Uploading document for ${company} ${quarter} ${year}`);

      // Decode base64 to buffer
      const fileBuffer = Buffer.from(fileData, 'base64');

      const result = await ciPipeline.ingestDocument(fileBuffer, {
        company,
        quarter,
        year,
        docType: docType || 'earnings',
      });

      res.json(result);
    } catch (error) {
      console.error('Error uploading CI document:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get all competitors (FR3)
  app.get('/api/ci/competitors', (req, res) => {
    try {
      const competitors = ciPipeline.listCompetitors();
      res.json({
        success: true,
        competitors,
        count: competitors.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error listing competitors:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get competitor summaries (FR3.2)
  app.get('/api/ci/summaries/:docId', (req, res) => {
    try {
      const { docId } = req.params;
      const result = ciPipeline.getSummaries(docId);
      res.json(result);
    } catch (error) {
      console.error('Error fetching summaries:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get P2P benchmark (FR3.3)
  app.get('/api/ci/p2p/:docId', (req, res) => {
    try {
      const { docId } = req.params;
      const result = ciPipeline.generateP2PBenchmark(docId);
      res.json(result);
    } catch (error) {
      console.error('Error generating P2P:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Delete competitor document
  app.delete('/api/ci/competitors/:docId', async (req, res) => {
    try {
      const { docId } = req.params;
      const result = await ciPipeline.deleteCompetitor(docId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting competitor:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============= BUDGET VARIANCE ROUTES (FR2.7) =============

  // Get budget variance report
  app.post('/api/variance', async (req, res) => {
    try {
      const { entity, period, account } = req.body;

      if (!entity) {
        return res.status(400).json({ success: false, error: 'Entity is required' });
      }

      console.log(`📊 Variance: ${entity} ${period || 'all periods'} ${account || 'all accounts'}`);

      // Get variance data
      const data = await db.getBudgetVariance(entity, period);

      if (!data || data.length === 0) {
        return res.json({
          success: true,
          entity,
          period,
          account,
          message: 'No variance data found',
          data: [],
          summary: null,
        });
      }

      // Filter by account if specified
      let filteredData = data;
      if (account) {
        filteredData = data.filter(row =>
          row.Account_Desc && row.Account_Desc.toLowerCase().includes(account.toLowerCase())
        );
      }

      // Calculate summary metrics
      const summary = calculateVarianceSummary(filteredData);

      res.json({
        success: true,
        entity,
        period,
        account,
        summary,
        data: filteredData.slice(0, 100), // Limit to 100 rows
        rowCount: filteredData.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching variance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============= ADMIN ROUTES (FR7) =============

  // Get system configuration
  app.get('/api/admin/config', (req, res) => {
    try {
      const result = admin.getConfig();
      res.json(result);
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Update data mode
  app.put('/api/admin/config', (req, res) => {
    try {
      const { dataMode } = req.body;

      if (!dataMode) {
        return res.status(400).json({ success: false, error: 'Data mode is required' });
      }

      const result = admin.updateDataMode(dataMode);
      res.json(result);
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get connection status
  app.get('/api/admin/status', async (req, res) => {
    try {
      const result = await admin.getConnectionStatus();
      res.json(result);
    } catch (error) {
      console.error('Error fetching connection status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get org hierarchy
  app.get('/api/admin/org-hierarchy', async (req, res) => {
    try {
      const result = await admin.getOrgHierarchy();
      res.json(result);
    } catch (error) {
      console.error('Error fetching org hierarchy:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get accounts
  app.get('/api/admin/accounts', async (req, res) => {
    try {
      const result = await admin.getAccounts();
      res.json(result);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get system stats
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const result = await admin.getSystemStats();
      res.json(result);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Test database connection
  app.post('/api/admin/test-connection', async (req, res) => {
    try {
      const result = await admin.testDatabaseConnection();
      res.json(result);
    } catch (error) {
      console.error('Error testing connection:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ============= EXPORT ROUTES (FR2.6) =============

  // Export job result as CSV
  app.get('/api/export/:jobId', (req, res) => {
    try {
      const { jobId } = req.params;
      const { format = 'csv' } = req.query;

      const job = jobBoard.getJob(jobId);

      if (job.error) {
        return res.status(404).json({ success: false, error: job.error });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: `Job is ${job.status}, cannot export`
        });
      }

      if (!job.result || !job.result.data || job.result.data.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No data to export'
        });
      }

      // Generate CSV
      if (format === 'csv') {
        const csv = generateCSV(job.result.data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${jobId}.csv"`);
        res.send(csv);
      } else {
        res.status(400).json({
          success: false,
          error: 'Unsupported format (only csv supported in MVP)'
        });
      }
    } catch (error) {
      console.error('Error exporting job:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('✅ HTTP routes configured (with job board & export)');
}

/**
 * Calculate variance summary metrics
 * FR2.7: Budget variance analysis
 */
function calculateVarianceSummary(data) {
  if (!data || data.length === 0) {
    return null;
  }

  let totalActual = 0;
  let totalReplan = 0;
  let significantVariances = [];

  for (const row of data) {
    const actual = parseFloat(row.Actual_USD_Value) || 0;
    const replan = parseFloat(row.Replan_USD_Value) || 0;
    const variance = actual - replan;
    const variancePct = replan !== 0 ? (variance / Math.abs(replan)) * 100 : 0;

    totalActual += actual;
    totalReplan += replan;

    // Flag significant variances (>5%)
    if (Math.abs(variancePct) > 5) {
      significantVariances.push({
        account: row.Account_Desc || 'Unknown',
        period: row.Period,
        actual,
        replan,
        variance,
        variancePct: variancePct.toFixed(2) + '%',
        favorable: variance > 0,
      });
    }
  }

  const totalVariance = totalActual - totalReplan;
  const totalVariancePct = totalReplan !== 0 ? (totalVariance / Math.abs(totalReplan)) * 100 : 0;

  // Sort significant variances by absolute percentage
  significantVariances.sort((a, b) =>
    Math.abs(parseFloat(b.variancePct)) - Math.abs(parseFloat(a.variancePct))
  );

  return {
    totalActual,
    totalReplan,
    totalVariance,
    totalVariancePct: totalVariancePct.toFixed(2) + '%',
    favorable: totalVariance > 0,
    significantVariances: significantVariances.slice(0, 10), // Top 10
    significantCount: significantVariances.length,
  };
}

/**
 * Convert data array to CSV string
 */
function generateCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);

  // Build CSV
  const rows = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ];

  return rows.join('\n');
}

export default { setupRoutes };
