import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Card, Row, Col, Upload, Button, Space } from 'antd';
import { ToolOutlined, HomeOutlined, PlusOutlined, CameraOutlined, ScanOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { workOrdersApi, assetsApi, locativeCategoriesApi, locationsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import QrScannerModal from '../../components/QrScannerModal';

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
  const [locativeCategories, setLocativeCategories] = useState<any[]>([]);
  const [loadingLocativeCategories, setLoadingLocativeCategories] = useState(false);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const { user, hasRole } = useAuth();
  const isAdminOrJefe = hasRole(['ADMIN', 'JEFE_MANTENIMIENTO']);

  const maintenanceType = Form.useWatch('maintenanceType', form);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (open) {
      if (!isAdminOrJefe) {
        loadAssets();
      }
      loadLocativeCategories();
      form.setFieldsValue({ maintenanceType: 'EQUIPO' });
      if (isAdminOrJefe) {
        loadLocations();
        setSelectedLocationId(undefined);
      }
    }
  }, [open]);

  const loadLocations = async () => {
    try {
      const response = await locationsApi.getAll();
      setAllLocations(response.data.filter((l: any) => l.active !== false));
    } catch (error) {
      message.error('Error al cargar ubicaciones');
    }
  };

  const loadAssetsByLocation = async (locationId: string) => {
    try {
      setLoadingAssets(true);
      const response = await assetsApi.getByLocation(locationId);
      const activeAssets = response.data.filter((a: any) => a.status === 'ACTIVO');
      setAssets(activeAssets);
    } catch (error) {
      message.error('Error al cargar activos');
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    form.setFieldsValue({ assetId: undefined, locativeCategoryId: undefined });
    setAssets([]);
    if (locationId) {
      loadAssetsByLocation(locationId);
    }
  };

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

  const loadLocativeCategories = async () => {
    try {
      setLoadingLocativeCategories(true);
      const response = await locativeCategoriesApi.getActive();
      setLocativeCategories(response.data);
    } catch (error) {
      message.error('Error al cargar categorías locativas');
    } finally {
      setLoadingLocativeCategories(false);
    }
  };

  const handleQrScan = async (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.type !== 'asset' || !data.code) {
        message.error('Código QR no reconocido');
        return;
      }

      // Try to find in already-loaded local assets first
      const localMatch = assets.find((a: any) => a.code === data.code);
      if (localMatch) {
        form.setFieldsValue({ assetId: localMatch.id });
        message.success(`Equipo seleccionado: ${localMatch.code} - ${localMatch.description}`);
        return;
      }

      // Fallback: fetch from API
      const response = await assetsApi.getByCode(data.code);
      const asset = response.data;

      if (asset.status !== 'ACTIVO') {
        message.error(`El equipo ${asset.code} no está activo`);
        return;
      }
      if (user?.locationId && asset.location?.id !== user.locationId) {
        message.error(`El equipo ${asset.code} no pertenece a tu ubicación`);
        return;
      }

      // Add to local list so it appears in the dropdown
      setAssets((prev) => {
        if (prev.find((a) => a.id === asset.id)) return prev;
        return [...prev, asset];
      });
      form.setFieldsValue({ assetId: asset.id });
      message.success(`Equipo seleccionado: ${asset.code} - ${asset.description}`);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        message.error('Código QR no reconocido');
      } else {
        message.error(err.response?.data?.message || 'Error al buscar el equipo');
      }
    }
  };

  const handleSubmit = async (values: any) => {
    if (isAdminOrJefe && !selectedLocationId) {
      message.error('Selecciona una ubicación');
      return;
    }
    try {
      setLoading(true);
      const data: any = {
        ...values,
        createdBy: user?.email,
      };
      if (isAdminOrJefe && selectedLocationId) {
        data.locationId = selectedLocationId;
      }
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
      setSelectedLocationId(undefined);
      setAssets([]);
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
    borderColor: maintenanceType === type ? (type === 'EQUIPO' ? '#1890ff' : '#722ed1') : '#d9d9d9',
    borderWidth: maintenanceType === type ? 2 : 1,
    background: maintenanceType === type ? (type === 'EQUIPO' ? '#e6f7ff' : '#f9f0ff') : '#fff',
    transition: 'all 0.2s',
  });

  return (
    <>
    <Modal
      title="Nueva Solicitud"
      open={open}
      onCancel={() => { form.resetFields(); setFileList([]); setSelectedLocationId(undefined); setAssets([]); onClose(); }}
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
        {/* Selector de ubicación para ADMIN/JEFE */}
        {isAdminOrJefe && (
          <Form.Item
            label="Ubicación"
            required
            style={{ marginBottom: 16 }}
          >
            <Select
              placeholder="Selecciona la ubicación"
              value={selectedLocationId}
              onChange={handleLocationChange}
              showSearch
              optionFilterProp="children"
              size={isMobile ? "large" : "middle"}
            >
              {allLocations
                .sort((a: any, b: any) => a.name.localeCompare(b.name))
                .map((loc: any) => (
                  <Select.Option key={loc.id} value={loc.id}>
                    {loc.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        )}

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
                onClick={() => { form.setFieldsValue({ maintenanceType: 'EQUIPO', assetId: undefined, locativeCategoryId: undefined }); if (isAdminOrJefe && selectedLocationId) loadAssetsByLocation(selectedLocationId); }}
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
                onClick={() => form.setFieldsValue({ maintenanceType: 'LOCATIVO', assetId: undefined, locativeCategoryId: undefined })}
              >
                <HomeOutlined style={{ fontSize: 22, color: maintenanceType === 'LOCATIVO' ? '#722ed1' : '#8c8c8c', display: 'block', marginBottom: 4 }} />
                <div style={{ fontWeight: 600, fontSize: 13 }}>Locativo</div>
              </Card>
            </Col>
          </Row>
        </Form.Item>

        {/* Equipo selector */}
        {maintenanceType === 'EQUIPO' && (
          <Form.Item label="Equipo" required>
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="assetId"
                noStyle
                rules={[{ required: true, message: 'Selecciona un equipo' }]}
              >
                <Select
                  placeholder={isAdminOrJefe && !selectedLocationId ? "Primero selecciona una ubicación" : assets.length > 0 ? "Selecciona el equipo" : "No hay equipos en esta ubicación"}
                  loading={loadingAssets}
                  showSearch
                  optionFilterProp="children"
                  disabled={assets.length === 0 || (isAdminOrJefe && !selectedLocationId)}
                  size={isMobile ? "large" : "middle"}
                  style={{ width: '100%' }}
                >
                  {assets.map((asset) => (
                    <Select.Option key={asset.id} value={asset.id}>
                      {asset.code} - {asset.description}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Button
                icon={<ScanOutlined />}
                size={isMobile ? "large" : "middle"}
                onClick={() => setQrScannerOpen(true)}
                title="Escanear QR"
              />
            </Space.Compact>
          </Form.Item>
        )}

        {/* Categoría locativa */}
        {maintenanceType === 'LOCATIVO' && (
          <Form.Item
            label="Categoría"
            name="locativeCategoryId"
            rules={[{ required: true, message: 'Selecciona una categoría' }]}
          >
            <Select
              placeholder="Tipo de mantenimiento locativo"
              size={isMobile ? "large" : "middle"}
              loading={loadingLocativeCategories}
              showSearch
              optionFilterProp="children"
            >
              {locativeCategories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
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
    <QrScannerModal
      open={qrScannerOpen}
      onClose={() => setQrScannerOpen(false)}
      onScan={handleQrScan}
    />
    </>
  );
};

export default CreateWorkOrderModal;
