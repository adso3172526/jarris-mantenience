import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Modal, Button, Typography, Space, Upload, message } from 'antd';
import { CameraOutlined, ScanOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

const READER_ID = 'qr-reader';

const QrScannerModal: React.FC<QrScannerModalProps> = ({ open, onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Check if we're in a secure context (HTTPS or localhost)
  useEffect(() => {
    const isSecure = window.isSecureContext;
    setCameraSupported(isSecure);
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch { /* ignore */ }
      try { scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    scannedRef.current = false;

    const el = document.getElementById(READER_ID);
    if (!el) return;

    await stopScanner();

    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      try {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            onScan(decodedText);
            stopScanner().then(onClose);
          },
          () => {},
        );
        setScanning(true);
      } catch {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length === 0) throw new Error('No cameras found');
        await scanner.start(
          cameras[cameras.length - 1].id,
          config,
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            onScan(decodedText);
            stopScanner().then(onClose);
          },
          () => {},
        );
        setScanning(true);
      }
    } catch (err: any) {
      console.error('QR Camera error:', err);
      setError('No se pudo iniciar la cámara.');
    }
  }, [onScan, onClose, stopScanner]);

  // Scan QR from an image file
  const scanFromFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const scanner = new Html5Qrcode(READER_ID);
      const result = await scanner.scanFile(file, true);
      scanner.clear();
      onScan(result);
      onClose();
    } catch {
      setError('No se detectó un código QR en la imagen. Intenta con otra foto más clara.');
    }
  }, [onScan, onClose]);

  const handleClose = useCallback(() => {
    stopScanner().then(onClose);
  }, [stopScanner, onClose]);

  const handleAfterOpenChange = useCallback((isOpen: boolean) => {
    setReady(isOpen);
  }, []);

  // Auto-start camera if supported
  useEffect(() => {
    if (ready && open && cameraSupported) {
      startCamera();
    }
    return () => { stopScanner(); };
  }, [ready, open, cameraSupported, startCamera, stopScanner]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setScanning(false);
    }
  }, [open]);

  return (
    <Modal
      title={
        <Space>
          <ScanOutlined />
          Escanear código QR
        </Space>
      }
      open={open}
      onCancel={handleClose}
      afterOpenChange={handleAfterOpenChange}
      footer={null}
      destroyOnClose
      centered
      width={400}
      styles={{ body: { padding: '16px', textAlign: 'center' } }}
    >
      {/* Camera live view (only in HTTPS/localhost) */}
      {cameraSupported && (
        <div
          id={READER_ID}
          style={{
            width: '100%',
            minHeight: scanning ? 300 : 0,
            background: '#000',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        />
      )}

      {/* Hidden div for scanFile when camera is not available */}
      {!cameraSupported && <div id={READER_ID} style={{ display: 'none' }} />}

      {/* File-based scanning (always available as fallback) */}
      {!scanning && (
        <div style={{ marginTop: cameraSupported ? 16 : 0 }}>
          {!cameraSupported && (
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
              Toma una foto del código QR del equipo
            </Typography.Text>
          )}
          <Upload
            accept="image/*"
            capture="environment"
            showUploadList={false}
            beforeUpload={(file) => {
              scanFromFile(file as unknown as File);
              return false;
            }}
          >
            <Button
              type="primary"
              icon={<CameraOutlined />}
              size="large"
              style={{ width: '100%' }}
            >
              {cameraSupported ? 'O tomar foto del QR' : 'Tomar foto del QR'}
            </Button>
          </Upload>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="danger" style={{ display: 'block', marginBottom: 12 }}>
            {error}
          </Typography.Text>
        </div>
      )}

      {scanning && !error && (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
          Apunta la cámara al código QR del equipo
        </Typography.Text>
      )}
    </Modal>
  );
};

export default QrScannerModal;
