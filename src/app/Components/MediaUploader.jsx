'use client';

import { useState, useRef, useEffect } from 'react';
import styles from '../CSS/mediaUploader.module.css';

const MediaUploader = ({ onMediaSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState('video'); // video or canvas
  const [videoSrc, setVideoSrc] = useState(null);
  const [canvasData, setCanvasData] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);

  useEffect(() => {
    if (activeTab === 'canvas' && canvasRef.current) {
      initializeCanvas();
    }
  }, [activeTab]);

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 600;
    canvas.height = 400;
    
    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set default drawing properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    
    // Save canvas data
    setCanvasData(canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setCanvasData(null);
  };

  const addText = () => {
    const text = prompt('Enter text to add:');
    if (text) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.font = '20px Arial';
      ctx.fillStyle = brushColor;
      ctx.fillText(text, 50, 50);
      setCanvasData(canvas.toDataURL());
    }
  };

  const handleMediaSubmit = () => {
    if (activeTab === 'video' && videoSrc) {
      onMediaSelect({ type: 'video', data: videoSrc });
    } else if (activeTab === 'canvas' && canvasData) {
      onMediaSelect({ type: 'canvas', data: canvasData });
    }
    onClose();
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add Media Content</h2>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>

        <div className={styles.content}>
          {/* Tab Navigation */}
          <div className={styles.tabNavigation}>
            <button 
              className={`${styles.tab} ${activeTab === 'video' ? styles.active : ''}`}
              onClick={() => setActiveTab('video')}
            >
              🎥 Video
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'canvas' ? styles.active : ''}`}
              onClick={() => setActiveTab('canvas')}
            >
              🎨 Canvas Drawing
            </button>
          </div>

          {/* Video Tab */}
          {activeTab === 'video' && (
            <div className={styles.videoSection}>
              <div className={styles.uploadArea}>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  ref={fileInputRef}
                  className={styles.hiddenInput}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.uploadBtn}
                >
                  📁 Select Video File
                </button>
              </div>
              
              {videoSrc && (
                <div className={styles.videoPreview}>
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    controls
                    className={styles.video}
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className={styles.videoControls}>
                    <p className={styles.videoInfo}>Video ready for upload</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Canvas Tab */}
          {activeTab === 'canvas' && (
            <div className={styles.canvasSection}>
              <div className={styles.canvasTools}>
                <div className={styles.toolGroup}>
                  <label className={styles.toolLabel}>Brush Color:</label>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className={styles.colorPicker}
                  />
                </div>
                
                <div className={styles.toolGroup}>
                  <label className={styles.toolLabel}>Brush Size:</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(e.target.value)}
                    className={styles.rangeSlider}
                  />
                  <span className={styles.sizeDisplay}>{brushSize}px</span>
                </div>
                
                <div className={styles.toolGroup}>
                  <button onClick={addText} className={styles.toolBtn}>
                    📝 Add Text
                  </button>
                  <button onClick={clearCanvas} className={styles.toolBtn}>
                    🗑️ Clear
                  </button>
                </div>
              </div>
              
              <div className={styles.canvasContainer}>
                <canvas
                  ref={canvasRef}
                  className={styles.canvas}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              
              <p className={styles.canvasInstructions}>
                🎨 Click and drag to draw on the canvas. Use the tools above to customize your drawing.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button onClick={onClose} className={styles.cancelBtn}>
              Cancel
            </button>
            <button 
              onClick={handleMediaSubmit}
              className={styles.submitBtn}
              disabled={
                (activeTab === 'video' && !videoSrc) || 
                (activeTab === 'canvas' && !canvasData)
              }
            >
              Add to Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaUploader;