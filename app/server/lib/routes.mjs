/**
 * FinIQ API Routes
 */

import { Router } from "express";
import config from "./config.mjs";

const router = Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: config.dataMode,
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Placeholder routes — will be implemented in subsequent batches

// Chat / NL Query (Batch 3)
router.post("/chat", (req, res) => {
  res.json({
    response: "NL Query engine will be available after Batch 3.",
    data: null,
    chartConfig: null,
    sources: [],
  });
});

// Entities (Batch 2)
router.get("/entities", (req, res) => {
  res.json({ entities: [] });
});

// Accounts (Batch 2)
router.get("/accounts", (req, res) => {
  res.json({ accounts: [] });
});

// PES Reports (Batch 3)
router.get("/reports/pes/:entity", (req, res) => {
  res.json({ message: "PES generation coming in Batch 3" });
});

// Budget Variance (Batch 3)
router.get("/reports/variance/:entity", (req, res) => {
  res.json({ message: "Budget variance coming in Batch 3" });
});

// Jobs (Batch 5)
router.get("/jobs", (req, res) => {
  res.json({ jobs: [] });
});

router.post("/jobs", (req, res) => {
  res.json({ message: "Job board coming in Batch 5" });
});

// CI (Batch 7)
router.get("/ci/competitors", (req, res) => {
  res.json({
    competitors: [
      { name: "Nestle", ticker: "NSRGY", segment_overlap: "Confectionery, Pet Care, Food" },
      { name: "Mondelez", ticker: "MDLZ", segment_overlap: "Confectionery, Snacking" },
      { name: "Hershey", ticker: "HSY", segment_overlap: "Confectionery" },
      { name: "Ferrero", ticker: "N/A", segment_overlap: "Confectionery" },
      { name: "Colgate-Palmolive", ticker: "CL", segment_overlap: "Pet Care (Hill's)" },
      { name: "General Mills", ticker: "GIS", segment_overlap: "Pet Care (Blue Buffalo), Food" },
      { name: "Kellanova", ticker: "K", segment_overlap: "Snacking" },
      { name: "J.M. Smucker", ticker: "SJM", segment_overlap: "Pet Care (Meow Mix, Milk-Bone)" },
      { name: "Freshpet", ticker: "FRPT", segment_overlap: "Pet Care (fresh/refrigerated)" },
      { name: "IDEXX", ticker: "IDXX", segment_overlap: "Veterinary diagnostics" },
    ],
  });
});

// Suggested prompts (Batch 3)
router.get("/prompts/suggested", (req, res) => {
  res.json({ prompts: [] });
});

// Admin (Batch 6)
router.get("/admin/config", (req, res) => {
  res.json({
    dataMode: config.dataMode,
    databricksConnected: false,
    sqlitePath: config.sqlitePath,
  });
});

export default router;
