import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Button,
} from "@mui/material";
import { useGetExamsQuery } from "src/slices/examApiSlice";
import { useGetCheatingLogsQuery } from "src/slices/cheatingLogApiSlice";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import SecurityIcon from "@mui/icons-material/Security";
import ComputerIcon from "@mui/icons-material/Computer";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ImageIcon from "@mui/icons-material/Image";
import DownloadIcon from "@mui/icons-material/Download";
import html2canvas from "html2canvas";

export default function CheatingTable() {
  const reportRef = React.useRef(null);
  const [filter, setFilter] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [cheatingLogs, setCheatingLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [screenshotDialog, setScreenshotDialog] = useState(false);

  const { data: examsData, isLoading: examsLoading, error: examsError } = useGetExamsQuery();
  const {
    data: cheatingLogsData,
    isLoading: logsLoading,
    error: logsError,
  } = useGetCheatingLogsQuery(selectedExamId, {
    skip: !selectedExamId,
  });

  useEffect(() => {
    if (examsData && examsData.length > 0) {
      const firstExam = examsData[0];
      setSelectedExamId(firstExam.examId);
    }
  }, [examsData]);

  useEffect(() => {
    if (cheatingLogsData) {
      // detailed endpoint shape: { success, data: { logs, analytics } }
      const logsArray = Array.isArray(cheatingLogsData)
        ? cheatingLogsData
        : cheatingLogsData.data?.logs || [];
      setCheatingLogs(logsArray);
    }
  }, [cheatingLogsData]);

  const filteredUsers = cheatingLogs.filter(
    (log) =>
      log.username?.toLowerCase().includes(filter.toLowerCase()) ||
      log.email?.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedLog(null);
  };

  const handleViewScreenshot = (screenshot) => {
    setSelectedScreenshot(screenshot);
    setScreenshotDialog(true);
  };

  const handleCloseScreenshotDialog = () => {
    setScreenshotDialog(false);
    setSelectedScreenshot(null);
  };

  const loadJsPDF = async () => {
    try {
      const mod = await import("jspdf");
      return mod.jsPDF || mod.default || mod;
    } catch (e) {
      return null;
    }
  };

  const imageToDataURL = async (url) => {
    try {
      if (!url) return null;
      if (url.startsWith('data:')) return url;
      const resp = await fetch(url, { mode: 'cors' });
      const blob = await resp.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  };

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    const element = reportRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const jsPDFClass = await loadJsPDF();
    if (jsPDFClass) {
      const pdf = new jsPDFClass("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let y = 0;
      let remainingHeight = imgHeight;
      let position = 0;
      const pageCanvas = document.createElement('canvas');
      const pageCtx = pageCanvas.getContext('2d');
      const pxPageHeight = Math.floor((pageHeight * canvas.width) / pageWidth);
      while (remainingHeight > 0) {
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(pxPageHeight, canvas.height - position);
        pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(canvas, 0, -position);
        const pageData = pageCanvas.toDataURL('image/png');
        if (y > 0) pdf.addPage();
        pdf.addImage(pageData, 'PNG', 0, 0, imgWidth, (pageCanvas.height * imgWidth) / pageCanvas.width);
        position += pxPageHeight;
        y += pageHeight;
        remainingHeight = imgHeight - y;
      }
      // Append full-size evidence images
      if (selectedLog && Array.isArray(selectedLog.screenshots) && selectedLog.screenshots.length) {
        for (const shot of selectedLog.screenshots) {
          const dataUrl = await imageToDataURL(shot.url);
          if (!dataUrl) continue;
          pdf.addPage();
          // Optional header for each image
          pdf.setFontSize(12);
          const header = `Evidence: ${shot.type}  •  ${new Date(shot.detectedAt).toLocaleString()}${typeof shot.confidence === 'number' ? `  •  Confidence: ${(shot.confidence*100).toFixed(0)}%` : ''}`;
          pdf.text(header, 10, 10);
          const marginTop = 16;
          const imgH = pageHeight - marginTop - 10;
          const imgW = pageWidth - 10;
          pdf.addImage(dataUrl, 'JPEG', 5, marginTop, imgW, imgH, undefined, 'FAST');
        }
      }
      const name = selectedLog ? `Report_${selectedLog.username}_${selectedLog.examId}.pdf` : 'Report.pdf';
      pdf.save(name);
    } else {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<img src="${imgData}" style="width:100%" />`);
        w.document.close();
      }
    }
  };

  const handleDownloadScreenshot = (screenshot) => {
    const link = document.createElement("a");
    link.href = screenshot.url;
    link.download = `violation_${screenshot.type}_${new Date(screenshot.detectedAt).getTime()}.jpg`;
    link.click();
  };

  const getViolationColor = (count) => {
    if (count > 5) return "error";
    if (count > 2) return "warning";
    return "default";
  };

  const getViolationIcon = (count) => {
    if (count > 0) return <WarningIcon />;
    return null;
  };

  const getRiskLevel = (log) => {
    const totalViolations = (log.noFaceCount || 0) + (log.multipleFaceCount || 0) + 
                           (log.cellPhoneCount || 0) + (log.prohibitedObjectCount || 0) +
                           (log.voiceDetectedCount || 0) + (log.attentionDriftCount || 0) +
                           (log.tabSwitchCount || 0) + (log.copyPasteCount || 0) + 
                           (log.rightClickCount || 0) + (log.printScreenCount || 0) +
                           (log.devToolsCount || 0) + (log.fullScreenExitCount || 0) +
                           (log.windowBlurCount || 0) + (log.applicationSwitchCount || 0);
    
    if (totalViolations >= 20) return { level: "Critical", color: "error" };
    if (totalViolations >= 15) return { level: "High", color: "warning" };
    if (totalViolations >= 10) return { level: "Medium", color: "info" };
    if (totalViolations >= 5) return { level: "Low", color: "default" };
    return { level: "Minimal", color: "success" };
  };

  const getScreenshotsByType = (screenshots, type) => {
    return screenshots?.filter(s => s.type === type) || [];
  };

  const EvidenceThumbs = ({ log, type, onView }) => {
    const shots = getScreenshotsByType(log.screenshots, type);
    if (!shots.length) return <Typography variant="body2" color="text.secondary">No evidence available</Typography>;
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {shots.map((s, idx) => (
          <Box key={idx} sx={{ cursor: 'pointer' }} onClick={() => onView(s)}>
            <img crossOrigin="anonymous" src={s.url} alt={`${type}-evidence`} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
          </Box>
        ))}
      </Box>
    );
  };

  if (examsLoading || logsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (logsError) {
    return (
      <Box p={2}>
        <Typography color="error">
          Error loading logs: {logsError.data?.message || logsError.error || "Unknown error"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Select
              label="Select Exam"
              value={selectedExamId || ""}
              onChange={(e) => setSelectedExamId(e.target.value)}
              fullWidth
            >
              {examsData?.map((exam) => (
                <MenuItem key={exam.examId} value={exam.examId}>
                  {exam.examName || "Unnamed Exam"}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Filter by Name or Email"
              variant="outlined"
              fullWidth
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Sno</TableCell>
              <TableCell>Student</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Risk Level</TableCell>
              <TableCell>AI Violations</TableCell>
              <TableCell>Browser Violations</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Screenshots</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No cheating logs found for this exam
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((log, index) => {
                const risk = getRiskLevel(log);
                const aiViolations = (log.noFaceCount || 0) + (log.multipleFaceCount || 0) + 
                                   (log.cellPhoneCount || 0) + (log.prohibitedObjectCount || 0) +
                                   (log.voiceDetectedCount || 0) + (log.attentionDriftCount || 0);
                const browserViolations = (log.tabSwitchCount || 0) + (log.copyPasteCount || 0) + 
                                        (log.rightClickCount || 0) + (log.printScreenCount || 0) +
                                        (log.devToolsCount || 0) + (log.fullScreenExitCount || 0) +
                                        (log.windowBlurCount || 0) + (log.applicationSwitchCount || 0);
                const totalViolations = aiViolations + browserViolations;
                const totalScreenshots = log.screenshots?.length || 0;

                return (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{log.username}</TableCell>
                    <TableCell>{log.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={risk.level}
                        color={risk.color}
                        size="small"
                        icon={<SecurityIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<VisibilityIcon />}
                        label={aiViolations}
                        color={aiViolations > 3 ? "error" : aiViolations > 0 ? "warning" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<ComputerIcon />}
                        label={browserViolations}
                        color={browserViolations > 5 ? "error" : browserViolations > 2 ? "warning" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={totalViolations}
                        color={totalViolations > 10 ? "error" : totalViolations > 5 ? "warning" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<ImageIcon />}
                        label={totalScreenshots}
                        color={totalScreenshots > 0 ? "info" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleViewDetails(log)}
                        color="primary"
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detailed View Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Detailed Violation Report - {selectedLog?.username}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box ref={reportRef}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="h6">Student: {selectedLog.username}</Typography>
                    <Typography>Email: {selectedLog.email}</Typography>
                    <Typography>Exam ID: {selectedLog.examId}</Typography>
                    <Typography>Total Screenshots: {selectedLog.screenshots?.length || 0}</Typography>
                  </Alert>
                </Grid>

                {/* AI Violations with Screenshots */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">
                        <VisibilityIcon sx={{ mr: 1 }} />
                        AI Camera Violations
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="error">👤 No Face: {selectedLog.noFaceCount || 0}</Typography>
                              <Typography variant="body2">Student face not visible in camera</Typography>
                              <EvidenceThumbs log={selectedLog} type="noFace" onView={handleViewScreenshot} />
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="error">👥 Multiple Faces: {selectedLog.multipleFaceCount || 0}</Typography>
                              <Typography variant="body2">Multiple people detected in camera</Typography>
                              <EvidenceThumbs log={selectedLog} type="multipleFace" onView={handleViewScreenshot} />
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="error">📱 Voice Detected: {selectedLog.voiceDetectedCount || 0}</Typography>
                              <Typography variant="body2">Sustained speaking detected</Typography>
                              <EvidenceThumbs log={selectedLog} type="voiceDetected" onView={handleViewScreenshot} />
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="error">👀 Attention Drift: {selectedLog.attentionDriftCount || 0}</Typography>
                              <Typography variant="body2">Looking away from screen for too long</Typography>
                              <EvidenceThumbs log={selectedLog} type="attentionDrift" onView={handleViewScreenshot} />
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="error">📱 Cell Phone: {selectedLog.cellPhoneCount || 0}</Typography>
                              <Typography variant="body2">Cell phone detected in camera</Typography>
                              <EvidenceThumbs log={selectedLog} type="cellPhone" onView={handleViewScreenshot} />
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="error">📚 Prohibited Objects: {selectedLog.prohibitedObjectCount || 0}</Typography>
                              <Typography variant="body2">Books, laptops, or other prohibited items detected</Typography>
                              <EvidenceThumbs log={selectedLog} type="prohibitedObject" onView={handleViewScreenshot} />
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Browser Violations with Screenshots */}
                <Grid item xs={12}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">
                        <ComputerIcon sx={{ mr: 1 }} />
                        Browser Security Violations
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="warning">
                                Tab Switches: {selectedLog.tabSwitchCount || 0}
                              </Typography>
                              <Typography variant="body2">
                                Student switched tabs or applications
                              </Typography>
                              {getScreenshotsByType(selectedLog.screenshots, "tabSwitch").length > 0 && (
                                <Button
                                  size="small"
                                  startIcon={<ImageIcon />}
                                  onClick={() => handleViewScreenshot(getScreenshotsByType(selectedLog.screenshots, "tabSwitch")[0])}
                                >
                                  View Evidence ({getScreenshotsByType(selectedLog.screenshots, "tabSwitch").length})
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="warning">
                                Copy/Paste: {selectedLog.copyPasteCount || 0}
                              </Typography>
                              <Typography variant="body2">
                                Copy-paste operations attempted
                              </Typography>
                              {getScreenshotsByType(selectedLog.screenshots, "copyPaste").length > 0 && (
                                <Button
                                  size="small"
                                  startIcon={<ImageIcon />}
                                  onClick={() => handleViewScreenshot(getScreenshotsByType(selectedLog.screenshots, "copyPaste")[0])}
                                >
                                  View Evidence ({getScreenshotsByType(selectedLog.screenshots, "copyPaste").length})
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="error">
                                Screenshots: {selectedLog.printScreenCount || 0}
                              </Typography>
                              <Typography variant="body2">
                                Screenshot attempts detected
                              </Typography>
                              {getScreenshotsByType(selectedLog.screenshots, "printScreen").length > 0 && (
                                <Button
                                  size="small"
                                  startIcon={<ImageIcon />}
                                  onClick={() => handleViewScreenshot(getScreenshotsByType(selectedLog.screenshots, "printScreen")[0])}
                                >
                                  View Evidence ({getScreenshotsByType(selectedLog.screenshots, "printScreen").length})
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="error">
                                Dev Tools: {selectedLog.devToolsCount || 0}
                              </Typography>
                              <Typography variant="body2">
                                Developer tools access attempted
                              </Typography>
                              {getScreenshotsByType(selectedLog.screenshots, "devTools").length > 0 && (
                                <Button
                                  size="small"
                                  startIcon={<ImageIcon />}
                                  onClick={() => handleViewScreenshot(getScreenshotsByType(selectedLog.screenshots, "devTools")[0])}
                                >
                                  View Evidence ({getScreenshotsByType(selectedLog.screenshots, "devTools").length})
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="warning">
                                Full-screen Exit: {selectedLog.fullScreenExitCount || 0}
                              </Typography>
                              <Typography variant="body2">
                                Student exited full-screen mode
                              </Typography>
                              {getScreenshotsByType(selectedLog.screenshots, "fullScreenExit").length > 0 && (
                                <Button
                                  size="small"
                                  startIcon={<ImageIcon />}
                                  onClick={() => handleViewScreenshot(getScreenshotsByType(selectedLog.screenshots, "fullScreenExit")[0])}
                                >
                                  View Evidence ({getScreenshotsByType(selectedLog.screenshots, "fullScreenExit").length})
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="warning">
                                Window Blur: {selectedLog.windowBlurCount || 0}
                              </Typography>
                              <Typography variant="body2">
                                Window focus lost (switched to other apps)
                              </Typography>
                              {getScreenshotsByType(selectedLog.screenshots, "windowBlur").length > 0 && (
                                <Button
                                  size="small"
                                  startIcon={<ImageIcon />}
                                  onClick={() => handleViewScreenshot(getScreenshotsByType(selectedLog.screenshots, "windowBlur")[0])}
                                >
                                  View Evidence ({getScreenshotsByType(selectedLog.screenshots, "windowBlur").length})
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" color="warning">
                                App Switch: {selectedLog.applicationSwitchCount || 0}
                              </Typography>
                              <Typography variant="body2">
                                Application switching (Alt+Tab, Windows key)
                              </Typography>
                              {getScreenshotsByType(selectedLog.screenshots, "applicationSwitch").length > 0 && (
                                <Button
                                  size="small"
                                  startIcon={<ImageIcon />}
                                  onClick={() => handleViewScreenshot(getScreenshotsByType(selectedLog.screenshots, "applicationSwitch")[0])}
                                >
                                  View Evidence ({getScreenshotsByType(selectedLog.screenshots, "applicationSwitch").length})
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Summary */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Summary
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="body1">
                            <strong>Total AI Violations:</strong> {(selectedLog.noFaceCount || 0) + 
                            (selectedLog.multipleFaceCount || 0) + (selectedLog.cellPhoneCount || 0) + 
                            (selectedLog.prohibitedObjectCount || 0) + (selectedLog.voiceDetectedCount || 0) +
                            (selectedLog.attentionDriftCount || 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body1">
                            <strong>Total Browser Violations:</strong> {(selectedLog.tabSwitchCount || 0) + 
                            (selectedLog.copyPasteCount || 0) + (selectedLog.rightClickCount || 0) + 
                            (selectedLog.printScreenCount || 0) + (selectedLog.devToolsCount || 0) + 
                            (selectedLog.fullScreenExitCount || 0) + (selectedLog.windowBlurCount || 0) + 
                            (selectedLog.applicationSwitchCount || 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body1">
                            <strong>Risk Level:</strong> {getRiskLevel(selectedLog).level}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button variant="contained" onClick={handleExportPdf}>Export PDF</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Screenshot Viewer Dialog */}
      <Dialog open={screenshotDialog} onClose={handleCloseScreenshotDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              ���� Violation Evidence - {selectedScreenshot?.type?.toUpperCase()}
            </Typography>
            <Box>
              <IconButton onClick={() => handleDownloadScreenshot(selectedScreenshot)}>
                <DownloadIcon />
              </IconButton>
              <IconButton onClick={handleCloseScreenshotDialog}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedScreenshot && (
            <Box>
              <Card>
                <CardMedia
                  component="img"
                  image={selectedScreenshot.url}
                  alt={`Violation evidence - ${selectedScreenshot.type}`}
                  sx={{ maxHeight: 500, objectFit: "contain" }}
                />
                <CardContent>
                  <Typography variant="h6" gutterBottom>Violation Details</Typography>
                  <Typography variant="body2" color="text.secondary"><strong>Type:</strong> {selectedScreenshot.type}</Typography>
                  <Typography variant="body2" color="text.secondary"><strong>Detected At:</strong> {new Date(selectedScreenshot.detectedAt).toLocaleString()}</Typography>
                  {typeof selectedScreenshot.confidence === 'number' && (
                    <Typography variant="body2" color="text.secondary"><strong>Confidence:</strong> {(selectedScreenshot.confidence * 100).toFixed(0)}%</Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
