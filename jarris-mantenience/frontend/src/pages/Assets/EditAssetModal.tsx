import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, message, Upload, Button, Image, Popconfirm, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { assetsApi, categoriesApi, locationsApi } from '../../services/api';

interface EditAssetModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: any;
}

const EditAssetModal: React.FC<EditAssetModalProps> = ({
  open,
  onClose,
  onSuccess,
  asset,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [newFileList, setNewFileList] = useState<UploadFile[]>([]);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (open && asset) {
      loadData();
      form.setFieldsValue({
        description: asset.description,
        categoryId: asset.category?.id,
        locationId: asset.location?.id,
        brand: asset.brand,
        model: asset.model,
        serial: asset.serial,
        reference: asset.reference,
        value: asset.value,
        status: asset.status,
      });
      setExistingPhotos(asset.photos || []);
    }
  }, [open, asset, form]);

  const loadData = async () => {
    try {
      const [categoriesRes, locationsRes] = await Promise.all([
        categoriesApi.getAll(),
        locationsApi.getAll(),
      ]);
      setCategories(categoriesRes.data);
      setLocations(locationsRes.data);
    } catch (error) {
      message.error('Error al cargar datos');
    }
  };

  const handleDeletePhoto = async (photoIndex: number) => {
    try {
      setDeletingPhoto(true);
      await assetsApi.deletePhoto(asset.id, photoIndex);
      
      // Actualizar lista local
      const newPhotos = [...existingPhotos];
      newPhotos.splice(photoIndex, 1);
      setExistingPhotos(newPhotos);
      
      message.success('Foto eliminada');
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      message.error('Error al eliminar la foto');
    } finally {
      setDeletingPhoto(false);
    }
  };
const handleSubmit = async () => {
  try {
    const values = await form.validateFields();
    setLoading(true);

    // Limpiar y validar todos los campos numéricos
    const cleanedValues = {
      ...values,
      value: values.value != null ? Number(values.value) : 0,
    };

    // 1. Actualizar datos del activo
    await assetsApi.update(asset.id, cleanedValues);
    
    
    
   

      // 2. Si hay fotos nuevas, subirlas
      if (newFileList.length > 0) {
        const formData = new FormData();
        newFileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });

        try {
          await assetsApi.uploadPhotos(asset.id, formData);
          message.success('Activo actualizado y fotos subidas exitosamente');
        } catch (photoError) {
          console.error('Error uploading photos:', photoError);
          message.warning('Activo actualizado pero hubo un error al subir las fotos');
        }
      } else {
        message.success('Activo actualizado exitosamente');
      }

      form.resetFields();
      setNewFileList([]);
      setExistingPhotos([]);
      setPhotoError(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        message.warning('Completa los campos obligatorios');
        return;
      }
      message.error('Error al actualizar el activo: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setNewFileList([]);
    setExistingPhotos([]);
    setPhotoError(null);
    onClose();
  };

  const uploadProps = {
    listType: 'picture-card' as const,
    fileList: newFileList,
    beforeUpload: (file: File) => {
      // Validar tipo
      if (file.type && !file.type.startsWith('image/')) {
        setPhotoError(`Formato no permitido: "${file.name}". Solo se aceptan imágenes.`);
        return false;
      }

      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB >= 15) {
        setPhotoError(`"${file.name}" pesa ${sizeMB.toFixed(1)}MB. El máximo permitido es 15MB.`);
        return false;
      }

      const total = existingPhotos.length + newFileList.length;
      if (total >= 5) {
        setPhotoError('Máximo 5 fotos por activo.');
        return false;
      }

      setPhotoError(null);
      return false;
    },
    onChange: ({ fileList: newList }: any) => {
      // Filtrar archivos inválidos
      const valid = newList.filter((f: any) => {
        if (!f.originFileObj) return true;
        const type = f.originFileObj.type;
        if (type && !type.startsWith('image/')) return false;
        if (f.originFileObj.size / 1024 / 1024 >= 15) return false;
        return true;
      });
      const maxNew = 5 - existingPhotos.length;
      setNewFileList(valid.slice(0, maxNew));
    },
    onRemove: (file: UploadFile) => {
      const index = newFileList.indexOf(file);
      const newList = newFileList.slice();
      newList.splice(index, 1);
      setNewFileList(newList);
    },
  };

  const totalPhotos = existingPhotos.length + newFileList.length;

  return (
    <Modal
      title={`Editar Activo - ${asset?.code}`}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={700}
      centered
      okText="Guardar"
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
          label="Nombre"
          rules={[{ required: true, message: 'Ingresa un nombre' }]}
        >
          <Input placeholder="Ej: Taladro Inalámbrico" />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="Categoría"
          rules={[{ required: true, message: 'Selecciona una categoría' }]}
        >
          <Select
            placeholder="Selecciona una categoría"
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

        <Form.Item name="value" label="Valor">
          <InputNumber
            style={{ width: '100%' }}
            placeholder="0"
            formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
            min={0}
          />
        </Form.Item>

        <Form.Item name="status" label="Estado">
          <Select>
            <Select.Option value="ACTIVO">ACTIVO</Select.Option>
            <Select.Option value="BAJA">BAJA</Select.Option>
          </Select>
        </Form.Item>

        {/* Fotos Existentes */}
        {existingPhotos.length > 0 && (
          <Form.Item label="Fotos Actuales">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {existingPhotos.map((photo, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <Image
                    width={104}
                    height={104}
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${photo}`}
                    style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #d9d9d9' }}
                  />
                  <Popconfirm
                    title="¿Eliminar esta foto?"
                    onConfirm={() => handleDeletePhoto(index)}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Button
                      type="primary"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deletingPhoto}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                      }}
                    />
                  </Popconfirm>
                </div>
              ))}
            </div>
          </Form.Item>
        )}

        {/* Subir Nuevas Fotos */}
        <Form.Item label={`Agregar Fotos (${totalPhotos}/5)`}>
          <Upload {...uploadProps}>
            {totalPhotos >= 5 ? null : (
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

export default EditAssetModal;
