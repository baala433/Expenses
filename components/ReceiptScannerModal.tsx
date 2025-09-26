import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeReceiptImage } from '../services/geminiService';
import { CameraIcon } from './Icons';
import Spinner from './Spinner';

const ANALYSIS_MESSAGES = [
    "Reading receipt data...",
    "Identifying merchant and amount...",
    "AI is categorizing the expense...",
    "Finalizing details...",
];

const ReceiptScannerModal = ({ isOpen, onClose, onAddTransaction, categories }) => {
    const [view, setView] = useState('camera'); // 'camera', 'preview', 'loading', 'form', 'error'
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState(ANALYSIS_MESSAGES[0]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = useCallback(async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access the camera. Please ensure you have granted permission in your browser settings.");
            setView('error');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        if (isOpen && view === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, view, startCamera, stopCamera]);
    
     useEffect(() => {
        let interval: number;
        if (view === 'loading') {
          let messageIndex = 0;
          setLoadingMessage(ANALYSIS_MESSAGES[0]);
          interval = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % ANALYSIS_MESSAGES.length;
            setLoadingMessage(ANALYSIS_MESSAGES[messageIndex]);
          }, 1500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [view]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setCapturedImage(dataUrl);
            setView('preview');
            stopCamera();
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setView('camera');
    };

    const handleAnalyze = async () => {
        if (!capturedImage) return;
        setView('loading');
        setError(null);

        try {
            const base64Image = capturedImage.split(',')[1];
            const categoryNames = categories.map(c => c.name);
            const result = await analyzeReceiptImage(base64Image, 'image/jpeg', categoryNames);
            setAnalysisResult(result);
            setView('form');
        } catch (err: any) {
            setError(err.message || "An unknown error occurred during analysis.");
            setView('error');
        }
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setAnalysisResult(prev => (prev ? { ...prev, [e.target.name]: e.target.value } : null));
    };
    
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const amount = parseFloat(e.target.value);
        setAnalysisResult(prev => (prev ? { ...prev, amount: isNaN(amount) ? '' : amount } : null));
    }
    
    const handleAdd = () => {
        if (analysisResult) {
            onAddTransaction(analysisResult);
        }
    };
    
    const handleClose = () => {
        stopCamera();
        setCapturedImage(null);
        setAnalysisResult(null);
        setError(null);
        setView('camera');
        onClose();
    };

    if (!isOpen) return null;

    const renderContent = () => {
        switch (view) {
            case 'camera':
                return (
                    <div className="relative w-full aspect-[3/4] max-h-[60vh] bg-gray-900 rounded-lg overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                            <button onClick={handleCapture} className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-transform hover:scale-105" aria-label="Capture photo"></button>
                        </div>
                    </div>
                );
            case 'preview':
                return (
                    <div className="w-full">
                        {capturedImage && <img src={capturedImage} alt="Receipt preview" className="rounded-lg max-h-[60vh] mx-auto" />}
                        <div className="flex justify-center gap-4 mt-4">
                            <button onClick={handleRetake} className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Retake</button>
                            <button onClick={handleAnalyze} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Analyze Receipt</button>
                        </div>
                    </div>
                );
            case 'loading':
                return (
                    <div className="text-center p-8">
                        <Spinner />
                        <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-300">{loadingMessage}</p>
                    </div>
                );
            case 'form':
                if (!analysisResult) return null;
                return (
                    <div className="w-full space-y-4 p-2">
                        <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-white">Confirm Transaction</h3>
                        <div>
                            <label htmlFor="description" className="form-label">Merchant</label>
                            <input type="text" id="description" name="description" value={analysisResult.description} onChange={handleFormChange} className="form-input" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="date" className="form-label">Date</label>
                                <input type="date" id="date" name="date" value={analysisResult.date} onChange={handleFormChange} className="form-input" />
                            </div>
                             <div>
                                <label htmlFor="amount" className="form-label">Amount (INR)</label>
                                <input type="number" id="amount" name="amount" value={analysisResult.amount} onChange={handleAmountChange} className="form-input" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="category" className="form-label">Category</label>
                            <select id="category" name="category" value={analysisResult.category} onChange={handleFormChange} className="form-input">
                                {categories.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>
                         <div className="pt-4">
                            <button onClick={handleAdd} className="w-full px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add Transaction</button>
                         </div>
                    </div>
                );
            case 'error':
                 return (
                    <div className="text-center p-8">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button onClick={handleRetake} className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Try Again</button>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col m-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <CameraIcon className="w-6 h-6 text-blue-600 dark:text-blue-400"/>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Scan Receipt</h2>
                    </div>
                     <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                     </button>
                </header>
                <main className="p-4 flex-1 flex justify-center items-center overflow-y-auto">
                    {renderContent()}
                </main>
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
             <style>{`
                .form-label {
                    @apply block mb-1 text-xs font-medium text-gray-600 dark:text-gray-400;
                }
                .form-input {
                    @apply bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-gray-200 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5;
                }
            `}</style>
        </div>
    );
};

export default ReceiptScannerModal;