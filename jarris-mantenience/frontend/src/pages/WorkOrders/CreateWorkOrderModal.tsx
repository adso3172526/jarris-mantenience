import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Card, Row, Col, Upload } from 'antd';
import { ToolOutlined, HomeOutlined, PlusOutlined, CameraOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { workOrdersApi, assetsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface CreateWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user } = useAuth();

  const maintenanceType = Form.useWatch('maintenanceType', form);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (open) {
      loadAssets();
      form.setFieldsValue({ maintenanceType: 'EQUIPO' });
    }
  }, [open]);

  const loadAssets = async () => {
    try {
      setLoadingAssets(true);
      const response = await assetsApi.getAll();
      const myLocationAssets = response.data.filter((a: any) => {
        const isActive = a.status === 'ACTIVO';
        const isMyLocation = user?.locationId && a.location?.id === user.locationId;
        return isActive && isMyLocation;
      });
      setAssets(myLocationAssets);
      if (myLocationAssets.length === 0) {
        message.info('No hay equipos disponibles en tu ubicación');
      }
    } catch (error) {
      message.error('Error al cargar activos');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const data = {
        ...values,
        createdBy: user?.email,
      };
      const response = await workOrdersApi.create(data);
      const newWoId = response.data.id;

      // Subir fotos si hay
      if (fileList.length > 0 && newWoId) {
        const formData = new FormData();
        fileList.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });
        formData.append('uploadedBy', user?.email || '');
        formData.append('userRole', 'PDV');

        try {
          await workOrdersApi.uploadPhotos(newWoId, formData);
        } catch (photoError) {
          console.error('Error uploading photos:', photoError);
          message.warning('Solicitud creada pero hubo un error al subir las fotos');
        }
      }

      message.success('Solicitud creada exitosamente');
      form.resetFields();
      setFileList([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al crear solicitud');
    } finally {
      setLoading(false);
    }
  };

  const typeCardStyle = (type: string): React.CSSProperties => ({
    cursor: 'pointer',
    borderColor: maintenanceType === type ? (type === 'EQUIPO' ? '#1890ff' : '#52c41a') : '#d9d9d9',
    borderWidth: maintenanceType === type ? 2 : 1,
    background: maintenanceType === type ? (type === 'EQUIPO' ? '#e6f7ff' : '#f6ffed') : '#fff',
    transition: 'all 0.2s',
  });

  return (
    <Modal
      title="Nueva Solicitud"
      open={open}
      onCancel={() => { form.resetFields(); setFileList([]); onClose(); }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={isMobile ? '100%' : 520}
      centered
      okText="Enviar Solicitud"
      cancelText="Cancelar"
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 110px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Tipo de mantenimiento - Cards seleccionables */}
        <Form.Item
          name="maintenanceType"
          rules={[{ required: true, message: 'Selecciona el tipo' }]}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Card
                size="small"
                style={typeCardStyle('EQUIPO')}
                styles={{ body: { padding: '12px 16px', textAlign: 'center' } }}
                onClick={() => form.setFieldsValue({ maintenanceType: 'EQUIPO', assetId: undefined, locativeCategory: undefined })}
              >
                <ToolOutlined style={{ fontSize: 22, color: maintenanceType === 'EQUIPO' ? '#1890ff' : '#8c8c8c', display: 'block', marginBottom: 4 }} />
                <div style={{ fontWeight: 600, fontSize: 13 }}>Equipo</div>
              </Card>
            </Col>
            <Col span={12}>
              <Card
                size="small"
                style={typeCardStyle('LOCATIVO')}
                styles={{ body: { padding: '12px 16px', textAlign: 'center' } }}
                onClick={() => form.setFieldsValue({ maintenanceType: 'LOCATIVO', assetId: undefined, locativeCategory: undefined })}
              >
                <HomeOutlined style={{ fontSize: 22, color: maintenanceType === 'LOCATIVO' ? '#52c41a' : '#8c8c8c', display: 'block', marginBottom: 4 }} />
                <div style={{ fontWeight: 600, fontSize: 13 }}>Locativo</div>
              </Card>
            </Col>
          </Row>
        </Form.Item>

        {/* Equipo selector */}
        {maintenanceType === 'EQUIPO' && (
          <Form.Item
            label="Equipo"
            name="assetId"
            rules={[{ required: true, message: 'Selecciona un equipo' }]}
          >
            <Select
              placeholder={assets.length > 0 ? "Selecciona el equipo" : "No hay equipos en tu ubicación"}
              loading={loadingAssets}
              showSearch
              optionFilterProp="children"
              disabled={assets.length === 0}
              size={isMobile ? "large" : "middle"}
            >
              {assets.map((asset) => (
                <Select.Option key={asset.id} value={asset.id}>
                  {asset.code} - {asset.description}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Categoría locativa */}
        {maintenanceType === 'LOCATIVO' && (
          <Form.Item
            label="Categoría"
            name="locativeCategory"
            rules={[{ required: true, message: 'Selecciona una categoría' }]}
          >
            <Select
              placeholder="Tipo de mantenimiento locativo"
              size={isMobile ? "large" : "middle"}
            >
              <Select.Option value="PINTURA">Pintura y Acabados</Select.Option>
              <Select.Option value="ELECTRICO">Sistema Eléctrico</Select.Option>
              <Select.Option value="ESTRUCTURAL">Estructura y Obra Civil</Select.Option>
              <Select.Option value="PLOMERIA">Plomería e Hidráulica</Select.Option>
              <Select.Option value="HVAC">Climatización (HVAC)</Select.Option>
              <Select.Option value="PISOS">Pisos y Revestimientos</Select.Option>
              <Select.Option value="FACHADA">Fachada Exterior</Select.Option>
              <Select.Option value="CARPINTERIA">Carpintería y Mobiliario</Select.Option>
              <Select.Option value="OTROS">Otros</Select.Option>
            </Select>
          </Form.Item>
        )}

        {/* Título */}
        <Form.Item
          label="Título"
          name="title"
          rules={[{ required: true, message: 'Título requerido' }]}
        >
          <Input
            placeholder={maintenanceType === 'LOCATIVO' ? 'Ej: Pintar fachada' : 'Ej: Freidora no enciende'}
            size={isMobile ? "large" : "middle"}
          />
        </Form.Item>

        {/* Descripción */}
        <Form.Item
          label="Descripción del problema"
          name="requestDescription"
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe el problema detalladamente..."
          />
        </Form.Item>

        {/* Fotos */}
        <Form.Item
          label={<span><CameraOutlined style={{ marginRight: 6 }} />Fotos (opcional, máx. 2)</span>}
          style={{ marginBottom: 8 }}
        >
          <Upload
            listType="picture-card"
            fileList={fileList}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('Solo imágenes JPG/PNG');
                return Upload.LIST_IGNORE;
              }
              const isLt5M = file.size / 1024 / 1024 < 5;
              if (!isLt5M) {
                message.error('Máximo 5MB por foto');
                return Upload.LIST_IGNORE;
              }
              if (fileList.length >= 2) {
                message.error('Máximo 2 fotos');
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            onChange={({ fileList: newList }) => setFileList(newList.slice(0, 2))}
            onRemove={(file) => {
              setFileList(fileList.filter((f) => f.uid !== file.uid));
            }}
            accept="image/*"
            capture={isMobile ? "environment" : undefined}
          >
            {fileList.length < 2 && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 4, fontSize: 12 }}>{isMobile ? 'Tomar foto' : 'Subir'}</div>
              </div>
            )}
          </Upload>
        </Form.Item>
      </Form>

      <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4, fontSize: 12, color: '#8c8c8c' }}>
        La solicitud será enviada al Jefe de Mantenimiento para su revisión.
      </div>
    </Modal>
  );
};

export default CreateWorkOrderModal;
