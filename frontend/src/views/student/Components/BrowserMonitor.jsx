import React, { useEffect, useState, useRef } from "react";
import { Box, Card, Typography, Alert, Chip, Button } from "@mui/material";
import { useCheatingLog } from "src/context/CheatingLogContext";
import { UploadClient } from "@uploadcare/upload-client";
import swal from "sweetalert";
import { useSaveCheatingLogMutation } from "src/slices/cheatingLogApiSlice";
import { useSelector } from 'react-redux';

const client = new UploadClient({ publicKey: "e69ab6e5db6d4a41760b" });

const BrowserMonitor = ({ examId, onViolationDetected, showUI = false }) => {
  const { cheatingLog, updateCheatingLog } = useCheatingLog();
  const [violations, setViolations] = useState({
    tabSwitch: 0,
    copyPaste: 0,
    rightClick: 0,
    printScreen: 0,
    devTools: 0,
    fullScreenExit: 0,
    windowBlur: 0,
    applicationSwitch: 0
  });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isExamActive, setIsExamActive] = useState(true);
  const violationTimeoutRef = useRef({});
  const [saveCheatingLog] = useSaveCheatingLogMutation();
  const { userInfo } = useSelector((state) => state.auth);

  // Capture screenshot for browser violations
  const captureBrowserScreenshot = async (type) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff0000";
      ctx.font = "20px Arial";
      ctx.fillText(`VIOLATION DETECTED: ${type.toUpperCase()}`, 20, 40);
      ctx.fillText(`Time: ${new Date().toLocaleString()}`, 20, 70);
      ctx.fillText(`Student: ${cheatingLog.username || userInfo?.name || "Unknown"}`, 20, 100);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      const file = dataURLtoFile(dataUrl, `browser_violation_${type}_${Date.now()}.jpg`);
      const result = await client.uploadFile(file);
      return { url: result.cdnUrl, type, detectedAt: new Date() };
    } catch (error) {
      return null;
    }
  };

  const dataURLtoFile = (dataUrl, fileName) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], fileName, { type: mime });
  };

  const handleViolation = async (type) => {
    const now = Date.now();
    const lastTime = violationTimeoutRef.current[type] || 0;
    if (now - lastTime >= 3000) {
      violationTimeoutRef.current[type] = now;
      setViolations((prev) => ({ ...prev, [type]: prev[type] + 1 }));
      const screenshot = await captureBrowserScreenshot(type);
      const username = cheatingLog.username || userInfo?.name || '';
      const email = cheatingLog.email || userInfo?.email || '';
      const updatedLog = {
        ...cheatingLog,
        [`${type}Count`]: (cheatingLog[`${type}Count`] || 0) + 1,
        examId: cheatingLog.examId || examId,
        username,
        email,
        screenshots: screenshot ? [...(cheatingLog.screenshots || []), screenshot] : (cheatingLog.screenshots || [])
      };
      updateCheatingLog(updatedLog);
      try { await saveCheatingLog(updatedLog).unwrap(); } catch {}
      showViolationWarning(type);
      if (onViolationDetected) onViolationDetected(type, screenshot);
    }
  };

  const showViolationWarning = (type) => {
    const warnings = {
      tabSwitch: "Tab Switch Detected! Please stay on the exam page.",
      copyPaste: "Copy/Paste Detected! This action is not allowed.",
      rightClick: "Right-click Detected! This action is not allowed.",
      printScreen: "Screenshot Attempt Detected! This is not allowed.",
      devTools: "Developer Tools Detected! Please close them immediately.",
      fullScreenExit: "Full-screen Mode Required! Please return to full-screen.",
      windowBlur: "Window Focus Lost! Please return to the exam window.",
      applicationSwitch: "Application Switch Detected! Please stay on the exam."
    };

    swal({
      title: "Security Violation",
      text: warnings[type] || "Suspicious activity detected!",
      icon: "warning",
      button: "I Understand",
      timer: 3000
    });
  };

  useEffect(() => {
    const enterFullScreen = async () => {
      try {
        const element = document.documentElement;
        if (element.requestFullscreen) await element.requestFullscreen();
        else if (element.webkitRequestFullscreen) await element.webkitRequestFullscreen();
        else if (element.mozRequestFullScreen) await element.mozRequestFullScreen();
        else if (element.msRequestFullscreen) await element.msRequestFullscreen();
        setIsFullScreen(true);
      } catch (error) {
        handleViolation("fullScreenExit");
      }
    };

    const checkFullScreen = () => {
      const isCurrentlyFullScreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (!isCurrentlyFullScreen && isExamActive) {
        handleViolation("fullScreenExit");
        setTimeout(() => enterFullScreen(), 1000);
      }
      setIsFullScreen(isCurrentlyFullScreen);
    };

    const interval = setInterval(checkFullScreen, 2000);
    enterFullScreen();
    return () => clearInterval(interval);
  }, [isExamActive]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isExamActive) handleViolation("tabSwitch");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isExamActive]);

  // CONSOLIDATED keyboard detection - All in one useEffect
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log('Key pressed:', e.key, 'Meta:', e.metaKey, 'Shift:', e.shiftKey, 'Ctrl:', e.ctrlKey);
      
      // PRIORITY 1: Screenshot detection (Mac and Windows)
      if (e.key === "PrintScreen") { 
        e.preventDefault(); 
        handleViolation("printScreen"); 
        return false; 
      }
      
      // Mac Screenshot shortcuts - Check this FIRST before other Meta key detection
      if (e.metaKey && e.shiftKey) {
        if (e.key === "3" || e.key === "4" || e.key === "5") { 
          e.preventDefault();
          handleViolation("printScreen");
          return false;
        }
      }
      
      // Windows Snipping Tool
      if (e.metaKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        handleViolation("printScreen");
        return false;
      }
      
      // PRIORITY 2: Copy-paste detection
      // Windows Ctrl shortcuts
      if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "a" || e.key === "x" || e.key === "z" || e.key === "s")) {
        e.preventDefault();
        handleViolation("copyPaste");
        return false;
      }
      
      // Mac Cmd shortcuts (but NOT screenshot shortcuts)
      if (e.metaKey && !e.shiftKey) {
        if (e.key === "c" || e.key === "v" || e.key === "a" || e.key === "x" || e.key === "z" || e.key === "s") {
          e.preventDefault();
          handleViolation("copyPaste");
          return false;
        }
        // Mac specific shortcuts
        if (e.key === "C" || e.key === "V" || e.key === "A" || e.key === "X" || e.key === "Z" || e.key === "S") {
          e.preventDefault();
          handleViolation("copyPaste");
          return false;
        }
      }
      
      // PRIORITY 3: Dev tools
      if (e.key === "F12") { 
        e.preventDefault(); 
        handleViolation("devTools"); 
        return false; 
      }
      
      // PRIORITY 4: Application switching (only if not screenshot)
      if (e.altKey && e.key === "Tab") { 
        e.preventDefault(); 
        handleViolation("applicationSwitch"); 
        return false; 
      }
      
      // Meta key alone (without shift) - application switch
      if (e.key === "Meta" || e.key === "OS") { 
        e.preventDefault(); 
        handleViolation("applicationSwitch"); 
        return false; 
      }
    };

    // Paste event detection (catches right-click paste and other methods)
    const handlePaste = (e) => {
      e.preventDefault();
      handleViolation("copyPaste");
      return false;
    };

    // Right-click detection
    const handleContextMenu = (e) => {
      e.preventDefault();
      handleViolation("rightClick");
      return false;
    };

    // Copy event detection
    const handleCopy = (e) => {
      e.preventDefault();
      handleViolation("copyPaste");
      return false;
    };

    // Cut event detection
    const handleCut = (e) => {
      e.preventDefault();
      handleViolation("copyPaste");
      return false;
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Monitor window focus
  useEffect(() => {
    let blurTimer = null;
    const onBlur = () => {
      if (!isExamActive) return;
      // Only record if window stays unfocused for > 3 seconds
      blurTimer = window.setTimeout(() => {
        handleViolation('windowBlur');
      }, 3000);
    };
    const onFocus = () => {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [isExamActive]);

  // Disable text selection
  useEffect(() => {
    const handleSelectStart = (e) => { e.preventDefault(); return false; };
    document.addEventListener("selectstart", handleSelectStart);
    return () => document.removeEventListener("selectstart", handleSelectStart);
  }, []);

  const handleManualFullScreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) element.requestFullscreen();
    else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
  };

  // If showUI is false, return null (completely invisible)
  if (!showUI) {
    return null;
  }

  return (
    <Box>
      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Browser Security Monitor
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Security Status: {isFullScreen ? "Secure" : "Warning"}
          </Typography>
          {!isFullScreen && (
            <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2">
                Full-screen mode is required for secure exam environment.
                <br />
                <Button variant="contained" size="small" onClick={handleManualFullScreen} sx={{ mt: 1 }}>
                  Enter Full Screen
                </Button>
              </Typography>
            </Alert>
          )}
        </Box>

        {/* Show violation counts for admin/teacher view */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          <Chip label={`Tab Switches: ${violations.tabSwitch}`} color={violations.tabSwitch > 0 ? "error" : "default"} size="small" />
          <Chip label={`Copy/Paste: ${violations.copyPaste}`} color={violations.copyPaste > 0 ? "error" : "default"} size="small" />
          <Chip label={`Right-click: ${violations.rightClick}`} color={violations.rightClick > 0 ? "error" : "default"} size="small" />
          <Chip label={`Screenshots: ${violations.printScreen}`} color={violations.printScreen > 0 ? "error" : "default"} size="small" />
          <Chip label={`Dev Tools: ${violations.devTools}`} color={violations.devTools > 0 ? "error" : "default"} size="small" />
          <Chip label={`Focus Lost: ${violations.windowBlur}`} color={violations.windowBlur > 0 ? "error" : "default"} size="small" />
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            All security violations are logged and monitored in real time with screenshot evidence
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default BrowserMonitor;
