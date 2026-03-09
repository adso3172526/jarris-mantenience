import React, { useState, useEffect } from 'react';
import { Modal, Descriptions, Tag, Timeline, Typography, Image, Button, Divider } from 'antd';
import { workOrderStatusColors } from '../../config/theme';
import {
  FileTextOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { ToolOutlined, HomeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ViewWorkOrderModalProps {
  open: boolean;
  onClose: () => void;
  workOrder: any;
  onEdit?: () => void;
  showEditButton?: boolean;
}

const ViewWorkOrderModal: React.FC<ViewWorkOrderModalProps> = ({
  open,
  onClose,
  workOrder,
  onEdit,
  showEditButton = false,
}) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatCOP = (value: number) => {
    return `$${Math.round(value).toLocaleString('es-CO')}`;
  };

  const getTimelineItems = () => {
    const items = [];

    items.push({
      color: 'gold',
      dot: <FileTextOutlined />,
      children: (
        <div>
          <Text strong>Creada</Text>
          <br />
          <Text type="secondary">
            {new Date(workOrder.createdAt).toLocaleString('es-CO')}
          </Text>
          {workOrder.createdBy && (
            <>
              <br />
              <Text type="secondary">Por: {workOrder.createdBy}</Text>
            </>
          )}
        </div>
      ),
    });

    if (workOrder.rejectedAt) {
      items.push({
        color: 'red',
        dot: <CloseCircleOutlined />,
        children: (
          <div>
            <Text strong style={{ color: '#ff4d4f' }}>Rechazada</Text>
            <br />
            <Text type="secondary">
              {new Date(workOrder.rejectedAt).toLocaleString('es-CO')}
            </Text>
            {workOrder.rejectedBy && (
              <>
                <br />
                <Text type="secondary">Por: {workOrder.rejectedBy}</Text>
              </>
            )}
            {workOrder.rejectionReason && (
              <>
                <br />
                <Text type="secondary">Motivo: {workOrder.rejectionReason}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    if (workOrder.assigneeName && !workOrder.rejectedAt) {
      items.push({
        color: 'blue',
        dot: <UserOutlined />,
        children: (
          <div>
            <Text strong>Asignada a {workOrder.assigneeName}</Text>
            <br />
            <Tag color={workOrder.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
              {workOrder.assigneeType}
            </Tag>
          </div>
        ),
      });
    }

    if ((workOrder.status === 'EN_PROCESO' || workOrder.status === 'TERMINADA' || workOrder.status === 'CERRADA') && !workOrder.rejectedAt) {
      items.push({
        color: 'cyan',
        dot: <ClockCircleOutlined />,
        children: (
          <div>
            <Text strong>En Proceso</Text>
            {workOrder.startedAt && (
              <>
                <br />
                <Text type="secondary">
                  {new Date(workOrder.startedAt).toLocaleString('es-CO')}
                </Text>
              </>
            )}
            {workOrder.startedBy && (
              <>
                <br />
                <Text type="secondary">Por: {workOrder.startedBy}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    if (workOrder.finishedAt) {
      items.push({
        color: 'green',
        dot: <CheckCircleOutlined />,
        children: (
          <div>
            <Text strong>Finalizada</Text>
            <br />
            <Text type="secondary">
              {new Date(workOrder.finishedAt).toLocaleString('es-CO')}
            </Text>
            {workOrder.finishedBy && (
              <>
                <br />
                <Text type="secondary">Por: {workOrder.finishedBy}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    if (workOrder.closedAt && !workOrder.rejectedAt) {
      items.push({
        color: 'default',
        children: (
          <div>
            <Text strong>Cerrada</Text>
            <br />
            <Text type="secondary">
              {new Date(workOrder.closedAt).toLocaleString('es-CO')}
            </Text>
            {workOrder.closedBy && (
              <>
                <br />
                <Text type="secondary">Por: {workOrder.closedBy}</Text>
              </>
            )}
          </div>
        ),
      });
    }

    return items;
  };

  // Mobile Optimized View
  const renderMobileContent = () => (
    <div>
      {/* Estado */}
      <div style={{ marginBottom: 16 }}>
        <Tag
          color={workOrderStatusColors[workOrder.status as keyof typeof workOrderStatusColors]}
          style={{ fontSize: 14, padding: '4px 12px' }}
        >
          {workOrder.status}
        </Tag>
      </div>

      {/* Información General */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
          Información General
        </Text>
        
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Tipo:</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color={workOrder.maintenanceType === 'EQUIPO' ? 'blue' : 'green'}>
              {workOrder.maintenanceType === 'EQUIPO' ? (
                <><ToolOutlined /> Mantenimiento de Equipo</>
              ) : (
                <><HomeOutlined /> Mantenimiento Locativo</>
              )}
            </Tag>
          </div>
        </div>

        {workOrder.maintenanceType === 'EQUIPO' && workOrder.asset && (
          <>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Código:</Text>
              <div style={{ fontWeight: 600 }}>{workOrder.asset.code}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Descripción:</Text>
              <div>{workOrder.asset.description}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Categoría:</Text>
              <div>{workOrder.asset.category?.name || 'N/A'}</div>
            </div>
          </>
        )}

        {workOrder.maintenanceType === 'LOCATIVO' && (
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Categoría Locativa:</Text>
            <div style={{ marginTop: 4 }}>
              <Tag color="green">{workOrder.locativeCategory}</Tag>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Ubicación:</Text>
          <div>{workOrder.location.name}</div>
        </div>
      </div>

      <Divider />

      {/* Solicitud */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
          Solicitud
        </Text>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Título:</Text>
          <div>{workOrder.title}</div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Descripción:</Text>
          <div style={{ fontSize: 13 }}>{workOrder.requestDescription || 'Sin descripción'}</div>
        </div>
      </div>

      {/* Fotos del PDV */}
      {workOrder.pdvPhotos && workOrder.pdvPhotos.length > 0 && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Fotos del PDV
            </Text>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {workOrder.pdvPhotos.map((photo: string, index: number) => (
                  <Image
                    key={index}
                    width={100}
                    height={100}
                    src={`${import.meta.env.VITE_API_URL}${photo}`}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    alt={`Foto PDV ${index + 1}`}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        </>
      )}

      {/* Asignación */}
      {workOrder.assigneeName && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Asignación
            </Text>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Asignado a:</Text>
              <div>{workOrder.assigneeName}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tipo:</Text>
              <div>
                <Tag color={workOrder.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
                  {workOrder.assigneeType}
                </Tag>
              </div>
            </div>
            {workOrder.assigneeEmail && (
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Email:</Text>
                <div style={{ fontSize: 12 }}>{workOrder.assigneeEmail}</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Fotos del Técnico */}
      {workOrder.technicianPhotos && workOrder.technicianPhotos.length > 0 && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Fotos del Técnico/Contratista
            </Text>
            <Image.PreviewGroup>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {workOrder.technicianPhotos.map((photo: string, index: number) => (
                  <Image
                    key={index}
                    width={100}
                    height={100}
                    src={`${import.meta.env.VITE_API_URL}${photo}`}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    alt={`Foto Técnico ${index + 1}`}
                  />
                ))}
              </div>
            </Image.PreviewGroup>
          </div>
        </>
      )}

      {/* Trabajo Realizado */}
      {workOrder.workDoneDescription && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Trabajo Realizado
            </Text>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Descripción:</Text>
              <div style={{ fontSize: 13 }}>{workOrder.workDoneDescription}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Costo:</Text>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#E60012' }}>
                {formatCOP(workOrder.cost)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Factura */}
      {workOrder.invoiceFilePath && (
        <>
          <Divider />
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Factura
            </Text>
            <div style={{ marginBottom: 8 }}>
              <a
                href={`${import.meta.env.VITE_API_URL}${workOrder.invoiceFilePath}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13 }}
              >
                📄 {workOrder.invoiceFileName}
              </a>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Subida por: {workOrder.invoiceUploadedBy}
              </Text>
            </div>
          </div>
        </>
      )}

      {/* Timeline */}
      <Divider />
      <div>
        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
          Línea de Tiempo
        </Text>
        <Timeline items={getTimelineItems()} />
      </div>
    </div>
  );

  // Desktop View
  const renderDesktopContent = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Tag
          color={workOrderStatusColors[workOrder.status as keyof typeof workOrderStatusColors]}
          style={{ fontSize: 14, padding: '4px 12px' }}
        >
          {workOrder.status}
        </Tag>
      </div>

      <Title level={5}>Información General</Title>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Tipo" span={2}>
          <Tag color={workOrder.maintenanceType === 'EQUIPO' ? 'blue' : 'green'} style={{ fontSize: 14 }}>
            {workOrder.maintenanceType === 'EQUIPO' ? (
              <><ToolOutlined /> Mantenimiento de Equipo</>
            ) : (
              <><HomeOutlined /> Mantenimiento Locativo</>
            )}
          </Tag>
        </Descriptions.Item>

        {workOrder.maintenanceType === 'EQUIPO' && workOrder.asset && (
          <>
            <Descriptions.Item label="Código" span={1}>
              {workOrder.asset.code}
            </Descriptions.Item>
            <Descriptions.Item label="Descripción" span={1}>
              {workOrder.asset.description}
            </Descriptions.Item>
            <Descriptions.Item label="Categoría" span={1}>
              {workOrder.asset.category?.name || 'N/A'}
            </Descriptions.Item>
          </>
        )}

        {workOrder.maintenanceType === 'LOCATIVO' && (
          <Descriptions.Item label="Categoría Locativa" span={2}>
            <Tag color="green" style={{ fontSize: 14 }}>
              {workOrder.locativeCategory}
            </Tag>
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Ubicación" span={2}>
          {workOrder.location.name}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5} style={{ marginTop: 24 }}>Solicitud</Title>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="Título">
          {workOrder.title}
        </Descriptions.Item>
        <Descriptions.Item label="Descripción">
          {workOrder.requestDescription || 'Sin descripción'}
        </Descriptions.Item>
      </Descriptions>

      {workOrder.pdvPhotos && workOrder.pdvPhotos.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Fotos del PDV</Title>
          <Image.PreviewGroup>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {workOrder.pdvPhotos.map((photo: string, index: number) => (
                <Image
                  key={index}
                  width={150}
                  height={150}
                  src={`${import.meta.env.VITE_API_URL}${photo}`}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  alt={`Foto PDV ${index + 1}`}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </>
      )}

      {workOrder.assigneeName && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Asignación</Title>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Asignado a" span={1}>
              {workOrder.assigneeName}
            </Descriptions.Item>
            <Descriptions.Item label="Tipo" span={1}>
              <Tag color={workOrder.assigneeType === 'INTERNO' ? 'blue' : 'orange'}>
                {workOrder.assigneeType}
              </Tag>
            </Descriptions.Item>
            {workOrder.assigneeEmail && (
              <Descriptions.Item label="Email" span={2}>
                {workOrder.assigneeEmail}
              </Descriptions.Item>
            )}
          </Descriptions>
        </>
      )}

      {workOrder.technicianPhotos && workOrder.technicianPhotos.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Fotos del Técnico/Contratista</Title>
          <Image.PreviewGroup>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {workOrder.technicianPhotos.map((photo: string, index: number) => (
                <Image
                  key={index}
                  width={150}
                  height={150}
                  src={`${import.meta.env.VITE_API_URL}${photo}`}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  alt={`Foto Técnico ${index + 1}`}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        </>
      )}

      {workOrder.workDoneDescription && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Trabajo Realizado</Title>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Descripción">
              {workOrder.workDoneDescription}
            </Descriptions.Item>
            <Descriptions.Item label="Costo">
              {formatCOP(workOrder.cost)}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      {workOrder.invoiceFilePath && (
        <>
          <Title level={5} style={{ marginTop: 24 }}>Factura</Title>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Archivo" span={1}>
              <a
                href={`${import.meta.env.VITE_API_URL}${workOrder.invoiceFilePath}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {workOrder.invoiceFileName}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="Subida por" span={1}>
              {workOrder.invoiceUploadedBy}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}

      <Title level={5} style={{ marginTop: 24 }}>Línea de Tiempo</Title>
      <Timeline items={getTimelineItems()} />
    </div>
  );

  return (
    <Modal
      title={`OT - ${workOrder.id.substring(0, 8)}`}
      open={open}
      onCancel={onClose}
      footer={
        showEditButton && onEdit ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Button
              icon={<EditOutlined />}
              onClick={onEdit}
              type="primary"
              style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
            >
              Editar OT
            </Button>
            <Button onClick={onClose} danger>Cerrar</Button>
          </div>
        ) : (
          <Button onClick={onClose} block={isMobile} danger>Cerrar</Button>
        )
      }
      width={isMobile ? 'calc(100vw - 24px)' : 800}
      centered
      style={isMobile ? { maxWidth: 'calc(100vw - 24px)' } : {}}
      styles={{
        body: {
          maxHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)',
          overflowY: 'auto',
          padding: isMobile ? 12 : undefined,
        },
      }}
    >
      {isMobile ? renderMobileContent() : renderDesktopContent()}
    </Modal>
  );
};

export default ViewWorkOrderModal;
