import React, { useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import * as faceDetection from '@tensorflow-models/face-detection';
import Webcam from 'react-webcam';
import { drawRect } from './utilities';
import { Box, Card, Typography, Button, LinearProgress } from '@mui/material';
import swal from 'sweetalert';
import { UploadClient } from '@uploadcare/upload-client';
import { useSaveCheatingLogMutation } from 'src/slices/cheatingLogApiSlice';
import { useSelector } from 'react-redux';

const client = new UploadClient({ publicKey: 'e69ab6e5db6d4a41760b' });

// Enhanced prohibited object list - Only objects that COCO-SSD can actually detect
const PROHIBITED_CLASSES = new Set([
  // Electronic devices
  'cell phone', 'laptop', 'mouse', 'remote', 'keyboard', 'tv', 'microwave', 'oven', 'toaster',
  
  // Books and writing materials (COCO can detect 'book')
  'book', 'scissors',
  
  // Food and drinks (common cheating aids)
  'bottle', 'cup', 'apple', 'banana', 'orange', 'sandwich', 'pizza', 'donut', 'cake',
  
  // Personal items
  'backpack', 'handbag', 'suitcase', 'umbrella', 'tie',
  
  // Additional objects that might be used for cheating
  'clock', 'vase', 'teddy bear', 'hair drier', 'toothbrush'
]);

export default function Home({ cheatingLog, updateCheatingLog, examId }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [lastDetectionTime, setLastDetectionTime] = useState({});
  const [screenshots, setScreenshots] = useState([]);
  const [saveCheatingLog] = useSaveCheatingLogMutation();
  const { userInfo } = useSelector((state) => state.auth);

  // Face detector
  const faceDetectorRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const cocoNetRef = useRef(null);

  // Keep last detections to overlay on evidence image
  const lastObjectsRef = useRef([]); // COCO detections: [{class,bbox:[x,y,w,h]}]
  const lastFaceRef = useRef(null);  // { box: {xMin,yMin,xMax,yMax} }

  // Voice detection state
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const voiceBaselineRef = useRef(0);
  const voiceActiveAccumMsRef = useRef(0);
  const lastSampleTsRef = useRef(0);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  // Attention drift state
  const driftStartRef = useRef(0);
  const [faceCentered, setFaceCentered] = useState(true);
  const [driftCountdown, setDriftCountdown] = useState(0);

  // Initialize screenshots array when component mounts
  useEffect(() => {
    if (cheatingLog && cheatingLog.screenshots) {
      setScreenshots(cheatingLog.screenshots);
    }
  }, [cheatingLog]);

  const captureScreenshotAndUpload = async (type, confidence) => {
    const video = webcamRef.current?.video;

    if (
      !video ||
      video.readyState !== 4 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      console.warn('Video not ready for screenshot');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Annotate evidence for AI violations
    const AI_TYPES = new Set(['noFace','multipleFace','cellPhone','prohibitedObject','voiceDetected','attentionDrift']);
    if (AI_TYPES.has(type)) {
      context.lineWidth = 2;
      context.font = '20px Arial';
      context.fillStyle = '#ff3131';
      context.strokeStyle = '#ff3131';
      context.fillText(`Evidence: ${type}`, 16, 28);
      if (lastObjectsRef.current && lastObjectsRef.current.length > 0) {
        lastObjectsRef.current.forEach((d) => {
          const [x,y,w,h] = d.bbox;
          if (['cell phone','book','laptop','person'].includes(d.class)) {
            context.strokeRect(x, y, w, h);
            context.fillText(d.class, x + 4, y + 22);
          }
        });
      }
      if (lastFaceRef.current && lastFaceRef.current.box) {
        const b = lastFaceRef.current.box;
        const x = b.xMin, y = b.yMin, w = b.xMax - b.xMin, h = b.yMax - b.yMin;
        context.strokeStyle = '#31a24c';
        context.fillStyle = '#31a24c';
        context.strokeRect(x, y, w, h);
        context.fillText('face', x + 4, y + 22);
      }
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const file = dataURLtoFile(dataUrl, `cheating_${type}_${Date.now()}.jpg`);

    try {
      const result = await client.uploadFile(file);
      const screenshot = {
        url: result.cdnUrl,
        type: type,
        detectedAt: new Date(),
        confidence,
      };
      setScreenshots((prev) => [...prev, screenshot]);
      return screenshot;
    } catch (error) {
      console.warn('Upload failed, falling back to embedded data URL');
      // Fallback: use embedded data URL so the teacher dashboard can still display it
      const screenshot = {
        url: dataUrl,
        type: type,
        detectedAt: new Date(),
        confidence,
      };
      setScreenshots((prev) => [...prev, screenshot]);
      return screenshot;
    }
  };

  const handleDetection = async (type, confidence) => {
    const now = Date.now();
    const lastTime = lastDetectionTime[type] || 0;

    if (now - lastTime >= 3000) {
      setLastDetectionTime((prev) => ({ ...prev, [type]: now }));

      // Capture and upload screenshot (optional)
      const screenshot = await captureScreenshotAndUpload(type, confidence);

      // Build updated log with reliable identity
      const username = cheatingLog.username || userInfo?.name || '';
      const email = cheatingLog.email || userInfo?.email || '';
      const updatedLog = {
        ...cheatingLog,
        examId: cheatingLog.examId || examId,
        username,
        email,
        [`${type}Count`]: (cheatingLog[`${type}Count`] || 0) + 1,
        screenshots: screenshot ? [...(cheatingLog.screenshots || []), screenshot] : (cheatingLog.screenshots || []),
      };
      updateCheatingLog(updatedLog);

      // Save immediately (best-effort)
      try {
        await saveCheatingLog(updatedLog).unwrap();
      } catch (e) {}

      switch (type) {
        case 'noFace':
          swal('Face Not Visible', 'Warning Recorded', 'warning');
          break;
        case 'multipleFace':
          swal('Multiple Faces Detected', 'Warning Recorded', 'warning');
          break;
        case 'cellPhone':
          swal('Cell Phone Detected', 'Warning Recorded', 'warning');
          break;
        case 'prohibitedObject':
          swal('Prohibited Object Detected', 'Warning Recorded', 'warning');
          break;
        case 'voiceDetected':
          swal('Voice Detected', 'Speaking detected during exam', 'warning');
          break;
        case 'attentionDrift':
          swal('Attention Drift', 'Looking away for too long', 'warning');
          break;
        default:
          break;
      }
    }
  };

  const runModels = async () => {
    try {
      console.log('Initializing TensorFlow.js...');
      const backends = tf.getBackend();
      if (backends !== 'webgl') {
        try { 
          await tf.setBackend('webgl'); 
          console.log('Using WebGL backend');
        } catch (_) { 
          await tf.setBackend('cpu'); 
          console.log('Using CPU backend');
        }
      }
      await tf.ready();
      console.log('TensorFlow.js ready');
    } catch (e) { 
      console.error('TF backend init error:', e); 
    }

    let cocoNet = null;
    try { 
      console.log('Loading COCO-SSD model...');
      cocoNet = await cocossd.load(); 
      console.log('COCO-SSD model loaded successfully');
    } catch (e) { 
      console.error('Failed to load COCO-SSD:', e); 
    }

    try {
      console.log('Loading BlazeFace model...');
      const faceDetector = await faceDetection.createDetector(
        faceDetection.SupportedModels.BlazeFace,
        { runtime: 'tfjs' }
      );
      faceDetectorRef.current = faceDetector;
      console.log('BlazeFace model loaded successfully');
    } catch (e) {
      console.warn('Face detector unavailable, falling back to COCO person counts:', e);
      faceDetectorRef.current = null;
    }

    if (!cocoNet) {
      swal('Error', 'Failed to load AI models (object detector). Please refresh.', 'error');
      return;
    }

    // Store COCO model in ref
    cocoNetRef.current = cocoNet;

    // Wait for webcam to be ready before starting detection
    const startDetection = () => {
      if (webcamRef.current?.video?.readyState === 4) {
        console.log('Webcam ready, starting detection loop');
        detectionIntervalRef.current = setInterval(() => {
          detect(cocoNetRef.current, faceDetectorRef.current);
        }, 500);
      } else {
        console.log('Waiting for webcam...');
        setTimeout(startDetection, 500);
      }
    };

    // Start detection after a short delay to ensure webcam is ready
    setTimeout(startDetection, 1000);
  };

  // Voice activity detection with Web Audio API (integrated accumulation)
  const startVoiceDetection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const measure = (ts) => {
        if (!analyserRef.current) return;
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          const resume = () => audioContextRef.current && audioContextRef.current.resume();
          window.addEventListener('click', resume, { once: true });
        }
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setMicLevel(Math.min(100, Math.round(rms * 400))); // simple visual meter

        if (voiceBaselineRef.current === 0) {
          voiceBaselineRef.current = rms;
        } else {
          voiceBaselineRef.current = 0.98 * voiceBaselineRef.current + 0.02 * rms;
        }

        const threshold = Math.max(voiceBaselineRef.current * 1.2, 0.006);
        const now = ts || performance.now();
        const dt = lastSampleTsRef.current ? Math.min(100, now - lastSampleTsRef.current) : 0;
        lastSampleTsRef.current = now;

        if (rms > threshold) {
          setVoiceActive(true);
          voiceActiveAccumMsRef.current += dt;
        } else {
          setVoiceActive(false);
          voiceActiveAccumMsRef.current = Math.max(0, voiceActiveAccumMsRef.current - dt * 0.6);
        }

        if (voiceActiveAccumMsRef.current > 800) {
          handleDetection('voiceDetected', 1);
          voiceActiveAccumMsRef.current = 0;
        }

        requestAnimationFrame(measure);
      };

      setVoiceReady(true);
      requestAnimationFrame(measure);
    } catch (e) {
      console.warn('Microphone access denied or unavailable', e);
      setVoiceReady(false);
    }
  };

  // Helper for attention drift decision
  const evaluateAttentionDrift = (box, videoWidth, videoHeight) => {
    const cx = (box.xMin + box.xMax) / 2;
    const cy = (box.yMin + box.yMax) / 2;
    const nx = cx / videoWidth;
    const ny = cy / videoHeight;
    const w = Math.max(1, box.xMax - box.xMin);
    const h = Math.max(1, box.yMax - box.yMin);
    const areaFrac = (w * h) / (videoWidth * videoHeight);

    const inCenter = nx > 0.28 && nx < 0.72 && ny > 0.22 && ny < 0.78;
    const nearEdge = nx < 0.25 || nx > 0.75 || ny < 0.20 || ny > 0.80;
    const tooSmall = areaFrac < 0.035;

    // Sideways face heuristic: narrower width relative to height suggests yaw; raise threshold to be more sensitive
    const aspect = w / h;
    const sideways = aspect < 0.7;

    return { inCenter, nearEdge, tooSmall, sideways };
  };

  const detect = async (net, faceDetector) => {
    if (!webcamRef.current || !webcamRef.current.video || !canvasRef.current) {
      return;
    }
    
    if (webcamRef.current.video.readyState !== 4) {
      return;
    }
    
    const video = webcamRef.current.video;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    if (videoWidth === 0 || videoHeight === 0) {
      return;
    }

    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    try {
      if (!net) {
        console.warn('COCO-SSD model not loaded');
        return;
      }
      
      const obj = await net.detect(video);
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      drawRect(obj, ctx);
      lastObjectsRef.current = obj.map(o => ({ class: o.class, bbox: o.bbox, score: o.score }));

      // Prohibited object detections
      obj.forEach((element) => {
        const detectedClass = element.class;
        if (detectedClass === 'cell phone' && element.score > 0.5) {
          console.log('Cell phone detected with confidence:', element.score);
          handleDetection('cellPhone', element.score);
        }
        if (PROHIBITED_CLASSES.has(detectedClass) && element.score > 0.6 && detectedClass !== 'cell phone') {
          console.log('Prohibited object detected:', detectedClass, 'confidence:', element.score);
          handleDetection('prohibitedObject', element.score);
        }
      });

        if (faceDetector) {
          try {
            const faces = await faceDetector.estimateFaces(video, { flipHorizontal: true });
            const faceCount = Array.isArray(faces) ? faces.length : 0;
            lastFaceRef.current = faceCount > 0 ? faces[0] : null;

            if (faceCount === 0) {
              console.log('No face detected');
              handleDetection('noFace', 1);
            } else if (faceCount > 1) {
              console.log('Multiple faces detected:', faceCount);
              handleDetection('multipleFace', 1);
            }

          if (faceCount > 0) {
            const f = faces[0];
            const box = f.box;
            const { inCenter, nearEdge, tooSmall, sideways } = evaluateAttentionDrift(box, videoWidth, videoHeight);
            const now = Date.now();
            setFaceCentered(inCenter);

            // Even more responsive dwell
            const dwellMs = (nearEdge || tooSmall || sideways) ? 400 : 800;

            if (!inCenter || nearEdge || tooSmall || sideways) {
              if (driftStartRef.current === 0) driftStartRef.current = now;
              const remain = Math.max(0, dwellMs - (now - driftStartRef.current));
              setDriftCountdown(Math.ceil(remain / 1000));
              if (now - driftStartRef.current > dwellMs) {
                handleDetection('attentionDrift', 1);
                driftStartRef.current = 0;
                setDriftCountdown(0);
              }
            } else {
              driftStartRef.current = 0;
              setDriftCountdown(0);
            }
          } else {
            driftStartRef.current = 0;
            setDriftCountdown(0);
            setFaceCentered(true);
          }
          } catch (faceError) {
            console.error('Face detection error:', faceError);
          }
        } else {
          // Fallback using COCO person center for drift
          let person = obj.find((o) => o.class === 'person');
          if (person) {
            const [x, y, w, h] = person.bbox;
            const box = { xMin: x, yMin: y, xMax: x + w, yMax: y + h };
            const { inCenter, nearEdge, tooSmall, sideways } = evaluateAttentionDrift(box, videoWidth, videoHeight);
            const now = Date.now();
            setFaceCentered(inCenter);
            const dwellMs = (nearEdge || tooSmall || sideways) ? 400 : 800;
            if (!inCenter || nearEdge || tooSmall || sideways) {
              if (driftStartRef.current === 0) driftStartRef.current = now;
              const remain = Math.max(0, dwellMs - (now - driftStartRef.current));
              setDriftCountdown(Math.ceil(remain / 1000));
              if (now - driftStartRef.current > dwellMs) {
                handleDetection('attentionDrift', 1);
                driftStartRef.current = 0;
                setDriftCountdown(0);
              }
            } else {
              driftStartRef.current = 0;
              setDriftCountdown(0);
            }
          } else {
            setFaceCentered(true);
            setDriftCountdown(0);
          }

          // Person count fallback
          let personCount = 0;
          obj.forEach((element) => { if (element.class === 'person') personCount += 1; });
          lastFaceRef.current = null;
          if (personCount === 0) handleDetection('noFace', 1);
          if (personCount > 1) handleDetection('multipleFace', 1);
        }
      } catch (error) {
        console.error('Error during detection:', error);
      }
  };

  useEffect(() => {
    runModels();
    startVoiceDetection();
    
    return () => {
      // Cleanup detection interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      try {
        analyserRef.current = null;
        if (audioContextRef.current) audioContextRef.current.close();
        audioContextRef.current = null;
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach((t) => t.stop());
          micStreamRef.current = null;
        }
      } catch {}
    };
  }, []);

  const handleEnableMic = async () => {
    try {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        setVoiceReady(true);
      } else {
        await startVoiceDetection();
      }
    } catch {}
  };

  return (
    <Box>
      <Card variant="outlined" sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          muted
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user',
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}
        />
        {/* HUD */}
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 11, bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', p: 1, borderRadius: 1, minWidth: 220 }}>
          <Typography variant="caption">Face: {faceCentered ? 'Centered' : `Off-center${driftCountdown ? ` (${driftCountdown}s)` : ''}`}</Typography><br />
          <Typography variant="caption">Voice: {voiceActive ? 'Active' : (voiceReady ? 'Quiet' : 'Mic not allowed')}</Typography>
          <LinearProgress variant="determinate" value={micLevel} sx={{ mt: 0.5, width: 180 }} />
          {!voiceReady && (
            <Button size="small" variant="contained" color="warning" onClick={handleEnableMic} sx={{ mt: 1 }}>
              Enable Microphone
            </Button>
          )}
        </Box>
      </Card>
    </Box>
  );
}

// Helper to convert base64 to File
function dataURLtoFile(dataUrl, fileName) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], fileName, { type: mime });
}
