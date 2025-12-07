import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

const CheatingLogContext = createContext();

export const CheatingLogProvider = ({ children }) => {
  const { userInfo } = useSelector((state) => state.auth);
  const [cheatingLog, setCheatingLog] = useState({
    noFaceCount: 0,
    multipleFaceCount: 0,
    cellPhoneCount: 0,
    prohibitedObjectCount: 0,
    tabSwitchCount: 0,
    copyPasteCount: 0,
    rightClickCount: 0,
    printScreenCount: 0,
    devToolsCount: 0,
    fullScreenExitCount: 0,
    windowBlurCount: 0,
    applicationSwitchCount: 0,
    voiceDetectedCount: 0,
    attentionDriftCount: 0,
    examId: '',
    username: userInfo?.name || '',
    email: userInfo?.email || '',
  });

  useEffect(() => {
    if (userInfo) {
      setCheatingLog((prev) => ({
        ...prev,
        username: userInfo.name,
        email: userInfo.email,
      }));
    }
  }, [userInfo]);

  const numberOrPrev = (next, prev) => Number(next ?? prev ?? 0);

  const updateCheatingLog = (newLog) => {
    setCheatingLog((prev) => {
      const updatedLog = {
        ...prev,
        ...newLog,
        noFaceCount: numberOrPrev(newLog.noFaceCount, prev.noFaceCount),
        multipleFaceCount: numberOrPrev(newLog.multipleFaceCount, prev.multipleFaceCount),
        cellPhoneCount: numberOrPrev(newLog.cellPhoneCount, prev.cellPhoneCount),
        prohibitedObjectCount: numberOrPrev(newLog.prohibitedObjectCount, prev.prohibitedObjectCount),
        tabSwitchCount: numberOrPrev(newLog.tabSwitchCount, prev.tabSwitchCount),
        copyPasteCount: numberOrPrev(newLog.copyPasteCount, prev.copyPasteCount),
        rightClickCount: numberOrPrev(newLog.rightClickCount, prev.rightClickCount),
        printScreenCount: numberOrPrev(newLog.printScreenCount, prev.printScreenCount),
        devToolsCount: numberOrPrev(newLog.devToolsCount, prev.devToolsCount),
        fullScreenExitCount: numberOrPrev(newLog.fullScreenExitCount, prev.fullScreenExitCount),
        windowBlurCount: numberOrPrev(newLog.windowBlurCount, prev.windowBlurCount),
        applicationSwitchCount: numberOrPrev(newLog.applicationSwitchCount, prev.applicationSwitchCount),
        voiceDetectedCount: numberOrPrev(newLog.voiceDetectedCount, prev.voiceDetectedCount),
        attentionDriftCount: numberOrPrev(newLog.attentionDriftCount, prev.attentionDriftCount),
      };
      return updatedLog;
    });
  };

  const resetCheatingLog = (examId) => {
    const resetLog = {
      noFaceCount: 0,
      multipleFaceCount: 0,
      cellPhoneCount: 0,
      prohibitedObjectCount: 0,
      tabSwitchCount: 0,
      copyPasteCount: 0,
      rightClickCount: 0,
      printScreenCount: 0,
      devToolsCount: 0,
      fullScreenExitCount: 0,
      windowBlurCount: 0,
      applicationSwitchCount: 0,
      voiceDetectedCount: 0,
      attentionDriftCount: 0,
      examId: examId,
      username: userInfo?.name || '',
      email: userInfo?.email || '',
    };
    setCheatingLog(resetLog);
  };

  return (
    <CheatingLogContext.Provider value={{ cheatingLog, updateCheatingLog, resetCheatingLog }}>
      {children}
    </CheatingLogContext.Provider>
  );
};

export const useCheatingLog = () => {
  const context = useContext(CheatingLogContext);
  if (!context) throw new Error('useCheatingLog must be used within CheatingLogProvider');
  return context;
};
