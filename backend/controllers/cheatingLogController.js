import asyncHandler from "express-async-handler";
import CheatingLog from "../models/cheatingLogModel.js";

// Get cheating logs by exam ID
const getCheatingLogsByExamId = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const logs = await CheatingLog.find({ examId }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: logs.length, data: logs });
});

// Save cheating log (aggregate by examId+email)
const saveCheatingLog = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const { examId, email, username } = payload;
  if (!examId || !email || !username) {
    return res.status(400).json({ success: false, message: "examId, email, username are required" });
  }

  // Prepare $inc for provided counts only
  const countFields = [
    'noFaceCount','multipleFaceCount','cellPhoneCount','prohibitedObjectCount',
    'tabSwitchCount','copyPasteCount','rightClickCount','printScreenCount',
    'devToolsCount','fullScreenExitCount','windowBlurCount','applicationSwitchCount',
    'voiceDetectedCount','attentionDriftCount'
  ];
  const inc = {};
  for (const f of countFields) {
    if (typeof payload[f] === 'number') {
      inc[f] = payload[f];
    } else if (payload[f] === undefined && f in payload) {
      // if provided but not a number, ignore
    }
  }

  // Normalize screenshots input
  let screenshots = [];
  if (Array.isArray(payload.screenshots)) {
    screenshots = payload.screenshots.filter(s => s && s.url && s.type);
  } else if (payload.screenshots && payload.screenshots.url && payload.screenshots.type) {
    screenshots = [payload.screenshots];
  }

  const update = {
    $setOnInsert: { examId, email, username },
  };
  if (Object.keys(inc).length) update.$inc = inc;
  if (screenshots.length) update.$push = { screenshots: { $each: screenshots } };

  const saved = await CheatingLog.findOneAndUpdate(
    { examId, email },
    update,
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, data: saved });
});

// Detailed logs plus simple analytics
const getDetailedCheatingLogs = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const logs = await CheatingLog.find({ examId }).sort({ createdAt: -1 });

  const totals = logs.map((l) => (
    (l.noFaceCount||0)+(l.multipleFaceCount||0)+(l.cellPhoneCount||0)+(l.prohibitedObjectCount||0)+
    (l.tabSwitchCount||0)+(l.copyPasteCount||0)+(l.rightClickCount||0)+(l.printScreenCount||0)+
    (l.devToolsCount||0)+(l.fullScreenExitCount||0)+(l.windowBlurCount||0)+(l.applicationSwitchCount||0)+
    (l.voiceDetectedCount||0)+(l.attentionDriftCount||0)
  ));

  const totalViolations = totals.reduce((a,b)=>a+b,0);

  res.status(200).json({ success: true, data: { logs, analytics: { totalLogs: logs.length, totalViolations } } });
});

export { getCheatingLogsByExamId, saveCheatingLog, getDetailedCheatingLogs };
