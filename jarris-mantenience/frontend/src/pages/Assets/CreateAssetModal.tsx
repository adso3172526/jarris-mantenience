import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, message, Upload, Alert } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { assetsApi, categoriesApi, locationsApi } from '../../services/api';

interface CreateAssetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCategories();
      loadLocations();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data);
    } catch (error) {
      message.error('Error al cargar categorías');
    }
  };

  const loadLocations = async () => {
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data);
    } catch (error) {
      message.error('Error al cargar ubicaciones');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (fileList.length === 0) {
        setPhotoError('Debes subir al menos una foto del activo');
        return;
      }

      setLoading(true);

      // 1. Crear el activo
      const assetResponse = await assetsApi.create(values);
      const newAssetId = assetResponse.data.id;

      // 2. Si hay fotos, subirlas
      if (fileList.length > 0) {
        const formData = new FormData();
        fileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });

        try {
          await assetsApi.uploadPhotos(newAssetId, formData);
          message.success('Activo creado y fotos subidas exitosamente');
        } catch (photoError) {
          console.error('Error uploading photos:', photoError);
          message.warning('Activo creado pero hubo un error al subir las fotos');
        }
      } else {
        message.success('Activo creado exitosamente');
      }

      form.resetFields();
      setFileList([]);
      setPhotoError(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating asset:', error);
      message.error('Error al crear el activo: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    setPhotoError(null);
    onClose();
  };

  const uploadProps = {
    listType: 'picture-card' as const,
    fileList: fileList,
    beforeUpload: (file: File) => {
      // Validar tipo
      if (file.type && !file.type.startsWith('image/')) {
        setPhotoError(`Formato no permitido: "${file.name}". Solo se aceptan imágenes.`);
        return false;
      }

      // Validar tamaño (15MB)
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB >= 15) {
        setPhotoError(`"${file.name}" pesa ${sizeMB.toFixed(1)}MB. El máximo permitido es 15MB.`);
        return false;
      }

      // Validar máximo 5 fotos
      if (fileList.length >= 5) {
        setPhotoError('Máximo 5 fotos por activo.');
        return false;
      }

      setPhotoError(null);
      return false;
    },
    onChange: ({ fileList: newFileList }: any) => {
      // Filtrar archivos inválidos
      const valid = newFileList.filter((f: any) => {
        if (!f.originFileObj) return true;
        const type = f.originFileObj.type;
        if (type && !type.startsWith('image/')) return false;
        if (f.originFileObj.size / 1024 / 1024 >= 15) return false;
        return true;
      });
      setFileList(valid.slice(0, 5));
    },
    onRemove: (file: UploadFile) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
  };

  return (
    <Modal
      title="Crear Nuevo Activo"
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      centered
      okText="Crear"
      cancelText="Cancelar"
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
      >
        <Form.Item
          name="description"
          label="Descripcion"
          rules={[{ required: true, message: 'Ingresa una descripcion' }]}
        >
          <Input placeholder="Ej: Taladro Inalámbrico" />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="Categoría"
          rules={[{ required: true, message: 'Selecciona una categoria' }]}
        >
          <Select
            placeholder="Selecciona una categoria"
            options={categories.map(cat => ({
              label: cat.name,
              value: cat.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="locationId"
          label="Ubicación"
          rules={[{ required: true, message: 'Selecciona una ubicación' }]}
        >
          <Select
            placeholder="Selecciona una ubicación"
            options={locations.map(loc => ({
              label: loc.name,
              value: loc.id,
            }))}
          />
        </Form.Item>

        <Form.Item name="brand" label="Marca">
          <Input placeholder="Ej: DeWalt" />
        </Form.Item>

        <Form.Item name="model" label="Modelo">
          <Input placeholder="Ej: DCD771C2" />
        </Form.Item>

        <Form.Item name="serial" label="Serial">
          <Input placeholder="Ej: 123456789" />
        </Form.Item>

        <Form.Item name="reference" label="Referencia">
          <Input placeholder="Ej: REF-001" />
        </Form.Item>

        <Form.Item
          name="value"
          label="Valor"
          rules={[{ required: true, message: 'Ingresa el valor del activo' }]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="0"
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="Fotos del Activo (Mínimo 1 - Máximo 5)"
          required
        >
          <Upload {...uploadProps}>
            {fileList.length >= 5 ? null : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Subir Foto</div>
              </div>
            )}
          </Upload>
          <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: 12 }}>
            Formatos: JPG, PNG, WEBP • Tamaño máximo: 15MB por foto
          </div>
          {photoError && (
            <Alert
              message={photoError}
              type="error"
              showIcon
              closable
              onClose={() => setPhotoError(null)}
              style={{ marginTop: 8 }}
            />
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateAssetModal;
