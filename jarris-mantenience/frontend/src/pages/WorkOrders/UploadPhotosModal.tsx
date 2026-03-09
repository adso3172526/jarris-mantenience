import React, { useState } from 'react';
import { Modal, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { workOrdersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const { Dragger } = Upload;

interface UploadPhotosModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrder: any;
}

const UploadPhotosModal: React.FC<UploadPhotosModalProps> = ({
  open,
  onClose,
  onSuccess,
  workOrder,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleClose = () => {
    setFileList([]);
    onClose();
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Selecciona al menos una foto');
      return;
    }

    if (fileList.length > 2) {
      message.error('Máximo 2 fotos');
      return;
    }

    try {
      setUploading(true);

      // Determinar el rol del usuario
      let userRole = 'PDV';
      if (user?.roles && user.roles.length > 0) {
        const roles = user.roles;
        if (roles.includes('PDV')) {
          userRole = 'PDV';
        } else if (roles.includes('TECNICO_INTERNO')) {
          userRole = 'TECNICO_INTERNO';
        } else if (roles.includes('CONTRATISTA')) {
          userRole = 'CONTRATISTA';
        } else {
          userRole = roles[0];
        }
      }

      const formData = new FormData();
      
      // Agregar los archivos
      let filesAdded = 0;
      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
          filesAdded++;
          console.log('Added file:', file.name, file.originFileObj.type, file.originFileObj.size);
        }
      });

      if (filesAdded === 0) {
        message.error('No se pudieron procesar los archivos');
        setUploading(false);
        return;
      }

      // Agregar los datos
      formData.append('uploadedBy', user?.email || '');
      formData.append('userRole', userRole);

      console.log('=== Upload Debug ===');
      console.log('Files to upload:', filesAdded);
      console.log('User role:', userRole);
      console.log('Uploaded by:', user?.email);

      await workOrdersApi.uploadPhotos(workOrder.id, formData);
      
      message.success('Fotos subidas exitosamente');
      setFileList([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('=== Upload Error ===');
      console.error('Full error:', error);
      console.error('Response data:', error.response?.data);
      message.error(error.response?.data?.message || 'Error al subir fotos');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'files',
    multiple: true,
    maxCount: 2,
    fileList: fileList,
    onRemove: (file) => {
      setFileList(fileList.filter(f => f.uid !== file.uid));
    },
    beforeUpload: (file) => {
      console.log('beforeUpload called:', file.name, file.type);
      
      // Validar tipo
      const isImage = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
      if (!isImage) {
        message.error(`${file.name} no es una imagen JPG/PNG`);
        return Upload.LIST_IGNORE;
      }

      // Validar tamaño
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error(`${file.name} debe ser menor a 5MB`);
        return Upload.LIST_IGNORE;
      }

      // Validar máximo 2
      if (fileList.length >= 2) {
        message.error('Máximo 2 fotos');
        return Upload.LIST_IGNORE;
      }

      // Crear UploadFile con originFileObj
      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file,
      };

      setFileList(prev => [...prev, uploadFile]);
      console.log('File added, has originFileObj:', !!uploadFile.originFileObj);
      
      return false; // No subir automáticamente
    },
  };

  return (
    <Modal
      title={`Subir Fotos - ${workOrder.id.substring(0, 8)}`}
      open={open}
      onCancel={handleClose}
      onOk={handleUpload}
      confirmLoading={uploading}
      okText="Subir Fotos"
      cancelText="Cancelar"
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <p>
          <strong>{workOrder.asset ? 'Equipo:' : 'Tipo:'}</strong>{' '}
          {workOrder.asset 
            ? `${workOrder.asset.code} - ${workOrder.asset.description}` 
            : `Mantenimiento Locativo - ${workOrder.locativeCategory || ''}`}
        </p>
        <p style={{ fontSize: 12, color: '#8c8c8c' }}>
          Puedes subir máximo 2 fotos por perfil. Formatos: JPG, PNG (máx 5MB cada una)
        </p>
      </div>

      <Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Haz click o arrastra imágenes aquí
        </p>
        <p className="ant-upload-hint">
          Máximo 2 fotos. Solo JPG/PNG.
        </p>
      </Dragger>
    </Modal>
  );
};

export default UploadPhotosModal;
