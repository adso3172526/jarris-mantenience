import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, message, Upload, Button, Tabs, Image, Divider } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { workOrdersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface EditClosedWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workOrder: any;
}

const EditClosedWorkOrderModal: React.FC<EditClosedWorkOrderModalProps> = ({
  open,
  onClose,
  onSuccess,
  workOrder,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<UploadFile | null>(null);
  const [pdvPhotos, setPdvPhotos] = useState<UploadFile[]>([]);
  const [techPhotos, setTechPhotos] = useState<UploadFile[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (open && workOrder) {
      form.setFieldsValue({
        title: workOrder.title,
        requestDescription: workOrder.requestDescription,
        workDoneDescription: workOrder.workDoneDescription,
        cost: workOrder.cost,
      });
      setInvoiceFile(null);
      setPdvPhotos([]);
      setTechPhotos([]);
    }
  }, [open, workOrder, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      // 1. Actualizar datos básicos
      await workOrdersApi.editClosed(workOrder.id, values);

      // 2. Reemplazar factura si hay una nueva
      if (invoiceFile?.originFileObj) {
        const formData = new FormData();
        formData.append('file', invoiceFile.originFileObj);
        formData.append('uploadedBy', user?.email || '');

        try {
          await workOrdersApi.replaceInvoice(workOrder.id, formData);
          message.success('Factura actualizada');
        } catch (error) {
          message.warning('Datos actualizados, pero error al actualizar factura');
        }
      }

      // 3. Reemplazar fotos PDV si hay nuevas
      if (pdvPhotos.length > 0) {
        const formData = new FormData();
        pdvPhotos.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });
        formData.append('uploadedBy', user?.email || '');
        formData.append('photoType', 'pdv');

        try {
          await workOrdersApi.replacePhotos(workOrder.id, formData);
          message.success('Fotos PDV actualizadas');
        } catch (error) {
          message.warning('Error al actualizar fotos PDV');
        }
      }

      // 4. Reemplazar fotos técnico si hay nuevas
      if (techPhotos.length > 0) {
        const formData = new FormData();
        techPhotos.forEach((file) => {
          if (file.originFileObj) {
            formData.append('files', file.originFileObj);
          }
        });
        formData.append('uploadedBy', user?.email || '');
        formData.append('photoType', 'technician');

        try {
          await workOrdersApi.replacePhotos(workOrder.id, formData);
          message.success('Fotos técnico actualizadas');
        } catch (error) {
          message.warning('Error al actualizar fotos técnico');
        }
      }

      message.success('Orden de trabajo actualizada exitosamente');
      form.resetFields();
      setInvoiceFile(null);
      setPdvPhotos([]);
      setTechPhotos([]);
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const invoiceUploadProps = {
    maxCount: 1,
    fileList: invoiceFile ? [invoiceFile] : [],
    beforeUpload: (file: File) => {
      const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type)) {
        message.error('Solo PDF, JPG o PNG');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('Debe ser menor a 10MB');
        return false;
      }

      const uploadFile: UploadFile = {
        uid: `${Date.now()}`,
        name: file.name,
        status: 'done',
        originFileObj: file,
      };

      setInvoiceFile(uploadFile);
      return false;
    },
    onRemove: () => setInvoiceFile(null),
  };

  const pdvPhotosUploadProps = {
    maxCount: 2,
    fileList: pdvPhotos,
    beforeUpload: (file: File) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type)) {
        message.error('Solo JPG o PNG');
        return false;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Debe ser menor a 5MB');
        return false;
      }

      if (pdvPhotos.length >= 2) {
        message.error('Máximo 2 fotos');
        return false;
      }

      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file,
      };

      setPdvPhotos((prev) => [...prev, uploadFile]);
      return false;
    },
    onRemove: (file: UploadFile) => {
      setPdvPhotos((prev) => prev.filter((f) => f.uid !== file.uid));
    },
  };

  const techPhotosUploadProps = {
    maxCount: 2,
    fileList: techPhotos,
    beforeUpload: (file: File) => {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowed.includes(file.type)) {
        message.error('Solo JPG o PNG');
        return false;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Debe ser menor a 5MB');
        return false;
      }

      if (techPhotos.length >= 2) {
        message.error('Máximo 2 fotos');
        return false;
      }

      const uploadFile: UploadFile = {
        uid: `${Date.now()}-${file.name}`,
        name: file.name,
        status: 'done',
        originFileObj: file,
      };

      setTechPhotos((prev) => [...prev, uploadFile]);
      return false;
    },
    onRemove: (file: UploadFile) => {
      setTechPhotos((prev) => prev.filter((f) => f.uid !== file.uid));
    },
  };

  const tabItems = [
    {
      key: 'data',
      label: 'Datos',
      children: (
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Título de la Solicitud"
            name="title"
            rules={[{ required: true, message: 'Título requerido' }]}
          >
            <Input placeholder="Ej: Falla en motor" />
          </Form.Item>

          <Form.Item label="Descripción de la Solicitud (PDV)" name="requestDescription">
            <Input.TextArea rows={3} placeholder="Descripción original del PDV" />
          </Form.Item>

          <Form.Item label="Trabajo Realizado" name="workDoneDescription">
            <Input.TextArea rows={4} placeholder="Descripción del trabajo realizado" />
          </Form.Item>

          <Form.Item
            label="Costo"
            name="cost"
            rules={[{ required: true, message: 'Costo requerido' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
              placeholder="0"
            />
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'invoice',
      label: 'Factura',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <strong>Factura Actual:</strong>
            {workOrder?.invoiceFilePath ? (
              <div style={{ marginTop: 8 }}>
                <a
                  href={`${import.meta.env.VITE_API_URL}${workOrder.invoiceFilePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {workOrder.invoiceFileName}
                </a>
              </div>
            ) : (
              <div style={{ marginTop: 8, color: '#8c8c8c' }}>Sin factura</div>
            )}
          </div>

          <Divider />

          <div>
            <strong>Reemplazar Factura:</strong>
            <div style={{ marginTop: 12 }}>
              <Upload {...invoiceUploadProps}>
                <Button icon={<UploadOutlined />}>
                  {invoiceFile ? 'Cambiar factura' : 'Subir nueva factura'}
                </Button>
              </Upload>
              {invoiceFile && (
                <div style={{ marginTop: 8, color: '#52c41a' }}>
                  ✓ Nueva factura seleccionada: {invoiceFile.name}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'photos',
      label: 'Fotos',
      children: (
        <div>
          {/* Fotos PDV */}
          <div style={{ marginBottom: 24 }}>
            <strong>Fotos PDV Actuales:</strong>
            {workOrder?.pdvPhotos && workOrder.pdvPhotos.length > 0 ? (
              <Image.PreviewGroup>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  {workOrder.pdvPhotos.map((photo: string, index: number) => (
                    <Image
                      key={index}
                      width={100}
                      height={100}
                      src={`${import.meta.env.VITE_API_URL}${photo}`}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div style={{ marginTop: 8, color: '#8c8c8c' }}>Sin fotos</div>
            )}

            <Divider />

            <strong>Reemplazar Fotos PDV:</strong>
            <div style={{ marginTop: 12 }}>
              <Upload {...pdvPhotosUploadProps}>
                <Button icon={<UploadOutlined />}>Subir nuevas fotos PDV (máx 2)</Button>
              </Upload>
            </div>
          </div>

          {/* Fotos Técnico */}
          <div>
            <strong>Fotos Técnico/Contratista Actuales:</strong>
            {workOrder?.technicianPhotos && workOrder.technicianPhotos.length > 0 ? (
              <Image.PreviewGroup>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  {workOrder.technicianPhotos.map((photo: string, index: number) => (
                    <Image
                      key={index}
                      width={100}
                      height={100}
                      src={`${import.meta.env.VITE_API_URL}${photo}`}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <div style={{ marginTop: 8, color: '#8c8c8c' }}>Sin fotos</div>
            )}

            <Divider />

            <strong>Reemplazar Fotos Técnico:</strong>
            <div style={{ marginTop: 12 }}>
              <Upload {...techPhotosUploadProps}>
                <Button icon={<UploadOutlined />}>
                  Subir nuevas fotos Técnico (máx 2)
                </Button>
              </Upload>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="Editar Orden de Trabajo Cerrada"
      open={open}
      onCancel={() => {
        form.resetFields();
        setInvoiceFile(null);
        setPdvPhotos([]);
        setTechPhotos([]);
        onClose();
      }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Guardar Cambios"
      cancelText="Cancelar"
      width={isMobile ? '100%' : 800}
      centered
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 110px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
        },
      }}
    >
      <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 13 }}>
          ⚠️ Editando OT cerrada. Los archivos subidos REEMPLAZARÁN los actuales.
        </p>
      </div>

      <Tabs items={tabItems} />

      <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 12 }}>
          ℹ️ Los cambios se guardarán inmediatamente. No se modificarán eventos ni estados.
        </p>
      </div>
    </Modal>
  );
};

export default EditClosedWorkOrderModal;
