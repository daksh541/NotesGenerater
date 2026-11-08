import React, { useState, useRef, useEffect } from 'react';
import { Camera as CameraIcon, Image as ImageIcon, X, RefreshCw, Zap, Check, AlertCircle, ChevronLeft } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface CapturedPhoto {
    id: string;
    file: File;
    previewUrl: string;
    rotation: number; // 0, 90, 180, 270
    filter: 'none' | 'whiteboard' | 'grayscale';
}

interface MobileCameraCaptureProps {
    isOpen: boolean;
    onClose: () => void;
    onPhotosCaptured: (photos: CapturedPhoto[]) => void;
}

export const MobileCameraCapture: React.FC<MobileCameraCaptureProps> = ({
    isOpen,
    onClose,
    onPhotosCaptured
}) => {
    const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
    const [hasFlash, setHasFlash] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [isNative, setIsNative] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    // Initialize HTML5 camera stream when modal is opened on Web/PWA
    useEffect(() => {
        if (!isOpen) {
            stopCameraStream();
            return;
        }

        if (!Capacitor.isNativePlatform()) {
            startCameraStream();
        }

        return () => {
            stopCameraStream();
        };
    }, [isOpen, facingMode]);

    const startCameraStream = async () => {
        setPermissionError(null);
        stopCameraStream();

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setPermissionError('Camera is not directly supported on this browser. Use photo picker instead.');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Check flash/torch capability
            const track = stream.getVideoTracks()[0];
            const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
            if (capabilities.torch) {
                setHasFlash(true);
            }
        } catch (err: any) {
            console.warn('Camera permission or device error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError('Camera access was denied. Please allow camera permissions in your browser or device settings.');
            } else {
                setPermissionError('Could not start camera. You can select photos from your library instead.');
            }
        }
    };

    const stopCameraStream = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
        }
    };

    const toggleFlash = async () => {
        if (!cameraStream) return;
        const track = cameraStream.getVideoTracks()[0];
        try {
            const nextFlash = !flashOn;
            await (track as any).applyConstraints({
                advanced: [{ torch: nextFlash }]
            });
            setFlashOn(nextFlash);
        } catch (e) {
            console.error('Torch toggle failed:', e);
        }
    };

    const handleFlipCamera = () => {
        setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    };

    // Native capture using Capacitor Camera plugin
    const handleNativeCapture = async (source: CameraSource) => {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: source
            });

            if (image.webPath) {
                const response = await fetch(image.webPath);
                const blob = await response.blob();
                const filename = `whiteboard_${Date.now()}.${image.format || 'jpg'}`;
                const file = new File([blob], filename, { type: `image/${image.format || 'jpeg'}` });

                const newPhoto: CapturedPhoto = {
                    id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    file,
                    previewUrl: image.webPath,
                    rotation: 0,
                    filter: 'none'
                };
                setCapturedPhotos((prev) => [...prev, newPhoto]);
            }
        } catch (err: any) {
            if (err.message !== 'User cancelled photos app') {
                console.error('Native camera error:', err);
            }
        }
    };

    // Web shutter click from video stream
    const handleWebShutter = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const filename = `whiteboard_${Date.now()}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });
            const previewUrl = URL.createObjectURL(blob);

            const newPhoto: CapturedPhoto = {
                id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                file,
                previewUrl,
                rotation: 0,
                filter: 'none'
            };
            setCapturedPhotos((prev) => [...prev, newPhoto]);
        }, 'image/jpeg', 0.92);
    };

    // Photo Library selection (both Web and Native fallback)
    const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        const newItems: CapturedPhoto[] = files.map((file) => ({
            id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            file,
            previewUrl: URL.createObjectURL(file),
            rotation: 0,
            filter: 'none'
        }));
        setCapturedPhotos((prev) => [...prev, ...newItems]);
    };

    const handleConfirm = () => {
        if (capturedPhotos.length === 0) return;
        onPhotosCaptured(capturedPhotos);
        stopCameraStream();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none safe-top safe-bottom">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-md z-10 text-white">
                <button
                    onClick={() => {
                        stopCameraStream();
                        onClose();
                    }}
                    className="p-2 rounded-full bg-white/10 active:bg-white/20 transition-colors"
                    title="Close"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="text-center">
                    <span className="text-sm font-semibold tracking-wide">Capture Whiteboard</span>
                    <span className="block text-[11px] text-slate-400">
                        {capturedPhotos.length} {capturedPhotos.length === 1 ? 'photo' : 'photos'} captured
                    </span>
                </div>

                <div className="flex items-center space-x-2">
                    {hasFlash && (
                        <button
                            onClick={toggleFlash}
                            className={`p-2 rounded-full ${flashOn ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-white'}`}
                        >
                            <Zap size={20} />
                        </button>
                    )}
                    <button
                        onClick={handleFlipCamera}
                        className="p-2 rounded-full bg-white/10 active:bg-white/20 transition-colors text-white"
                        title="Flip Camera"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Viewfinder / Camera Surface */}
            <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
                {permissionError ? (
                    <div className="p-6 text-center max-w-sm space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <AlertCircle size={28} />
                        </div>
                        <h3 className="text-base font-bold text-white">Camera Access Required</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">{permissionError}</p>
                        <div className="pt-2 flex flex-col space-y-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 px-4 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30"
                            >
                                Select from Photo Library
                            </button>
                            <button
                                onClick={startCameraStream}
                                className="w-full py-2.5 px-4 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : isNative ? (
                    <div className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shadow-inner">
                            <CameraIcon size={38} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white">Native Mobile Camera</h3>
                            <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                Tap the shutter below to launch the camera or pick existing lecture photos.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Viewfinder Framing Guidelines (Rule of thirds & whiteboard bounds) */}
                        <div className="absolute inset-8 border border-white/25 rounded-2xl pointer-events-none flex flex-col justify-between">
                            <div className="flex justify-between p-2">
                                <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                                <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                            </div>
                            <div className="text-center">
                                <span className="bg-black/50 text-[10px] text-white/80 px-2.5 py-1 rounded-full font-medium tracking-wide">
                                    Align whiteboard inside frame
                                </span>
                            </div>
                            <div className="flex justify-between p-2">
                                <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                                <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
                            </div>
                        </div>
                    </>
                )}

                {/* Thumbnail strip of captured photos */}
                {capturedPhotos.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
                        {capturedPhotos.map((photo, index) => (
                            <div
                                key={photo.id}
                                className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-md group"
                            >
                                <img
                                    src={photo.previewUrl}
                                    alt={`Captured ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-0 right-0 bg-indigo-600 text-white text-[9px] px-1 font-bold rounded-tl">
                                    #{index + 1}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="p-5 bg-black/80 backdrop-blur-md flex items-center justify-between z-10">
                {/* Photo Library Picker */}
                <button
                    onClick={() => {
                        if (isNative) {
                            handleNativeCapture(CameraSource.Photos);
                        } else {
                            fileInputRef.current?.click();
                        }
                    }}
                    className="p-3.5 rounded-full bg-white/10 active:bg-white/20 text-white transition-all flex items-center justify-center"
                    title="Choose from Gallery"
                >
                    <ImageIcon size={22} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelection}
                    multiple
                    accept="image/*"
                    className="hidden"
                />

                {/* Main Shutter Button */}
                <button
                    onClick={() => {
                        if (isNative) {
                            handleNativeCapture(CameraSource.Camera);
                        } else {
                            handleWebShutter();
                        }
                    }}
                    className="w-18 h-18 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-95 transition-transform"
                    title="Take Photo"
                >
                    <div className="w-14 h-14 rounded-full bg-white active:bg-indigo-200 transition-colors" />
                </button>

                {/* Confirm / Continue Button */}
                <button
                    onClick={handleConfirm}
                    disabled={capturedPhotos.length === 0}
                    className={`px-4 py-2.5 rounded-2xl flex items-center space-x-1.5 font-bold text-xs transition-all ${
                        capturedPhotos.length > 0
                            ? 'bg-indigo-600 text-white active:scale-95 shadow-md shadow-indigo-600/40'
                            : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                >
                    <span>Done ({capturedPhotos.length})</span>
                    <Check size={16} />
                </button>
            </div>
        </div>
    );
};
