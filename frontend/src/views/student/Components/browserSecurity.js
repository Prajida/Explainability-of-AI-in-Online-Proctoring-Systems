// Browser Security Utilities
export const disableTextSelection = () => {
  document.addEventListener("selectstart", (e) => e.preventDefault());
  document.addEventListener("dragstart", (e) => e.preventDefault());
  document.addEventListener("drag", (e) => e.preventDefault());
};

export const disableRightClick = () => {
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("mousedown", (e) => {
    if (e.button === 2) e.preventDefault();
  });
};

export const disableKeyboardShortcuts = () => {
  document.addEventListener("keydown", (e) => {
    // Disable F12, Print Screen, etc.
    if (["F12", "PrintScreen", "ScrollLock", "Pause"].includes(e.key)) {
      e.preventDefault();
    }
    
    // Disable Ctrl+Shift+I, Ctrl+U, etc.
    if (e.ctrlKey && e.shiftKey && e.key === "I") e.preventDefault();
    if (e.ctrlKey && e.key === "u") e.preventDefault();
  });
};

export const monitorFullScreen = (callback) => {
  const checkFullScreen = () => {
    const isFullScreen = !!(document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement);
    callback(isFullScreen);
  };
  
  document.addEventListener("fullscreenchange", checkFullScreen);
  document.addEventListener("webkitfullscreenchange", checkFullScreen);
  document.addEventListener("mozfullscreenchange", checkFullScreen);
  document.addEventListener("MSFullscreenChange", checkFullScreen);
  
  return () => {
    document.removeEventListener("fullscreenchange", checkFullScreen);
    document.removeEventListener("webkitfullscreenchange", checkFullScreen);
    document.removeEventListener("mozfullscreenchange", checkFullScreen);
    document.removeEventListener("MSFullscreenChange", checkFullScreen);
  };
};

export const monitorTabVisibility = (callback) => {
  const handleVisibilityChange = () => {
    callback(!document.hidden);
  };
  
  document.addEventListener("visibilitychange", handleVisibilityChange);
  
  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
};
