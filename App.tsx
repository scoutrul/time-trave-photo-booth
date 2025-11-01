
import React, { useState, useRef, useCallback } from 'react';
import { generateHistoricalImage } from './services/geminiService';

const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 14c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
  </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
  </svg>
);

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 9-9c0-4.97-4.03-9-9-9zm-1 5v5l4.25 2.52.75-1.23-3.5-2.07V8H12z" />
  </svg>
);

const ImagePlaceholder: React.FC<{ title: string, children?: React.ReactNode }> = ({ title, children }) => (
    <div className="w-full aspect-square bg-gray-700/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-500 text-gray-400 p-4">
        {children}
        <p className="mt-4 font-semibold text-lg text-center">{title}</p>
    </div>
);

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


export default function App() {
    const [originalImage, setOriginalImage] = useState<{ data: string; mimeType: string; } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState<boolean>(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = useCallback(async () => {
        setIsCapturing(true);
        setOriginalImage(null);
        setGeneratedImage(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access the camera. Please check permissions and try again.");
            setIsCapturing(false);
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCapturing(false);
    }, []);

    const handleCapture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const base64Data = await blobToBase64(blob);
                    setOriginalImage({ data: `data:image/jpeg;base64,${base64Data}`, mimeType: 'image/jpeg' });
                    stopCamera();
                }
            }, 'image/jpeg');
        }
    }, [stopCamera]);
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            stopCamera();
            setGeneratedImage(null);
            const base64Data = await blobToBase64(file);
            setOriginalImage({ data: `data:${file.type};base64,${base64Data}`, mimeType: file.type });
        }
    };
    
    const handleGenerate = async () => {
        if (!originalImage || !prompt) {
            setError("Please provide a photo and a historical scene prompt.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const base64WithoutPrefix = originalImage.data.split(',')[1];
            const resultBase64 = await generateHistoricalImage(base64WithoutPrefix, originalImage.mimeType, prompt);
            setGeneratedImage(`data:image/png;base64,${resultBase64}`);
        } catch (err) {
            console.error(err);
            setError("Failed to generate the image. The AI might be busy, or the prompt might be too complex. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartOver = () => {
        setOriginalImage(null);
        setGeneratedImage(null);
        setPrompt('');
        setError(null);
        setIsLoading(false);
        stopCamera();
    };


    return (
        <div className="min-h-screen bg-gray-800 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
                        Time-Travel Photo Booth
                    </h1>
                    <p className="text-lg text-gray-300 mt-2">
                        Capture your moment, describe a scene, and journey through history!
                    </p>
                </header>

                <div className="bg-gray-900 shadow-2xl rounded-xl p-6 md:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Input Side */}
                        <div className="flex flex-col space-y-6">
                           <div className="relative w-full aspect-square">
                                {isCapturing ? (
                                    <div className="w-full h-full">
                                        <video ref={videoRef} autoPlay className="w-full h-full rounded-lg object-cover transform -scale-x-100"></video>
                                        <canvas ref={canvasRef} className="hidden"></canvas>
                                    </div>
                                ) : originalImage ? (
                                    <img src={originalImage.data} alt="Your snapshot" className="w-full h-full object-contain rounded-lg" />
                                ) : (
                                    <ImagePlaceholder title="Your Photo">
                                       <div className="flex space-x-4">
                                            <CameraIcon className="w-16 h-16" />
                                            <UploadIcon className="w-16 h-16" />
                                       </div>
                                    </ImagePlaceholder>
                                )}
                            </div>
                           
                            {isCapturing ? (
                                <div className="flex items-center space-x-4">
                                    <button onClick={handleCapture} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center space-x-2">
                                        <CameraIcon className="w-6 h-6"/><span>Snap Photo</span>
                                    </button>
                                     <button onClick={stopCamera} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                                    <button onClick={startCamera} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center space-x-2">
                                       <CameraIcon className="w-6 h-6"/> <span>Use Camera</span>
                                    </button>
                                    <label htmlFor="file-upload" className="w-full cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center space-x-2">
                                        <UploadIcon className="w-6 h-6"/>
                                        <span>Upload Photo</span>
                                    </label>
                                    <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </div>
                            )}
                        </div>

                        {/* Output Side */}
                        <div className="flex flex-col space-y-6">
                            <div className="relative w-full aspect-square">
                                {isLoading ? (
                                    <div className="w-full h-full bg-gray-700/50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-purple-500 animate-pulse p-4">
                                        <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
                                        <p className="mt-4 font-semibold text-lg text-white">Traveling through time...</p>
                                        <p className="text-sm text-gray-300">This can take a moment.</p>
                                    </div>
                                ) : generatedImage ? (
                                    <img src={generatedImage} alt="Generated historical scene" className="w-full h-full object-contain rounded-lg" />
                                ) : (
                                    <ImagePlaceholder title="Time-Travel Photo">
                                        <HistoryIcon className="w-16 h-16"/>
                                    </ImagePlaceholder>
                                )}
                            </div>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={handleGenerate}
                                    disabled={!originalImage || !prompt || isLoading}
                                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                >
                                    <HistoryIcon className="w-6 h-6" />
                                    <span>Time Travel!</span>
                                </button>
                                <button onClick={handleStartOver} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
                                        Start Over
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Prompt Input */}
                    <div className="mt-8">
                        <label htmlFor="prompt" className="block text-lg font-medium text-gray-200 mb-2">
                            Describe the Scene
                        </label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., 'A 1920s jazz club in New York', 'Ancient Rome as a gladiator', 'Walking on the moon'"
                            rows={3}
                            className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="mt-6 p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-center">
                            <p>{error}</p>
                        </div>
                    )}
                </div>
                <footer className="text-center mt-8 text-gray-500 text-sm">
                    <p>Powered by Gemini. Please use responsibly.</p>
                </footer>
            </div>
        </div>
    );
}
