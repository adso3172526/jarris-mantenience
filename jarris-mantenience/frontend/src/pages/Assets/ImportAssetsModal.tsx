import React, { useState } from 'react';
import { Modal, Button, Upload, message, Alert, Table, Typography, Space } from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  InboxOutlined,
  CheckCircleTwoTone,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { assetsApi } from '../../services/api';

const { Dragger } = Upload;
const { Text, Paragraph } = Typography;

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  ok: boolean;
  total: number;
  created: number;
  errors: ImportError[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportAssetsModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setFileList([]);
    setResult(null);
    setUploading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      const res = await assetsApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Plantilla_Carga_Activos.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('No se pudo descargar la plantilla');
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async () => {
    const file = fileList[0]?.originFileObj as File | undefined;
    if (!file) {
      message.warning('Selecciona un archivo .xlsx');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setResult(null);
      const res = await assetsApi.importExcel(formData);
      const data: ImportResult = res.data;
      setResult(data);
      if (data.ok) {
        message.success(`${data.created} activos importados correctamente`);
        setFileList([]); // evita re-importar el mismo archivo por segundo clic
        onSuccess();
      } else {
        message.error(`Se encontraron ${data.errors.length} filas con errores`);
      }
    } catch (error: any) {
      message.error(
        error.response?.data?.message || 'Error al importar el archivo',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title="Importar activos desde Excel"
      open={open}
      onCancel={handleClose}
      width={640}
      footer={[
        <Button key="close" onClick={handleClose}>
          Cerrar
        </Button>,
        <Button
          key="upload"
          type="primary"
          icon={<UploadOutlined />}
          loading={uploading}
          disabled={fileList.length === 0}
          onClick={handleUpload}
        >
          Importar
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          type="info"
          showIcon
          message="¿Primera vez? Descarga la plantilla, llénala y súbela aquí."
          description="La plantilla incluye las categorías y ubicaciones válidas en listas desplegables. El código y el QR de cada activo se generan automáticamente."
        />

        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadTemplate}
          loading={downloading}
          block
        >
          Descargar plantilla
        </Button>

        <Dragger
          accept=".xlsx"
          multiple={false}
          maxCount={1}
          fileList={fileList}
          beforeUpload={(file) => {
            const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
            if (!isXlsx) {
              message.error('Solo se permiten archivos .xlsx');
              return Upload.LIST_IGNORE;
            }
            setFileList([
              { uid: file.uid, name: file.name, originFileObj: file } as UploadFile,
            ]);
            setResult(null);
            return false;
          }}
          onRemove={() => {
            setFileList([]);
            setResult(null);
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Haz clic o arrastra el archivo .xlsx lleno
          </p>
        </Dragger>

        {result && result.ok && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
            message={`${result.created} de ${result.total} activos creados correctamente`}
          />
        )}

        {result && !result.ok && (
          <>
            <Alert
              type="error"
              showIcon
              message={`No se creó ningún activo. Corrige estas ${result.errors.length} filas y vuelve a subir el archivo.`}
            />
            <Table
              size="small"
              rowKey="row"
              pagination={{ pageSize: 5, size: 'small' }}
              dataSource={result.errors}
              columns={[
                { title: 'Fila', dataIndex: 'row', key: 'row', width: 70 },
                { title: 'Error', dataIndex: 'message', key: 'message' },
              ]}
            />
            <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
              <Text strong>Tip:</Text> el número de fila corresponde a la fila del
              Excel (la fila 1 es el encabezado).
            </Paragraph>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default ImportAssetsModal;
